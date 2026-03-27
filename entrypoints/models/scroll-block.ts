import { BlockBase } from "./block-base";
import { makeObservable, observable, action, toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";
import { Selector } from "./selector";

export interface ScrollBlockConfig {
    target: 'window' | 'element';
    behavior: 'bottom' | 'top' | 'pixels' | 'element_into_view';
    pixels?: number;
    selector?: Selector;
    smooth?: boolean;
    delayAfter?: number;
}

export class ScrollBlock extends BlockBase {
    id: string;
    type: string = 'scroll';
    config: ScrollBlockConfig;

    constructor(name: string, config: ScrollBlockConfig) {
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
            setTarget: action,
            setBehavior: action,
            setPixels: action,
            setSelector: action,
            setSmooth: action,
            setDelayAfter: action,
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

    setTarget(target: ScrollBlockConfig['target']) {
        this.config.target = target;
    }

    setBehavior(behavior: ScrollBlockConfig['behavior']) {
        this.config.behavior = behavior;
    }

    setPixels(pixels?: number) {
        this.config.pixels = pixels;
    }

    setSelector(selector?: Selector) {
        this.config.selector = selector;
    }

    setSmooth(smooth?: boolean) {
        this.config.smooth = smooth;
    }

    setDelayAfter(delay?: number) {
        this.config.delayAfter = delay;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): ScrollBlock {
        const block = new ScrollBlock(json.label || 'Scroll', json.config || { target: 'window', behavior: 'bottom' });
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