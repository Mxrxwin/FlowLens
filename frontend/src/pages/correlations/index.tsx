import { useState } from 'react';
import { Pagination, Select, SelectItem, Spinner } from '@heroui/react';
import { CorrelationsList } from '../../widgets/correlations-list';
import { SortCorrelations } from '../../features/sort-correlations';
import { getCorrelations } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import { useT } from '../../shared/i18n';
import type { CorrelationSort, CorrelationSince } from '../../entities/correlation/types';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const SINCE_OPTIONS: { value: CorrelationSince; labelKey: string }[] = [
  { value: '1h',  labelKey: 'correlations.since.1h'  },
  { value: '24h', labelKey: 'correlations.since.24h' },
  { value: '7d',  labelKey: 'correlations.since.7d'  },
  { value: '',    labelKey: 'correlations.since.all' },
];

export default function CorrelationsPage() {
  const t = useT();
  const [sort, setSort]         = useState<CorrelationSort>('count');
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [since, setSince]       = useState<CorrelationSince>('24h');

  const { data, loading, error } = usePolling(
    () => getCorrelations({ sort, page, pageSize, since }),
    10000,
    [sort, page, pageSize, since],
  );

  const total      = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort     = (v: CorrelationSort)  => { setSort(v);     setPage(1); };
  const handleSince    = (v: CorrelationSince) => { setSince(v);    setPage(1); };
  const handlePageSize = (v: PageSize)         => { setPageSize(v); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <SortCorrelations value={sort} onChange={handleSort} />

        {/* Time range buttons */}
        <div className="flex gap-1">
          {SINCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSince(opt.value)}
              className={[
                'px-3 py-1 rounded-small text-small transition-colors',
                since === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-default-100 text-default-700 hover:bg-default-200',
              ].join(' ')}
            >
              {t(opt.labelKey as any)}
            </button>
          ))}
        </div>

        {/* Per-page selector */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-small text-default-500">{t('correlations.perPage')}</span>
          <Select
            size="sm"
            className="w-20"
            selectedKeys={[String(pageSize)]}
            onSelectionChange={(keys) => {
              const v = Number([...keys][0]) as PageSize;
              if (PAGE_SIZE_OPTIONS.includes(v)) handlePageSize(v);
            }}
            aria-label={t('correlations.perPage')}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={String(n)}>{String(n)}</SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <CorrelationsList items={data?.items ?? []} />
      )}

      {/* Pagination — only when more than one page */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Pagination
            total={totalPages}
            page={page}
            onChange={setPage}
            size="sm"
            showControls
          />
        </div>
      )}
    </div>
  );
}
