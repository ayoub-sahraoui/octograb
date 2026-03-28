import type { ExtractionField as ModelExtractionField } from '../entrypoints/models/extract-scope-block';

export interface DomExtractionField {
  key: string;
  selector: string;
  selectorType?: 'css' | 'xpath';
  attribute: string;
  transformers?: any[];
  required?: boolean;
  multiple?: boolean;
}

export function toDomExtractionField(field: ModelExtractionField): DomExtractionField {
  const selectorType = field.selector?.type === 'xpath' ? 'xpath' : 'css';

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
