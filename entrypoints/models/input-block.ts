import { BaseBlock } from "./base-block";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

export interface InputBlockConfig {
    selector: Selector;
    value: string;
    delayBefore?: number;
    delayAfter?: number;
}

export class InputBlock implements BaseBlock {
    id: string;
    type: string = 'input';
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: InputBlockConfig;
    parent?: Block | null;
    children?: Block[];
    index?: number;

    constructor(name: string, config: InputBlockConfig) {
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