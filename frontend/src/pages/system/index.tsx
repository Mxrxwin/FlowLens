import { Spinner } from '@heroui/react';
import { SystemChart } from '../../widgets/system-chart';
import { getSystem } from '../../shared/api/client';
import { usePolling } from '../../shared/lib/usePolling';
import type { SystemStats } from '../../entities/system/types';

export default function SystemPage() {
  const { data, loading, error } = usePolling<SystemStats>(() => getSystem(), 5000);

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;

  const series = data?.series ?? [];
  return <SystemChart series={series} />;
}
