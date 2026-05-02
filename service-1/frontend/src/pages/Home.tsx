export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Target App</h1>
      <p className="text-gray-600">
        Demo SPA used by the monitoring platform. Pages below exercise different
        backend behaviours.
      </p>
      <ul className="list-disc pl-6 space-y-1 text-sm">
        <li><b>/catalog</b> — stable endpoint, returns a static product list.</li>
        <li><b>/checkout</b> — chaos endpoint: 30% errors, 20% slow responses.</li>
        <li><b>/simulate</b> — bulk event generator (placeholder for now).</li>
      </ul>
    </div>
  );
}
