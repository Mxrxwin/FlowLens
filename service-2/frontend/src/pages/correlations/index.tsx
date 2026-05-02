import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { CorrelationsList } from '../../widgets/correlations-list';
import { SortCorrelations } from '../../features/sort-correlations';
import { getCorrelations } from '../../shared/api/client';
import type { CorrelationRow, CorrelationSort } from '../../entities/correlation/types';

export default function CorrelationsPage() {
  const [items, setItems] = useState<CorrelationRow[]>([]);
  const [sort, setSort] = useState<CorrelationSort>('count');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCorrelations(sort)
      .then((d) => { if (!cancelled) setItems(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sort]);

  return (
    <div className="space-y-4">
      <SortCorrelations value={sort} onChange={setSort} />
      {loading ? <Spinner /> : error ? <div className="text-danger">{error}</div> : <CorrelationsList items={items} />}
    </div>
  );
}
