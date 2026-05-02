import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getDeviceMeta } from '../geo';
import { getSessionId } from '../index';
import { enqueueBatched } from '../transport';

interface MonitoredConfig extends InternalAxiosRequestConfig {
  _skipMonitoring?: boolean;
  _startTime?: number;
}

function buildPerfEvent(perf: Record<string, number | string | boolean>) {
  return {
    type: 'performance' as const,
    session_id: getSessionId(),
    timestamp: Date.now(),
    ...getDeviceMeta(),
    performance: perf,
  };
}

export function attachPerformanceCollector(): void {
  axios.interceptors.request.use((config) => {
    (config as MonitoredConfig)._startTime = performance.now();
    return config;
  });

  axios.interceptors.response.use(
    (res) => {
      report(res.config as MonitoredConfig, false);
      return res;
    },
    (err) => {
      if (err.config) report(err.config as MonitoredConfig, true);
      return Promise.reject(err);
    },
  );

  attachWebVitals();
}

function report(cfg: MonitoredConfig, isError: boolean): void {
  if (cfg._skipMonitoring) return;
  if (cfg._startTime == null) return;
  const duration = Math.round(performance.now() - cfg._startTime);
  enqueueBatched(buildPerfEvent({
    endpoint: cfg.url || '',
    api_response_time: duration,
    ...(isError ? { is_error: true } : {}),
  }));
}

// --- Web Vitals -----------------------------------------------------------

function attachWebVitals(): void {
  const route = () => window.location.pathname;

  // TTFB — readily available from the Navigation Timing entry.
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav && nav.responseStart > 0) {
      enqueueBatched(buildPerfEvent({
        endpoint: route(),
        ttfb: Math.round(nav.responseStart),
      }));
    }
  } catch { /* unsupported browser */ }

  // LCP — track latest entry, flush on hidden/pagehide and once after 5s
  // so the metric also surfaces during dev when the tab never closes.
  try {
    let latest = 0;
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last && last.startTime > latest) latest = last.startTime;
    });
    obs.observe({ type: 'largest-contentful-paint', buffered: true });

    const flush = () => {
      if (latest <= 0) return;
      enqueueBatched(buildPerfEvent({ endpoint: route(), lcp: Math.round(latest) }));
      latest = 0;
    };
    window.setTimeout(flush, 5000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
  } catch { /* unsupported */ }

  // FID — single first-input event, then disconnect.
  try {
    const obs = new PerformanceObserver((list) => {
      const e = list.getEntries()[0] as PerformanceEventTiming | undefined;
      if (!e) return;
      const fid = Math.max(0, Math.round(e.processingStart - e.startTime));
      enqueueBatched(buildPerfEvent({ endpoint: route(), fid }));
      obs.disconnect();
    });
    obs.observe({ type: 'first-input', buffered: true });
  } catch { /* unsupported */ }
}
