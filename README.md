# Persona FAS Gallery (selfie killchain)

An internal Persona app: a React + Vite SPA served by a Hono Cloudflare Worker, cataloguing
face-anti-spoofing (FAS) attack techniques across the selfie killchain.

- [**React**](https://react.dev/) — UI
- [**Vite**](https://vite.dev/) — build tooling and dev server
- [**Hono**](https://hono.dev/) — Worker-side routing under `/api/*`
- [**Cloudflare Workers**](https://developers.cloudflare.com/workers/) — hosting, with the SPA served
  from `dist/client` as static assets

## Deploy names

Every deployment is namespaced with a `persona-` prefix so this app never claims a generic
Worker name (and its `workers.dev` hostname) that overlaps with a public upstream template. The
names follow Persona's convention of `persona-<app>-staging` / `persona-<app>-prod`:

| Environment | Worker name |
| --- | --- |
| `staging` (default) | `persona-selfie-killchain-staging` |
| `production` | `persona-selfie-killchain-prod` |

`wrangler.json` also sets a `persona-selfie-killchain` top-level name, so even a bare
`wrangler deploy` with no environment selected lands on a prefixed Worker.

Note that `@cloudflare/vite-plugin` resolves the target environment at **build** time from
`CLOUDFLARE_ENV` and writes the fully-resolved Worker name into
`dist/persona_selfie_killchain/wrangler.json`, which `wrangler deploy` then reads via
`.wrangler/deploy/config.json`. Passing `--env` to `wrangler deploy` after the fact does not change
which Worker you ship to — the `deploy:*` scripts below therefore bundle the matching build.

## Development

Install dependencies:

```bash
npm install
```

Start the dev server (runs against the `staging` environment on port 8787):

```bash
npm run dev
```

Rebuild the gallery index from the source dataset:

```bash
npm run build:index
```

## Checks

Typecheck, build, and validate the Worker config without deploying:

```bash
npm run check
npm run lint
```

## Production

Preview a build locally:

```bash
npm run preview
```

Deploy to staging, then to production. Each script builds for its own environment first, so there
is no way to ship a staging bundle to prod (or vice versa):

```bash
npm run deploy          # -> persona-selfie-killchain-staging (alias of deploy:staging)
npm run deploy:prod     # -> persona-selfie-killchain-prod
```

Tail logs by Worker name:

```bash
npx wrangler tail persona-selfie-killchain-staging
npx wrangler tail persona-selfie-killchain-prod
```
