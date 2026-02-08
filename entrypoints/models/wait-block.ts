import { BaseBlock } from "./base-block";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";
import { Selector } from "./selector";
import { Block } from "./types";

export interface WaitBlockConfig {
    type: 'timeout' | 'selector_visible' | 'selector_hidden' | 'network_idle' | 'dom_content_loaded';
    timeout?: number;
    selector?: Selector;
    idleTime?: number;
}

export class WaitBlock implements BaseBlock {
    id: string;
    type: string = 'wait';
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: WaitBlockConfig;
    children?: Block[];

    constructor(name: string, config: WaitBlockConfig) {
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