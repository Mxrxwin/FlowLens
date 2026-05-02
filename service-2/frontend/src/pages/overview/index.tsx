import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { OverviewCards } from '../../widgets/overview-cards';
import { getOverview } from '../../shared/api/client';
import type { Overview } from '../../entities/event/types';

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOverview()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;
  if (!data) return null;

  return <OverviewCards data={data} />;
}
