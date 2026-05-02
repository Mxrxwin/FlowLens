import { useState } from 'react';
import { Tabs, Tab } from '@heroui/react';
import OverviewPage from '../pages/overview';
import ErrorsPage from '../pages/errors';
import PerformancePage from '../pages/performance';
import CorrelationsPage from '../pages/correlations';

type PageKey = 'overview' | 'errors' | 'performance' | 'correlations';

export default function App() {
  const [page, setPage] = useState<PageKey>('overview');

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
      </header>

      <Tabs
        aria-label="Pages"
        selectedKey={page}
        onSelectionChange={(k) => setPage(String(k) as PageKey)}
      >
        <Tab key="overview" title="Overview" />
        <Tab key="errors" title="Errors" />
        <Tab key="performance" title="Performance" />
        <Tab key="correlations" title="Correlations" />
      </Tabs>

      <main className="mt-6">
        {page === 'overview' && <OverviewPage />}
        {page === 'errors' && <ErrorsPage />}
        {page === 'performance' && <PerformancePage />}
        {page === 'correlations' && <CorrelationsPage />}
      </main>
    </div>
  );
}
