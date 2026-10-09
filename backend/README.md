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

The service listens on `http://localhost:5180` and applies any pending migrations on startup,
because `appsettings.Development.json` opts in; see the migration gate below.

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
They are keyed as `(ListId, Id)`, so they need only be unique inside their own list — which
is exactly what the request validator already enforces.

A `PUT` replaces the list wholesale and array order becomes stored order, which is why a
drag-to-reorder needs no extra endpoint. Requests are rejected with 400 when a list exceeds
200 items, a title is empty or over 200 characters, or two items share an id.

Responses carry `Cache-Control: no-store` and `Vary: Origin`. These are per-client mutable
lists that the browser polls every five seconds, so a shared cache would be wrong at any TTL,
and `Vary` stops an intermediary handing one origin's CORS headers to another. Preflight
replies are the exception and stay cacheable: the header middleware sits after the CORS
middleware, which answers `OPTIONS` without calling further into the pipeline.

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
managed host, which is where `SSL Mode=Require`, a pool ceiling of 4 and a sixty-second idle
lifetime come from — a free pooler allows far fewer connections than Npgsql's default of 100.
`Require` encrypts without verifying the certificate; pinning the provider's CA and moving to
`VerifyFull` is the upgrade if this ever holds anything worth stealing.

That ceiling is arithmetic rather than taste. A free instance allows 60 database connections,
and the platform's own services plus the superuser reservation take roughly half. Session mode
— what the dashboard's port-5432 URI gives, and what Render needs because the direct host is
IPv6-only — pins one database connection per pooled client for the life of the session, so the
limit that binds is that 60 rather than the pooler's 200 client slots. Budget two instances per
service across a deploy and the sum is apps × 2 × `MaxPoolSize` against roughly 32 usable.
Four services share this database, so the ceiling is 4, not the 5 that fitted three. The idle
lifetime matters here for the same reason and
would not on a dedicated database: a service sitting idle on its connections is holding slots a
neighbour needs.

## One database, a schema per app

The free plan grants two projects per organisation and both were spent, which left a third
service wanting a database with nowhere to put one. So the backends share a single project
and take a schema each — `todo` here, with `invoice`, `audiophile` and `feedback` next door —
rather than a project each. These
lists are the irreplaceable half of that pair, so they stay in the project they were created
in and move only from `public` to `todo`; the invoice service, which re-seeds itself whenever
its table is empty, is the one that travels.

Sharing needs both halves of the move, and either half alone is worse than neither.
`HasDefaultSchema` moves the tables; `MigrationsHistoryTable` moves the ledger recording which
migrations have run. Move only the tables and both services keep reading and writing
`public.__EFMigrationsHistory`, where each reads the other's migration ids as its own history
and then generates a migration dropping the other's tables. The two calls sit beside each other
in `Program.cs`, fed by the same local, so they cannot drift apart.

The schema name is configuration rather than a constant, so one connection string serves every
service and only `Database__Schema` differs between them. `DatabaseSchema` refuses anything
that is not a bare identifier, because the value reaches generated DDL rather than a parameter.
It is per service and close to permanent: `MoveToOwnSchema` names the schema it moves to, so
repointing an existing service at a different one needs a new migration rather than just a new
variable.

Row-level security on `Lists` and `Items` dates from when they sat in `public` and the Data API
could reach them. It has no policies, which denies everything to any role that does not bypass
it, and the flag travels with the table through `SET SCHEMA`, so it survives the move and costs
nothing. Leaving `public` is the stronger version of the same protection. What no longer
carries RLS is the migration ledger, which was in that list too: enabling it on the table EF
reads to decide what has already run is a quiet trap, because a role that stopped bypassing RLS
would read zero applied migrations and replay all of them against populated tables. Dropping it
from the list also repairs a fresh database, where that statement named a `public` table the
ledger had already left.

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

Applying them is gated. `Migrations__Apply` defaults to false, and a boot that finds pending
migrations without it refuses to start rather than serving against a schema it does not match.
Render holds the previous instance when a new one fails its health check, so a refusal costs a
no-op deploy instead of an outage, and the deploy that *should* migrate is one where the
variable was set deliberately. These lists are user-created and shared by their id, so an
unattended migration against them is the one failure with nothing behind it.

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
scheduled request to it resets both timers at once. A cron worker outside this repository
sends one every five minutes through the working day, and one database-touching request
daily. Anyone self-hosting this needs their own equivalent, or a paid plan that never sleeps.
