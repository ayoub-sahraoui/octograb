import { BlockBase } from "./block-base";
import { makeObservable, observable, action, toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";
import { Selector } from "./selector";

export interface WaitBlockConfig {
    type: 'timeout' | 'selector_visible' | 'selector_hidden' | 'network_idle' | 'dom_content_loaded';
    timeout?: number;
    selector?: Selector;
    idleTime?: number;
}

export class WaitBlock extends BlockBase {
    id: string;
    type: string = 'wait';
    config: WaitBlockConfig;

    constructor(name: string, config: WaitBlockConfig) {
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
            setWaitType: action,
            setTimeout: action,
            setSelector: action,
            setIdleTime: action,
        });
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

    setWaitType(type: WaitBlockConfig['type']) {
        this.config.type = type;
    }

    setTimeout(timeout?: number) {
        this.config.timeout = timeout;
    }

    setSelector(selector: Selector) {
        this.config.selector = selector;
    }

    setIdleTime(idleTime?: number) {
        this.config.idleTime = idleTime;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): WaitBlock {
        const block = new WaitBlock(json.label || 'Wait', json.config || { type: 'timeout', timeout: 1000 });
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