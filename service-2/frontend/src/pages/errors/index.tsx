import { Spinner } from '@heroui/react';
import { ErrorsTable } from '../../widgets/errors-table';
import { getErrors } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { ErrorRow } from '../../entities/error/types';

export default function ErrorsPage() {
  const { data, loading, error } = usePolling<ErrorRow[]>(() => getErrors());

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;
  return <ErrorsTable items={data ?? []} />;
}
