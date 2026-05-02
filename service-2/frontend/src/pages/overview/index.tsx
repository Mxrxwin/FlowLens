import { Spinner } from '@heroui/react';
import { OverviewCards } from '../../widgets/overview-cards';
import { getOverview } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { Overview } from '../../entities/event/types';

export default function OverviewPage() {
  const { data, loading, error } = usePolling<Overview>(() => getOverview());

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;
  if (!data) return null;

  return <OverviewCards data={data} />;
}
