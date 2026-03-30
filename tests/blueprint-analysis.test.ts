import { describe, expect, it } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { LoopElementsBlock } from '../entrypoints/models/loop-elements-block';
import { ExtractScopeBlock } from '../entrypoints/models/extract-scope-block';
import { SetVariableBlock } from '../entrypoints/models/set-variable-block';
import { MacroBlock } from '../entrypoints/models/macro-block';
import { SelectorType } from '../entrypoints/models/selector';
import { analyzeBlueprint, createBlueprintPreview } from '../entrypoints/models/blueprint-analysis';
import { macroRegistryStore } from '../entrypoints/stores/macro-registry-store';

describe('Blueprint Analysis', () => {
    it('summarizes compiled blueprint structure and runtime features', () => {
        const blueprint = new Blueprint('Catalog scrape', 'Analysis target');
        const navigate = new NavigateBlock('Open page', { url: 'https://example.com' });
        const loop = new LoopElementsBlock('Each card', {
            selector: { type: SelectorType.CSS, value: '.card' },
        });
        const extract = new ExtractScopeBlock('Extract card', {
            fields: [
                { key: 'title', selector: { type: SelectorType.CSS, value: '.title' }, attribute: 'text' },
            ],
        });
        loop.addChild(extract);

        const setVariable = new SetVariableBlock('Save query', {
            name: 'query',
            value: '{{searchTerm}}',
        });
        const macro = new MacroBlock('Run macro', {
            macroId: 'macro-products',
            parameters: { category: '{{query}}' },
        });

        blueprint.addBlock(navigate);
        blueprint.addBlock(loop);
        blueprint.addBlock(setVariable);
        blueprint.addBlock(macro);

        const analysis = analyzeBlueprint(blueprint);

        expect(analysis.blockCount).toBe(5);
        expect(analysis.maxDepth).toBe(1);
        expect(analysis.blockTypes).toEqual(['extract_scope', 'loop_elements', 'macro', 'navigate', 'set_variable']);
        expect(analysis.variableReferences).toEqual(['query', 'searchTerm']);
        expect(analysis.macroIds).toEqual(['macro-products']);
        expect(analysis.containerBlockCount).toBe(2);
    });

    it('creates a preview object from shared compiled analysis', () => {
        const blueprint = new Blueprint('Preview me', '');
        blueprint.addBlock(new NavigateBlock('Open', { url: 'https://example.com' }));

        const preview = createBlueprintPreview(blueprint, {
            valid: true,
            errors: [],
            warnings: [],
        });

        expect(preview.name).toBe('Preview me');
        expect(preview.blockCount).toBe(1);
        expect(preview.blockTypes).toEqual(['navigate']);
        expect(preview.maxDepth).toBe(0);
        expect(preview.variableReferences).toEqual([]);
        expect(preview.macroIds).toEqual([]);
    });

    it('reports unresolved variable references', () => {
        const blueprint = new Blueprint('Variables', '');
        blueprint.addBlock(new NavigateBlock('Open', { url: 'https://example.com?q={{searchTerm}}' }));

        const analysis = analyzeBlueprint(blueprint);

        expect(analysis.issues.some((issue) => issue.message.includes('Unresolved variable reference: searchTerm'))).toBe(true);
    });

    it('validates macro parameters against the registered macro definition', () => {
        macroRegistryStore.clearMacros();
        macroRegistryStore.setMacro('macro-products', {
            id: 'macro-products',
            name: 'Products macro',
            parameters: [
                { name: 'category', required: true },
                { name: 'limit', defaultValue: '10' },
            ],
            blocks: [],
        });

        const blueprint = new Blueprint('Macros', '');
        blueprint.addBlock(new MacroBlock('Run macro', {
            macroId: 'macro-products',
            parameters: { unexpected: 'x' },
        }));

        const analysis = analyzeBlueprint(blueprint);

        expect(analysis.issues.some((issue) => issue.message.includes('required macro parameter "category"'))).toBe(true);
        expect(analysis.issues.some((issue) => issue.message.includes('Unknown macro parameter "unexpected"'))).toBe(true);
    });

    it('treats local scope definitions as non-leaking while global and blueprint scopes remain available', () => {
        const blueprint = new Blueprint('Scopes', '');
        const loop = new LoopElementsBlock('Loop', {
            selector: { type: SelectorType.CSS, value: '.item' },
        });
        loop.addChild(new SetVariableBlock('Local set', {
            name: 'itemName',
            value: 'Phone',
            scope: 'local',
        }));
        loop.addChild(new SetVariableBlock('Global set', {
            name: 'runId',
            value: '123',
            scope: 'global',
        }));
        loop.addChild(new SetVariableBlock('Blueprint set', {
            name: 'catalogId',
            value: 'abc',
            scope: 'blueprint',
        }));

        blueprint.addBlock(loop);
        blueprint.addBlock(new NavigateBlock('After loop', {
            url: 'https://example.com/{{itemName}}/{{runId}}/{{catalogId}}',
        }));

        const analysis = analyzeBlueprint(blueprint);

        expect(analysis.issues.some((issue) => issue.message.includes('Unresolved variable reference: itemName'))).toBe(true);
        expect(analysis.issues.some((issue) => issue.message.includes('Unresolved variable reference: runId'))).toBe(false);
        expect(analysis.issues.some((issue) => issue.message.includes('Unresolved variable reference: catalogId'))).toBe(false);
    });

    it('detects macro cycles and expansion limits at analysis time', () => {
        macroRegistryStore.clearMacros();
        macroRegistryStore.setMacro('macro-a', {
            id: 'macro-a',
            name: 'Macro A',
            blocks: [{ id: 'macro-b-call', type: 'macro', label: 'Call B', config: { macroId: 'macro-b' } }],
        });
        macroRegistryStore.setMacro('macro-b', {
            id: 'macro-b',
            name: 'Macro B',
            blocks: [{ id: 'macro-a-call', type: 'macro', label: 'Call A', config: { macroId: 'macro-a' } }],
        });
        macroRegistryStore.setMacro('macro-large', {
            id: 'macro-large',
            name: 'Macro Large',
            blocks: Array.from({ length: 205 }, (_, index) => ({
                id: `wait-${index}`,
                type: 'wait',
                label: `Wait ${index}`,
                config: { type: 'timeout', timeout: 1 },
            })),
        });

        const blueprint = new Blueprint('Macro safety', '');
        blueprint.addBlock(new MacroBlock('Cycle', { macroId: 'macro-a' }));
        blueprint.addBlock(new MacroBlock('Large', { macroId: 'macro-large' }));

        const analysis = analyzeBlueprint(blueprint);

        expect(analysis.issues.some((issue) => issue.message.includes('Macro cycle detected'))).toBe(true);
        expect(analysis.issues.some((issue) => issue.message.includes('Macro expansion would exceed max block limit'))).toBe(true);
    });
});
