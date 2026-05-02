import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getDeviceMeta } from '../geo';
import { getSessionId } from '../index';
import { enqueueBatched } from '../transport';

interface MonitoredConfig extends InternalAxiosRequestConfig {
  _skipMonitoring?: boolean;
  _startTime?: number;
}

function buildPerfEvent(endpoint: string, durationMs: number, isError: boolean) {
  return {
    type: 'performance' as const,
    session_id: getSessionId(),
    timestamp: Date.now(),
    ...getDeviceMeta(),
    performance: {
      endpoint,
      api_response_time: durationMs,
      ...(isError ? { is_error: true } : {}),
    },
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
}

function report(cfg: MonitoredConfig, isError: boolean): void {
  if (cfg._skipMonitoring) return;        // skip our own /ingest calls
  if (cfg._startTime == null) return;
  const duration = Math.round(performance.now() - cfg._startTime);
  enqueueBatched(buildPerfEvent(cfg.url || '', duration, isError));
}
