import { Tabs, Tab } from '@heroui/react';
import type { CorrelationSort } from '../../entities/correlation/types';

interface Props {
  value: CorrelationSort;
  onChange: (v: CorrelationSort) => void;
}

export function SortCorrelations({ value, onChange }: Props) {
  return (
    <Tabs
      aria-label="Sort correlations"
      selectedKey={value}
      onSelectionChange={(k) => onChange(String(k) as CorrelationSort)}
      size="sm"
    >
      <Tab key="count" title="By count" />
      <Tab key="frequency" title="By frequency" />
    </Tabs>
  );
}
