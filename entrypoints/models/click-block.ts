import { BlockBase } from "./block-base";
import { Selector } from "./selector";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { OnErrorStrategy } from "./enums";

export interface ClickBlockConfig {
    selector: Selector;
    delayBefore?: number;
    delayAfter?: number;
    openInNewTab?: boolean;
    waitAfterClick?: number;
}

export class ClickBlock extends BlockBase {
    id: string;
    type: string = 'click';
    config: ClickBlockConfig;

    constructor(name: string, config: ClickBlockConfig) {
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

    setDelayBefore(delay?: number) {
        this.config.delayBefore = delay;
    }

    setDelayAfter(delay?: number) {
        this.config.delayAfter = delay;
    }

    setOpenInNewTab(openInNewTab: boolean) {
        this.config.openInNewTab = openInNewTab;
    }

    setWaitAfterClick(wait: number) {
        this.config.waitAfterClick = wait;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): ClickBlock {
        const block = new ClickBlock(json.label || 'Click', json.config || { selector: { type: 'css', value: '' } });
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