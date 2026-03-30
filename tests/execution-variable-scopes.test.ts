import { describe, expect, it } from 'vitest';
import { ExecutionVariableScopes } from '../entrypoints/models/execution-variable-scopes';

describe('ExecutionVariableScopes', () => {
    it('keeps local variables inside the current local scope and falls back to broader scopes', () => {
        const scopes = new ExecutionVariableScopes();

        scopes.set('shared', 'global-value', 'global');
        scopes.set('persisted', 'blueprint-value', 'blueprint');
        scopes.set('rootLocal', 'root-local', 'local');

        scopes.pushLocalScope();
        scopes.set('innerOnly', 'inner', 'local');
        scopes.set('shared', 'shadowed-local', 'local');

        expect(scopes.get('innerOnly', 'local')).toBe('inner');
        expect(scopes.resolveReference('shared')).toBe('shadowed-local');
        expect(scopes.resolveTemplate('{{shared}}/{{persisted}}')).toBe('shadowed-local/blueprint-value');

        scopes.popLocalScope();

        expect(scopes.get('innerOnly', 'local')).toBeUndefined();
        expect(scopes.resolveReference('shared')).toBe('global-value');
        expect(scopes.resolveReference('rootLocal')).toBe('root-local');
    });

    it('supports explicit scope reads and blueprint value snapshots', () => {
        const scopes = new ExecutionVariableScopes();

        scopes.set('name', 'local-name', 'local');
        scopes.set('name', 'global-name', 'global');
        scopes.set('name', 'blueprint-name', 'blueprint');

        expect(scopes.get('name', 'local')).toBe('local-name');
        expect(scopes.get('name', 'global')).toBe('global-name');
        expect(scopes.get('name', 'blueprint')).toBe('blueprint-name');
        expect(scopes.getBlueprintValues()).toEqual({ name: 'blueprint-name' });
    });
});
