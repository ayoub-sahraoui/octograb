import { BaseBlock } from './base-block';
import { Selector } from "./selector";
import { v4 as uuidv4 } from 'uuid';
import { makeAutoObservable, toJS } from "mobx";
import { Block } from "./types";
import { OnErrorStrategy } from "./enums";

export interface ConditionConfig {
    selector: Selector;
    check: 'exists' | 'not_exists' | 'visible' | 'hidden' | 'text_contains' | 'text_equals' | 'text_regex' | 'count_equals' | 'count_greater_than';
    value?: string | number;
    negate?: boolean;
}

export class ConditionBlock implements BaseBlock {
    id: string;
    type: string = 'condition';
    label: string;
    enabled: boolean;
    description: string;
    onError: OnErrorStrategy;
    maxRetries: number;
    retryDelay: number;
    config: ConditionConfig;
    elseChildren?: Block[];

    constructor(config: ConditionConfig) {
        this.id = uuidv4();
        this.label = 'Condition';
        this.enabled = true;
        this.description = 'Condition block';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.config = config;
        makeAutoObservable(this);
    }

    toJSON() {
        return toJS(this);
    }
}