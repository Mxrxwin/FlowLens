# FlowLens

FlowLens is a self-hosted monitoring and analytics platform for web
applications. It ingests structured client-side telemetry — runtime errors,
Web Vitals, API timings, and navigation events — through a single HTTP
endpoint, persists the events in PostgreSQL, and exposes a React dashboard
for inspection and correlation analysis.

The platform is designed to be operated end-to-end by a single team on its
own infrastructure: there are no external SaaS dependencies on the ingest
path, no third-party telemetry forwarders, and no per-event network calls
beyond the local Redis stream and PostgreSQL writes.

---

## 1. Project overview

FlowLens addresses three recurring problems in front-end observability:

1. **Error visibility.** Uncaught exceptions and unhandled rejections are
   captured by the SDK and rendered with their preceding interaction trail
   so that an engineer can reconstruct the failure context without a session
   replay tool.
2. **Performance regression detection.** Largest Contentful Paint, First
   Input Delay, Time to First Byte, and per-endpoint API latency are
   collected, retained, and aggregated by route and region.
3. **Cross-signal correlation.** Errors and slow responses are grouped by
   `(error_message, endpoint, region, device_type, browser)` so that
   recurring incidents become visible without manual SQL.

What FlowLens collects:

| Signal | Source | Storage |
|---|---|---|
| Errors (`type=error`) | `window.error`, `unhandledrejection`, axios interceptor | `events`, `errors` |
| Performance (`type=performance`) | Web Vitals + axios timings | `events`, `performance_metrics` |
| Navigation (`type=navigation`) | SPA route changes | `events.payload` |
| Correlations | Aggregation over errors | `correlations` |

The platform is intended to be self-hosted. The reference deployment is a
single Docker host running the bundled Compose stack; horizontal scale-out
is out of scope for this repository.

---

## 2. Architecture

```mermaid
flowchart LR
    SDK["Target app SDK<br/>(browser)"] -- "POST /ingest<br/>X-FlowLens-Project-Key" --> BE["FlowLens backend<br/>(Go / Gin)"]
    BE -- "XADD" --> RS["Redis Streams<br/>monitoring-events"]
    RS -- "XREAD BLOCK 0" --> PR["Processor<br/>(in-process)"]
    PR -- "INSERT" --> PG[("PostgreSQL")]
    FE["FlowLens dashboard<br/>(React + nginx)"] -- "GET /api/*" --> BE
    BE -- "SELECT" --> PG
    GU["geoip-updater<br/>(optional)"] -. "writes mmdb" .-> VOL[("geoip volume")]
    VOL -. "read-only mmap" .-> BE
```

**Ingest path.** The browser SDK opens a single `POST /ingest` request per
event (errors are sent immediately, performance/navigation are batched).
The backend validates the project key, performs server-side region
enrichment, and writes the JSON to the `monitoring-events` Redis stream.
A consumer goroutine in the same process reads the stream, parses the
event, parses the User-Agent, and writes to PostgreSQL. The error path
also updates the correlation table in the same transaction-free flow.

**Read path.** The React dashboard at port `5173` queries the backend's
`/api/*` endpoints over the same nginx-fronted virtual host. There are no
direct database queries from the browser.

**Components.**

| Component | Image / runtime | Purpose |
|---|---|---|
| `backend` | Go 1.23, Gin, pgx, go-redis | `/ingest` + `/api/*` |
| `frontend` | Vite + React + nginx | Dashboard SPA, reverse-proxies `/api` and `/ingest` |
| `postgres` | `postgres:16-alpine` | Event/error/perf/correlation storage |
| `redis` | `redis:7-alpine` | Single stream `monitoring-events` |
| `geoip-updater` (optional) | `maxmindinc/geoipupdate:v7.0` | Refreshes GeoLite2-City weekly |

Source layout:

```
backend/
  cmd/main.go
  internal/handler/    # ingest + REST API
  internal/processor/  # stream consumer → repository writer
  internal/repository/ # SQL
  internal/correlation/
  internal/geo/        # client IP, headers, MaxMind
frontend/              # React dashboard (Vite build)
db/init/01_schema.sql  # bootstrap schema
docs/                  # event_contract.md, geoip.md
proxy/                 # placeholder
```

---

## 3. Features

- **Error tracking** with stack trace, endpoint, and a two-step trail of
  preceding click/navigation actions captured by the SDK.
- **Performance monitoring** for LCP, FID, TTFB, and per-axios-call API
  response time, tagged with route and `is_error`.
- **Web Vitals & API latency** stored per-event and queryable by time range.
- **Correlation detection** that upserts groups of
  `(error_message, endpoint, region, device_type, browser)` as they recur.
- **Project key / DSN-based ingest** with multi-project isolation through
  the `FLOWLENS_PROJECT_KEYS` allow-list.
- **Optional server-side GeoIP enrichment** via local MaxMind GeoLite2-City
  with no network calls on the hot path.
- **Docker-based self-hosting** through `docker-compose.yml`.

---

## 4. Requirements

- Docker Engine 20.10+ and either the modern Compose plugin
  (`docker compose`) or the legacy standalone `docker-compose`.
- ~1 GB free disk for the database volume on a small-traffic instance.
- Optional, only for GeoIP: a free MaxMind GeoLite2 account with an
  account ID and license key. See
  https://www.maxmind.com/en/geolite2/signup.

Default ports:

| Port | Service | Exposure |
|---|---|---|
| `5173` | FlowLens dashboard (also routes `/ingest` and `/api/*`) | Host |
| `8081` | Backend HTTP | Container-internal (`expose:`) |
| `5432` | PostgreSQL | Container-internal |
| `6379` | Redis | Container-internal |

The backend is reached from the browser through the frontend's nginx
reverse proxy; it is never published directly to the host by default.

---

## 5. Quick start

Clone the repository and prepare the environment file:

```sh
git clone <repo-url> FlowLens
cd FlowLens
cp .env.example .env
```

Edit `.env` and at minimum:

- set `POSTGRES_PASSWORD` to a non-default value;
- review `FLOWLENS_PROJECT_KEYS` (comma-separated allow-list of public keys
  the ingest endpoint will accept).

Bring the stack up:

```sh
# Docker Compose v2 (recommended)
docker compose up -d --build

# Docker Compose v1 (legacy)
docker-compose up -d --build
```

Open the dashboard at <http://localhost:5173>. The ingest endpoint is
`http://localhost:5173/ingest` and is consumed by browser SDKs (see
`docs/event_contract.md` for the wire contract).

To stop the stack:

```sh
docker compose down
```

To wipe persistent data (PostgreSQL volume) as well:

```sh
docker compose down -v
```

---

## 6. Environment variables

All variables are read from `.env` at the repository root. The Compose file
passes them through to the relevant containers; the backend also calls
`godotenv.Load("../.env")` for local `go run`.

| Variable | Required | Default | Sensitive | Description |
|---|---|---|---|---|
| `REDIS_ADDR` | yes | `redis:6379` | no | `host:port` of the Redis instance backing `monitoring-events`. |
| `POSTGRES_USER` | yes | `user` | no | PostgreSQL role used by the backend. |
| `POSTGRES_PASSWORD` | yes | `password` | **yes** | Must be changed before any non-trivial deployment. |
| `POSTGRES_DB` | yes | `monitoring` | no | Database name created on first `postgres` boot. |
| `DATABASE_URL` | yes | `postgres://user:password@postgres:5432/monitoring?sslmode=disable` | **yes** | Full connection URL used by the Go backend. Must match the three vars above. |
| `FLOWLENS_BACKEND_PORT` | no | `8081` | no | Listening port inside the backend container. |
| `FLOWLENS_HTTP_PORT` | no | `5173` | no | Host port for the dashboard / nginx reverse proxy. |
| `FLOWLENS_PROJECT_KEYS` | yes | `pk_demo` | no | Comma-separated allow-list of public project keys accepted by `/ingest`. |
| `VITE_API_URL` | no | _(empty — same-origin)_ | no | Build-time override for the dashboard's API base URL. Leave empty to use the nginx reverse proxy. |
| `FLOWLENS_GEOIP_ENABLED` | no | `false` | no | Master switch for the MaxMind enrichment layer. |
| `FLOWLENS_GEOIP_DB_PATH` | no | `/geoip/GeoLite2-City.mmdb` | no | Path to the `.mmdb` file inside the backend container. |
| `FLOWLENS_STORE_IP` | no | `false` | no | Persist the client IP into `events.client_ip`. Off by default. |
| `MAXMIND_ACCOUNT_ID` | no | _(empty)_ | **yes** | Used only by the optional `geoip-updater` service. |
| `MAXMIND_LICENSE_KEY` | no | _(empty)_ | **yes** | Used only by the optional `geoip-updater` service. |

Variables marked **sensitive** must not be committed to version control.
Keep production secrets in the environment file on the host where FlowLens
runs, or in your deployment platform's secret manager.

---

## 7. DSN and project keys

A FlowLens project key is a **public identifier** that routes inbound
events to a project. It is functionally analogous to the public DSN of
other observability tools — it is not a secret and is not used for
authentication. The browser-side SDK ships the key in either the request
header `X-FlowLens-Project-Key` or the URL query string.

Example DSN consumed by the demo app:

```
http://localhost:5173/ingest?project_key=pk_demo
```

The backend rejects keys that are not in the `FLOWLENS_PROJECT_KEYS`
allow-list with `401 invalid project key`. Production deployments should:

- use long, opaque, randomly generated keys (e.g. `pk_<32-hex>`);
- rotate keys when an SDK build leaks publicly or is abused;
- terminate TLS in front of the dashboard (HTTPS, real domain);
- treat the allow-list as configuration, not as a security boundary on
  its own — abuse is still possible if a key is harvested from a public
  bundle.

---

## 8. GeoIP enrichment

FlowLens enriches the `region` field of every event server-side. The
ingest path makes **no external network calls**. Resolution proceeds
through the following ordered fallback:

1. **SDK-provided hint.** `event.region` from the browser (typically
   derived from `Intl.DateTimeFormat().resolvedOptions().timeZone`).
2. **CDN / proxy geo headers.** `CF-IPCity`, `CF-IPCountry`,
   `X-Vercel-IP-City`, `X-Appengine-City`, `CloudFront-Viewer-City`, etc.
3. **Local MaxMind GeoLite2-City lookup.** Memory-mapped `.mmdb` file,
   keyed by the client IP extracted from `CF-Connecting-IP` →
   `X-Real-IP` → first public IP in `X-Forwarded-For` → `RemoteAddr`.
4. **Constant fallback** `"Unresolved region"`.

GeoLite2-City is approximate. City-level results are not always present
and should not be treated as authoritative geolocation.

### Enabling MaxMind

Add the following to `.env`:

```env
FLOWLENS_GEOIP_ENABLED=true
FLOWLENS_GEOIP_DB_PATH=/geoip/GeoLite2-City.mmdb
FLOWLENS_STORE_IP=false

MAXMIND_ACCOUNT_ID=...
MAXMIND_LICENSE_KEY=...
```

Populate the `geoip` named volume once, then start the platform:

```sh
docker compose --profile geoip run --rm geoip-updater
docker compose up -d
```

To keep the database up to date, run the updater as a long-lived service.
It loops internally on `GEOIPUPDATE_FREQUENCY` hours (default `168` —
weekly):

```sh
docker compose --profile geoip up -d geoip-updater
```

The `geoip` Compose profile keeps the updater out of the default `up`
command, so missing MaxMind credentials never block a baseline
`docker compose up`.

### Honest limitations

- The backend opens the `.mmdb` file once at startup. Updates written by
  `geoip-updater` are picked up only after a backend restart
  (`docker compose restart backend`). A future hot-reload is tracked in
  the source but is not implemented today.
- `client_ip` is **not** persisted by default. Setting
  `FLOWLENS_STORE_IP=true` opts the column in; ingest still strips any
  inbound `client_ip` field that the SDK might send to prevent client
  spoofing.

See [`docs/geoip.md`](docs/geoip.md) for additional operational notes.

---

## 9. Self-hosting

The recommended self-hosted deployment is a single Docker host running
the Compose stack from this repository:

```sh
cp .env.example .env
# edit .env: database password, project keys, public ports, optional GeoIP
docker compose up -d --build
```

Operational commands:

```sh
docker compose ps
docker compose logs -f backend
docker compose down
docker compose down -v   # also removes persistent volumes
```

For a production-facing instance:

- change `POSTGRES_PASSWORD` and make `DATABASE_URL` match it;
- replace `FLOWLENS_PROJECT_KEYS=pk_demo` with long random project keys;
- put FlowLens behind HTTPS and a real domain;
- restrict dashboard access with a firewall, VPN, or external auth proxy;
- decide whether GeoIP should be enabled and whether IP retention is
  allowed for your privacy model.

The repository also contains an optional `Makefile` for teams that want a
simple SSH/rsync deployment helper. It is intentionally generic and has no
committed host/user values. Copy `Makefile.local.example` to
`Makefile.local` and keep that local file out of git if you use it.

---

## 10. Security and privacy

- **Project keys are public identifiers, not authentication.** Treat them
  as routing labels. Anyone with a key can submit events to the matching
  project; this is the same trust model as the Sentry public DSN.
- **HTTPS is required in production.** Run FlowLens behind a TLS-
  terminating reverse proxy or load balancer. The bundled nginx serves
  HTTP only.
- **Rotate keys on abuse.** Add a new key to `FLOWLENS_PROJECT_KEYS`,
  redeploy SDKs, then remove the old key.
- **Do not store IP unless you need to.** `FLOWLENS_STORE_IP` is `false`
  by default. The ingest handler always strips inbound `client_ip` from
  the event JSON before it reaches Redis or the database, regardless of
  the flag.
- **GeoIP is optional.** Disabling MaxMind degrades gracefully to the
  CDN-header / SDK-hint chain.
- **Rotate the PostgreSQL password.** The `.env.example` value
  `password` is for local development only.
- **Network exposure.** Only the dashboard port is published by default.
  Restrict it with a firewall or a reverse proxy with authentication
  before exposing the dashboard publicly.

---

## 11. Troubleshooting

**Dashboard renders blank or shows a stale UI.**
The frontend is a Vite-built SPA cached aggressively by nginx. After a
deploy, force a hard refresh (Cmd/Ctrl+Shift+R) or
`docker compose restart frontend`. If the bundle is genuinely stale,
rebuild with `docker compose build --no-cache frontend`.

**`/ingest` returns `401 invalid project key`.**
The submitted key is not in `FLOWLENS_PROJECT_KEYS`. Verify the SDK is
sending `X-FlowLens-Project-Key` (or `?project_key=`) and that the value
matches the backend allow-list. Restart the backend after editing
`.env`.

**Region always reports `Unresolved region`.**
Either GeoIP is disabled, the `.mmdb` file is missing/corrupt, or the
client IP is private (e.g., the request came over a non-trusted network
without `CF-Connecting-IP` / `X-Real-IP` / `X-Forwarded-For`). Check the
backend logs for `geoip:` lines and confirm `FLOWLENS_GEOIP_ENABLED=true`
and `ls -l /geoip/GeoLite2-City.mmdb` inside the backend container.

**`docker compose up` does not start the GeoIP updater.**
Expected. `geoip-updater` lives behind the `geoip` profile to keep
missing MaxMind credentials non-fatal. Run
`docker compose --profile geoip up -d geoip-updater` explicitly.

**Dashboard is up but no events appear.**
Verify in this order: (1) the SDK build embeds the correct DSN; (2) a
direct `curl` to `/ingest` returns `200`; (3) `docker compose logs -f
backend` shows ingest activity; (4) `docker compose exec redis
redis-cli XLEN monitoring-events` is non-zero; (5) the consumer
goroutine is healthy (no `consumer:` errors in the logs).

**`docker compose` vs `docker-compose`.**
Prefer the v2 plugin (`docker compose`) for new installs. The legacy
standalone binary (`docker-compose`) works for this stack as well, but
commands in this README use the v2 form.

---

## 12. Development

Backend (Go 1.23):

```sh
cd backend
go build ./...
go test ./...
go vet ./...
```

The unit-tested package today is `internal/geo` (client-IP extraction
and resolver fallback). Other packages currently rely on the integration
behaviour exercised by the Compose stack.

Frontend (Vite + React):

```sh
cd frontend
npm install
npm run build      # tsc + vite build
npm run dev        # local dev server on Vite default port
```

Compose:

```sh
docker compose config              # validate the rendered file
docker compose --profile geoip config
docker compose up -d --build
```

The wire contract for events is documented in
[`docs/event_contract.md`](docs/event_contract.md). GeoIP-specific
operational details live in [`docs/geoip.md`](docs/geoip.md).
