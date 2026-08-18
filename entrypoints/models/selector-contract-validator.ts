import { Blueprint } from './blueprint';
import { Block } from './types';
import { getBlockRegistryEntry, getBlockSelectorDescriptor } from './block-registry';
import { isValidCssSelector } from '@/core/css-selector-sanitizer';
import type { Scope } from '@/core/env';

export interface SelectorContractIssue {
    severity: 'error' | 'warning';
    message: string;
    block: Block;
    path: string;
}

export interface RuntimeSelectorCheck {
    block: Block;
    path: string;
    selectorKey: string;
    selectorValue: string;
    selectorType: 'css' | 'xpath' | 'text' | 'auto';
    selectorRole?: string;
    selectorCardinality?: 'single' | 'multiple' | 'any';
    scope?: Scope;
}

export interface RuntimeDetailFlowCheck {
    block: Block;
    path: string;
    clickSelectorValue: string;
    clickSelectorType: 'css' | 'xpath' | 'text' | 'auto';
    clickScope?: Scope;
    openInNewTab: boolean;
    childChecks: RuntimeSelectorCheck[];
    sequentialSameTab?: boolean;
}

const INVALID_CSS_PATTERNS = [
    /^\/\//,
    /contains\s*\(/i,
    /normalize-space\s*\(/i,
    /\btext\s*\(\s*\)/i,
    /\[@/,
    /::?contains\s*\(/i,
    /\bor\b/i,
    /\band\b/i,
];

function collectBlockSelectorIssues(
    block: Block,
    path: string,
    issues: SelectorContractIssue[],
) {
    if (block.enabled === false) {
        return;
    }

    const entry = getBlockRegistryEntry(block.type);
    if (!entry?.selectorDescriptors) {
        return;
    }

    for (const key of Object.keys(entry.selectorDescriptors)) {
        const descriptor = getBlockSelectorDescriptor(block.type, key, block);
        if (!descriptor) {
            continue;
        }

        const selectorConfig = (block.config as any)?.[descriptor.key];
        const selectorValue = selectorConfig?.value;
        const selectorType = selectorConfig?.type || 'css';
        if (!selectorValue || typeof selectorValue !== 'string') {
            continue;
        }

        if (selectorType === 'css') {
            if (INVALID_CSS_PATTERNS.some((pattern) => pattern.test(selectorValue)) || !isValidCssSelector(selectorValue)) {
                issues.push({
                    severity: 'error',
                    message: `${descriptor.label} uses unsupported CSS or invalid CSS syntax.`,
                    block,
                    path,
                });
                continue;
            }
        }

        if (descriptor.selectorCardinality === 'single' && selectorValue.includes(',')) {
            issues.push({
                severity: 'warning',
                message: `${descriptor.label} should match one element, but this selector combines multiple targets.`,
                block,
                path,
            });
        }

        if ((descriptor.selectorRole === 'loop-root' || descriptor.selectorRole === 'extract-field')
            && /:nth-child|:nth-of-type/i.test(selectorValue)) {
            issues.push({
                severity: 'warning',
                message: `${descriptor.label} looks too specific for a repeating selector and may only work for one item.`,
                block,
                path,
            });
        }
    }

    if (block.type === 'extract_scope') {
        collectExtractFieldQualityIssues(block, path, issues);
    }

    if (block.type === 'loop_elements') {
        collectSequentialDetailFlowQualityIssues(block, path, issues);
    }
}

function isEnabled(block: Block | undefined): block is Block {
    if (!block) return false;
    return block.enabled !== false;
}

function isDetailFlowPause(block: Block): boolean {
    return block.type === 'wait' || block.type === 'scroll';
}

function isSequentialDetailExtract(block: Block | undefined): block is Block {
    return isEnabled(block)
        && block.type === 'extract_scope'
        && Boolean((block.config as any)?.resetScope);
}

function collectSequentialDetailExtractIds(children: Block[] = []): Set<string> {
    const extractIds = new Set<string>();

    for (let index = 0; index < children.length; index += 1) {
        const block = children[index];
        if (!isEnabled(block) || block.type !== 'click') {
            continue;
        }

        const clickConfig = block.config as any;
        if (clickConfig?.openInNewTab || !clickConfig?.selector?.value) {
            continue;
        }

        let detailIndex = index + 1;
        while (detailIndex < children.length && isEnabled(children[detailIndex]) && isDetailFlowPause(children[detailIndex])) {
            detailIndex += 1;
        }

        if (isSequentialDetailExtract(children[detailIndex])) {
            extractIds.add(children[detailIndex].id);
        }
    }

    return extractIds;
}

function collectExtractFieldQualityIssues(
    block: Block,
    path: string,
    issues: SelectorContractIssue[],
) {
    const fields = ((block.config as any)?.fields || []) as Array<any>;
    if (fields.length === 0) {
        return;
    }

    const fieldKeys = new Set<string>();
    const duplicateKeys = new Set<string>();
    for (const field of fields) {
        const key = typeof field?.key === 'string' ? field.key.trim() : '';
        if (!key) continue;
        if (fieldKeys.has(key)) {
            duplicateKeys.add(key);
        }
        fieldKeys.add(key);
    }

    for (const key of duplicateKeys) {
        issues.push({
            severity: 'warning',
            message: `Extract field key "${key}" is duplicated; later values can overwrite earlier extracted data.`,
            block,
            path,
        });
    }

    for (const field of fields) {
        const key = typeof field?.key === 'string' ? field.key.trim() : '';
        if (!key) continue;

        if (key.toUpperCase() === 'GTN') {
            issues.push({
                severity: 'warning',
                message: `Extract field key "GTN" looks like a typo; use "GTIN" if this is a product identifier.`,
                block,
                path,
            });
        }

        const formula = typeof field?.formula === 'string' ? field.formula : '';
        if (formula) {
            const references: string[] = [];
            const referencePattern = /\{\{([^}]+)\}\}/g;
            let match: RegExpExecArray | null;
            while ((match = referencePattern.exec(formula)) !== null) {
                const reference = String(match[1] || '').trim();
                if (reference) references.push(reference);
            }

            for (const reference of references) {
                if (!fieldKeys.has(reference)) {
                    issues.push({
                        severity: 'warning',
                        message: `Formula for "${key}" references missing field "${reference}".`,
                        block,
                        path,
                    });
                }
            }

            if (field.mode === 'static' && (field.staticValue === undefined || field.staticValue === '')) {
                issues.push({
                    severity: 'warning',
                    message: `Formula field "${key}" is configured as static with an empty base value; ensure the formula references existing extracted fields.`,
                    block,
                    path,
                });
            }
        }

        const selectorValue = typeof field?.selector?.value === 'string' ? field.selector.value : '';
        if (field.required && selectorValue && isHighlyPositionalSelector(selectorValue)) {
            issues.push({
                severity: 'warning',
                message: `required extract field "${key}" uses a highly positional selector and may break when the page layout changes.`,
                block,
                path,
            });
        }
    }
}

function isHighlyPositionalSelector(selectorValue: string): boolean {
    return /:nth-child|:nth-of-type/i.test(selectorValue)
        || selectorValue.split('>').length > 4;
}

function collectSequentialDetailFlowQualityIssues(
    block: Block,
    path: string,
    issues: SelectorContractIssue[],
) {
    const children = block.children || [];

    for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        if (!isEnabled(child) || child.type !== 'click') {
            continue;
        }

        const clickConfig = child.config as any;
        if (clickConfig?.openInNewTab || !clickConfig?.selector?.value) {
            continue;
        }

        let detailIndex = index + 1;
        while (detailIndex < children.length && isEnabled(children[detailIndex]) && isDetailFlowPause(children[detailIndex])) {
            detailIndex += 1;
        }

        if (!isSequentialDetailExtract(children[detailIndex])) {
            continue;
        }

        let returnIndex = detailIndex + 1;
        while (returnIndex < children.length && isEnabled(children[returnIndex]) && isDetailFlowPause(children[returnIndex])) {
            returnIndex += 1;
        }

        const returnBlock = children[returnIndex];
        if (!returnBlock) {
            issues.push({
                severity: 'warning',
                message: 'Same-tab detail extraction flow has no Go Back block, so the loop may not return to the listing page for the next item.',
                block,
                path,
            });
            continue;
        }

        if (returnBlock.type === 'go_back' && returnBlock.enabled === false) {
            issues.push({
                severity: 'warning',
                message: 'Same-tab detail extraction flow has a Go Back block, but the Go Back block is disabled; later loop items may fail.',
                block,
                path,
            });
        } else if (returnBlock.type !== 'go_back') {
            issues.push({
                severity: 'warning',
                message: 'Same-tab detail extraction flow should return to the listing page with a Go Back block before processing later items.',
                block,
                path,
            });
        }
    }
}

function walkBlocks(block: Block, path: string[], issues: SelectorContractIssue[]) {
    if (block.enabled === false) {
        return;
    }

    const currentPath = [...path, block.label || block.type].join(' > ');
    collectBlockSelectorIssues(block, currentPath, issues);

    for (const child of block.children || []) {
        walkBlocks(child, [...path, block.label || block.type], issues);
    }

    if (block.type === 'condition' && (block as any).elseChildren) {
        for (const child of (block as any).elseChildren) {
            walkBlocks(child, [...path, block.label || block.type, 'else'], issues);
        }
    }
}

export function validateBlueprintSelectorContracts(blueprint: Blueprint): SelectorContractIssue[] {
    const issues: SelectorContractIssue[] = [];
    for (const block of blueprint.blocks) {
        walkBlocks(block, [], issues);
    }
    return issues;
}

function buildScopeFromSelector(
    selectorConfig: { value?: string; type?: 'css' | 'xpath' } | undefined,
    parentScope?: Scope,
): Scope | undefined {
    if (!selectorConfig?.value) {
        return undefined;
    }

    return {
        selector: selectorConfig.value,
        selectorType: selectorConfig.type || 'css',
        index: 0,
        parent: parentScope,
    };
}

export function collectRuntimeSelectorChecks(blueprint: Blueprint): RuntimeSelectorCheck[] {
    const checks: RuntimeSelectorCheck[] = [];

    const pushDescriptorCheck = (
        block: Block,
        path: string[],
        descriptorKey: string,
        selectorConfig: { value?: string; type?: 'css' | 'xpath' } | undefined,
        scope?: Scope,
        pathSuffix?: string,
    ) => {
        const descriptor = getBlockSelectorDescriptor(block.type, descriptorKey, block);
        const selectorValue = selectorConfig?.value;
        if (!descriptor || !selectorValue || typeof selectorValue !== 'string') {
            return;
        }

        checks.push({
            block,
            path: [...path, block.label || block.type, pathSuffix].filter(Boolean).join(' > '),
            selectorKey: descriptor.key,
            selectorValue,
            selectorType: (selectorConfig?.type || 'css') as 'css' | 'xpath' | 'text' | 'auto',
            selectorRole: descriptor.selectorRole,
            selectorCardinality: descriptor.selectorCardinality,
            scope,
        });
    };

    const visit = (block: Block, path: string[], scope?: Scope) => {
        if (block.enabled === false) {
            return;
        }

        const entry = getBlockRegistryEntry(block.type);
        let childScope = scope;

        if (entry?.selectorDescriptors) {
            for (const key of Object.keys(entry.selectorDescriptors)) {
                if (block.type === 'extract_scope' && (key === 'field.selector' || key === 'scopeSelector')) {
                    continue;
                }

                const descriptor = getBlockSelectorDescriptor(block.type, key, block);
                if (!descriptor) continue;

                const selectorConfig = (block.config as any)?.[descriptor.key];
                pushDescriptorCheck(block, path, key, selectorConfig, scope);
            }
        }

        if (block.type === 'loop_elements') {
            const loopSelector = (block.config as any)?.selector;
            childScope = buildScopeFromSelector(loopSelector, scope);
        } else if (block.type === 'extract_scope') {
            const config = block.config as any;
            let extractScope = config.resetScope ? undefined : scope;
            if (config.scopeSelector?.value) {
                pushDescriptorCheck(block, path, 'scopeSelector', config.scopeSelector, extractScope);
                extractScope = buildScopeFromSelector(config.scopeSelector, extractScope);
            }

            for (const field of config.fields || []) {
                if (field?.mode === 'static') {
                    continue;
                }
                pushDescriptorCheck(
                    block,
                    path,
                    'field.selector',
                    field?.selector,
                    extractScope,
                    field?.label || field?.key,
                );
            }

            childScope = extractScope;
        }

        if (block.type === 'click') {
            return;
        }

        const sequentialDetailExtractIds = block.type === 'loop_elements'
            ? collectSequentialDetailExtractIds(block.children || [])
            : new Set<string>();

        for (const child of block.children || []) {
            if (sequentialDetailExtractIds.has(child.id)) {
                continue;
            }
            visit(child, [...path, block.label || block.type], childScope);
        }

        if (block.type === 'condition' && (block as any).elseChildren) {
            for (const child of (block as any).elseChildren) {
                visit(child, [...path, block.label || block.type, 'else'], childScope);
            }
        }
    };

    for (const block of blueprint.blocks) {
        visit(block, []);
    }

    return checks;
}

export function collectRuntimeDetailFlowChecks(blueprint: Blueprint): RuntimeDetailFlowCheck[] {
    const flows: RuntimeDetailFlowCheck[] = [];

    const collectChecksForBlocks = (blocks: Block[], path: string[], scope?: Scope): RuntimeSelectorCheck[] => {
        const checks: RuntimeSelectorCheck[] = [];

        const pushDescriptorCheck = (
            block: Block,
            currentPath: string[],
            descriptorKey: string,
            selectorConfig: { value?: string; type?: 'css' | 'xpath' } | undefined,
            currentScope?: Scope,
            pathSuffix?: string,
        ) => {
            const descriptor = getBlockSelectorDescriptor(block.type, descriptorKey, block);
            const selectorValue = selectorConfig?.value;
            if (!descriptor || !selectorValue || typeof selectorValue !== 'string') {
                return;
            }

            checks.push({
                block,
                path: [...currentPath, block.label || block.type, pathSuffix].filter(Boolean).join(' > '),
                selectorKey: descriptor.key,
                selectorValue,
                selectorType: (selectorConfig?.type || 'css') as 'css' | 'xpath' | 'text' | 'auto',
                selectorRole: descriptor.selectorRole,
                selectorCardinality: descriptor.selectorCardinality,
                scope: currentScope,
            });
        };

        const visit = (block: Block, currentPath: string[], currentScope?: Scope) => {
            if (block.enabled === false) {
                return;
            }

            const entry = getBlockRegistryEntry(block.type);
            let childScope = currentScope;

            if (entry?.selectorDescriptors) {
                for (const key of Object.keys(entry.selectorDescriptors)) {
                    if (block.type === 'extract_scope' && (key === 'field.selector' || key === 'scopeSelector')) {
                        continue;
                    }
                    const selectorConfig = (block.config as any)?.[key];
                    pushDescriptorCheck(block, currentPath, key, selectorConfig, currentScope);
                }
            }

            if (block.type === 'loop_elements') {
                const loopSelector = (block.config as any)?.selector;
                childScope = buildScopeFromSelector(loopSelector, currentScope);
            } else if (block.type === 'extract_scope') {
                const config = block.config as any;
                let extractScope = config.resetScope ? undefined : currentScope;
                if (config.scopeSelector?.value) {
                    pushDescriptorCheck(block, currentPath, 'scopeSelector', config.scopeSelector, extractScope);
                    extractScope = buildScopeFromSelector(config.scopeSelector, extractScope);
                }

                for (const field of config.fields || []) {
                    if (field?.mode === 'static') continue;
                    pushDescriptorCheck(
                        block,
                        currentPath,
                        'field.selector',
                        field?.selector,
                        extractScope,
                        field?.label || field?.key,
                    );
                }

            childScope = extractScope;
            }

            if (block.type === 'click') {
                return;
            }

            for (const child of block.children || []) {
                visit(child, [...currentPath, block.label || block.type], childScope);
            }

            if (block.type === 'condition' && (block as any).elseChildren) {
                for (const child of (block as any).elseChildren) {
                    visit(child, [...currentPath, block.label || block.type, 'else'], childScope);
                }
            }
        };

        for (const block of blocks) {
            visit(block, path, scope);
        }

        return checks;
    };

    const visitBlueprint = (block: Block, path: string[], scope?: Scope) => {
        if (block.enabled === false) {
            return;
        }

        let childScope = scope;

        if (block.type === 'loop_elements') {
            childScope = buildScopeFromSelector((block.config as any)?.selector, scope);
        } else if (block.type === 'extract_scope') {
            const config = block.config as any;
            let extractScope = config.resetScope ? undefined : scope;
            if (config.scopeSelector?.value) {
                extractScope = buildScopeFromSelector(config.scopeSelector, extractScope);
            }
            childScope = extractScope;
        }

        if (block.type === 'click') {
            const clickSelector = (block.config as any)?.selector;
            if (clickSelector?.value && (block.children?.length || 0) > 0) {
                flows.push({
                    block,
                    path: [...path, block.label || block.type].join(' > '),
                    clickSelectorValue: clickSelector.value,
                    clickSelectorType: (clickSelector.type || 'css') as 'css' | 'xpath' | 'text' | 'auto',
                    clickScope: scope,
                    openInNewTab: Boolean((block.config as any)?.openInNewTab),
                    childChecks: collectChecksForBlocks(block.children || [], [...path, block.label || block.type], undefined),
                });
            }
        }

        if (block.type === 'loop_elements') {
            const children = block.children || [];
            for (let index = 0; index < children.length; index += 1) {
                const child = children[index];
                if (!isEnabled(child) || child.type !== 'click') {
                    continue;
                }

                const clickSelector = (child.config as any)?.selector;
                if (!clickSelector?.value || (child.config as any)?.openInNewTab) {
                    continue;
                }

                let detailIndex = index + 1;
                while (detailIndex < children.length && isEnabled(children[detailIndex]) && isDetailFlowPause(children[detailIndex])) {
                    detailIndex += 1;
                }

                const detailExtract = children[detailIndex];
                if (!isSequentialDetailExtract(detailExtract)) {
                    continue;
                }

                flows.push({
                    block: child,
                    path: [...path, block.label || block.type, child.label || child.type].join(' > '),
                    clickSelectorValue: clickSelector.value,
                    clickSelectorType: (clickSelector.type || 'css') as 'css' | 'xpath' | 'text' | 'auto',
                    clickScope: childScope,
                    openInNewTab: false,
                    childChecks: collectChecksForBlocks(
                        [detailExtract],
                        [...path, block.label || block.type, child.label || child.type],
                        undefined,
                    ),
                    sequentialSameTab: true,
                });
            }
        }

        for (const child of block.children || []) {
            visitBlueprint(child, [...path, block.label || block.type], childScope);
        }

        if (block.type === 'condition' && (block as any).elseChildren) {
            for (const child of (block as any).elseChildren) {
                visitBlueprint(child, [...path, block.label || block.type, 'else'], childScope);
            }
        }
    };

    for (const block of blueprint.blocks) {
        visitBlueprint(block, []);
    }

    return flows;
}
