import { BlockBase } from "./block-base";
import { makeObservable, observable, action, toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { OnErrorStrategy } from "./enums";

export interface LoopElementsBlockConfig {
    selector: Selector;
    maxIterations?: number;
    indexVariable?: string;
    /** Delay between iterations in milliseconds (default: 0) */
    delayBetweenIterations?: number;
    /** Random jitter added to delay in milliseconds (default: 0) */
    randomJitter?: number;
}

export class LoopElementsBlock extends BlockBase {
    id: string;
    type: string = 'loop_elements';
    config: LoopElementsBlockConfig;

    constructor(name: string, config: LoopElementsBlockConfig) {
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
            setMaxIterations: action,
            setIndexVariable: action,
            setDelayBetweenIterations: action,
            setRandomJitter: action,
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

    setSelector(selector: Selector) {
        this.config.selector = selector;
    }

    setMaxIterations(max?: number) {
        this.config.maxIterations = max;
    }

    setIndexVariable(variable?: string) {
        this.config.indexVariable = variable;
    }

    setDelayBetweenIterations(delay: number) {
        this.config.delayBetweenIterations = delay;
    }

    setRandomJitter(jitter: number) {
        this.config.randomJitter = jitter;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): LoopElementsBlock {
        const block = new LoopElementsBlock(json.label || 'Loop Elements', json.config || { selector: { type: 'css', value: '' } });
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