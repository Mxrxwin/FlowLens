# @mxrxwin/flowlens-sdk

Browser SDK for [FlowLens](https://github.com/Mxrxwin/FlowLens) — a self-hosted
web monitoring and analytics platform.

Captures errors, Web Vitals, API latency, and navigation events and sends them
to your own FlowLens instance. No data leaves your infrastructure.

## Installation

```sh
npm install @mxrxwin/flowlens-sdk
```

## Quick start

```ts
import { initMonitoring } from '@mxrxwin/flowlens-sdk';

initMonitoring({
  dsn: 'https://your-flowlens-host/ingest?project_key=pk_live',
});
```

That's it. The SDK automatically captures:

- uncaught exceptions and unhandled promise rejections;
- the last two user interactions (click, SPA navigation) attached to each error;
- Web Vitals — LCP, FID, TTFB — via `PerformanceObserver`;
- a browser timezone-derived region hint.

## With axios

Pass your axios instance to also capture per-request API latency and HTTP errors:

```ts
import axios from 'axios';
import { initMonitoring } from '@mxrxwin/flowlens-sdk';

initMonitoring({
  dsn: 'https://your-flowlens-host/ingest?project_key=pk_live',
  axios,
});
```

## Manual error reporting

Use `reportError` inside `try/catch` blocks:

```ts
import { reportError } from '@mxrxwin/flowlens-sdk';

try {
  await checkout();
} catch (e) {
  reportError({
    message: e.message,
    stack:   e.stack,
    endpoint: '/checkout',
  });
}
```

## API

### `initMonitoring(config)`

Initialises the SDK. Must be called once at application startup before any
other code runs. Safe to call in SSR environments — collectors are only
attached when `window` is available.

| Option | Type | Required | Description |
|---|---|---|---|
| `dsn` | `string` | yes | Full ingest URL including `project_key`, e.g. `https://mon.example.com/ingest?project_key=pk_live`. |
| `axios` | `AxiosInstance` | no | Your application's axios instance. When provided, the SDK attaches request/response interceptors to track API latency and network errors. |

### `reportError(payload)`

Manually send an error event. Useful for caught exceptions that would not
otherwise reach `window.error`.

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | yes | Error message text. |
| `stack` | `string` | no | Stack trace string. |
| `endpoint` | `string` | no | Associated route or API URL. |

## How the DSN works

The DSN is a standard URL with a `project_key` query parameter:

```
https://mon.example.com/ingest?project_key=pk_live
```

At init time the SDK parses the DSN, extracts `project_key`, and sends it as
the `X-FlowLens-Project-Key` header on every request. The project key is a
**public identifier** — it is safe to include in your frontend bundle.

## What gets collected

| Signal | How |
|---|---|
| JS errors | `window.addEventListener('error')` + `unhandledrejection` |
| Preceding actions | Rolling buffer of last 2 clicks / navigations |
| Web Vitals (LCP, FID, TTFB) | `PerformanceObserver` + Navigation Timing API |
| API latency | axios request/response interceptor (optional) |
| Network errors | axios error interceptor (optional) |
| Region | `Intl.DateTimeFormat().resolvedOptions().timeZone` |
| Session ID | `crypto.randomUUID()` stored in `localStorage` |

## Requirements

- **FlowLens** instance running and accessible from the browser.
  See [FlowLens on GitHub](https://github.com/Mxrxwin/FlowLens) for setup instructions.
- Browser with Fetch API support (all modern browsers).
- axios is an optional peer dependency — only needed for API latency tracking.

## Notes

- **Monitoring must not throw.** All fetch errors are swallowed silently so
  the SDK never breaks the host application.
- The axios interceptor skips its own `/ingest` requests to prevent recursion.
- `session_id` persists across page reloads via `localStorage`.
- Server-side rendering: `initMonitoring` is a no-op when `window` is
  undefined, so it is safe to call unconditionally in universal apps.

## License

MIT
