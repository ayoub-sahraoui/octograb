import { BlockBase } from './block-base';
import { Selector } from "./selector";
import { v4 as uuidv4 } from 'uuid';
import { toJS } from "mobx";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

export interface ConditionConfig {
    selector: Selector;
    check: 'exists' | 'not_exists' | 'visible' | 'hidden' | 'text_contains' | 'text_equals' | 'text_regex' | 'count_equals' | 'count_greater_than';
    value?: string | number;
    negate?: boolean;
}

export class ConditionBlock extends BlockBase {
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
        super();
        this.id = uuidv4();
        this.label = 'Condition';
        this.enabled = true;
        this.description = 'Condition block';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.config = config;
    }

    // ─── Config-specific actions ───────────────────────────────────────────

    setSelector(selector: Selector) {
        this.config.selector = selector;
    }

    setCheck(check: ConditionConfig['check']) {
        this.config.check = check;
    }

    setValue(value: string | number | undefined) {
        this.config.value = value;
    }

    setNegate(negate: boolean | undefined) {
        this.config.negate = negate;
    }

    // ─── Else Children ─────────────────────────────────────────────────────

    addElseChild(child: Block) {
        if (!this.elseChildren) {
            this.elseChildren = [];
        }
        child.parent = this;
        child.index = this.elseChildren.length;
        this.elseChildren.push(child);
    }

    removeElseChild(child: Block) {
        if (!this.elseChildren) return;
        this.elseChildren = this.elseChildren.filter(c => c.id !== child.id);
        this.elseChildren.forEach((c, i) => c.index = i);
    }

    clearElseChildren() {
        this.elseChildren = [];
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): ConditionBlock {
        const block = new ConditionBlock(json.config || { selector: { type: 'css', value: '' }, check: 'exists' });
        if (json.id) block.id = json.id;
        if (json.label !== undefined) block.setLabel(json.label);
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