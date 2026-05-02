import { useState, type ReactNode } from 'react';
import axios from 'axios';

const ENDPOINTS = ['/api/checkout', '/api/catalog'] as const;
const REGIONS = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург'] as const;
const EVENT_TYPES = ['error', 'slow request'] as const;

const USER_AGENTS = {
  'Mobile Safari':   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Android Chrome':  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Desktop Chrome':  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Firefox':         'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
} as const;

type Endpoint = typeof ENDPOINTS[number];
type Region = typeof REGIONS[number];
type EventType = typeof EVENT_TYPES[number];
type UALabel = keyof typeof USER_AGENTS;

// Fresh axios instance: bypasses SDK interceptors so simulated traffic isn't
// double-logged with real perf events.
const ingest = axios.create();

const inputCls = 'mt-1 block w-full border rounded px-2 py-1 bg-white';

export default function Simulate() {
  const [endpoint, setEndpoint] = useState<Endpoint>('/api/checkout');
  const [region, setRegion] = useState<Region>('Москва');
  const [uaLabel, setUaLabel] = useState<UALabel>('Mobile Safari');
  const [eventType, setEventType] = useState<EventType>('error');
  const [count, setCount] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  function buildEvent() {
    const base = {
      session_id: crypto.randomUUID(),
      timestamp: Date.now(),
      user_agent: USER_AGENTS[uaLabel],
      region,
    };
    if (eventType === 'error') {
      return {
        type: 'error',
        ...base,
        error: { message: 'Simulated error', endpoint },
        preceding_actions: [],
      };
    }
    return {
      type: 'performance',
      ...base,
      performance: {
        endpoint,
        api_response_time: 3000,
        is_error: false,
      },
    };
  }

  async function generate() {
    const n = Math.max(1, Math.floor(count));
    setLoading(true);
    setStatus(null);
    try {
      await Promise.all(
        Array.from({ length: n }, () => ingest.post('/ingest', buildEvent())),
      );
      setStatus({ kind: 'ok', message: `Sent ${n} ${eventType} events` });
    } catch (e: any) {
      setStatus({ kind: 'error', message: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-bold">Simulator</h1>
      <p className="text-gray-600 text-sm">
        Send synthetic events directly to <code>/ingest</code>.
      </p>

      <Field label="Endpoint">
        <select className={inputCls} value={endpoint} onChange={(e) => setEndpoint(e.target.value as Endpoint)}>
          {ENDPOINTS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="Region">
        <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value as Region)}>
          {REGIONS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="User-Agent">
        <select className={inputCls} value={uaLabel} onChange={(e) => setUaLabel(e.target.value as UALabel)}>
          {(Object.keys(USER_AGENTS) as UALabel[]).map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="Event type">
        <select className={inputCls} value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}>
          {EVENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Field>

      <Field label="Count">
        <input
          type="number"
          min={1}
          className={inputCls}
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value || '1', 10))}
        />
      </Field>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Sending…' : 'Generate events'}
      </button>

      {status?.kind === 'ok'    && <div className="text-green-700">{status.message}</div>}
      {status?.kind === 'error' && <div className="text-red-600">Error: {status.message}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      {children}
    </label>
  );
}
