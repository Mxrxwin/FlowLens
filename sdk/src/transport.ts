import type { ResolvedConfig } from './config';

const FLUSH_INTERVAL_MS = 5000;

export interface Transport {
  sendImmediate(event: object): void;
  enqueueBatched(event: object): void;
  endpoint: string;
  projectKey: string;
}

export function createTransport(cfg: ResolvedConfig): Transport {
  const headers: Record<string, string> = cfg.projectKey
    ? { 'X-FlowLens-Project-Key': cfg.projectKey }
    : {};

  const queue: object[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function fire(event: object): void {
    fetch(cfg.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => { /* monitoring must not throw */ });
  }

  function flush(): void {
    timer = null;
    if (queue.length === 0) return;
    queue.splice(0).forEach(fire);
  }

  return {
    endpoint: cfg.endpoint,
    projectKey: cfg.projectKey,
    sendImmediate: fire,
    enqueueBatched(event) {
      queue.push(event);
      if (timer === null) timer = setTimeout(flush, FLUSH_INTERVAL_MS);
    },
  };
}
