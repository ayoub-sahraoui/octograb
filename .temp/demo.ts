// ============================================================================
// Core Types & Enums
// ============================================================================

export enum BlockType {
  Navigate = 'navigate',
  Click = 'click',
  Input = 'input',
  LoopElements = 'loop_elements',
  LoopPagination = 'loop_pagination',
  ExtractScope = 'extract_scope',
  GoBack = 'go_back',
  Scroll = 'scroll',
  Wait = 'wait',
  Condition = 'condition',
  Screenshot = 'screenshot', // New: Capture screenshots
  Download = 'download', // New: Handle file downloads
}

export enum SelectorType {
  CSS = 'css',
  XPath = 'xpath',
  Text = 'text', // New: Select by visible text
  Role = 'role', // New: ARIA role selector
}

export enum TransformerType {
  Trim = 'trim',
  Uppercase = 'uppercase',
  Lowercase = 'lowercase',
  Replace = 'replace',
  Regex = 'regex',
  ParseNumber = 'parse_number', // New
  ParseDate = 'parse_date', // New
  ParseJSON = 'parse_json', // New
  Split = 'split', // New
  Join = 'join', // New
  Custom = 'custom', // New: For custom JS transformers
}

export enum AttributeType {
  Text = 'text',
  InnerHTML = 'innerHTML',
  OuterHTML = 'outerHTML',
  Href = 'href',
  Src = 'src',
  Value = 'value',
  Class = 'class',
  Id = 'id',
  DataAttribute = 'data-*',
  Custom = 'custom',
}

// ============================================================================
// Selector Types
// ============================================================================

export interface BaseSelector {
  type: SelectorType;
  value: string;
  /** Optional timeout in ms to wait for element */
  timeout?: number;
  /** Whether to wait for element to be visible */
  waitForVisible?: boolean;
}

export interface DetectedSelectors {
  css?: string;
  xpath?: string;
  text?: string;
  role?: string;
  /** Confidence score 0-1 for selector reliability */
  confidence?: number;
}

export interface EnhancedSelector extends BaseSelector {
  /** Alternative selectors for fallback */
  fallbacks?: BaseSelector[];
  /** Auto-detected selectors during recording */
  detected?: DetectedSelectors;
  /** Optional frame selector if element is in iframe */
  frameSelector?: string;
}

// ============================================================================
// Transformer Types
// ============================================================================

export interface BaseTransformerConfig {
  type: TransformerType;
  /** Whether to skip this transformer if previous one fails */
  skipOnError?: boolean;
}

export interface ReplaceTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.Replace;
  searchValue: string;
  replaceValue: string;
  global?: boolean;
}

export interface RegexTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.Regex;
  pattern: string;
  flags?: string;
  replacement?: string; // For replace mode
  extractGroup?: number; // For extraction mode
}

export interface SplitTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.Split;
  delimiter: string;
  index?: number; // Get specific index after split
}

export interface ParseDateTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.ParseDate;
  inputFormat?: string;
  outputFormat?: string;
  locale?: string;
}

export interface CustomTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.Custom;
  /** JavaScript function as string: (value: string) => string */
  functionBody: string;
}

export type TransformerConfig =
  | BaseTransformerConfig
  | ReplaceTransformerConfig
  | RegexTransformerConfig
  | SplitTransformerConfig
  | ParseDateTransformerConfig
  | CustomTransformerConfig;

// ============================================================================
// Extraction Types
// ============================================================================

export interface ExtractionField {
  /** Unique identifier for the field */
  key: string;
  /** Display label */
  label?: string;
  /** Element selector */
  selector: EnhancedSelector;
  /** Attribute to extract */
  attribute: AttributeType | string;
  /** Chain of transformers to apply */
  transformers?: TransformerConfig[];
  /** Whether field is required (affects error handling) */
  required?: boolean;
  /** Default value if extraction fails */
  defaultValue?: any;
  /** Whether to extract multiple elements */
  multiple?: boolean;
}

// ============================================================================
// Block Configuration Types
// ============================================================================

export interface PaginationConfig {
  nextButtonSelector: EnhancedSelector;
  /** Maximum pages to scrape (undefined = infinite) */
  maxPages?: number;
  /** Minimum delay between page navigations (ms) */
  delayBetweenPages?: number;
  /** Stop condition */
  stopWhen?: ConditionConfig;
  /** Strategy when next button not found */
  onNoNextButton?: 'stop' | 'error';
}

export interface ScrollConfig {
  target: 'window' | 'element';
  behavior: 'bottom' | 'top' | 'pixels' | 'element_into_view';
  pixels?: number;
  selector?: EnhancedSelector;
  /** Whether to scroll smoothly */
  smooth?: boolean;
  /** Delay after scroll (ms) */
  delayAfter?: number;
}

export interface WaitConfig {
  type: 'timeout' | 'selector_visible' | 'selector_hidden' | 'network_idle' | 'dom_content_loaded';
  timeout?: number;
  selector?: EnhancedSelector;
  /** For network_idle: time to wait after last network activity (ms) */
  idleTime?: number;
}

export interface ConditionConfig {
  selector: EnhancedSelector;
  check: 'exists' | 'not_exists' | 'visible' | 'hidden' | 'text_contains' | 'text_equals' | 'text_regex' | 'count_equals' | 'count_greater_than';
  value?: string | number;
  /** Negate the condition */
  negate?: boolean;
}

export interface ScreenshotConfig {
  /** Type of screenshot */
  type: 'full_page' | 'viewport' | 'element';
  /** Element selector for element screenshots */
  selector?: EnhancedSelector;
  /** Output filename pattern (supports variables) */
  filename?: string;
  /** Image format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Quality for jpeg/webp (0-100) */
  quality?: number;
}

export interface DownloadConfig {
  /** Trigger element selector */
  triggerSelector?: EnhancedSelector;
  /** Expected filename pattern (regex supported) */
  expectedFilename?: string;
  /** Timeout to wait for download (ms) */
  timeout?: number;
  /** Target directory */
  targetDir?: string;
}

export interface NavigateConfig {
  /** URL to navigate to (supports template variables) */
  url: string;
  /** Wait condition after navigation */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  /** Behavior for navigation */
  behavior?: 'new_tab' | 'same_tab' | 'replace';
  /** Timeout for navigation (ms) */
  timeout?: number;
}

export interface InputConfig {
  /** Input selector */
  selector: EnhancedSelector;
  /** Value to input (supports template variables) */
  value: string;
  /** Whether to clear existing value first */
  clearFirst?: boolean;
  /** Delay between keystrokes (ms) for human-like typing */
  typeDelay?: number;
  /** Whether to press Enter after input */
  pressEnter?: boolean;
}

// ============================================================================
// Block Types
// ============================================================================

export interface BaseBlock {
  id: string;
  type: BlockType;
  /** Display label */
  label?: string;
  /** Whether block is enabled */
  enabled?: boolean;
  /** Description/notes */
  description?: string;
  /** Error handling strategy */
  onError?: 'stop' | 'skip' | 'retry';
  /** Max retry attempts */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
}

export interface NavigateBlock extends BaseBlock {
  type: BlockType.Navigate;
  config: NavigateConfig;
}

export interface ClickBlock extends BaseBlock {
  type: BlockType.Click;
  selector: EnhancedSelector;
  /** Wait before click (ms) */
  delayBefore?: number;
  /** Wait after click (ms) */
  delayAfter?: number;
}

export interface InputBlock extends BaseBlock {
  type: BlockType.Input;
  config: InputConfig;
}

export interface LoopElementsBlock extends BaseBlock {
  type: BlockType.LoopElements;
  selector: EnhancedSelector;
  /** Blocks to execute for each element */
  children: Block[];
  /** Maximum iterations */
  maxIterations?: number;
  /** Variable name for current item index */
  indexVariable?: string;
}

export interface LoopPaginationBlock extends BaseBlock {
  type: BlockType.LoopPagination;
  config: PaginationConfig;
  /** Blocks to execute on each page */
  children: Block[];
}

export interface ExtractScopeBlock extends BaseBlock {
  type: BlockType.ExtractScope;
  /** Fields to extract */
  fields: ExtractionField[];
  /** Optional scope selector to extract within */
  scopeSelector?: EnhancedSelector;
}

export interface ConditionBlock extends BaseBlock {
  type: BlockType.Condition;
  config: ConditionConfig;
  /** Blocks to execute if condition is true */
  children?: Block[];
  /** Blocks to execute if condition is false */
  elseChildren?: Block[];
}

export interface ScrollBlock extends BaseBlock {
  type: BlockType.Scroll;
  config: ScrollConfig;
}

export interface WaitBlock extends BaseBlock {
  type: BlockType.Wait;
  config: WaitConfig;
}

export interface ScreenshotBlock extends BaseBlock {
  type: BlockType.Screenshot;
  config: ScreenshotConfig;
}

export interface DownloadBlock extends BaseBlock {
  type: BlockType.Download;
  config: DownloadConfig;
}

export interface GoBackBlock extends BaseBlock {
  type: BlockType.GoBack;
  /** Number of pages to go back */
  steps?: number;
}

export type Block =
  | NavigateBlock
  | ClickBlock
  | InputBlock
  | LoopElementsBlock
  | LoopPaginationBlock
  | ExtractScopeBlock
  | ConditionBlock
  | ScrollBlock
  | WaitBlock
  | ScreenshotBlock
  | DownloadBlock
  | GoBackBlock;

// ============================================================================
// Plan Types
// ============================================================================

export interface PlanMeta {
  name: string;
  version: string;
  description?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
}

export interface BrowserConfig {
  userAgent?: string;
  viewport?: { width: number; height: number };
  headless?: boolean;
  /** Custom headers to send with requests */
  headers?: Record<string, string>;
  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  /** Cookies to set before execution */
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
}

export interface PlanVariables {
  /** Variables that can be used in the plan (template strings) */
  [key: string]: string | number | boolean;
}

export interface Plan {
  meta: PlanMeta;
  /** Browser configuration */
  browser?: BrowserConfig;
  /** Plan variables */
  variables?: PlanVariables;
  /** Main execution pipeline */
  pipeline: Block[];
  /** Global error handlers */
  errorHandlers?: {
    onBlockError?: (block: Block, error: Error) => void;
    onPlanError?: (error: Error) => void;
  };
}

export interface SavedPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  plan: Plan;
  /** Execution statistics */
  stats?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration?: number;
  };
}

// ============================================================================
// Job & Execution Types
// ============================================================================

export enum JobStatus {
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Paused = 'paused',
}

export interface Job {
  id: string;
  planId?: string;
  planName: string;
  status: JobStatus;
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  duration: number | null; // milliseconds
  /** Number of items extracted */
  itemsExtracted: number | null;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current block being executed */
  currentBlock?: string;
  /** Error message if failed */
  error?: string;
  /** Job metadata */
  metadata?: Record<string, any>;
}

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Success = 'success',
  System = 'system',
}

export interface Log {
  timestamp: string;
  level: LogLevel;
  message: string;
  /** Associated block ID */
  blockId?: string;
  /** Additional context data */
  context?: Record<string, any>;
  /** Stack trace for errors */
  stackTrace?: string;
}

export interface ExecutionResult<T = any> {
  /** Execution ID */
  id: string;
  /** Job ID */
  jobId: string;
  /** Execution status */
  status: JobStatus;
  /** Extracted data */
  data: T[];
  /** Execution metadata */
  metadata: {
    startTime: string;
    endTime: string;
    duration: number;
    itemCount: number;
    blockExecutions: number;
    errors: number;
  };
  /** Execution logs */
  logs: Log[];
  /** Error details if failed */
  error?: {
    message: string;
    blockId?: string;
    stackTrace?: string;
  };
  /** Screenshots captured during execution */
  screenshots?: Array<{
    blockId: string;
    filename: string;
    path: string;
  }>;
  /** Downloaded files */
  downloads?: Array<{
    blockId: string;
    filename: string;
    path: string;
  }>;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Type guard utilities */
export const isNavigateBlock = (block: Block): block is NavigateBlock =>
  block.type === BlockType.Navigate;

export const isConditionBlock = (block: Block): block is ConditionBlock =>
  block.type === BlockType.Condition;

export const isLoopBlock = (block: Block): block is LoopElementsBlock | LoopPaginationBlock =>
  block.type === BlockType.LoopElements || block.type === BlockType.LoopPagination;

/** Validation types */
export interface ValidationError {
  blockId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PlanValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}