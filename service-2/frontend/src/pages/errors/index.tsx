import { useState } from 'react';
import { Spinner } from '@heroui/react';
import { ErrorsTable } from '../../widgets/errors-table';
import { ErrorDetailModal } from '../../widgets/error-detail-modal';
import { FilterErrors, emptyFilter, type ErrorsFilter } from '../../features/filter-errors';
import { getErrors, type ErrorsQuery } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { ErrorRow } from '../../entities/error/types';

function toQuery(f: ErrorsFilter): ErrorsQuery {
  return {
    region:   f.region   || undefined,
    endpoint: f.endpoint || undefined,
    from:     f.from ? new Date(f.from).toISOString() : undefined,
    to:       f.to   ? new Date(f.to).toISOString()   : undefined,
  };
}

export default function ErrorsPage() {
  const [filter, setFilter] = useState<ErrorsFilter>(emptyFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, loading, error } = usePolling<ErrorRow[]>(
    () => getErrors(toQuery(filter)),
    5000,
    [filter.region, filter.endpoint, filter.from, filter.to],
  );

  return (
    <div className="space-y-4">
      <FilterErrors value={filter} onChange={setFilter} />
      {loading ? <Spinner />
        : error ? <div className="text-danger">{error}</div>
        : <ErrorsTable items={data ?? []} onRowClick={setSelectedId} />}
      <ErrorDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
