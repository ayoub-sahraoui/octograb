
import { ExtractionField } from './types';

export interface Scope {
  selector: string;
  selectorType: 'css' | 'xpath';
  index: number;
  parent?: Scope;
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
  extract(fields: ExtractionField[], scope?: Scope): Promise<Record<string, any>>;
  isVisible(selector: string, type: 'css' | 'xpath', scope?: Scope): Promise<boolean>;
  
  // Debug
  getUrl(): Promise<string>;
}
