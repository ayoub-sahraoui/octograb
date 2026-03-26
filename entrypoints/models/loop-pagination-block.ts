import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";
import { toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { Selector } from "./selector";
import { ConditionConfig } from "./condition-block";

export interface LoopPaginationBlockConfig {
    paginationType?: 'button' | 'scroll';
    nextButtonSelector: Selector;
    scrollTarget?: 'window' | 'element';
    scrollSelector?: Selector;
    scrollAmount?: number;
    scrollStrategy?: 'fixed_amount' | 'scroll_to_bottom' | 'scroll_to_last_item';
    itemSelector?: Selector;
    maxPages?: number;
    delayBetweenPages?: number;
    stopWhen?: ConditionConfig;
    onNoNextButton?: 'stop' | 'error';
}

export class LoopPaginationBlock extends BlockBase {
    id: string;
    type: string = 'loop_pagination';
    config: LoopPaginationBlockConfig;

    constructor(name: string, config: LoopPaginationBlockConfig) {
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

    setPaginationType(type: LoopPaginationBlockConfig['paginationType']) {
        this.config.paginationType = type;
    }

    setNextButtonSelector(selector: Selector) {
        this.config.nextButtonSelector = selector;
    }

    setScrollTarget(target: LoopPaginationBlockConfig['scrollTarget']) {
        this.config.scrollTarget = target;
    }

    setScrollSelector(selector?: Selector) {
        this.config.scrollSelector = selector;
    }

    setScrollAmount(amount: number) {
        this.config.scrollAmount = amount;
    }

    setScrollStrategy(strategy: LoopPaginationBlockConfig['scrollStrategy']) {
        this.config.scrollStrategy = strategy;
    }

    setItemSelector(selector?: Selector) {
        this.config.itemSelector = selector;
    }

    setMaxPages(max?: number) {
        this.config.maxPages = max;
    }

    setDelayBetweenPages(delay?: number) {
        this.config.delayBetweenPages = delay;
    }

    setOnNoNextButton(action: LoopPaginationBlockConfig['onNoNextButton']) {
        this.config.onNoNextButton = action;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): LoopPaginationBlock {
        const block = new LoopPaginationBlock(json.label || 'Loop Pagination', json.config || { nextButtonSelector: { type: 'css', value: '' } });
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