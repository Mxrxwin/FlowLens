import { Spinner } from "@heroui/react";
import { PerformanceChart } from "../../widgets/performance-chart";
import { VitalsChart } from "../../widgets/vitals-chart";
import {
  getPerformance,
  type PerformanceResponse,
} from "../../shared/api/client";
import { usePolling } from "../../shared/lib/usePolling";

export default function PerformancePage() {
  const { data, loading, error } = usePolling<PerformanceResponse>(() =>
    getPerformance(),
  );

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;

  const safe = data ?? { endpoints: [], regions: [] };
  return (
    <div className="space-y-6">
      <PerformanceChart items={safe.endpoints} />
      <VitalsChart items={safe.regions} />
    </div>
  );
}
