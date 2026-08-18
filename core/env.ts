import { DomExtractionField } from './extraction-contract';
import { SelectorType } from './types';

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
  selectorType: SelectorType;
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
  click(selector: string, type: SelectorType, scope?: Scope, openInNewTab?: boolean): Promise<void>;
  type(selector: string, type: SelectorType, value: string, scope?: Scope): Promise<void>;
  scroll(target: 'window' | 'element', behavior: 'bottom' | 'top' | 'pixels', amount?: number, selector?: string, selectorType?: SelectorType, scope?: Scope): Promise<void>;

  // Query
  count(selector: string, type: SelectorType, scope?: Scope): Promise<number>;
  extract(fields: DomExtractionField[], scope?: Scope): Promise<Record<string, any>>;
  isVisible(selector: string, type: SelectorType, scope?: Scope): Promise<boolean>;

  // Debug
  getUrl(): Promise<string>;
}
