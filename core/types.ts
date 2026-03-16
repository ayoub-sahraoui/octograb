export type BlockType = 'navigate' | 'click' | 'input' | 'loop_elements' | 'loop_pagination' | 'extract_scope' | 'go_back' | 'scroll' | 'wait' | 'condition';
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
  // replace
  searchValue?: string;
  replaceValue?: string;
  // regex
  pattern?: string;
  flags?: string;
  replacement?: string;
  extractGroup?: number;
  // split
  delimiter?: string;
  index?: number;
  // currency_convert
  fixedRate?: number;
  // parse_json
  path?: string;
  // parse_date
  outputFormat?: string;
  // custom (not supported in Chrome extensions due to CSP)
  functionBody?: string;
  // error handling
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

export interface PaginationConfig {
  nextButtonSelector: string;
  nextButtonSelectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
  maxPages?: number;
}

export interface ScrollConfig {
  target: 'window' | 'element';
  behavior: 'bottom' | 'top' | 'pixels';
  pixels?: number;
  selector?: string; // If target is element
  selectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
}

export interface WaitConfig {
  type: 'timeout' | 'selector_visible' | 'selector_hidden' | 'dom_content_loaded' | 'network_idle';
  timeout?: number; // ms
  selector?: string;
  selectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
}

export interface ConditionConfig {
  selector: string;
  selectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
  check: 'exists' | 'not_exists' | 'visible' | 'hidden' | 'text_contains' | 'text_equals' | 'text_regex' | 'count_equals' | 'count_greater_than';
  value?: string; // For text/count checks
  negate?: boolean;
}

export interface Block {
  id: string;
  type: BlockType;
  children?: Block[];      // Used as THEN branch for condition
  elseChildren?: Block[];  // Used as ELSE branch for condition
  url?: string;
  selector?: string;
  selectorType?: SelectorType;
  detectedCssSelector?: string;
  detectedXpathSelector?: string;
  value?: string;
  config?: PaginationConfig;
  scrollConfig?: ScrollConfig; // For scroll blocks
  waitConfig?: WaitConfig; // For wait blocks
  conditionConfig?: ConditionConfig; // For condition blocks
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
  planId?: string; // Reference to the plan that should be executed
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
