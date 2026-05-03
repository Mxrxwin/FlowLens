import { getDeviceMeta } from '../geo';
import { getSessionId } from '../index';
import { sendImmediate } from '../transport';
import { getRecentActions } from './actions';

export interface ErrorPayload {
  message: string;
  stack?: string;
  endpoint?: string;
}

// Public helper for other collectors (e.g. axios interceptor) to emit
// type=error events using the same shape as window-level errors.
export function reportError(p: ErrorPayload): void {
  if (!p.message) return;
  sendImmediate(buildErrorEvent(p));
}

function buildErrorEvent(p: ErrorPayload) {
  return {
    type: 'error' as const,
    session_id: getSessionId(),
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

export function attachErrorCollector(): void {
  // Resource load failures (img/script) also fire 'error' on window, but as
  // plain Event with target=Element. Only handle real ErrorEvents with a
  // genuine JS Error attached.
  window.addEventListener('error', (e) => {
    if (!(e instanceof ErrorEvent)) return;
    const err = e.error instanceof Error ? e.error : null;
    const message = err?.message || e.message;
    if (!message) return;

    sendImmediate(buildErrorEvent({
      message,
      stack: err?.stack,
      endpoint: window.location.pathname,
    }));
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as unknown;
    let message = '';
    let stack: string | undefined;
    let endpoint: string | undefined;

    if (reason instanceof Error) {
      message = reason.message;
      stack = reason.stack;
    } else if (typeof reason === 'string') {
      message = reason;
    } else if (reason && typeof reason === 'object') {
      const r = reason as Record<string, any>;
      message = typeof r.message === 'string' ? r.message : '';
      stack = typeof r.stack === 'string' ? r.stack : undefined;
      endpoint = typeof r.config?.url === 'string' ? r.config.url : undefined;
    }

    if (!message) return;

    sendImmediate(buildErrorEvent({
      message,
      stack,
      endpoint: endpoint || window.location.pathname,
    }));
  });
}
