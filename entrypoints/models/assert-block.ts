import { makeObservable, observable, action, toJS } from "mobx";
import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";
import { Selector } from "./selector";

export type AssertCheckType =
    | 'exists'
    | 'not_exists'
    | 'visible'
    | 'hidden'
    | 'text_equals'
    | 'text_contains'
    | 'text_regex';

export interface AssertBlockConfig {
    selector: Selector;
    check: AssertCheckType;
    /** Expected value for text_equals, text_contains, text_regex */
    value?: string;
    /** Timeout in milliseconds to wait for condition (default: 5000) */
    timeout?: number;
    /** Custom error message to show on assertion failure */
    failMessage?: string;
}

export class AssertBlock extends BlockBase {
    id: string;
    type: string = 'assert';
    config: AssertBlockConfig;

    constructor(name: string, config: AssertBlockConfig) {
        super();
        makeObservable(this, {
            id: observable,
            type: observable,
            config: observable,
            label: observable,
            enabled: observable,
            description: observable,
            onError: observable,
            maxRetries: observable,
            retryDelay: observable,
            parent: observable,
            children: observable,
            index: observable,
            setLabel: action,
            setEnabled: action,
            toggleEnabled: action,
            setDescription: action,
            setOnError: action,
            setMaxRetries: action,
            setRetryDelay: action,
            setMaxExecutionTime: action,
            setConfig: action,
            updateConfig: action,
            setConfigValue: action,
            setParent: action,
            addChild: action,
            removeChild: action,
            moveChild: action,
            clearChildren: action,
            setIndex: action,
            setSelector: action,
            setCheck: action,
            setValue: action,
            setTimeout: action,
            setFailMessage: action,
        });
        this.id = crypto.randomUUID();
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

    setCheck(check: AssertCheckType) {
        this.config.check = check;
    }

    setValue(value: string) {
        this.config.value = value;
    }

    setTimeout(timeout: number | undefined) {
        this.config.timeout = timeout;
    }

    setFailMessage(message: string) {
        this.config.failMessage = message;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): AssertBlock {
        const block = new AssertBlock(json.label || 'Assert', json.config || { selector: { type: 'auto', value: '' }, check: 'exists' });
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
