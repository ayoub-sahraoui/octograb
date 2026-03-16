import { toJS } from "mobx";
import { BaseBlock } from "./base-block";
import { Selector } from "./selector";
import { v4 as uuidv4 } from 'uuid';
import { makeAutoObservable } from "mobx";
import { AttributeType } from "./enums";
import { TransformerConfig } from "./transformer";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

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

export class ExtractScopeBlock implements BaseBlock {
    id: string;
    type: string = 'extract_scope';
    label: string;
    enabled: boolean;
    description: string;
    onError: OnErrorStrategy;
    maxRetries: number;
    retryDelay: number;
    config: ExtractScopeBlockConfig;
    parent?: Block | null;
    children?: Block[];
    index?: number;

    constructor(name: string, config: ExtractScopeBlockConfig) {
        this.id = uuidv4();
        this.label = name;
        this.enabled = true;
        this.description = '';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 0;
        this.retryDelay = 0;
        this.config = config;
        makeAutoObservable(this);
    }

    toJSON() {
        return toJS(this);
    }

}