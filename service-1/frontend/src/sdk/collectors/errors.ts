import { getDeviceMeta } from '../geo';
import { getSessionId } from '../index';
import { sendImmediate } from '../transport';
import { getRecentActions } from './actions';

interface ErrorPayload {
  message: string;
  stack?: string;
  endpoint?: string;
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
  window.addEventListener('error', (e) => {
    sendImmediate(buildErrorEvent({
      message: e.message || 'Uncaught error',
      stack: e.error?.stack,
      endpoint: window.location.pathname,
    }));
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason;
    sendImmediate(buildErrorEvent({
      message: reason?.message ? String(reason.message) : String(reason),
      stack: reason?.stack,
      endpoint: reason?.config?.url || window.location.pathname,
    }));
  });
}
