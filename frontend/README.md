# Todo frontend

Next.js static export, served from Cloudflare Workers Static Assets. The browser owns the
list and `localStorage` is the source of truth, so the app runs perfectly with no backend at
all — which is exactly why the one piece of configuration it needs is easy to forget.

## Configuration

`NEXT_PUBLIC_API_URL` is the origin of the todo API, with no trailing slash. Copy the example
and fill it in:

```bash
cp .env.example .env.local
```

On `localhost` and `127.0.0.1` the app falls back to `http://localhost:5180`, the port
`backend/` listens on, so `pnpm dev` needs no configuration at all.

`next build` refuses to run when the variable is unset, because the failure it prevents is
invisible. `startSync` resolves an empty origin, returns a no-op, and the exported site still
works — as a localStorage-only app. Nothing logs, nothing 404s, no request is ever attempted,
and the deploy looks correct in every screenshot and every Lighthouse run. Point the variable
at the local API if you want a production build without a hosted one.

## Running your own

Three values here are mine and are wrong for anyone else:

- `NEXT_PUBLIC_API_URL` — your API, not `vanta-todo-api.onrender.com`. Nothing prevents a
  build from pointing at mine, but the lists then live in my database, on a free plan, with no
  promises attached.
- `SITE_URL` in `src/app/site.ts` — canonical link, sitemap, robots and Open Graph tags.
- `name` in `wrangler.jsonc` — the `*.workers.dev` subdomain, unique per account.

The API half needs its own database and its own allow-list: see `backend/README.md` for the
connection string and `render.yaml` for `Cors__AllowedOrigins__0`, which has to name whatever
origin you deploy this to. CORS constrains browsers only, so that allow-list protects your
users, not your API.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm dlx wrangler deploy
```

`build` exports to `out/`, which is the directory `wrangler.jsonc` publishes.
