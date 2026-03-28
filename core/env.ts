import { DomExtractionField } from './extraction-contract';

export interface BlockContext {
  // Loop metadata
  loopIteration?: number;           // Current iteration in Loop Pagination
  loopItemIndex?: number;           // Current item index in Loop Elements
  loopTotalItems?: number;          // Total items in current loop
  loopItemsProcessed?: Set<number>; // Set of already processed item indices

  // Parent data
  parentData?: Record<string, any>; // Data passed from parent block

  // Custom variables
  variables?: Record<string, any>;  // User-defined variables
}

export interface Scope {
  selector: string;
  selectorType: 'css' | 'xpath';
  index: number;
  parent?: Scope;
  context?: BlockContext;           // Runtime context data
}

export interface ExecutionEnvironment {
  // Navigation
  navigate(url: string): Promise<void>;
  waitForPageLoad(): Promise<void>;
  goBack(): Promise<void>;

  // Interaction
  click(selector: string, type: 'css' | 'xpath', scope?: Scope, openInNewTab?: boolean): Promise<void>;
  type(selector: string, type: 'css' | 'xpath', value: string, scope?: Scope): Promise<void>;
  scroll(target: 'window' | 'element', behavior: 'bottom' | 'top' | 'pixels', amount?: number, selector?: string, selectorType?: 'css' | 'xpath', scope?: Scope): Promise<void>;

  // Query
  count(selector: string, type: 'css' | 'xpath', scope?: Scope): Promise<number>;
  extract(fields: DomExtractionField[], scope?: Scope): Promise<Record<string, any>>;
  isVisible(selector: string, type: 'css' | 'xpath', scope?: Scope): Promise<boolean>;

  // Debug
  getUrl(): Promise<string>;
}
