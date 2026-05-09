import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { useT } from '../../shared/i18n';
import type { ErrorRow } from '../../entities/error/types';

interface Props {
  items: ErrorRow[];
  onRowClick?: (id: string) => void;
}

export function ErrorsTable({ items, onRowClick }: Props) {
  const t = useT();

  return (
    <Table
      aria-label="Errors"
      selectionMode={onRowClick ? 'single' : 'none'}
      onRowAction={onRowClick ? (key) => onRowClick(String(key)) : undefined}
    >
      <TableHeader>
        <TableColumn>{t('errors.col.time')}</TableColumn>
        <TableColumn>{t('errors.col.message')}</TableColumn>
        <TableColumn>{t('errors.col.endpoint')}</TableColumn>
        <TableColumn>{t('errors.col.region')}</TableColumn>
      </TableHeader>
      <TableBody emptyContent={t('errors.empty')} items={items}>
        {(row) => (
          <TableRow key={row.id} className="cursor-pointer">
            <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
            <TableCell className="font-mono text-sm">{row.message}</TableCell>
            <TableCell>{row.endpoint || '—'}</TableCell>
            <TableCell>{row.region || '—'}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
