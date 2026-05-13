interface FlowLensConfig {
    /** Full ingest DSN, e.g. "https://mon.example.com/ingest?project_key=pk_live" */
    dsn: string;
}

interface ErrorPayload {
    message: string;
    stack?: string;
    endpoint?: string;
}
declare function reportError(p: ErrorPayload): void;

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
declare function initMonitoring(config: FlowLensConfig & {
    axios?: any;
}): void;

export { type ErrorPayload, type FlowLensConfig, initMonitoring, reportError };
