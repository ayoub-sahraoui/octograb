import { describe, it, expect } from 'vitest';
import { BLOCK_REGISTRY, getBlockRegistryEntry, BLOCK_TYPES } from '../entrypoints/models/block-registry';

describe('block registry', () => {
    it('should expose all supported block types', () => {
        expect(BLOCK_TYPES).toEqual([
            'navigate',
            'click',
            'input',
            'wait',
            'scroll',
            'go_back',
            'condition',
            'loop_elements',
            'loop_pagination',
            'extract_scope',
            'assert',
            'set_variable',
            'macro',
        ]);
    });

    it('should provide executor handler metadata for every registered block type', () => {
        for (const type of BLOCK_TYPES) {
            const entry = getBlockRegistryEntry(type);
            expect(entry).toBeDefined();
            expect(entry?.executorMethod).toBeTruthy();
        }
    });

    it('should create a block from minimal JSON for every registry entry', () => {
        const minimalJsonByType: Record<string, any> = {
            navigate: { type: 'navigate', config: { url: 'https://example.com' } },
            click: { type: 'click', config: { selector: { type: 'css', value: '.btn' } } },
            input: { type: 'input', config: { selector: { type: 'css', value: '#input' }, value: 'test' } },
            wait: { type: 'wait', config: { type: 'timeout', timeout: 1000 } },
            scroll: { type: 'scroll', config: { behavior: 'bottom' } },
            go_back: { type: 'go_back', config: {} },
            condition: { type: 'condition', config: { selector: { type: 'css', value: '.el' }, check: 'exists' } },
            loop_elements: { type: 'loop_elements', config: { selector: { type: 'css', value: '.item' } } },
            loop_pagination: { type: 'loop_pagination', config: { nextButtonSelector: { type: 'css', value: '.next' } } },
            extract_scope: { type: 'extract_scope', config: { fields: [{ key: 'title', selector: { type: 'css', value: '.title' }, attribute: 'text' }] } },
            assert: { type: 'assert', config: { selector: { type: 'css', value: '.el' }, check: 'exists' } },
            set_variable: { type: 'set_variable', config: { name: 'x', value: '1' } },
            macro: { type: 'macro', config: { macroId: 'macro-1' } },
        };

        for (const type of BLOCK_TYPES) {
            const entry = BLOCK_REGISTRY[type];
            const block = entry.create(minimalJsonByType[type]);
            expect(block.type).toBe(type);
        }
    });
});
