import { Blueprint } from './blueprint';
import { Block } from './types';
import { analyzeBlueprint } from './blueprint-analysis';
import { BLOCK_TYPES, getBlockRegistryEntry } from './block-registry';
import { validateBlueprintSelectorContracts } from './selector-contract-validator';

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

        const analysis = analyzeBlueprint(blueprint);
        if (analysis.maxDepth > this.maxNestingDepth) {
            this.addError(`Maximum nesting depth (${this.maxNestingDepth}) exceeded`);
        }
        for (const issue of analysis.issues) {
            if (issue.severity === 'error') {
                this.addError(issue.message, issue.blockId, issue.blockLabel, issue.path);
            } else {
                this.addWarning(issue.message, issue.blockId, issue.blockLabel, issue.path);
            }
        }

        for (const block of blueprint.blocks) {
            this.validateBlock(block, null, 0, []);
        }

        const selectorIssues = validateBlueprintSelectorContracts(blueprint);
        for (const issue of selectorIssues) {
            if (issue.severity === 'error') {
                this.addError(issue.message, issue.block.id, issue.block.label, issue.path);
            } else {
                this.addWarning(issue.message, issue.block.id, issue.block.label, issue.path);
            }
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

        if (block.enabled === false) {
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
        if (!BLOCK_TYPES.includes(block.type)) {
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
        const entry = getBlockRegistryEntry(block.type);
        entry?.validate?.(block, path, {
            addError: (message, currentBlock, currentPath) => this.addError(message, currentBlock.id, currentBlock.label, currentPath),
            addWarning: (message, currentBlock, currentPath) => this.addWarning(message, currentBlock.id, currentBlock.label, currentPath),
            isInLoopContext: (currentBlock) => this.isInLoopContext(currentBlock),
        });
    }

    private validateParentChildRelationship(block: Block, parent: Block | null, path: string) {
        const entry = getBlockRegistryEntry(block.type);

        if (parent === null && block.parent) {
            this.addWarning(
                'Root block should not have a parent reference',
                block.id,
                block.label,
                path,
            );
        }

        if (entry && !entry.allowsChildren && block.children && block.children.length > 0) {
            this.addError(
                `${block.label || block.type} should not have children`,
                block.id,
                block.label,
                path,
            );
        }

        if (block.type !== 'condition' && (block as any).elseChildren && (block as any).elseChildren.length > 0) {
            this.addError(
                `${block.label || block.type} should not have else children`,
                block.id,
                block.label,
                path,
            );
        }

        if (!parent) {
            return;
        }

        const parentElseChildren = parent.type === 'condition' ? ((parent as any).elseChildren || []) as Block[] : [];
        const isActuallyElseChild = parentElseChildren.includes(block);

        if (isActuallyElseChild && block.parentBranch !== 'elseChildren') {
            this.addWarning(
                'Else child block parent branch does not match actual parent branch',
                block.id,
                block.label,
                path,
            );
        }

        if (!isActuallyElseChild && block.parentBranch === 'elseChildren') {
            this.addWarning(
                'Child block parent branch does not match actual parent branch',
                block.id,
                block.label,
                path,
            );
        }
    }

    private validateChildren(block: Block, depth: number, path: string[]) {
        if (block.children) {
            for (const child of block.children) {
                if (child.enabled === false) {
                    continue;
                }
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
                if (child.enabled === false) {
                    continue;
                }
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
