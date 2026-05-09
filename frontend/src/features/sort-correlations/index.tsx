import { Tabs, Tab } from '@heroui/react';
import { useT } from '../../shared/i18n';
import type { CorrelationSort } from '../../entities/correlation/types';

interface Props {
  value: CorrelationSort;
  onChange: (v: CorrelationSort) => void;
}

export function SortCorrelations({ value, onChange }: Props) {
  const t = useT();

  return (
    <Tabs
      aria-label="Sort correlations"
      selectedKey={value}
      onSelectionChange={(k) => onChange(String(k) as CorrelationSort)}
      size="sm"
    >
      <Tab key="count" title={t('sort.byCount')} />
      <Tab key="frequency" title={t('sort.byFrequency')} />
    </Tabs>
  );
}
