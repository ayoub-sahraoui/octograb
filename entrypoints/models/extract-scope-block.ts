import { toJS } from "mobx";
import { BlockBase } from "./block-base";
import { Selector } from "./selector";
import { v4 as uuidv4 } from 'uuid';
import { AttributeType } from "./enums";
import { TransformerConfig } from "./transformer";
import { OnErrorStrategy } from "./enums";

export type StaticFieldType = 'constant' | 'uuid' | 'random_number' | 'date' | 'auto_increment';

export interface ExtractionField {
    /** Unique ID for stable reordering (auto-generated if missing) */
    id?: string;
    key: string;
    label?: string;
    selector: Selector;
    attribute: AttributeType | string;
    transformers?: TransformerConfig[];
    required?: boolean;
    defaultValue?: any;
    multiple?: boolean;
    /** Field mode: 'extracted' (default) uses selector, 'static' uses static config */
    mode?: 'extracted' | 'static';
    /** Post-processing formula using {{fieldKey}} references, e.g. "{{price}} * 1.2" */
    formula?: string;
    /** Static field type */
    staticType?: StaticFieldType;
    /** Static value for 'constant' type */
    staticValue?: string;
    /** Min value for 'random_number' type */
    staticMin?: number;
    /** Max value for 'random_number' type */
    staticMax?: number;
    /** Date format string for 'date' type (e.g. "YYYY-MM-DD HH:mm:ss") */
    staticDateFormat?: string;
    /** Starting value for 'auto_increment' type */
    staticStartFrom?: number;
}

export interface ExtractScopeBlockConfig {
    fields: ExtractionField[];
    scopeSelector?: Selector;
    resetScope?: boolean;
}

export class ExtractScopeBlock extends BlockBase {
    id: string;
    type: string = 'extract_scope';
    label: string;
    enabled: boolean;
    description: string;
    onError: OnErrorStrategy;
    maxRetries: number;
    retryDelay: number;
    config: ExtractScopeBlockConfig;

    constructor(name: string, config: ExtractScopeBlockConfig) {
        super();
        this.id = uuidv4();
        this.label = name;
        this.enabled = true;
        this.description = '';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 0;
        this.retryDelay = 0;
        this.config = config;
    }

    // ─── Config-specific actions ───────────────────────────────────────────

    setFields(fields: ExtractionField[]) {
        this.config.fields = fields;
    }

    moveField(oldIndex: number, newIndex: number) {
        const [item] = this.config.fields.splice(oldIndex, 1);
        this.config.fields.splice(newIndex, 0, item);
    }

    addField(field: ExtractionField) {
        if (!this.config.fields) {
            this.config.fields = [];
        }
        this.config.fields.push(field);
    }

    removeField(fieldId: string) {
        if (!this.config.fields) return;
        this.config.fields = this.config.fields.filter(f => f.id !== fieldId);
    }

    removeFieldByIndex(index: number) {
        if (!this.config.fields) return;
        this.config.fields.splice(index, 1);
    }

    updateField(fieldId: string, updates: Partial<ExtractionField>) {
        if (!this.config.fields) return;
        const index = this.config.fields.findIndex(f => f.id === fieldId);
        if (index !== -1) {
            this.config.fields[index] = { ...this.config.fields[index], ...updates };
        }
    }

    updateFieldByIndex(index: number, key: keyof ExtractionField, value: any) {
        if (!this.config.fields || index < 0 || index >= this.config.fields.length) return;
        (this.config.fields[index] as any)[key] = value;
    }

    ensureFieldIds() {
        if (!this.config.fields) return;
        for (const field of this.config.fields) {
            if (!field.id) {
                field.id = uuidv4();
            }
        }
    }

    addTransformer(fieldIndex: number, transformer: TransformerConfig) {
        if (!this.config.fields || fieldIndex < 0 || fieldIndex >= this.config.fields.length) return;
        const field = this.config.fields[fieldIndex];
        if (!field.transformers) {
            field.transformers = [];
        }
        field.transformers.push(transformer);
    }

    removeTransformer(fieldIndex: number, transformerIndex: number) {
        if (!this.config.fields || fieldIndex < 0 || fieldIndex >= this.config.fields.length) return;
        const field = this.config.fields[fieldIndex];
        if (field.transformers && transformerIndex >= 0 && transformerIndex < field.transformers.length) {
            field.transformers.splice(transformerIndex, 1);
        }
    }

    updateTransformer(fieldIndex: number, transformerIndex: number, updates: Partial<TransformerConfig>) {
        if (!this.config.fields || fieldIndex < 0 || fieldIndex >= this.config.fields.length) return;
        const field = this.config.fields[fieldIndex];
        if (!field.transformers || transformerIndex < 0 || transformerIndex >= field.transformers.length) return;
        field.transformers[transformerIndex] = { ...field.transformers[transformerIndex], ...updates };
    }

    setScopeSelector(selector: Selector) {
        this.config.scopeSelector = selector;
    }

    setResetScope(reset: boolean) {
        this.config.resetScope = reset;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): ExtractScopeBlock {
        const block = new ExtractScopeBlock(json.label || 'Extract Scope', json.config || { fields: [] });
        if (json.id) block.id = json.id;
        if (json.enabled !== undefined) block.setEnabled(json.enabled);
        if (json.description !== undefined) block.setDescription(json.description);
        if (json.onError !== undefined) block.setOnError(json.onError);
        if (json.maxRetries !== undefined) block.setMaxRetries(json.maxRetries);
        if (json.retryDelay !== undefined) block.setRetryDelay(json.retryDelay);
        if (json.maxExecutionTime !== undefined) block.setMaxExecutionTime(json.maxExecutionTime);
        if (json.index !== undefined) block.setIndex(json.index);
        return block;
    }
}