import { Card, CardBody } from '@heroui/react';
import { useT } from '../../shared/i18n';
import type { Overview } from '../../entities/event/types';

export function OverviewCards({ data }: { data: Overview }) {
  const t = useT();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      <Card>
        <CardBody>
          <div className="text-sm text-default-500">{t('overview.events5m')}</div>
          <div className="text-3xl font-bold">{data.events_5m}</div>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <div className="text-sm text-default-500">{t('overview.errors5m')}</div>
          <div className="text-3xl font-bold text-danger">{data.errors_5m}</div>
        </CardBody>
      </Card>
    </div>
  );
}
