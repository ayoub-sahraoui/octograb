export enum SelectorType {
  CSS = 'css',
  XPath = 'xpath',
  Text = 'text', 
  Role = 'role',
}

export interface BaseSelector {
  type: SelectorType;
  value: string;
  timeout?: number;
  waitForVisible?: boolean;
}

export interface DetectedSelectors {
  css?: string;
  xpath?: string;
  text?: string;
  role?: string;
  confidence?: number;
}

export interface Selector extends BaseSelector {
  fallbacks?: BaseSelector[];
  detected?: DetectedSelectors;
  frameSelector?: string;
}