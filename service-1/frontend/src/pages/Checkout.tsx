import { useState } from 'react';
import axios from 'axios';

type Result =
  | { kind: 'ok'; orderId: string }
  | { kind: 'error'; message: string };

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function pay() {
    setLoading(true);
    setResult(null);
    try {
      const r = await axios.post<{ status: string; order_id: string }>('/api/checkout');
      setResult({ kind: 'ok', orderId: r.data.order_id });
    } catch (e: any) {
      setResult({ kind: 'error', message: e?.response?.data?.error || String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="text-gray-600 text-sm">
        Chaos endpoint: 30% returns 500, 20% sleeps 3s, otherwise 200.
      </p>
      <button
        id="pay-now"
        onClick={pay}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Processing…' : 'Оплатить'}
      </button>
      {result?.kind === 'ok' && (
        <div className="text-green-700">Order placed: <code>{result.orderId}</code></div>
      )}
      {result?.kind === 'error' && (
        <div className="text-red-600">Error: {result.message}</div>
      )}
    </div>
  );
}
