export interface FlowLensConfig {
  /** Full ingest DSN, e.g. "https://mon.example.com/ingest?project_key=pk_live" */
  dsn: string;
}

export interface ResolvedConfig {
  endpoint: string;
  projectKey: string;
}

export function resolveConfig(config: FlowLensConfig): ResolvedConfig {
  const { dsn } = config;
  if (!dsn) throw new Error('[FlowLens] dsn is required');

  try {
    const url = new URL(dsn, typeof window !== 'undefined' ? window.location.origin : undefined);
    const projectKey =
      url.searchParams.get('project_key') ||
      url.searchParams.get('key') ||
      '';
    url.searchParams.delete('project_key');
    url.searchParams.delete('key');
    return { endpoint: url.toString(), projectKey };
  } catch {
    return { endpoint: dsn, projectKey: '' };
  }
}
