import { BaseBlock } from "./base-block";
import { OnErrorStrategy } from "./enums";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { ConditionConfig } from "./condition-block";
import { Block } from "./types";

export interface LoopPaginationBlockConfig {
    nextButtonSelector: Selector;
    maxPages?: number;
    delayBetweenPages?: number;
    stopWhen?: ConditionConfig;
    onNoNextButton?: 'stop' | 'error';
}

export class LoopPaginationBlock implements BaseBlock {
    id: string;
    type: string = 'loop_pagination';
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: LoopPaginationBlockConfig;
    children?: Block[];

    constructor(name: string, config: LoopPaginationBlockConfig) {
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