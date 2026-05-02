import axios from 'axios';

const ENDPOINT = '/ingest';
const FLUSH_INTERVAL_MS = 5000;

const queue: object[] = [];
let timer: number | null = null;

export function sendImmediate(event: object): void {
  fire(event);
}

export function enqueueBatched(event: object): void {
  queue.push(event);
  if (timer === null) {
    timer = window.setInterval(flush, FLUSH_INTERVAL_MS);
  }
}

function flush(): void {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  for (const ev of batch) fire(ev);
}

function fire(event: object): void {
  // _skipMonitoring is read by the performance interceptor to avoid recursion.
  axios.post(ENDPOINT, event, { _skipMonitoring: true } as never).catch(() => {
    /* swallow — monitoring must not throw */
  });
}
