import { Card, CardBody } from '@heroui/react';
import type { CorrelationRow } from '../../entities/correlation/types';

function frequencyPerMin(c: CorrelationRow): number {
  const minutes = (new Date(c.last_seen_at).getTime() - new Date(c.first_seen_at).getTime()) / 60000;
  return c.count / Math.max(minutes, 1 / 60);
}

export function CorrelationsList({ items }: { items: CorrelationRow[] }) {
  if (items.length === 0) {
    return <div className="text-default-500">No correlations yet</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((c, i) => (
        <Card key={i}>
          <CardBody className="space-y-2">
            <div className="text-sm">
              Users from <b>{c.region}</b> on <b>{c.device_type}</b> hit{' '}
              <code className="text-xs">{c.endpoint}</code>
            </div>
            <div className="font-mono text-sm text-danger">{c.error_message}</div>
            <div className="flex justify-between text-xs text-default-500">
              <span>{c.count} cases · {frequencyPerMin(c).toFixed(2)}/min</span>
              <span>
                {new Date(c.first_seen_at).toLocaleTimeString()} →{' '}
                {new Date(c.last_seen_at).toLocaleTimeString()}
              </span>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
