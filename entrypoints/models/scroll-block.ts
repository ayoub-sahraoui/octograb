import { BaseBlock } from "./base-block";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";
import { Selector } from "./selector";
import { Block } from "./types";

export interface ScrollBlockConfig {
    target: 'window' | 'element';
    behavior: 'bottom' | 'top' | 'pixels' | 'element_into_view';
    pixels?: number;
    selector?: Selector;
    smooth?: boolean;
    delayAfter?: number;
}

export class ScrollBlock implements BaseBlock {
    id: string;
    type: string = 'scroll';
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: ScrollBlockConfig;
    parent?: Block | null;
    children?: Block[];
    index?: number;

    constructor(name: string, config: ScrollBlockConfig) {
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