import { BaseBlock } from "./base-block";
import { OnErrorStrategy } from "./enums";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { ConditionConfig } from "./condition-block";
import { Block } from "./types";

export interface LoopPaginationBlockConfig {
    paginationType?: 'button' | 'scroll';
    nextButtonSelector: Selector;
    scrollTarget?: 'window' | 'element';
    scrollSelector?: Selector;
    scrollAmount?: number;
    scrollStrategy?: 'fixed_amount' | 'scroll_to_bottom' | 'scroll_to_last_item';
    itemSelector?: Selector;
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
    parent?: Block | null;
    children?: Block[];
    index?: number;

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