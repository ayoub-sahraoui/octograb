import { BlockBase } from "./block-base";
import { Selector } from "./selector";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";

export interface InputBlockConfig {
    selector: Selector;
    value: string;
    clearBeforeInput?: boolean;
    delayBefore?: number;
    delayAfter?: number;
}

export class InputBlock extends BlockBase {
    id: string;
    type: string = 'input';
    config: InputBlockConfig;

    constructor(name: string, config: InputBlockConfig) {
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

    setSelector(selector: Selector) {
        this.config.selector = selector;
    }

    setValue(value: string) {
        this.config.value = value;
    }

    setClearBeforeInput(clear: boolean) {
        this.config.clearBeforeInput = clear;
    }

    setDelayBefore(delay: number | undefined) {
        this.config.delayBefore = delay;
    }

    setDelayAfter(delay: number | undefined) {
        this.config.delayAfter = delay;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): InputBlock {
        const block = new InputBlock(json.label || 'Input', json.config || { selector: { type: 'css', value: '' }, value: '' });
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