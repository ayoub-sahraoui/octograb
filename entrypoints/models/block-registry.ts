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
import type { ExpectedElementType, SelectorCardinality, SelectorRole } from "./selector-semantics";

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
    selectorDescriptors?: Record<string, BlockSelectorDescriptorDefinition>;
}

export interface BlockValidationHelpers {
    addError: (message: string, block: Block, path: string) => void;
    addWarning: (message: string, block: Block, path: string) => void;
    isInLoopContext: (block: Block) => boolean;
}

export interface BlockSelectorDescriptor {
    key: string;
    label: string;
    selectorRole?: SelectorRole;
    selectorCardinality?: SelectorCardinality;
    expectedElement?: ExpectedElementType;
    required?: boolean | ((block: Block, helpers: BlockValidationHelpers) => boolean);
    requiredMessage?: string | ((block: Block) => string);
}

export type BlockSelectorDescriptorDefinition =
    | BlockSelectorDescriptor
    | ((block?: Block) => BlockSelectorDescriptor);

function getRequiredSelectorDescriptors(
    entry: BlockRegistryEntry,
    block: Block,
    helpers: BlockValidationHelpers,
): BlockSelectorDescriptor[] {
    return Object.values(entry.selectorDescriptors || {})
        .map((descriptor) => typeof descriptor === 'function' ? descriptor(block) : descriptor)
        .filter((descriptor) => {
            const required = typeof descriptor.required === 'function'
                ? descriptor.required(block, helpers)
                : descriptor.required;
            return Boolean(required);
        });
}

function getSelectorValueFromConfig(config: any, key: string): string | undefined {
    const value = config?.[key];
    if (value?.value !== undefined) {
        return value.value;
    }
    return undefined;
}

function validateRequiredSelectors(
    entry: BlockRegistryEntry,
    block: Block,
    path: string,
    helpers: BlockValidationHelpers,
) {
    const config = block.config as any;
    for (const descriptor of getRequiredSelectorDescriptors(entry, block, helpers)) {
        const selectorValue = getSelectorValueFromConfig(config, descriptor.key);
        if (!selectorValue || selectorValue.trim() === '') {
            const message = typeof descriptor.requiredMessage === 'function'
                ? descriptor.requiredMessage(block)
                : descriptor.requiredMessage || `${descriptor.label} requires selector`;
            helpers.addError(message, block, path);
        }
    }
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
        selectorDescriptors: {
            selector: {
                key: 'selector',
                label: 'Click target',
                selectorRole: 'click-target',
                selectorCardinality: 'single',
                expectedElement: 'clickable',
                required: (_block, helpers) => !helpers.isInLoopContext(_block),
                requiredMessage: 'Click block requires selector (unless inside a loop)',
            },
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            validateRequiredSelectors(BLOCK_REGISTRY.click, block, path, helpers);
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
        selectorDescriptors: {
            selector: {
                key: 'selector',
                label: 'Input target',
                selectorRole: 'input-target',
                selectorCardinality: 'single',
                expectedElement: 'input',
                required: (_block, helpers) => !helpers.isInLoopContext(_block),
                requiredMessage: 'Input block requires selector (unless inside a loop)',
            },
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            validateRequiredSelectors(BLOCK_REGISTRY.input, block, path, helpers);
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
        selectorDescriptors: {
            selector: (block) => ({
                key: 'selector',
                label: 'Wait target',
                selectorRole: 'wait-target',
                selectorCardinality: 'single',
                required: Boolean(block && ['selector_visible', 'selector_hidden'].includes((block.config as any)?.type)),
                requiredMessage: 'Wait for selector requires selector',
            }),
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.type) {
                helpers.addError('Wait block requires type', block, path);
            } else if (config.type === 'timeout' && (!config.timeout || config.timeout <= 0)) {
                helpers.addError('Wait timeout must be > 0', block, path);
            }
            validateRequiredSelectors(BLOCK_REGISTRY.wait, block, path, helpers);
        },
    },
    scroll: {
        type: 'scroll',
        defaultLabel: 'Scroll',
        allowsChildren: false,
        managesChildrenExecution: false,
        executorMethod: 'executeScroll',
        create: (json) => new ScrollBlock(json.label || 'Scroll', json.config),
        selectorDescriptors: {
            selector: (block) => ({
                key: 'selector',
                label: 'Scroll target',
                selectorRole: 'scroll-target',
                selectorCardinality: 'single',
                required: Boolean(block && (((block.config as any)?.behavior === 'element_into_view') || ((block.config as any)?.target === 'element'))),
                requiredMessage: 'Scroll element selector is required for this scroll mode',
            }),
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.behavior) {
                helpers.addError('Scroll block requires behavior', block, path);
            } else if (config.behavior === 'pixels' && !config.pixels) {
                helpers.addError('Scroll with pixels behavior requires pixels value', block, path);
            }
            validateRequiredSelectors(BLOCK_REGISTRY.scroll, block, path, helpers);
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
        selectorDescriptors: {
            selector: (block) => ({
                key: 'selector',
                label: 'Condition selector',
                selectorRole: 'condition-target',
                selectorCardinality: (block?.config as any)?.check === 'count_equals' || (block?.config as any)?.check === 'count_greater_than'
                    ? 'multiple'
                    : ((block?.config as any)?.check === 'exists' || (block?.config as any)?.check === 'not_exists' ? 'any' : 'single'),
                required: (_block, helpers) => !helpers.isInLoopContext(_block),
                requiredMessage: 'Condition block requires selector (unless inside a loop)',
            }),
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.check) {
                helpers.addError('Condition block requires check type', block, path);
            }
            validateRequiredSelectors(BLOCK_REGISTRY.condition, block, path, helpers);
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
        selectorDescriptors: {
            selector: {
                key: 'selector',
                label: 'Loop selector',
                selectorRole: 'loop-root',
                selectorCardinality: 'multiple',
                required: true,
                requiredMessage: 'Loop Elements block requires selector',
            },
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            validateRequiredSelectors(BLOCK_REGISTRY.loop_elements, block, path, helpers);
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
        selectorDescriptors: {
            nextButtonSelector: (block) => ({
                key: 'nextButtonSelector',
                label: 'Next button selector',
                selectorRole: 'pagination-next',
                selectorCardinality: 'single',
                expectedElement: 'clickable',
                required: ((block?.config as any)?.paginationType || 'button') === 'button',
                requiredMessage: 'Loop Pagination (button) requires next button selector',
            }),
            itemSelector: (block) => ({
                key: 'itemSelector',
                label: 'Item selector',
                selectorRole: 'loop-root',
                selectorCardinality: 'multiple',
                required: ((block?.config as any)?.paginationType === 'scroll') && (((block?.config as any)?.scrollStrategy || 'fixed_amount') === 'scroll_to_last_item'),
                requiredMessage: 'Scroll to last item strategy requires item selector',
            }),
            scrollSelector: (block) => ({
                key: 'scrollSelector',
                label: 'Scroll selector',
                selectorRole: 'scroll-target',
                selectorCardinality: 'single',
                required: ((block?.config as any)?.paginationType === 'scroll') && (((block?.config as any)?.scrollStrategy || 'fixed_amount') === 'fixed_amount') && (((block?.config as any)?.scrollTarget || 'window') === 'element'),
                requiredMessage: 'Element scrolling requires a scroll selector',
            }),
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            validateRequiredSelectors(BLOCK_REGISTRY.loop_pagination, block, path, helpers);
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
        selectorDescriptors: {
            scopeSelector: {
                key: 'scopeSelector',
                label: 'Scope selector',
                selectorRole: 'extract-scope',
                selectorCardinality: 'single',
                required: false,
            },
            'field.selector': {
                key: 'field.selector',
                label: 'Field selector',
                selectorRole: 'extract-field',
                selectorCardinality: 'single',
                required: false,
            },
        },
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
        selectorDescriptors: {
            selector: (block) => ({
                key: 'selector',
                label: 'Assert selector',
                selectorRole: 'assert-target',
                selectorCardinality: ((block?.config as any)?.check === 'exists' || (block?.config as any)?.check === 'not_exists') ? 'any' : 'single',
                required: (_block, helpers) => !helpers.isInLoopContext(_block),
                requiredMessage: 'Assert block requires selector (unless inside a loop)',
            }),
        },
        validate: (block, path, helpers) => {
            const config = block.config as any;
            if (!config.check) {
                helpers.addError('Assert block requires check type', block, path);
            }
            validateRequiredSelectors(BLOCK_REGISTRY.assert, block, path, helpers);
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

export function getBlockSelectorDescriptor(
    type: BlockType,
    key: string,
    block?: Block,
): BlockSelectorDescriptor | undefined {
    const entry = BLOCK_REGISTRY[type];
    const definition = entry?.selectorDescriptors?.[key];
    if (!definition) {
        return undefined;
    }
    return typeof definition === 'function' ? definition(block) : definition;
}
