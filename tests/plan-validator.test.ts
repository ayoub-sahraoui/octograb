import { describe, it, expect } from 'vitest';
import { PlanValidator } from '../core/plan-validator';
import type { Plan } from '../core/types';

describe('PlanValidator', () => {
    it('should validate a plan with modern serialized blocks including newer block types', () => {
        const plan: Plan = {
            meta: {
                name: 'Modern Plan',
                version: '1.0.0',
                userAgent: 'vitest'
            },
            variables: {
                baseUrl: ''
            },
            pipeline: [
                {
                    id: 'nav-1',
                    type: 'navigate',
                    label: 'Navigate',
                    config: { url: 'https://example.com' }
                },
                {
                    id: 'assert-1',
                    type: 'assert',
                    label: 'Assert',
                    config: {
                        selector: { type: 'css', value: '.product-card' },
                        check: 'exists'
                    }
                }
            ]
        };

        const result = new PlanValidator().validate(plan);

        expect(result.valid).toBe(true);
        expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should fail modern serialized plans with invalid newer block config', () => {
        const plan: Plan = {
            meta: {
                name: 'Invalid Plan',
                version: '1.0.0',
                userAgent: 'vitest'
            },
            variables: {
                baseUrl: ''
            },
            pipeline: [
                {
                    id: 'set-var-1',
                    type: 'set_variable',
                    label: 'Set Variable',
                    config: {
                        name: '',
                        value: 'abc'
                    }
                }
            ]
        };

        const result = new PlanValidator().validate(plan);

        expect(result.valid).toBe(false);
        expect(result.issues.some(i => i.message.includes('variable name'))).toBe(true);
    });
});
