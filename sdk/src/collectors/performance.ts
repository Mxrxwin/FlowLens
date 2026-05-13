import type { Transport } from '../transport';
import { getDeviceMeta } from '../geo';
import { reportError } from './errors';

function buildPerfEvent(transport: Transport, perf: Record<string, number | string | boolean>) {
  return {
    type: 'performance' as const,
    session_id: (globalThis as any).__flowlens_session__ ?? '',
    timestamp: Date.now(),
    ...getDeviceMeta(),
    performance: perf,
  };
}

export function attachPerformanceCollector(transport: Transport, axiosInstance?: any): void {
  if (axiosInstance) {
    attachAxiosInterceptor(transport, axiosInstance);
  }
  attachWebVitals(transport);
}

function attachAxiosInterceptor(transport: Transport, axios: any): void {
  axios.interceptors.request.use((config: any) => {
    config._flStart = performance.now();
    return config;
  });

  axios.interceptors.response.use(
    (res: any) => { reportPerf(transport, res.config, false); return res; },
    (err: any) => {
      const cfg = err?.config;
      if (cfg) {
        reportPerf(transport, cfg, true);
        reportNetworkError(transport, err, cfg);
      }
      return Promise.reject(err);
    },
  );
}

function reportPerf(transport: Transport, cfg: any, isError: boolean): void {
  if (cfg?._flSkip || cfg?._skipMonitoring) return;
  if (cfg?._flStart == null) return;
  const duration = Math.round(performance.now() - cfg._flStart);
  transport.enqueueBatched(buildPerfEvent(transport, {
    endpoint: cfg.url || '',
    api_response_time: duration,
    ...(isError ? { is_error: true } : {}),
  }));
}

function reportNetworkError(transport: Transport, err: any, cfg: any): void {
  if (cfg?._flSkip || cfg?._skipMonitoring) return;
  const url: string = cfg?.url || '';
  if (url.includes('/ingest')) return;
  const message =
    (typeof err?.response?.data?.error === 'string' ? err.response.data.error : undefined) ||
    (typeof err?.message === 'string' ? err.message : '') ||
    'Request failed';
  reportError({ message, stack: err?.stack, endpoint: url || undefined });
}

function attachWebVitals(transport: Transport): void {
  const route = () => window.location.pathname;

  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.responseStart > 0) {
      transport.enqueueBatched(buildPerfEvent(transport, { endpoint: route(), ttfb: Math.round(nav.responseStart) }));
    }
  } catch { /* unsupported */ }

  try {
    let latest = 0;
    const obs = new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      if (last && last.startTime > latest) latest = last.startTime;
    });
    obs.observe({ type: 'largest-contentful-paint', buffered: true });
    const flush = () => {
      if (latest <= 0) return;
      transport.enqueueBatched(buildPerfEvent(transport, { endpoint: route(), lcp: Math.round(latest) }));
      latest = 0;
    };
    setTimeout(flush, 5000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('pagehide', flush);
  } catch { /* unsupported */ }

  try {
    const obs = new PerformanceObserver((list) => {
      const e = list.getEntries()[0] as PerformanceEventTiming | undefined;
      if (!e) return;
      transport.enqueueBatched(buildPerfEvent(transport, {
        endpoint: route(),
        fid: Math.max(0, Math.round(e.processingStart - e.startTime)),
      }));
      obs.disconnect();
    });
    obs.observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }
}
