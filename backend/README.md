# Todo API

Self-hosted .NET 9 backend for the todo app. It stores one list per opaque client-generated
id and exposes two endpoints, because the client is the source of truth and only ever sends
or receives a whole list.

## Tech stack

- **.NET 9 / ASP.NET Core** — minimal APIs, top-level statements
- **Entity Framework Core 9** with **PostgreSQL** (Npgsql) — durable managed database
- **Microsoft.AspNetCore.OpenApi** + **Scalar** — interactive API documentation
- **Rate limiting** — fixed window, 60 requests per minute per forwarded IP
- **Health checks** — `/health` with a database connectivity probe, exempt from the rate limit
- **CORS** — configurable allow-list, sourced from environment variables in production
- **ProblemDetails** (RFC 7807) — uniform error response shape across all failure paths
- **Forwarded headers** — proxy-aware request handling for cloud deployments
- **Docker** — multi-stage build, runs as non-root `app` user

## Quick start

The service needs a PostgreSQL connection string. Point it at a throwaway local database:

```bash
docker run -d --name todos-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=todos postgres:17-alpine
```

That matches the default in `appsettings.Development.json`. To use a hosted database
instead, set a user secret, which overrides that default and stays out of the repository:

```bash
dotnet user-secrets set "ConnectionStrings:Default" "postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres"
```

Then:

```bash
cd backend
dotnet run
```

The service listens on `http://localhost:5180` and applies any pending migrations on startup.

Interactive docs: open `http://localhost:5180/scalar/v1` in a browser.

Changing the model means a new migration, which needs the EF Core tools
(`dotnet tool install --global dotnet-ef`):

```bash
dotnet ef migrations add <Name> -o Data/Migrations
```

## Endpoints

| Method | Route            | Purpose                                            |
| ------ | ---------------- | -------------------------------------------------- |
| `GET`  | `/health`        | Liveness plus a database probe                      |
| `GET`  | `/lists/{id}`    | Read one list, items in stored order                |
| `PUT`  | `/lists/{id}`    | Create or replace a list from the snapshot sent     |

`{id}` is a v4 GUID the browser generates for itself. There are no accounts: the id is the
capability, so it is generated with `crypto` randomness and never guessed. Item ids are
opaque strings the client owns; the server bounds their length and never interprets them.

A `PUT` replaces the list wholesale and array order becomes stored order, which is why a
drag-to-reorder needs no extra endpoint. Requests are rejected with 400 when a list exceeds
200 items, a title is empty or over 200 characters, or two items share an id.

Responses are never cached. These are per-client mutable lists, so a shared cache would be
wrong at any TTL.

## Storage

Render's free plan has no persistent disk and recycles the container on every deploy and
every idle spin-down, so the SQLite file this service started with was destroyed roughly
every fifteen idle minutes. Any list that outlived a single session was luck. Storage is now
a managed PostgreSQL database reached through `ConnectionStrings__Default`, which is set in
the Render dashboard and never committed.

Connect through a pooler rather than the direct host. The direct connection is IPv6-only on
most managed providers and Render's egress is not, so a direct string fails to resolve from
the deployed container while working fine from a laptop.

Managed providers hand out a `postgresql://` URI and Npgsql only parses key-value form, so
`DatabaseConnection` expands one into the other, passes a key-value string through, and rejects
anything that is neither. That last case matters more than it looks: a value that silently falls
through reaches Npgsql as a malformed connection string, and the parser error it raises names no
cause and no variable, which is a long way to travel for a stray pair of quotes around a pasted
URI. Doing that in code rather than by hand is not a convenience either: the URI percent-encodes the
password, so a password containing `@` or `#` is silently wrong when retyped, and one
containing `;` terminates the key-value string early unless it is quoted. A URI also implies a
managed host, which is where `SSL Mode=Require` and a pool ceiling of 10 come from — a free
pooler allows far fewer connections than Npgsql's default of 100. `Require` encrypts without
verifying the certificate; pinning the provider's CA and moving to `VerifyFull` is the upgrade
if this ever holds anything worth stealing.

## Why migrations, not EnsureCreated

`EnsureCreated` is fine against a disposable file and silently useless against a managed
Postgres. It creates the schema only when the database has no tables at all, and Npgsql's check
counts every schema except `pg_catalog` and `information_schema` — so a Supabase project, which
ships its own `auth` and `storage` tables before you write a line, always looks populated. The
call returns `false`, creates nothing, and the service starts perfectly. `/health` stays green,
because a connectivity probe opens a connection without touching a table. Every real query then
fails on a table that was never created.

That is the trap worth remembering: a green health check and a broken database are the same
observation unless the probe touches what the queries touch. `MigrateAsync` replaces it, and the
schema now lives in `Data/Migrations` where a change to the model is a reviewable file rather
than a silent no-op. Migrating on startup is only safe because one instance runs; more than one
needs the migration to move out of the boot path.

## Who writes a list

One person does, from any number of their own devices. That choice is what makes the rest of
the design sound, so it is worth stating outright.

A list id is a capability. The browser generates it, keeps it in `localStorage`, and mirrors
it into the query string so the same list can be opened on a second device. There are no
accounts and no invitations: possession of the id is possession of the list.

Because a single person writes, `PUT` can replace the whole list and the newest snapshot can
win. Two of your own devices do not race each other — you are only ever typing into one of
them. The cost of a lost update is at worst your own stale edit, and the client polls every
five seconds so the window is small.

That reasoning collapses the moment two *people* share an id. Person B's five-second-old
snapshot still contains the item A deleted and knows nothing of the item A added, so a
routine `PUT` resurrects the first and destroys the second. This is not a rare interleaving;
it is what ordinarily happens when two people type at once. Polling narrows the window and
changes nothing about the outcome.

Supporting that properly means replacing the snapshot with intent — add, patch and delete
addressed at a single item — so that edits to different items commute and only same-item
edits need resolving, which collapses to per-field last-write-wins. Ordering is the awkward
part: an array index is not mergeable, so position becomes a fractional index that sorts
between its neighbours and lets a move be one field write. A CRDT is the wrong reach here.
There is an authoritative server and no offline multi-writer requirement, and `Completed` is
a boolean whose merge is trivial.

## Keeping it awake

Two different idle timers apply, and only one of them ever cost data.

Render spins a free instance down after roughly fifteen minutes, which now costs a cold
start of about a minute rather than the database. A managed Postgres project on a free plan
typically pauses after some days of no queries; the data survives, but restoring it is
manual. `/health` runs a database probe and is exempt from the rate limit, so a single
scheduled request to it resets both timers at once. `keepalive/` holds the worker that does
this.
