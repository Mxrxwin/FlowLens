export interface SystemSample {
  ts: number;
  cpu_pct: number;
  ram_pct: number;
  ram_used_mb: number;
  ram_total_mb: number;
}

export interface SystemStats {
  series: SystemSample[];
}
