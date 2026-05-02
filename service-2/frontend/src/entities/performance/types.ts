export interface EndpointAvg {
  endpoint: string;
  avg_response_time_ms: number;
  samples: number;
}

export interface RegionVitals {
  region: string;
  avg_lcp: number;
  avg_fid: number;
  avg_ttfb: number;
  samples: number;
}
