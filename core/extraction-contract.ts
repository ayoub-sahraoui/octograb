import type { ExtractionField as ModelExtractionField } from '../entrypoints/models/extract-scope-block';
import { SelectorType } from './types';

export interface DomExtractionField {
  key: string;
  selector: string;
  selectorType?: SelectorType;
  attribute: string;
  transformers?: any[];
  required?: boolean;
  multiple?: boolean;
}

export function toDomExtractionField(field: ModelExtractionField): DomExtractionField {
  const selectorType = (field.selector?.type || 'css') as SelectorType;

  return {
    key: field.key,
    selector: field.selector?.value || '',
    selectorType,
    attribute: String(field.attribute || 'text'),
    transformers: field.transformers ? JSON.parse(JSON.stringify(field.transformers)) : [],
    required: field.required || false,
    multiple: field.multiple || false,
  };
}

export function toDomExtractionFields(fields: ModelExtractionField[]): DomExtractionField[] {
  return fields.map(toDomExtractionField);
}
