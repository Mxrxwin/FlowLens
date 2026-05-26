import axios from 'axios';
import type { Overview } from '../../entities/event/types';
import type { ErrorRow, ErrorDetail } from '../../entities/error/types';
import type { EndpointAvg, RegionVitals } from '../../entities/performance/types';
import type { CorrelationRow, CorrelationSort, CorrelationSince } from '../../entities/correlation/types';
import type { SystemStats } from '../../entities/system/types';

export interface PerformanceResponse {
  endpoints: EndpointAvg[];
  regions: RegionVitals[];
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
});

interface Items<T> { items: T[] }

export const getOverview = () =>
  api.get<Overview>('/api/overview').then(r => r.data);

export interface ErrorsQuery {
  from?: string;
  to?: string;
  region?: string;
  endpoint?: string;
}

export const getErrors = (params: ErrorsQuery = {}) =>
  api.get<Items<ErrorRow>>('/api/errors', { params }).then(r => r.data.items);

export const getErrorDetail = (id: string) =>
  api.get<ErrorDetail>(`/api/errors/${id}`).then(r => r.data);

export const getPerformance = () =>
  api.get<PerformanceResponse>('/api/performance').then(r => r.data);

export interface CorrelationsQuery {
  sort: CorrelationSort;
  page: number;
  pageSize: number;
  since: CorrelationSince;
}

export interface CorrelationsResponse {
  items: CorrelationRow[];
  total: number;
}

export const getCorrelations = (q: CorrelationsQuery) =>
  api.get<CorrelationsResponse>('/api/correlations', {
    params: { sort: q.sort, page: q.page, page_size: q.pageSize, since: q.since },
  }).then(r => r.data);

export const getSystem = () =>
  api.get<SystemStats>('/api/system').then(r => r.data);
