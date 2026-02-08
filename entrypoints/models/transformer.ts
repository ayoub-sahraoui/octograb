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