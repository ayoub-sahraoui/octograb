export type SelectorType = 'css' | 'xpath';

export type TransformerType =
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'title_case'
  | 'replace'
  | 'regex'
  | 'split'
  | 'parse_number'
  | 'currency_convert'
  | 'parse_json'
  | 'join'
  | 'parse_date'
  | 'custom';

export interface Transformer {
  type: TransformerType;
  searchValue?: string;
  replaceValue?: string;
  pattern?: string;
  flags?: string;
  replacement?: string;
  extractGroup?: number;
  delimiter?: string;
  index?: number;
  fixedRate?: number;
  path?: string;
  outputFormat?: string;
  functionBody?: string;
  skipOnError?: boolean;
}

export interface ExtractionField {
  key: string;
  selector: string;
  selectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
  attribute: string;
  transformers?: Transformer[];
  required?: boolean;
  multiple?: boolean;
}

export interface SerializedBlockNode {
  id: string;
  type: string;
  label?: string;
  description?: string;
  enabled?: boolean;
  onError?: string;
  maxRetries?: number;
  retryDelay?: number;
  maxExecutionTime?: number;
  config?: Record<string, any>;
  index?: number;
  children?: SerializedBlockNode[];
  elseChildren?: SerializedBlockNode[];
}

export interface PlanMeta {
  name: string;
  version: string;
  userAgent: string;
}

export interface PlanVariables {
  baseUrl: string;
}

export interface Plan {
  meta: PlanMeta;
  variables: PlanVariables;
  pipeline: SerializedBlockNode[];
}

export interface SavedPlan {
  id: string;
  name: string;
  updatedAt: string;
  plan: Plan;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  planId?: string;
  planName: string;
  status: JobStatus;
  submittedAt: string;
  duration: string | null;
  items: number | null;
}

export interface Log {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'system';
}

export interface ExecutionResult {
  [key: string]: any;
}
