import { describe, expect, it } from 'vitest';
import { resolveCompiledConfigTemplates } from '../entrypoints/models/compiled-config-resolution';
import { ExecutionVariableScopes } from '../entrypoints/models/execution-variable-scopes';

describe('resolveCompiledConfigTemplates', () => {
    it('resolves runtime variable templates across nested config values', () => {
        const variables = new ExecutionVariableScopes();
        variables.set('keyword', 'laptop');
        variables.set('baseUrl', 'https://example.com', 'global');

        const resolved = resolveCompiledConfigTemplates({
            url: '{{baseUrl}}/search?q={{keyword}}',
            selector: {
                type: 'css',
                value: '[data-name="{{keyword}}"]',
            },
            nested: {
                label: 'Find {{keyword}}',
            },
        }, variables);

        expect(resolved).toEqual({
            url: 'https://example.com/search?q=laptop',
            selector: {
                type: 'css',
                value: '[data-name="laptop"]',
            },
            nested: {
                label: 'Find laptop',
            },
        });
    });

    it('preserves extract formulas for later field-based evaluation', () => {
        const variables = new ExecutionVariableScopes();
        variables.set('tax', '0.2');

        const resolved = resolveCompiledConfigTemplates({
            fields: [
                {
                    key: 'total',
                    formula: '{{price}} * (1 + {{tax}})',
                    defaultValue: '{{tax}}',
                },
            ],
        }, variables);

        expect(resolved).toEqual({
            fields: [
                {
                    key: 'total',
                    formula: '{{price}} * (1 + {{tax}})',
                    defaultValue: '0.2',
                },
            ],
        });
    });
});
