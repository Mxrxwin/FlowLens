import type { FlowLensConfig } from './config';
import { resolveConfig } from './config';
import { createTransport } from './transport';
import { createId } from './id';
import { attachActionsCollector } from './collectors/actions';
import { attachErrorCollector, reportError } from './collectors/errors';
import { attachPerformanceCollector } from './collectors/performance';

export type { FlowLensConfig } from './config';
export type { ErrorPayload } from './collectors/errors';

const SESSION_KEY = 'flowlens_session_id';
let initialized = false;

/**
 * Initialize FlowLens SDK.
 *
 * @example
 * ```ts
 * initMonitoring({
 *   dsn: 'https://mon.example.com/ingest?project_key=pk_live',
 * });
 * ```
 *
 * To capture axios API timings, pass your axios instance:
 * ```ts
 * import axios from 'axios';
 * initMonitoring({ dsn: '...', axios });
 * ```
 */
export function initMonitoring(config: FlowLensConfig & { axios?: any }): void {
  if (initialized) return;
  initialized = true;

  const resolved = resolveConfig(config);
  const transport = createTransport(resolved);

  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) { sessionId = createId(); localStorage.setItem(SESSION_KEY, sessionId); }
  (globalThis as any).__flowlens_session__ = sessionId;

  // Order matters: actions buffer must exist before errors fire.
  attachActionsCollector();
  attachPerformanceCollector(transport, config.axios);
  attachErrorCollector(transport);
}

/** Manually report an error. Useful for try/catch blocks. */
export { reportError };
