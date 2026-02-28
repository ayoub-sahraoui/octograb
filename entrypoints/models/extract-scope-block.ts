import { toJS } from "mobx";
import { BaseBlock } from "./base-block";
import { Selector } from "./selector";
import { v4 as uuidv4 } from 'uuid';
import { makeAutoObservable } from "mobx";
import { AttributeType } from "./enums";
import { TransformerConfig } from "./transformer";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

export interface ExtractionField {
    key: string;
    label?: string;
    selector: Selector;
    attribute: AttributeType | string;
    transformers?: TransformerConfig[];
    required?: boolean;
    defaultValue?: any;
    multiple?: boolean;
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