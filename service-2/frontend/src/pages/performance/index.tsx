import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { PerformanceChart } from '../../widgets/performance-chart';
import { getPerformance } from '../../shared/api/client';
import type { EndpointAvg } from '../../entities/performance/types';

export default function PerformancePage() {
  const [items, setItems] = useState<EndpointAvg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPerformance()
      .then((d) => { if (!cancelled) setItems(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;
  return <PerformanceChart items={items} />;
}
