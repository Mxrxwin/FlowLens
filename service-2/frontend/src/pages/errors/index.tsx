import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { ErrorsTable } from '../../widgets/errors-table';
import { getErrors } from '../../shared/api/client';
import type { ErrorRow } from '../../entities/error/types';

export default function ErrorsPage() {
  const [items, setItems] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getErrors()
      .then((d) => { if (!cancelled) setItems(d); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;
  if (error) return <div className="text-danger">{error}</div>;
  return <ErrorsTable items={items} />;
}
