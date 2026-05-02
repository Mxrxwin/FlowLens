import { useState } from 'react';
import { Spinner } from '@heroui/react';
import { CorrelationsList } from '../../widgets/correlations-list';
import { SortCorrelations } from '../../features/sort-correlations';
import { getCorrelations } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { CorrelationRow, CorrelationSort } from '../../entities/correlation/types';

export default function CorrelationsPage() {
  const [sort, setSort] = useState<CorrelationSort>('count');
  const { data, loading, error } = usePolling<CorrelationRow[]>(
    () => getCorrelations(sort),
    5000,
    [sort],
  );

  return (
    <div className="space-y-4">
      <SortCorrelations value={sort} onChange={setSort} />
      {loading ? <Spinner />
        : error ? <div className="text-danger">{error}</div>
        : <CorrelationsList items={data ?? []} />}
    </div>
  );
}
