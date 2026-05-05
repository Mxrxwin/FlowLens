# GeoIP enrichment

FlowLens resolves the `region` field of every ingested event server-side. The
hot path (`/ingest`) **never** makes a network call: enrichment is a pure
in-process lookup against an mmap'd MaxMind file, and is fully optional.

## Resolution order

For each event the backend picks the first non-empty source:

1. `event.region` from the SDK / simulator (browser timezone hint, etc.).
2. CDN / proxy geo headers (`CF-IPCity`, `CF-IPCountry`, `X-Vercel-IP-City`,
   `X-Appengine-City`, `CloudFront-Viewer-City`, …) seen on the request.
3. Local MaxMind GeoLite2-City DB lookup against the client IP.
4. Constant fallback `"Unresolved region"`.

The client IP itself is taken (in order) from `CF-Connecting-IP`, `X-Real-IP`,
the leftmost public address in `X-Forwarded-For`, then `RemoteAddr`. Private,
loopback and link-local addresses are skipped when walking `X-Forwarded-For`.

## What target apps configure

**Nothing beyond the DSN / project key.** Target apps keep sending events to
`/ingest` with `X-FlowLens-Project-Key`. Region resolution is entirely a
server-side concern of the FlowLens platform.

## Enabling MaxMind locally

GeoIP is **off by default**. To turn it on:

1. Sign up for a free GeoLite2 account at
   https://www.maxmind.com/en/geolite2/signup and copy your account ID +
   license key.
2. Drop them into `.env`:

   ```env
   FLOWLENS_GEOIP_ENABLED=true
   FLOWLENS_GEOIP_DB_PATH=/geoip/GeoLite2-City.mmdb
   FLOWLENS_STORE_IP=false

   MAXMIND_ACCOUNT_ID=...
   MAXMIND_LICENSE_KEY=...
   ```

3. Run the bundled updater once to populate the `geoip` named volume, then
   bring up the platform:

   ```sh
   docker compose --profile geoip run --rm geoip-updater
   docker compose up -d
   ```

   To keep the DB fresh, run the updater as a long-lived service — it sleeps
   for `GEOIPUPDATE_FREQUENCY` hours (default 168 / weekly) between refreshes:

   ```sh
   docker compose --profile geoip up -d geoip-updater
   ```

## Behaviour without a DB

If `FLOWLENS_GEOIP_ENABLED=false`, the file is missing, or the file is
corrupt, the backend logs a warning at startup and continues. Region
resolution then falls back to step 1 → 2 → 4 above. **`/ingest` keeps
working** — GeoIP is best-effort enrichment, not a hard dependency.

## IP retention

By default `client_ip` is **never written to the DB**. The column exists
(nullable) so opt-in is a one-line env change:

```env
FLOWLENS_STORE_IP=true
```

When this flag is off, the ingest handler strips any inbound `client_ip`
field before publishing, so the IP also does not transit Redis or land in
the JSON payload.

## Operational notes

- The MaxMind reader is opened once at startup and used via `mmap`, so
  lookups are O(log n) with zero allocation per request.
- The `geoip` volume is mounted **read-only** inside the backend; only the
  updater container has write access.
- The updater is gated behind the `geoip` Docker Compose profile, so missing
  MaxMind credentials never block `docker compose up`.
