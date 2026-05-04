import { useState } from 'react';
import { Spinner } from '@heroui/react';
import { ErrorsTable } from '../../widgets/errors-table';
import { ErrorDetailModal } from '../../widgets/error-detail-modal';
import { FilterErrors, emptyFilter, type ErrorsFilter } from '../../features/filter-errors';
import { getErrors, type ErrorsQuery } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { ErrorRow } from '../../entities/error/types';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Manual range wins if set; otherwise sliding preset window (to = now,
// from = now - rangeMinutes). Recomputed on every fetch tick.
function toQuery(f: ErrorsFilter): ErrorsQuery {
  let from: Date;
  let to: Date;

  if (f.manual) {
    from = f.manual.start.toDate(TZ);
    to = f.manual.end.toDate(TZ);
  } else {
    to = new Date();
    from = new Date(to.getTime() - f.rangeMinutes * 60_000);
  }

  return {
    region:   f.region   || undefined,
    endpoint: f.endpoint || undefined,
    from:     from.toISOString(),
    to:       to.toISOString(),
  };
}

export default function ErrorsPage() {
  const [filter, setFilter] = useState<ErrorsFilter>(emptyFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, loading, error } = usePolling<ErrorRow[]>(
    () => getErrors(toQuery(filter)),
    5000,
    [filter.region, filter.endpoint, filter.rangeMinutes, filter.manual],
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
