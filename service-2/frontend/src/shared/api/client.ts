import axios from 'axios';
import type { Overview } from '../../entities/event/types';
import type { ErrorRow } from '../../entities/error/types';
import type { EndpointAvg } from '../../entities/performance/types';
import type { CorrelationRow, CorrelationSort } from '../../entities/correlation/types';

export const api = axios.create({
  baseURL: 'http://localhost:8081',
});

interface Items<T> { items: T[] }

export const getOverview = () =>
  api.get<Overview>('/api/overview').then(r => r.data);

export const getErrors = () =>
  api.get<Items<ErrorRow>>('/api/errors').then(r => r.data.items);

export const getPerformance = () =>
  api.get<Items<EndpointAvg>>('/api/performance').then(r => r.data.items);

export const getCorrelations = (sort: CorrelationSort) =>
  api.get<Items<CorrelationRow>>('/api/correlations', { params: { sort } }).then(r => r.data.items);
