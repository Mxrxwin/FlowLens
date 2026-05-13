export interface DeviceMeta {
  user_agent: string;
  region?: string;
}

export function getDeviceMeta(): DeviceMeta {
  const region = resolveClientRegion();
  return {
    user_agent: navigator.userAgent,
    ...(region ? { region } : {}),
  };
}

function resolveClientRegion(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = cityFromTimeZone(timeZone);
  if (city) return city;
  const locale = navigator.language || (navigator.languages?.[0] ?? '');
  return countryFromLocale(locale);
}

function cityFromTimeZone(tz?: string): string {
  if (!tz || tz.toUpperCase() === 'UTC') return '';
  const chunks = tz.split('/');
  const city = chunks[chunks.length - 1]?.replace(/_/g, ' ').trim();
  return city && city !== 'GMT' ? city : '';
}

function countryFromLocale(locale: string): string {
  const region = locale.split(/[-_]/)[1]?.toUpperCase();
  if (!region) return '';
  try {
    const DN = (Intl as any).DisplayNames;
    return DN ? new DN([locale], { type: 'region' }).of(region) || region : region;
  } catch {
    return region;
  }
}
