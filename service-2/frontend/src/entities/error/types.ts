export interface ErrorRow {
  id: string;
  message: string;
  endpoint: string;
  timestamp: string;
  region: string;
}

export type PrecedingAction =
  | { type: 'click'; target: string }
  | { type: 'navigation'; from: string; to: string };

export interface ErrorDetail {
  id: string;
  message: string;
  stack_trace: string;
  endpoint: string;
  timestamp: string;
  region: string;
  preceding_actions: PrecedingAction[];
}
