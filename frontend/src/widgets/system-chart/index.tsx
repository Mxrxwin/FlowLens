import { Card, CardBody, CardHeader } from '@heroui/react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useT } from '../../shared/i18n';
import type { SystemSample } from '../../entities/system/types';

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface CurrentCardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
}

function CurrentCard({ label, value, sub, color }: CurrentCardProps) {
  return (
    <Card className="flex-1">
      <CardBody>
        <div className="text-sm text-default-500">{label}</div>
        <div className={`text-3xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-default-400 mt-1">{sub}</div>
      </CardBody>
    </Card>
  );
}

export function SystemChart({ series }: { series: SystemSample[] }) {
  const t = useT();
  const last = series.length > 0 ? series[series.length - 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <CurrentCard
          label={t('system.cpuCurrent')}
          value={last ? `${last.cpu_pct.toFixed(1)}%` : '—'}
          sub={t('system.cpuSub')}
          color="text-danger"
        />
        <CurrentCard
          label={t('system.ramCurrent')}
          value={last ? `${last.ram_pct.toFixed(1)}%` : '—'}
          sub={last ? `${last.ram_used_mb} / ${last.ram_total_mb} MB` : '—'}
          color="text-primary"
        />
      </div>

      <Card>
        <CardHeader>{t('system.chartTitle')}</CardHeader>
        <CardBody>
          {series.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-default-400">
              {t('system.collecting')}
            </div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="ts"
                    tickFormatter={formatTime}
                    minTickGap={40}
                  />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip
                    labelFormatter={(v) => formatTime(v as number)}
                    formatter={(v: number) => [`${v.toFixed(1)}%`]}
                  />
                  <Legend />
                  <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="cpu_pct"
                    name={t('system.cpu')}
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="ram_pct"
                    name={t('system.ram')}
                    stroke="#3b82f6"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
