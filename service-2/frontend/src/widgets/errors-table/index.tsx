import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import type { ErrorRow } from '../../entities/error/types';

interface Props {
  items: ErrorRow[];
  onRowClick?: (id: string) => void;
}

export function ErrorsTable({ items, onRowClick }: Props) {
  return (
    <Table
      aria-label="Errors"
      selectionMode={onRowClick ? 'single' : 'none'}
      onRowAction={onRowClick ? (key) => onRowClick(String(key)) : undefined}
    >
      <TableHeader>
        <TableColumn>TIME</TableColumn>
        <TableColumn>MESSAGE</TableColumn>
        <TableColumn>ENDPOINT</TableColumn>
        <TableColumn>REGION</TableColumn>
      </TableHeader>
      <TableBody emptyContent="No errors in selected window" items={items}>
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
