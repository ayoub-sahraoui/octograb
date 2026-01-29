
export type BlockType = 'navigate' | 'click' | 'input' | 'loop_elements' | 'loop_pagination' | 'extract_scope';

export interface ExtractionField {
  key: string;
  selector: string;
  attribute: string;
}

export interface PaginationConfig {
  nextButtonSelector: string;
  maxPages?: number;
}

export interface Block {
  id: string;
  type: BlockType;
  children?: Block[];
  url?: string;
  selector?: string;
  value?: string;
  config?: PaginationConfig;
  fields?: ExtractionField[];
  navigationBehavior?: 'new_tab' | 'default';
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
  pipeline: Block[];
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
