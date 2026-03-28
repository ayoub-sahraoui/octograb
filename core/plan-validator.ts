/**
 * Plan Validator - Catch issues before execution
 */

import { Plan } from './types';
import { Blueprint } from '../entrypoints/models/blueprint';
import { createBlockFromJSON } from '../entrypoints/models/block-factory';
import { BlueprintValidator } from '../entrypoints/models/blueprint-validator';

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

        if (!plan.meta?.name) {
            issues.push({
                severity: 'warning',
                blockId: 'meta',
                message: 'Plan has no name',
                suggestion: 'Give your plan a descriptive name'
            });
        }

        if (!plan.pipeline || plan.pipeline.length === 0) {
            issues.push({
                severity: 'error',
                blockId: 'pipeline',
                message: 'Plan has no blocks',
                suggestion: 'Add at least one block to your plan'
            });
            return { valid: false, issues };
        }

        try {
            const blueprint = new Blueprint(plan.meta?.name || 'Untitled Plan', '');
            blueprint.blocks = plan.pipeline.map((blockJson) => createBlockFromJSON(blockJson));

            const result = new BlueprintValidator().validate(blueprint);

            for (const error of result.errors) {
                issues.push({
                    severity: 'error',
                    blockId: error.blockId || 'unknown',
                    message: error.message,
                    suggestion: error.path ? `Check ${error.path}` : undefined
                });
            }

            for (const warning of result.warnings) {
                issues.push({
                    severity: 'warning',
                    blockId: warning.blockId || 'unknown',
                    message: warning.message,
                    suggestion: warning.path ? `Check ${warning.path}` : undefined
                });
            }
        } catch (error: any) {
            issues.push({
                severity: 'error',
                blockId: 'pipeline',
                message: error.message || 'Failed to parse plan pipeline',
                suggestion: 'Check the serialized block structure'
            });
        }

        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues
        };
    }
}
