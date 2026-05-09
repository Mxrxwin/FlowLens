import { Card, CardBody, CardHeader } from '@heroui/react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useT } from '../../shared/i18n';
import type { EndpointAvg } from '../../entities/performance/types';

export function PerformanceChart({ items }: { items: EndpointAvg[] }) {
  const t = useT();

  return (
    <Card>
      <CardHeader>{t('perf.chartTitle')}</CardHeader>
      <CardBody>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="endpoint" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avg_response_time_ms" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
