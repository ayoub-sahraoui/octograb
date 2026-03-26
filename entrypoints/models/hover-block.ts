import { toJS } from "mobx";
import { BlockBase } from "./block-base";
import { Selector } from "./selector";
import { OnErrorStrategy } from "./enums";

export interface HoverBlockConfig {
    selector: Selector;
    /** Optional delay in ms to wait after hover (for hover menus to appear) */
    hoverDelay?: number;
}

export class HoverBlock extends BlockBase {
    id: string;
    type: string = 'hover';
    config: HoverBlockConfig;

    constructor(name: string, config: HoverBlockConfig) {
        super();
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

    setHoverDelay(delay: number) {
        this.config.hoverDelay = delay;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): HoverBlock {
        const block = new HoverBlock(json.label || 'Hover', json.config || { selector: { type: 'css', value: '' } });
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
