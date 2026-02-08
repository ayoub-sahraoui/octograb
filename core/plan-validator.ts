/**
 * Plan Validator - Catch issues before execution
 */

import { Plan, Block } from './types';

export interface ValidationIssue {
    severity: 'error' | 'warning';
    blockId: string;
    message: string;
    suggestion?: string;
}

export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
}

export class PlanValidator {
    validate(plan: Plan): ValidationResult {
        const issues: ValidationIssue[] = [];

        // Check meta
        if (!plan.meta?.name) {
            issues.push({
                severity: 'warning',
                blockId: 'meta',
                message: 'Plan has no name',
                suggestion: 'Give your plan a descriptive name'
            });
        }

        // Validate pipeline
        if (!plan.pipeline || plan.pipeline.length === 0) {
            issues.push({
                severity: 'error',
                blockId: 'pipeline',
                message: 'Plan has no blocks',
                suggestion: 'Add at least one block to your plan'
            });
            return { valid: false, issues };
        }

        // Validate each block
        this.validateBlocks(plan.pipeline, issues);

        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues
        };
    }

    private validateBlocks(blocks: Block[], issues: ValidationIssue[], depth = 0) {
        const MAX_DEPTH = 10;

        if (depth > MAX_DEPTH) {
            issues.push({
                severity: 'error',
                blockId: 'depth',
                message: 'Block nesting too deep (max 10 levels)',
                suggestion: 'Simplify your plan structure'
            });
            return;
        }

        for (const block of blocks) {
            this.validateBlock(block, issues);

            // Recursively validate children
            if (block.children) {
                this.validateBlocks(block.children, issues, depth + 1);
            }
            if (block.elseChildren) {
                this.validateBlocks(block.elseChildren, issues, depth + 1);
            }
        }
    }

    private validateBlock(block: Block, issues: ValidationIssue[]) {
        switch (block.type) {
            case 'navigate':
                if (!block.url || block.url === 'https://') {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: 'Navigate block missing URL',
                        suggestion: 'Enter a valid URL'
                    });
                } else {
                    try {
                        new URL(block.url);
                    } catch {
                        issues.push({
                            severity: 'error',
                            blockId: block.id,
                            message: 'Invalid URL format',
                            suggestion: 'URL must start with http:// or https://'
                        });
                    }
                }
                break;

            case 'click':
            case 'input':
                if (!block.selector || block.selector.trim() === '') {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: `${block.type} block missing selector`,
                        suggestion: 'Use the element picker to select an element'
                    });
                }
                if (block.type === 'input' && !block.value) {
                    issues.push({
                        severity: 'warning',
                        blockId: block.id,
                        message: 'Input block has no value',
                        suggestion: 'Specify text to type into the field'
                    });
                }
                break;

            case 'loop_elements':
                if (!block.selector || block.selector.trim() === '') {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: 'Loop elements block missing selector',
                        suggestion: 'Specify which elements to loop over'
                    });
                }
                if (!block.children || block.children.length === 0) {
                    issues.push({
                        severity: 'warning',
                        blockId: block.id,
                        message: 'Loop has no children blocks',
                        suggestion: 'Add blocks to execute for each element'
                    });
                }
                break;

            case 'loop_pagination':
                if (!block.config?.nextButtonSelector || block.config.nextButtonSelector.trim() === '') {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: 'Pagination loop missing next button selector',
                        suggestion: 'Select the "next page" button'
                    });
                }
                if (!block.children || block.children.length === 0) {
                    issues.push({
                        severity: 'warning',
                        blockId: block.id,
                        message: 'Pagination loop has no children',
                        suggestion: 'Add extraction or loop_elements blocks'
                    });
                }
                break;

            case 'extract_scope':
                if (!block.fields || block.fields.length === 0) {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: 'Extract block has no fields',
                        suggestion: 'Add fields to extract data'
                    });
                } else {
                    // Validate fields
                    for (const field of block.fields) {
                        if (!field.key || field.key.trim() === '') {
                            issues.push({
                                severity: 'error',
                                blockId: block.id,
                                message: 'Extraction field missing key name',
                                suggestion: 'Give each field a unique name'
                            });
                        }
                        if (!field.selector || field.selector.trim() === '') {
                            issues.push({
                                severity: 'warning',
                                blockId: block.id,
                                message: `Field "${field.key}" has no selector`,
                                suggestion: 'Select the element to extract from'
                            });
                        }
                    }
                }
                break;

            case 'condition':
                if (!block.conditionConfig?.selector || block.conditionConfig.selector.trim() === '') {
                    issues.push({
                        severity: 'error',
                        blockId: block.id,
                        message: 'Condition block missing selector',
                        suggestion: 'Specify which element to check'
                    });
                }
                break;

            case 'wait':
                if (block.waitConfig?.type === 'timeout') {
                    const timeout = block.waitConfig.timeout || 0;
                    if (timeout > 30000) {
                        issues.push({
                            severity: 'warning',
                            blockId: block.id,
                            message: 'Very long wait time',
                            suggestion: 'Consider using selector-based waiting instead'
                        });
                    }
                }
                break;
        }
    }
}
