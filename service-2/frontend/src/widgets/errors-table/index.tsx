import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import type { ErrorRow } from '../../entities/error/types';

export function ErrorsTable({ items }: { items: ErrorRow[] }) {
  return (
    <Table aria-label="Errors">
      <TableHeader>
        <TableColumn>TIME</TableColumn>
        <TableColumn>MESSAGE</TableColumn>
        <TableColumn>ENDPOINT</TableColumn>
        <TableColumn>REGION</TableColumn>
      </TableHeader>
      <TableBody emptyContent="No errors in selected window" items={items}>
        {(row) => (
          <TableRow key={row.id}>
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
