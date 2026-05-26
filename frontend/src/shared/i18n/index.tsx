import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'flowlens_lang';

const translations = {
  ru: {
    // App
    'app.title': 'Панель мониторинга',
    'nav.overview': 'Обзор',
    'nav.errors': 'Ошибки',
    'nav.performance': 'Производительность',
    'nav.correlations': 'Корреляции',

    // Overview
    'overview.events5m': 'События · последние 5 мин',
    'overview.errors5m': 'Ошибки · последние 5 мин',
    'overview.errorRate': 'Error rate · 5 мин',
    'overview.rps': 'Throughput · RPS (5 мин)',

    // Errors table
    'errors.col.time': 'ВРЕМЯ',
    'errors.col.message': 'СООБЩЕНИЕ',
    'errors.col.endpoint': 'ENDPOINT',
    'errors.col.region': 'РЕГИОН',
    'errors.empty': 'Ошибок в выбранном периоде нет',

    // Error detail modal
    'errorDetail.title': 'Детали ошибки',
    'errorDetail.message': 'Сообщение',
    'errorDetail.endpoint': 'Endpoint',
    'errorDetail.region': 'Регион',
    'errorDetail.time': 'Время',
    'errorDetail.stackTrace': 'Stack trace',
    'errorDetail.precedingActions': 'Предшествующие действия',
    'errorDetail.noActions': 'Нет записанных предшествующих действий',
    'errorDetail.noStackTrace': 'нет stack trace',
    'errorDetail.notFound': 'Не найдено',
    'errorDetail.clickOn': 'клик на',
    'errorDetail.navigation': 'переход:',

    // Filter errors
    'filter.region': 'Регион',
    'filter.endpoint': 'Endpoint',
    'filter.timeRange': 'Временной диапазон',
    'filter.from': 'От',
    'filter.to': 'До',
    'filter.cancel': 'Отмена',
    'filter.apply': 'Применить',
    'filter.endBeforeStart': 'Дата «До» должна быть позже даты «От»',

    // Time range presets
    'range.5': 'Последние 5 минут',
    'range.15': 'Последние 15 минут',
    'range.30': 'Последние 30 минут',
    'range.60': 'Последний 1 час',
    'range.180': 'Последние 3 часа',
    'range.360': 'Последние 6 часов',
    'range.1440': 'Последние 24 часа',

    // Sort correlations
    'sort.byCount': 'По количеству',
    'sort.byFrequency': 'По частоте',

    // Correlations list
    'correlations.empty': 'Корреляций пока нет',
    'correlations.usersFrom': 'Пользователи из',
    'correlations.on': 'на',
    'correlations.hit': 'обращаются к',
    'correlations.cases': 'случаев',
    'correlations.since.1h': 'За час',
    'correlations.since.24h': 'За день',
    'correlations.since.7d': 'За неделю',
    'correlations.since.all': 'За всё время',
    'correlations.perPage': 'На странице',

    // Performance
    'perf.chartTitle': 'Время ответа API по endpoints (мс)',
    'perf.avg': 'Среднее',
    'perf.p95': 'P95',
    'perf.p99': 'P99',
    'vitals.chartTitle': 'Web Vitals по регионам (мс)',

    // Settings popover
    'settings.label': 'Настройки',
    'settings.language': 'Язык',
    'settings.ru': 'Русский',
    'settings.en': 'English',
  },
  en: {
    // App
    'app.title': 'Monitoring Dashboard',
    'nav.overview': 'Overview',
    'nav.errors': 'Errors',
    'nav.performance': 'Performance',
    'nav.correlations': 'Correlations',

    // Overview
    'overview.events5m': 'Events · last 5 min',
    'overview.errors5m': 'Errors · last 5 min',
    'overview.errorRate': 'Error rate · 5 min',
    'overview.rps': 'Throughput · RPS (5 min)',

    // Errors table
    'errors.col.time': 'TIME',
    'errors.col.message': 'MESSAGE',
    'errors.col.endpoint': 'ENDPOINT',
    'errors.col.region': 'REGION',
    'errors.empty': 'No errors in selected window',

    // Error detail modal
    'errorDetail.title': 'Error detail',
    'errorDetail.message': 'Message',
    'errorDetail.endpoint': 'Endpoint',
    'errorDetail.region': 'Region',
    'errorDetail.time': 'Time',
    'errorDetail.stackTrace': 'Stack trace',
    'errorDetail.precedingActions': 'Preceding actions',
    'errorDetail.noActions': 'No preceding actions recorded',
    'errorDetail.noStackTrace': 'no stack trace',
    'errorDetail.notFound': 'Not found',
    'errorDetail.clickOn': 'click on',
    'errorDetail.navigation': 'navigation:',

    // Filter errors
    'filter.region': 'Region',
    'filter.endpoint': 'Endpoint',
    'filter.timeRange': 'Time range',
    'filter.from': 'From',
    'filter.to': 'To',
    'filter.cancel': 'Cancel',
    'filter.apply': 'Apply',
    'filter.endBeforeStart': '"To" date must be later than "From" date',

    // Time range presets
    'range.5': 'Last 5 minutes',
    'range.15': 'Last 15 minutes',
    'range.30': 'Last 30 minutes',
    'range.60': 'Last 1 hour',
    'range.180': 'Last 3 hours',
    'range.360': 'Last 6 hours',
    'range.1440': 'Last 24 hours',

    // Sort correlations
    'sort.byCount': 'By count',
    'sort.byFrequency': 'By frequency',

    // Correlations list
    'correlations.empty': 'No correlations yet',
    'correlations.usersFrom': 'Users from',
    'correlations.on': 'on',
    'correlations.hit': 'hit',
    'correlations.cases': 'cases',
    'correlations.since.1h': 'Last hour',
    'correlations.since.24h': 'Last 24 hours',
    'correlations.since.7d': 'Last 7 days',
    'correlations.since.all': 'All time',
    'correlations.perPage': 'Per page',

    // Performance
    'perf.chartTitle': 'API response time by endpoint (ms)',
    'perf.avg': 'Avg',
    'perf.p95': 'P95',
    'perf.p99': 'P99',
    'vitals.chartTitle': 'Web Vitals by region (ms)',

    // Settings popover
    'settings.label': 'Settings',
    'settings.language': 'Language',
    'settings.ru': 'Русский',
    'settings.en': 'English',
  },
} as const;

type Translations = typeof translations.en;
export type TranslationKey = keyof Translations;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ru';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: TranslationKey): string => translations[lang][key];

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT(): (key: TranslationKey) => string {
  return useI18n().t;
}
