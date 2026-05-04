export type CorrelationSort = 'count' | 'frequency';

export interface CorrelationRow {
  error_message: string;
  endpoint: string;
  region: string;
  device_type: string;
  count: number;
  first_seen_at: string;
  last_seen_at: string;
}
