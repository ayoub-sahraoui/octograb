import { toJS } from "mobx";
import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";

export type FrameTarget = 'main' | number | string;

export interface SwitchFrameBlockConfig {
    /** Frame target: 'main' for main page, number for frame index, or string for frame name/id */
    target: FrameTarget;
    /** Optional timeout in ms to wait for frame to be available (default: 5000) */
    timeout?: number;
}

export class SwitchFrameBlock extends BlockBase {
    id: string;
    type: string = 'switch_frame';
    config: SwitchFrameBlockConfig;

    constructor(name: string, config: SwitchFrameBlockConfig) {
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

    setTarget(target: FrameTarget) {
        this.config.target = target;
    }

    setTimeout(timeout: number) {
        this.config.timeout = timeout;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): SwitchFrameBlock {
        const block = new SwitchFrameBlock(json.label || 'Switch Frame', json.config || { target: 'main' });
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
