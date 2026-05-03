import axios from 'axios';
import type { Overview } from '../../entities/event/types';
import type { ErrorRow, ErrorDetail } from '../../entities/error/types';
import type { EndpointAvg, RegionVitals } from '../../entities/performance/types';
import type { CorrelationRow, CorrelationSort } from '../../entities/correlation/types';

export interface PerformanceResponse {
  endpoints: EndpointAvg[];
  regions: RegionVitals[];
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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

export const getCorrelations = (sort: CorrelationSort) =>
  api.get<Items<CorrelationRow>>('/api/correlations', { params: { sort } }).then(r => r.data.items);
