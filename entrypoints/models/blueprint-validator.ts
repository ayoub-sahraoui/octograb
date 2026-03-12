import { Blueprint } from './blueprint';
import { Block } from './types';

export interface ValidationError {
    blockId?: string;
    blockLabel?: string;
    message: string;
    severity: 'error' | 'warning';
    path?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

export class BlueprintValidator {
    private errors: ValidationError[] = [];
    private warnings: ValidationError[] = [];
    private seenIds: Set<string> = new Set();
    private maxNestingDepth = 10;

    validate(blueprint: Blueprint): ValidationResult {
        this.errors = [];
        this.warnings = [];
        this.seenIds = new Set();

        if (!blueprint.name || blueprint.name.trim() === '') {
            this.addError('Blueprint must have a name');
        }

        if (!blueprint.blocks || blueprint.blocks.length === 0) {
            this.addWarning('Blueprint has no blocks');
        }

        for (const block of blueprint.blocks) {
            this.validateBlock(block, null, 0, []);
        }

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    private validateBlock(block: Block, parent: Block | null, depth: number, path: string[]) {
        const currentPath = [...path, block.label || block.type];
        const pathStr = currentPath.join(' > ');

        if (depth > this.maxNestingDepth) {
            this.addError(
                `Maximum nesting depth (${this.maxNestingDepth}) exceeded`,
                block.id,
                block.label,
                pathStr
            );
            return;
        }

        if (!block.id) {
            this.addError('Block missing ID', undefined, block.label, pathStr);
            return;
        }

        if (this.seenIds.has(block.id)) {
            this.addError(
                `Duplicate block ID: ${block.id}`,
                block.id,
                block.label,
                pathStr
            );
        }
        this.seenIds.add(block.id);

        if (!block.type) {
            this.addError('Block missing type', block.id, block.label, pathStr);
            return;
        }

        this.validateBlockType(block, pathStr);
        this.validateBlockConfig(block, pathStr);
        this.validateParentChildRelationship(block, parent, pathStr);
        this.validateChildren(block, depth, currentPath);
    }

    private validateBlockType(block: Block, path: string) {
        const validTypes = [
            'navigate', 'click', 'input', 'wait', 'scroll', 'go_back',
            'condition', 'loop_elements', 'loop_pagination', 'extract_scope'
        ];

        if (!validTypes.includes(block.type)) {
            this.addError(
                `Invalid block type: ${block.type}`,
                block.id,
                block.label,
                path
            );
        }
    }

    private validateBlockConfig(block: Block, path: string) {
        if (!block.config) {
            this.addError('Block missing config', block.id, block.label, path);
            return;
        }

        const config = block.config as any;

        switch (block.type) {
            case 'navigate':
                if (!config.url || config.url.trim() === '') {
                    this.addError('Navigate block requires URL', block.id, block.label, path);
                }
                break;

            case 'click':
                if (!config.selector?.value && !this.isInLoopContext(block)) {
                    this.addError(
                        'Click block requires selector (unless inside a loop)',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (config.openInNewTab && (!block.children || block.children.length === 0)) {
                    this.addWarning(
                        'Click with openInNewTab has no children - new tab will open and close immediately',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'input':
                if (!config.selector?.value && !this.isInLoopContext(block)) {
                    this.addError(
                        'Input block requires selector (unless inside a loop)',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (config.value === undefined || config.value === null || config.value === '') {
                    this.addWarning(
                        'Input block has no value - will input empty string',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'wait':
                if (!config.type) {
                    this.addError('Wait block requires type', block.id, block.label, path);
                } else if (config.type === 'timeout' && (!config.timeout || config.timeout <= 0)) {
                    this.addError('Wait timeout must be > 0', block.id, block.label, path);
                } else if (
                    (config.type === 'selector_visible' || config.type === 'selector_hidden') &&
                    !config.selector?.value
                ) {
                    this.addError(
                        'Wait for selector requires selector',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'scroll':
                if (!config.behavior) {
                    this.addError('Scroll block requires behavior', block.id, block.label, path);
                } else if (config.behavior === 'pixels' && !config.pixels) {
                    this.addError(
                        'Scroll with pixels behavior requires pixels value',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'condition':
                if (!config.check) {
                    this.addError('Condition block requires check type', block.id, block.label, path);
                }
                if (!config.selector?.value && !this.isInLoopContext(block)) {
                    this.addError(
                        'Condition block requires selector (unless inside a loop)',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (
                    ['text_contains', 'text_equals', 'text_regex', 'count_equals', 'count_greater_than'].includes(config.check) &&
                    (config.value === undefined || config.value === null)
                ) {
                    this.addError(
                        `Condition check "${config.check}" requires a value`,
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'loop_elements':
                if (!config.selector?.value) {
                    this.addError(
                        'Loop Elements block requires selector',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (config.maxIterations !== undefined && config.maxIterations <= 0) {
                    this.addError(
                        'Loop maxIterations must be > 0',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (!block.children || block.children.length === 0) {
                    this.addWarning(
                        'Loop Elements has no children - will iterate but do nothing',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'loop_pagination':
                if (!config.nextButtonSelector?.value) {
                    this.addError(
                        'Loop Pagination requires next button selector',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (config.maxPages && config.maxPages <= 0) {
                    this.addError(
                        'Loop maxPages must be > 0',
                        block.id,
                        block.label,
                        path
                    );
                }
                if (!block.children || block.children.length === 0) {
                    this.addWarning(
                        'Loop Pagination has no children - will paginate but extract nothing',
                        block.id,
                        block.label,
                        path
                    );
                }
                break;

            case 'extract_scope':
                if (!config.fields || config.fields.length === 0) {
                    this.addError(
                        'Extract block requires at least one field',
                        block.id,
                        block.label,
                        path
                    );
                } else {
                    for (const field of config.fields) {
                        if (!field.key || field.key.trim() === '') {
                            this.addError(
                                'Extract field missing key',
                                block.id,
                                block.label,
                                path
                            );
                        }
                        if (!field.attribute && field.mode !== 'static') {
                            this.addError(
                                `Extract field "${field.key}" missing attribute`,
                                block.id,
                                block.label,
                                path
                            );
                        }
                    }
                }
                break;
        }
    }

    private validateParentChildRelationship(block: Block, parent: Block | null, path: string) {
        const blocksWithoutChildren = ['navigate', 'input', 'go_back', 'wait', 'scroll'];
        const containerBlocks = ['loop_elements', 'loop_pagination', 'condition', 'extract_scope', 'click'];

        if (blocksWithoutChildren.includes(block.type) && block.children && block.children.length > 0) {
            this.addError(
                `Block type "${block.type}" should not have children`,
                block.id,
                block.label,
                path
            );
        }

        if (parent) {
            if (parent.type === 'loop_elements' || parent.type === 'loop_pagination') {
                if (block.type === 'navigate') {
                    this.addWarning(
                        'Navigate inside a loop may cause unexpected behavior',
                        block.id,
                        block.label,
                        path
                    );
                }
            }

            if (parent.type === 'click' && (parent.config as any).openInNewTab) {
                if (block.type === 'go_back') {
                    this.addWarning(
                        'Go Back inside a new tab click will close the tab',
                        block.id,
                        block.label,
                        path
                    );
                }
            }
        }

        if (block.type === 'extract_scope') {
            const hasLoopAncestor = this.hasAncestorOfType(block, ['loop_elements', 'loop_pagination']);
            if (!hasLoopAncestor) {
                this.addWarning(
                    'Extract block outside a loop will only extract once',
                    block.id,
                    block.label,
                    path
                );
            }
        }
    }

    private validateChildren(block: Block, depth: number, path: string[]) {
        if (block.children) {
            for (const child of block.children) {
                if (child.parent !== block) {
                    this.addWarning(
                        'Child block parent reference does not match actual parent',
                        child.id,
                        child.label,
                        path.join(' > ')
                    );
                }
                this.validateBlock(child, block, depth + 1, path);
            }
        }

        if (block.type === 'condition' && (block as any).elseChildren) {
            for (const child of (block as any).elseChildren) {
                if (child.parent !== block) {
                    this.addWarning(
                        'Else child block parent reference does not match actual parent',
                        child.id,
                        child.label,
                        path.join(' > ')
                    );
                }
                this.validateBlock(child, block, depth + 1, [...path, 'else']);
            }
        }
    }

    private isInLoopContext(block: Block): boolean {
        return this.hasAncestorOfType(block, ['loop_elements', 'loop_pagination']);
    }

    private hasAncestorOfType(block: Block, types: string[]): boolean {
        let current = block.parent;
        while (current) {
            if (types.includes(current.type)) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    private addError(message: string, blockId?: string, blockLabel?: string, path?: string) {
        this.errors.push({
            blockId,
            blockLabel,
            message,
            severity: 'error',
            path
        });
    }

    private addWarning(message: string, blockId?: string, blockLabel?: string, path?: string) {
        this.warnings.push({
            blockId,
            blockLabel,
            message,
            severity: 'warning',
            path
        });
    }
}

export const validateBlueprint = (blueprint: Blueprint): ValidationResult => {
    const validator = new BlueprintValidator();
    return validator.validate(blueprint);
};
