import { Card, CardBody, CardHeader } from '@heroui/react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useT } from '../../shared/i18n';
import type { RegionVitals } from '../../entities/performance/types';

export function VitalsChart({ items }: { items: RegionVitals[] }) {
  const t = useT();

  return (
    <Card>
      <CardHeader>{t('vitals.chartTitle')}</CardHeader>
      <CardBody>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avg_lcp"  fill="#3b82f6" name="LCP" />
              <Bar dataKey="avg_fid"  fill="#f59e0b" name="FID" />
              <Bar dataKey="avg_ttfb" fill="#10b981" name="TTFB" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
