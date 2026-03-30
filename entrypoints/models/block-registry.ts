import { AssertBlock } from "./assert-block";
import { ClickBlock } from "./click-block";
import { ConditionBlock } from "./condition-block";
import { ExtractScopeBlock } from "./extract-scope-block";
import { GoBackBlock } from "./go-back-block";
import { InputBlock } from "./input-block";
import { LoopElementsBlock } from "./loop-elements-block";
import { LoopPaginationBlock } from "./loop-pagination-block";
import { MacroBlock } from "./macro-block";
import { NavigateBlock } from "./navigate-block";
import { ScrollBlock } from "./scroll-block";
import { SetVariableBlock } from "./set-variable-block";
import { WaitBlock } from "./wait-block";
import { Block } from "./types";

export type BlockType = Block["type"];
export type ExecutorMethodName =
    | 'executeNavigate'
    | 'executeClick'
    | 'executeInput'
    | 'executeWait'
    | 'executeScroll'
    | 'executeGoBack'
    | 'executeCondition'
    | 'executeAssert'
    | 'executeSetVariable'
    | 'executeMacro'
    | 'executeLoopElements'
    | 'executeLoopPagination'
    | 'executeExtractScope';

export interface BlockRegistryEntry {
    type: BlockType;
    defaultLabel: string;
    allowsChildren: boolean;
    managesChildrenExecution: boolean;
    executorMethod: ExecutorMethodName;
    create: (json: any) => Block;
    validate?: (block: Block, path: string, helpers: BlockValidationHelpers) => void;
}

export interface BlockValidationHelpers {
    addError: (message: string, block: Block, path: string) => void;
    addWarning: (message: string, block: Block, path: string) => void;
    isInLoopContext: (block: Block) => boolean;
}

export const BLOCK_REGISTRY: Record<BlockType, BlockRegistryEntry> = {
    navigate: {
        type: 'navigate',
        defaultLabel: 'Navigate',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeNavigate',
        create: (json) => new NavigateBlock(json.label || 'Navigate', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.url || config.url.trim() === '') {
                helpers.addError('Navigate block requires URL', block, path);
            }
        },
    },
    click: {
        type: 'click',
        defaultLabel: 'Click',
        allowsChildren: true,
        managesChildrenExecution: false,
        executorMethod: 'executeClick',
        create: (json) => new ClickBlock(json.label || 'Click', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.selector?.value && !helpers.isInLoopContext(block)) {
                helpers.addError('Click block requires selector (unless inside a loop)', block, path);
            }
            if (config.openInNewTab && (!block.children || block.children.length === 0)) {
                helpers.addWarning('Click with openInNewTab has no children - new tab will open and close immediately', block, path);
            }
        },
    },
    input: {
        type: 'input',
        defaultLabel: 'Input',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeInput',
        create: (json) => new InputBlock(json.label || 'Input', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.selector?.value && !helpers.isInLoopContext(block)) {
                helpers.addError('Input block requires selector (unless inside a loop)', block, path);
            }
            if (config.value === undefined || config.value === null || config.value === '') {
                helpers.addWarning('Input block has no value - will input empty string', block, path);
            }
        },
    },
    wait: {
        type: 'wait',
        defaultLabel: 'Wait',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeWait',
        create: (json) => new WaitBlock(json.label || 'Wait', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.type) {
                helpers.addError('Wait block requires type', block, path);
            } else if (config.type === 'timeout' && (!config.timeout || config.timeout <= 0)) {
                helpers.addError('Wait timeout must be > 0', block, path);
            } else if ((config.type === 'selector_visible' || config.type === 'selector_hidden') && !config.selector?.value) {
                helpers.addError('Wait for selector requires selector', block, path);
            }
        },
    },
    scroll: {
        type: 'scroll',
        defaultLabel: 'Scroll',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeScroll',
        create: (json) => new ScrollBlock(json.label || 'Scroll', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.behavior) {
                helpers.addError('Scroll block requires behavior', block, path);
            } else if (config.behavior === 'pixels' && !config.pixels) {
                helpers.addError('Scroll with pixels behavior requires pixels value', block, path);
            }
        },
    },
    go_back: {
        type: 'go_back',
        defaultLabel: 'Go Back',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeGoBack',
        create: (json) => new GoBackBlock(json.label || 'Go Back', json.config),
    },
    condition: {
        type: 'condition',
        defaultLabel: 'Condition',
        allowsChildren: true,
        managesChildrenExecution: true,
        executorMethod: 'executeCondition',
        create: (json) => new ConditionBlock(json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.check) {
                helpers.addError('Condition block requires check type', block, path);
            }
            if (!config.selector?.value && !helpers.isInLoopContext(block)) {
                helpers.addError('Condition block requires selector (unless inside a loop)', block, path);
            }
            if (['text_contains', 'text_equals', 'text_regex', 'count_equals', 'count_greater_than'].includes(config.check) &&
                (config.value === undefined || config.value === null)) {
                helpers.addError(`Condition check "${config.check}" requires a value`, block, path);
            }
        },
    },
    loop_elements: {
        type: 'loop_elements',
        defaultLabel: 'Loop Elements',
        allowsChildren: true,
        managesChildrenExecution: true,
        executorMethod: 'executeLoopElements',
        create: (json) => new LoopElementsBlock(json.label || 'Loop Elements', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.selector?.value) {
                helpers.addError('Loop Elements block requires selector', block, path);
            }
            if (config.maxIterations !== undefined && config.maxIterations <= 0) {
                helpers.addError('Loop maxIterations must be > 0', block, path);
            }
            if (!block.children || block.children.length === 0) {
                helpers.addWarning('Loop Elements has no children - will iterate but do nothing', block, path);
            }
        },
    },
    loop_pagination: {
        type: 'loop_pagination',
        defaultLabel: 'Pagination',
        allowsChildren: true,
        managesChildrenExecution: true,
        executorMethod: 'executeLoopPagination',
        create: (json) => new LoopPaginationBlock(json.label || 'Pagination', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            const pagType = config.paginationType || 'button';
            if (pagType === 'button') {
                if (!config.nextButtonSelector?.value) {
                    helpers.addError('Loop Pagination (button) requires next button selector', block, path);
                }
            } else if (pagType === 'scroll') {
                const strategy = config.scrollStrategy || 'fixed_amount';
                if (strategy === 'scroll_to_last_item' && !config.itemSelector?.value) {
                    helpers.addError('Scroll to last item strategy requires item selector', block, path);
                }
            }
            if (config.maxPages && config.maxPages <= 0) {
                helpers.addError('Loop maxPages must be > 0', block, path);
            }
            if (!block.children || block.children.length === 0) {
                helpers.addWarning('Loop Pagination has no children - will paginate but extract nothing', block, path);
            }
        },
    },
    extract_scope: {
        type: 'extract_scope',
        defaultLabel: 'Extract Data',
        allowsChildren: true,
        managesChildrenExecution: true,
        executorMethod: 'executeExtractScope',
        create: (json) => new ExtractScopeBlock(json.label || 'Extract Data', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.fields || config.fields.length === 0) {
                helpers.addError('Extract block requires at least one field', block, path);
            } else {
                for (const field of config.fields) {
                    if (!field.key || field.key.trim() === '') {
                        helpers.addError('Extract field missing key', block, path);
                    }
                    if (!field.attribute && field.mode !== 'static') {
                        helpers.addError(`Extract field "${field.key}" missing attribute`, block, path);
                    }
                }
            }
        },
    },
    assert: {
        type: 'assert',
        defaultLabel: 'Assert',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeAssert',
        create: (json) => new AssertBlock(json.label || 'Assert', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.check) {
                helpers.addError('Assert block requires check type', block, path);
            }
            if (!config.selector?.value && !helpers.isInLoopContext(block)) {
                helpers.addError('Assert block requires selector (unless inside a loop)', block, path);
            }
            if (['text_contains', 'text_equals', 'text_regex'].includes(config.check) &&
                (config.value === undefined || config.value === null || config.value === '')) {
                helpers.addError(`Assert check "${config.check}" requires a value`, block, path);
            }
        },
    },
    set_variable: {
        type: 'set_variable',
        defaultLabel: 'Set Variable',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeSetVariable',
        create: (json) => new SetVariableBlock(json.label || 'Set Variable', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.name || config.name.trim() === '') {
                helpers.addError('Set Variable block requires variable name', block, path);
            }
        },
    },
    macro: {
        type: 'macro',
        defaultLabel: 'Macro',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeMacro',
        create: (json) => new MacroBlock(json.label || 'Macro', json.config),
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.macroId || config.macroId.trim() === '') {
                helpers.addError('Macro block requires macroId', block, path);
            }
        },
    },
};

export const BLOCK_TYPES = Object.keys(BLOCK_REGISTRY) as BlockType[];

export function getBlockRegistryEntry(type: string): BlockRegistryEntry | undefined {
    return BLOCK_REGISTRY[type as BlockType];
}
