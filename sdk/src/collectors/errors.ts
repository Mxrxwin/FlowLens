import type { Transport } from '../transport';
import { getDeviceMeta } from '../geo';
import { getRecentActions } from './actions';

export interface ErrorPayload {
  message: string;
  stack?: string;
  endpoint?: string;
}

let _transport: Transport;

export function initErrorCollector(transport: Transport): void {
  _transport = transport;
}

export function reportError(p: ErrorPayload): void {
  if (!p.message || !_transport) return;
  _transport.sendImmediate(buildErrorEvent(p));
}

function buildErrorEvent(p: ErrorPayload) {
  return {
    type: 'error' as const,
    session_id: (globalThis as any).__flowlens_session__ ?? '',
    timestamp: Date.now(),
    ...getDeviceMeta(),
    error: {
      message: p.message,
      ...(p.stack ? { stack: p.stack } : {}),
      ...(p.endpoint ? { endpoint: p.endpoint } : {}),
    },
    preceding_actions: getRecentActions(),
  };
}

export function attachErrorCollector(transport: Transport): void {
  initErrorCollector(transport);

  window.addEventListener('error', (e) => {
    if (!(e instanceof ErrorEvent)) return;
    const err = e.error instanceof Error ? e.error : null;
    const message = err?.message || e.message;
    if (!message) return;
    reportError({ message, stack: err?.stack, endpoint: window.location.pathname });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as unknown;
    let message = '', stack: string | undefined, endpoint: string | undefined;
    if (reason instanceof Error) {
      message = reason.message; stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      const r = reason as Record<string, any>;
      message = typeof r.message === 'string' ? r.message : '';
      stack = typeof r.stack === 'string' ? r.stack : undefined;
      endpoint = typeof r.config?.url === 'string' ? r.config.url : undefined;
    }
    if (!message) return;
    reportError({ message, stack, endpoint: endpoint || window.location.pathname });
  });
}
