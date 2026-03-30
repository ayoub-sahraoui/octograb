import { describe, expect, it } from 'vitest';
import { Scope } from '../core/env';
import { compileBlock } from '../entrypoints/models/blueprint-compiler';
import { buildExecutionTraceDetails } from '../entrypoints/models/execution-observability';
import { ExecutionVariableScopes } from '../entrypoints/models/execution-variable-scopes';
import { MacroBlock } from '../entrypoints/models/macro-block';
import { SetVariableBlock } from '../entrypoints/models/set-variable-block';

describe('Execution observability', () => {
    it('captures layered variable snapshots for debugging', () => {
        const scopes = new ExecutionVariableScopes();
        scopes.set('shared', 'blueprint-value', 'blueprint');
        scopes.set('shared', 'global-value', 'global');
        scopes.set('globalOnly', 'global-only', 'global');
        scopes.set('localOnly', 'outer-local');
        scopes.pushLocalScope();
        scopes.set('shared', 'local-value');
        scopes.set('innerOnly', 'inner-local');

        expect(scopes.getSnapshot()).toEqual({
            localScopes: [
                { localOnly: 'outer-local' },
                { shared: 'local-value', innerOnly: 'inner-local' },
            ],
            localResolved: {
                localOnly: 'outer-local',
                shared: 'local-value',
                innerOnly: 'inner-local',
            },
            global: {
                shared: 'global-value',
                globalOnly: 'global-only',
            },
            blueprint: {
                shared: 'blueprint-value',
            },
            resolved: {
                localOnly: 'outer-local',
                shared: 'local-value',
                innerOnly: 'inner-local',
                globalOnly: 'global-only',
            },
        });
    });

    it('builds trace details with compiled block context and runtime state', () => {
        const block = compileBlock(new SetVariableBlock('Set Search', {
            name: 'searchTerm',
            value: '{{keyword}}',
            scope: 'global',
        }));
        const scopes = new ExecutionVariableScopes();
        scopes.set('keyword', 'laptop');
        scopes.set('sessionId', '42', 'global');
        const scope: Scope = {
            selector: '.result',
            selectorType: 'css',
            index: 2,
            parent: {
                selector: '.results',
                selectorType: 'css',
                index: 0,
            },
        };

        expect(buildExecutionTraceDetails({
            block,
            scope,
            variables: scopes,
            macroStack: ['parent-macro', 'child-macro'],
            attempt: 2,
        })).toEqual({
            block: {
                id: block.id,
                type: 'set_variable',
                label: 'Set Search',
                parentId: undefined,
                parentBranch: undefined,
                execution: {
                    executorMethod: 'executeSetVariable',
                    allowsChildren: false,
                    managesChildrenExecution: false,
                },
            },
            config: {
                name: 'searchTerm',
                value: '{{keyword}}',
                scope: 'global',
            },
            scope: {
                selector: '.result',
                selectorType: 'css',
                index: 2,
                depth: 2,
                chain: [
                    { selector: '.results', selectorType: 'css', index: 0 },
                    { selector: '.result', selectorType: 'css', index: 2 },
                ],
            },
            variables: {
                localScopes: [
                    { keyword: 'laptop' },
                ],
                localResolved: {
                    keyword: 'laptop',
                },
                global: {
                    sessionId: '42',
                },
                blueprint: {},
                resolved: {
                    keyword: 'laptop',
                    sessionId: '42',
                },
            },
            macroStack: ['parent-macro', 'child-macro'],
            attempt: 2,
        });
    });

    it('adds error details without dropping existing runtime context', () => {
        const block = compileBlock(new MacroBlock('Reuse Macro', { macroId: 'macro-1' }));

        expect(buildExecutionTraceDetails({
            block,
            variables: new ExecutionVariableScopes(),
            macroStack: ['macro-1'],
            error: new Error('Macro expansion failed'),
        })).toMatchObject({
            block: {
                id: block.id,
                type: 'macro',
                label: 'Reuse Macro',
                parentId: undefined,
                parentBranch: undefined,
                execution: {
                    executorMethod: 'executeMacro',
                    allowsChildren: false,
                    managesChildrenExecution: false,
                },
            },
            config: {
                macroId: 'macro-1',
            },
            scope: null,
            variables: {
                localScopes: [
                    {},
                ],
                localResolved: {},
                global: {},
                blueprint: {},
                resolved: {},
            },
            macroStack: ['macro-1'],
            error: {
                message: 'Macro expansion failed',
            },
        });
    });
});
