import { attachActionsCollector } from './collectors/actions';
import { attachErrorCollector } from './collectors/errors';
import { attachPerformanceCollector } from './collectors/performance';

const SESSION_KEY = 'monitoring_session_id';

let sessionId = '';
let initialized = false;

export function getSessionId(): string {
  return sessionId;
}

function getOrCreateSession(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;

  sessionId = getOrCreateSession();

  // order: actions buffer must exist before errors fire
  attachActionsCollector();
  attachPerformanceCollector();
  attachErrorCollector();
}
