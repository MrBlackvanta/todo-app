# Todo API

Self-hosted .NET 9 backend for the todo app. It stores one list per opaque client-generated
id and exposes two endpoints, because the client is the source of truth and only ever sends
or receives a whole list.

## Tech stack

- **.NET 9 / ASP.NET Core** — minimal APIs, top-level statements
- **Entity Framework Core 9** with **SQLite** — file-based database, zero external dependencies
- **Microsoft.AspNetCore.OpenApi** + **Scalar** — interactive API documentation
- **Rate limiting** — fixed window, 60 requests per minute per forwarded IP
- **Health checks** — `/health` with a database connectivity probe, exempt from the rate limit
- **CORS** — configurable allow-list, sourced from environment variables in production
- **ProblemDetails** (RFC 7807) — uniform error response shape across all failure paths
- **Forwarded headers** — proxy-aware request handling for cloud deployments
- **Docker** — multi-stage build, runs as non-root `app` user

## Quick start

```bash
cd backend
dotnet run
```

The service listens on `http://localhost:5180` and creates `todos.db` on first run.

Interactive docs: open `http://localhost:5180/scalar/v1` in a browser.

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

## Storage on the free tier

Render's free plan has no persistent disk and spins the instance down after roughly fifteen
minutes idle, so `/tmp/todos.db` lives and dies with the container. That is why the browser
keeps the authoritative copy in `localStorage` and this service is a backup rather than the
store of record: the client pushes a full snapshot after every change and only ever reads
back when it has no local list at all, so a wiped server repopulates itself and can never
erase a client.

Attaching a durable store is a connection-string change. `EnsureCreated` is used instead of
migrations for the same reason — with an ephemeral database there is no schema to evolve.
