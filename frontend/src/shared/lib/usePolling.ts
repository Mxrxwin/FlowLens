import { useEffect, useState } from 'react';

export interface PollingState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Initial fetch + setInterval every `intervalMs`. Cleans up on unmount and
// when `deps` change. Loading flag is true only until the first fetch
// resolves — subsequent polls update silently (stale-while-revalidate).
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs = 5000,
  deps: unknown[] = [],
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async (initial: boolean) => {
      try {
        const d = await fetcher();
        if (cancelled) return;
        setData(d);
        setError(null);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      } finally {
        if (!cancelled && initial) setLoading(false);
      }
    };

    run(true);
    const timer = window.setInterval(() => run(false), intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, loading, error };
}
