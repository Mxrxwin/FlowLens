import { useState } from 'react';
import { Tabs, Tab, Button, Popover, PopoverTrigger, PopoverContent } from '@heroui/react';
import { useI18n, useT } from '../shared/i18n';
import type { Lang } from '../shared/i18n';
import OverviewPage from '../pages/overview';
import ErrorsPage from '../pages/errors';
import PerformancePage from '../pages/performance';
import CorrelationsPage from '../pages/correlations';

type PageKey = 'overview' | 'errors' | 'performance' | 'correlations';

function GearIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SettingsButton() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);

  const options: { key: Lang; label: string }[] = [
    { key: 'ru', label: t('settings.ru') },
    { key: 'en', label: t('settings.en') },
  ];

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end">
      <PopoverTrigger>
        <Button isIconOnly variant="light" aria-label={t('settings.label')} size="sm">
          <GearIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="p-3 w-44">
          <div className="text-xs text-default-500 mb-2 font-medium uppercase tracking-wide">
            {t('settings.language')}
          </div>
          <div className="flex flex-col gap-1">
            {options.map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={lang === key ? 'solid' : 'light'}
                color={lang === key ? 'primary' : 'default'}
                className="justify-start"
                onPress={() => { setLang(key); setOpen(false); }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function App() {
  const [page, setPage] = useState<PageKey>('overview');
  const t = useT();

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('app.title')}</h1>
        <SettingsButton />
      </header>

      <Tabs
        aria-label="Pages"
        selectedKey={page}
        onSelectionChange={(k) => setPage(String(k) as PageKey)}
      >
        <Tab key="overview" title={t('nav.overview')} />
        <Tab key="errors" title={t('nav.errors')} />
        <Tab key="performance" title={t('nav.performance')} />
        <Tab key="correlations" title={t('nav.correlations')} />
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
