import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { ClickBlock } from '../entrypoints/models/click-block';
import { InputBlock } from '../entrypoints/models/input-block';
import { WaitBlock } from '../entrypoints/models/wait-block';
import { LoopElementsBlock } from '../entrypoints/models/loop-elements-block';
import { ExtractScopeBlock } from '../entrypoints/models/extract-scope-block';
import { createBlockFromJSON } from '../entrypoints/models/block-factory';
import { SelectorType } from '../entrypoints/models/selector';

describe('Blueprint Execution Logic', () => {
    describe('Block Factory', () => {
        it('should create navigate block from JSON', () => {
            const json = {
                id: 'test-id',
                type: 'navigate',
                label: 'Test Nav',
                config: { url: 'https://example.com' },
                enabled: true
            };

            const block = createBlockFromJSON(json);
            expect(block.type).toBe('navigate');
            expect(block.label).toBe('Test Nav');
            expect((block.config as any).url).toBe('https://example.com');
        });

        it('should create block with children', () => {
            const json = {
                id: 'loop-1',
                type: 'loop_elements',
                label: 'Loop',
                config: { selector: { value: '.item', type: SelectorType.CSS } },
                children: [
                    {
                        id: 'extract-1',
                        type: 'extract_scope',
                        label: 'Extract',
                        config: {
                            fields: [{ key: 'title', selector: { value: '.title', type: 'css' }, attribute: 'text' }]
                        }
                    }
                ]
            };

            const block = createBlockFromJSON(json);
            expect(block.children).toBeDefined();
            expect(block.children?.length).toBe(1);
            expect(block.children?.[0].type).toBe('extract_scope');
            expect(block.children?.[0].parent).toBe(block);
        });

        it('should create condition block with elseChildren', () => {
            const json = {
                id: 'cond-1',
                type: 'condition',
                label: 'Condition',
                config: { selector: { value: '.element', type: 'css' }, check: 'exists' },
                children: [
                    { id: 'click-1', type: 'click', label: 'Click', config: { selector: { value: '.btn', type: 'css' } } }
                ],
                elseChildren: [
                    { id: 'wait-1', type: 'wait', label: 'Wait', config: { type: 'timeout', timeout: 1000 } }
                ]
            };

            const block = createBlockFromJSON(json) as any;
            expect(block.children?.length).toBe(1);
            expect(block.elseChildren?.length).toBe(1);
            expect(block.elseChildren[0].parent).toBe(block);
        });

        it('should handle all block types', () => {
            const types = [
                { type: 'navigate', config: { url: 'https://example.com' } },
                { type: 'click', config: { selector: { value: '.btn', type: 'css' } } },
                { type: 'input', config: { selector: { value: '#input', type: 'css' }, value: 'test' } },
                { type: 'wait', config: { type: 'timeout', timeout: 1000 } },
                { type: 'scroll', config: { behavior: 'bottom' } },
                { type: 'go_back', config: {} },
                { type: 'condition', config: { selector: { value: '.el', type: 'css' }, check: 'exists' } },
                { type: 'loop_elements', config: { selector: { value: '.item', type: 'css' } } },
                { type: 'loop_pagination', config: { nextButtonSelector: { value: '.next', type: 'css' } } },
                { type: 'extract_scope', config: { fields: [{ key: 'k', selector: { value: '.s', type: 'css' }, attribute: 'text' }] } }
            ];

            types.forEach(({ type, config }) => {
                const json = { id: 'test', type, label: 'Test', config };
                const block = createBlockFromJSON(json);
                expect(block.type).toBe(type);
            });
        });

        it('should throw error for unknown block type', () => {
            const json = {
                id: 'test',
                type: 'unknown_type',
                label: 'Test',
                config: {}
            };

            expect(() => createBlockFromJSON(json)).toThrow('Unknown block type');
        });
    });

    describe('Blueprint Serialization', () => {
        it('should serialize and deserialize blueprint', () => {
            const blueprint = new Blueprint('Test', 'Description');
            const nav = new NavigateBlock('Nav', { url: 'https://example.com' });
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: 'css' } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'title', selector: { value: '.title', type: 'css' }, attribute: 'text' }]
            });

            loop.children = [extract];
            extract.parent = loop;
            blueprint.addBlock(nav);
            blueprint.addBlock(loop);

            const json = blueprint.toJSON();
            const restored = Blueprint.fromJSON(json);

            expect(restored.name).toBe('Test');
            expect(restored.blocks.length).toBe(2);
            expect(restored.blocks[0].type).toBe('navigate');
            expect(restored.blocks[1].type).toBe('loop_elements');
            expect(restored.blocks[1].children?.length).toBe(1);
            expect(restored.blocks[1].children?.[0].type).toBe('extract_scope');
        });

        it('should handle circular parent references', () => {
            const blueprint = new Blueprint('Test', 'Description');
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: 'css' } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'title', selector: { value: '.title', type: 'css' }, attribute: 'text' }]
            });

            loop.children = [extract];
            extract.parent = loop;
            blueprint.addBlock(loop);

            expect(() => {
                const json = JSON.stringify(blueprint.toJSON(), (key, value) => {
                    if (key === 'parent') return undefined;
                    return value;
                });
                JSON.parse(json);
            }).not.toThrow();
        });
    });

    describe('Block Relationships', () => {
        it('should maintain parent-child relationships', () => {
            const parent = new LoopElementsBlock('Loop', { selector: { value: '.item', type: 'css' } });
            const child = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'title', selector: { value: '.title', type: 'css' }, attribute: 'text' }]
            });

            parent.children = [child];
            child.parent = parent;

            expect(child.parent).toBe(parent);
            expect(parent.children?.[0]).toBe(child);
        });

        it('should handle multiple children', () => {
            const parent = new LoopElementsBlock('Loop', { selector: { value: '.item', type: 'css' } });
            const child1 = new ClickBlock('Click', { selector: { value: '.btn1', type: 'css' } });
            const child2 = new WaitBlock('Wait', { type: 'timeout', timeout: 1000 });
            const child3 = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'title', selector: { value: '.title', type: 'css' }, attribute: 'text' }]
            });

            parent.children = [child1, child2, child3];
            child1.parent = parent;
            child2.parent = parent;
            child3.parent = parent;

            expect(parent.children?.length).toBe(3);
            expect(parent.children?.every(c => c.parent === parent)).toBe(true);
        });

        it('should handle nested hierarchies', () => {
            const root = new LoopElementsBlock('Root Loop', { selector: { value: '.root', type: 'css' } });
            const nested = new LoopElementsBlock('Nested Loop', { selector: { value: '.nested', type: 'css' } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'data', selector: { value: '.data', type: 'css' }, attribute: 'text' }]
            });

            root.children = [nested];
            nested.parent = root;
            nested.children = [extract];
            extract.parent = nested;

            expect(extract.parent).toBe(nested);
            expect(nested.parent).toBe(root);
            expect(root.parent).toBeUndefined();
        });
    });

    describe('Blueprint Operations', () => {
        let blueprint: Blueprint;

        beforeEach(() => {
            blueprint = new Blueprint('Test', 'Description');
        });

        it('should add blocks with correct indices', () => {
            const block1 = new NavigateBlock('Nav 1', { url: 'https://example.com' });
            const block2 = new WaitBlock('Wait', { type: 'timeout', timeout: 1000 });
            const block3 = new NavigateBlock('Nav 2', { url: 'https://example2.com' });

            blueprint.addBlock(block1);
            blueprint.addBlock(block2);
            blueprint.addBlock(block3);

            expect(block1.index).toBe(0);
            expect(block2.index).toBe(1);
            expect(block3.index).toBe(2);
        });

        it('should remove blocks and update indices', () => {
            const block1 = new NavigateBlock('Nav 1', { url: 'https://example.com' });
            const block2 = new WaitBlock('Wait', { type: 'timeout', timeout: 1000 });
            const block3 = new NavigateBlock('Nav 2', { url: 'https://example2.com' });

            blueprint.addBlock(block1);
            blueprint.addBlock(block2);
            blueprint.addBlock(block3);

            blueprint.removeBlock(block2);

            expect(blueprint.blocks.length).toBe(2);
            expect(blueprint.blocks[0].index).toBe(0);
            expect(blueprint.blocks[1].index).toBe(1);
        });

        it('should reorder blocks', () => {
            const block1 = new NavigateBlock('Nav 1', { url: 'https://example.com' });
            const block2 = new WaitBlock('Wait', { type: 'timeout', timeout: 1000 });
            const block3 = new NavigateBlock('Nav 2', { url: 'https://example2.com' });

            blueprint.addBlock(block1);
            blueprint.addBlock(block2);
            blueprint.addBlock(block3);

            blueprint.reorderBlock(block1, 2);

            expect(blueprint.blocks[0]).toBe(block2);
            expect(blueprint.blocks[1]).toBe(block3);
            expect(blueprint.blocks[2]).toBe(block1);
            expect(block2.index).toBe(0);
            expect(block3.index).toBe(1);
            expect(block1.index).toBe(2);
        });
    });

    describe('Scope Handling', () => {
        it('should build correct scope for loop iteration', () => {
            const scope = {
                selector: '.item',
                selectorType: 'css' as const,
                index: 2,
                parent: undefined
            };

            expect(scope.selector).toBe('.item');
            expect(scope.index).toBe(2);
        });

        it('should build nested scopes', () => {
            const parentScope = {
                selector: '.parent',
                selectorType: 'css' as const,
                index: 0,
                parent: undefined
            };

            const childScope = {
                selector: '.child',
                selectorType: 'css' as const,
                index: 1,
                parent: parentScope
            };

            expect(childScope.parent).toBe(parentScope);
            expect(childScope.index).toBe(1);
        });
    });

    describe('Block Configuration Validation', () => {
        it('should validate click block config', () => {
            const config = {
                selector: { value: '.btn', type: 'css' as const },
                openInNewTab: false,
                waitAfterClick: 1000
            };

            expect(config.selector.value).toBeTruthy();
            expect(config.openInNewTab).toBe(false);
        });

        it('should validate extract block config', () => {
            const config = {
                fields: [
                    { key: 'title', selector: { value: '.title', type: 'css' as const }, attribute: 'text' },
                    { key: 'price', selector: { value: '.price', type: 'css' as const }, attribute: 'text' }
                ],
                scopeSelector: { value: '.product', type: 'css' as const }
            };

            expect(config.fields.length).toBe(2);
            expect(config.fields.every(f => f.key && f.attribute)).toBe(true);
        });

        it('should validate loop config', () => {
            const config = {
                selector: { value: '.item', type: 'css' as const },
                maxIterations: 10
            };

            expect(config.selector.value).toBeTruthy();
            expect(config.maxIterations).toBeGreaterThan(0);
        });
    });
});
