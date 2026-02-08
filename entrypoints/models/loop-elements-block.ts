import { BaseBlock } from "./base-block";
import { makeAutoObservable } from "mobx";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

export interface LoopElementsBlockConfig {
    selector: Selector;
    children: BaseBlock[];
    maxIterations?: number;
    indexVariable?: string;
}

export class LoopElementsBlock implements BaseBlock {
    id: string;
    type: string = 'loop_elements';
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    config: LoopElementsBlockConfig;
    children?: Block[];

    constructor(name: string, config: LoopElementsBlockConfig) {
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