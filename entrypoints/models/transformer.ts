export enum TransformerType {
  Trim = 'trim',
  Uppercase = 'uppercase',
  Lowercase = 'lowercase',
  Replace = 'replace',
  Regex = 'regex',
  ParseNumber = 'parse_number',
  ParseDate = 'parse_date',
  ParseJSON = 'parse_json',
  Split = 'split',
  Join = 'join',
  CurrencyConvert = 'currency_convert',
  Capitalize = 'capitalize',
  TitleCase = 'title_case',
  Custom = 'custom',
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

export interface CurrencyConvertTransformerConfig extends BaseTransformerConfig {
  type: TransformerType.CurrencyConvert;
  fromCurrency: 'MAD' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY';
  toCurrency: 'MAD' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY';
  /** Optional: Use fixed exchange rate instead of API */
  fixedRate?: number;
}

export type TransformerConfig =
  | BaseTransformerConfig
  | ReplaceTransformerConfig
  | RegexTransformerConfig
  | SplitTransformerConfig
  | ParseDateTransformerConfig
  | CustomTransformerConfig
  | CurrencyConvertTransformerConfig;