import { describe, it, expect, beforeEach } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { ClickBlock } from '../entrypoints/models/click-block';
import { InputBlock } from '../entrypoints/models/input-block';
import { WaitBlock } from '../entrypoints/models/wait-block';
import { LoopElementsBlock } from '../entrypoints/models/loop-elements-block';
import { LoopPaginationBlock } from '../entrypoints/models/loop-pagination-block';
import { ExtractScopeBlock } from '../entrypoints/models/extract-scope-block';
import { ConditionBlock } from '../entrypoints/models/condition-block';
import { AssertBlock } from '../entrypoints/models/assert-block';
import { SetVariableBlock } from '../entrypoints/models/set-variable-block';
import { MacroBlock } from '../entrypoints/models/macro-block';
import { GoBackBlock } from '../entrypoints/models/go-back-block';
import { validateBlueprint } from '../entrypoints/models/blueprint-validator';
import { SelectorType } from '../entrypoints/models/selector';
import { macroRegistryStore } from '../entrypoints/stores/macro-registry-store';

describe('BlueprintValidator', () => {
    let blueprint: Blueprint;

    beforeEach(() => {
        blueprint = new Blueprint('Test Blueprint', 'Test description');
        macroRegistryStore.clearMacros();
    });

    describe('Basic Validation', () => {
        it('should validate empty blueprint with warning', () => {
            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0].message).toContain('no blocks');
        });

        it('should reject blueprint without name', () => {
            blueprint.name = '';
            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('name'))).toBe(true);
        });

        it('should detect duplicate block IDs', () => {
            const block1 = new NavigateBlock('Nav 1', { url: 'https://example.com' });
            const block2 = new NavigateBlock('Nav 2', { url: 'https://example.com' });
            block2.id = block1.id; // Force duplicate

            blueprint.addBlock(block1);
            blueprint.addBlock(block2);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
        });
    });

    describe('Navigate Block Validation', () => {
        it('should require URL', () => {
            const block = new NavigateBlock('Nav', { url: '' });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('URL'))).toBe(true);
        });

        it('should reject navigate with children', () => {
            const parent = new NavigateBlock('Nav', { url: 'https://example.com' });
            const child = new WaitBlock('Wait', { type: 'timeout', timeout: 1000 });
            parent.children = [child];
            child.parent = parent;
            blueprint.addBlock(parent);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('should not have children'))).toBe(true);
        });
    });

    describe('Click Block Validation', () => {
        it('should require selector outside loop', () => {
            const block = new ClickBlock('Click', { selector: { value: '', type: SelectorType.CSS } });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('selector'))).toBe(true);
        });

        it('should allow click without selector inside loop', () => {
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            const click = new ClickBlock('Click', { selector: { value: '', type: SelectorType.CSS } });
            loop.children = [click];
            click.parent = loop;
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(true);
        });

        it('should warn about openInNewTab with no children', () => {
            const block = new ClickBlock('Click', {
                selector: { value: '.link', type: SelectorType.CSS },
                openInNewTab: true
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('new tab'))).toBe(true);
        });

        it('should reject invalid CSS selector syntax for click selectors', () => {
            const block = new ClickBlock('Click', {
                selector: { value: "a:contains('Buy')", type: SelectorType.CSS },
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('unsupported CSS'))).toBe(true);
        });
    });

    describe('Input Block Validation', () => {
        it('should require selector outside loop', () => {
            const block = new InputBlock('Input', { selector: { value: '', type: SelectorType.CSS }, value: 'test' });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
        });

        it('should warn about empty value', () => {
            const block = new InputBlock('Input', { selector: { value: '#input', type: SelectorType.CSS }, value: '' });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('no value'))).toBe(true);
        });
    });

    describe('Wait Block Validation', () => {
        it('should require type', () => {
            const block = new WaitBlock('Wait', { type: undefined as any, timeout: 1000 });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('type'))).toBe(true);
        });

        it('should require positive timeout for timeout type', () => {
            const block = new WaitBlock('Wait', { type: 'timeout', timeout: 0 });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('> 0'))).toBe(true);
        });

        it('should require selector for visibility wait', () => {
            const block = new WaitBlock('Wait', {
                type: 'selector_visible',
                selector: { value: '', type: SelectorType.CSS },
                timeout: 5000
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('selector'))).toBe(true);
        });
    });

    describe('Loop Elements Validation', () => {
        it('should require selector', () => {
            const block = new LoopElementsBlock('Loop', { selector: { value: '', type: SelectorType.CSS } });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('selector'))).toBe(true);
        });

        it('should warn about loop with no children', () => {
            const block = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('no children'))).toBe(true);
        });

        it('should require positive maxIterations', () => {
            const block = new LoopElementsBlock('Loop', {
                selector: { value: '.item', type: SelectorType.CSS },
                maxIterations: 0
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
        });

        it('should warn about overly specific loop selectors', () => {
            const block = new LoopElementsBlock('Loop', {
                selector: { value: '.product-card:nth-child(3)', type: SelectorType.CSS }
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('too specific for a repeating selector'))).toBe(true);
        });
    });

    describe('Loop Pagination Validation', () => {
        it('should require next button selector', () => {
            const block = new LoopPaginationBlock('Pagination', {
                nextButtonSelector: { value: '', type: SelectorType.CSS }
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('next button'))).toBe(true);
        });

        it('should warn about pagination with no children', () => {
            const block = new LoopPaginationBlock('Pagination', {
                nextButtonSelector: { value: '.next', type: SelectorType.CSS }
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('no children'))).toBe(true);
        });
    });

    describe('Extract Scope Validation', () => {
        it('should require at least one field', () => {
            const block = new ExtractScopeBlock('Extract', { fields: [] });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('at least one field'))).toBe(true);
        });

        it('should require field key', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [{
                    key: '',
                    selector: { value: '.title', type: SelectorType.CSS },
                    attribute: 'text'
                }]
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('key'))).toBe(true);
        });

        it('should require field attribute', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [{
                    key: 'title',
                    selector: { value: '.title', type: SelectorType.CSS },
                    attribute: undefined as any
                }]
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('attribute'))).toBe(true);
        });

        it('should warn about extract outside loop', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [{
                    key: 'title',
                    selector: { value: '.title', type: SelectorType.CSS },
                    attribute: 'text'
                }]
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('outside a loop'))).toBe(true);
        });

        it('should warn when formula fields reference missing extracted fields', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [
                    {
                        key: 'PRIX',
                        selector: { value: '', type: SelectorType.CSS },
                        attribute: 'text',
                        mode: 'static',
                        staticType: 'constant',
                        staticValue: '',
                        formula: '{{Pages}}*0.50',
                    },
                ],
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('Formula for "PRIX" references missing field "Pages"'))).toBe(true);
        });

        it('should warn about suspicious GTN output keys that likely mean GTIN', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [
                    {
                        key: 'GTN',
                        selector: { value: '', type: SelectorType.CSS },
                        attribute: 'text',
                        mode: 'static',
                        staticType: 'constant',
                        staticValue: '9781268762',
                    },
                ],
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('GTN') && w.message.includes('GTIN'))).toBe(true);
        });

        it('should warn when required extract selectors are highly positional', () => {
            const block = new ExtractScopeBlock('Extract', {
                fields: [
                    {
                        key: 'image',
                        selector: {
                            value: 'main.main > div:nth-of-type(2) > div > div.flex-wrap > img',
                            type: SelectorType.CSS,
                        },
                        attribute: 'src',
                        required: true,
                    },
                ],
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('required') && w.message.includes('positional'))).toBe(true);
        });
    });

    describe('Condition Block Validation', () => {
        it('should require check type', () => {
            const block = new ConditionBlock({
                selector: { value: '.element', type: SelectorType.CSS },
                check: undefined as any
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('check type'))).toBe(true);
        });

        it('should require value for text_contains check', () => {
            const block = new ConditionBlock({
                selector: { value: '.element', type: SelectorType.CSS },
                check: 'text_contains'
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('requires a value'))).toBe(true);
        });

        it('should allow exists check without value', () => {
            const block = new ConditionBlock({
                selector: { value: '.element', type: SelectorType.CSS },
                check: 'exists'
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(true);
        });
    });

    describe('Newer Block Type Validation', () => {
        it('should accept assert blocks as valid block types', () => {
            const block = new AssertBlock('Assert', {
                selector: { value: '.element', type: SelectorType.CSS },
                check: 'exists'
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.errors.some(e => e.message.includes('Invalid block type'))).toBe(false);
        });

        it('should require variable name for set variable blocks', () => {
            const block = new SetVariableBlock('Set Variable', {
                name: '',
                value: 'value'
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('Variable') && e.message.includes('name'))).toBe(true);
        });

        it('should require macro id for macro blocks', () => {
            const block = new MacroBlock('Macro', {
                macroId: ''
            });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('macroId'))).toBe(true);
        });

        it('should warn on unresolved variable references', () => {
            const block = new NavigateBlock('Nav', { url: 'https://example.com?q={{missingVar}}' });
            blueprint.addBlock(block);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('Unresolved variable reference: missingVar'))).toBe(true);
        });

        it('should validate macro parameters against registered macros', () => {
            macroRegistryStore.setMacro('macro-products', {
                id: 'macro-products',
                name: 'Products macro',
                parameters: [{ name: 'category', required: true }],
                blocks: [],
            });

            blueprint.addBlock(new MacroBlock('Run macro', {
                macroId: 'macro-products',
                parameters: { extra: 'x' },
            }));

            const result = validateBlueprint(blueprint);
            expect(result.errors.some(e => e.message.includes('required macro parameter "category"'))).toBe(true);
            expect(result.warnings.some(w => w.message.includes('Unknown macro parameter "extra"'))).toBe(true);
        });
    });

    describe('Nesting and Relationships', () => {
        it('should detect excessive nesting depth', () => {
            let parent: any = blueprint;
            for (let i = 0; i < 12; i++) {
                const loop = new LoopElementsBlock(`Loop ${i}`, {
                    selector: { value: '.item', type: SelectorType.CSS }
                });
                if (parent.addBlock) {
                    parent.addBlock(loop);
                } else {
                    parent.children = [loop];
                    loop.parent = parent;
                }
                parent = loop;
            }

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.message.includes('nesting depth'))).toBe(true);
        });

        it('should warn about navigate inside loop', () => {
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            const nav = new NavigateBlock('Nav', { url: 'https://example.com' });
            loop.children = [nav];
            nav.parent = loop;
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('Navigate inside a loop'))).toBe(true);
        });

        it('should validate parent references', () => {
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [{
                    key: 'title',
                    selector: { value: '.title', type: SelectorType.CSS },
                    attribute: 'text'
                }]
            });
            loop.children = [extract];
            // Intentionally don't set parent reference
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);
            expect(result.warnings.some(w => w.message.includes('parent reference'))).toBe(true);
        });

        it('should warn when a condition else child has the wrong parent branch metadata', () => {
            const condition = new ConditionBlock({
                selector: { value: '.element', type: SelectorType.CSS },
                check: 'exists',
            });
            const elseWait = new WaitBlock('Else wait', { type: 'timeout', timeout: 250 });

            condition.addElseChild(elseWait);
            elseWait.parentBranch = 'children';
            blueprint.addBlock(condition);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('parent branch'))).toBe(true);
        });

        it('should ignore disabled blocks and their children during validation', () => {
            const click = new ClickBlock('Disabled click', {
                selector: { value: '', type: SelectorType.CSS },
            });
            click.enabled = false;
            const extract = new ExtractScopeBlock('Disabled child extract', {
                fields: [{
                    key: 'title',
                    selector: { value: 'a:contains("broken")', type: SelectorType.CSS },
                    attribute: 'text',
                }],
            });
            extract.parent = click;
            click.children = [extract];
            blueprint.addBlock(click);

            const result = validateBlueprint(blueprint);

            expect(result.errors.some(e => e.blockLabel === 'Disabled click')).toBe(false);
            expect(result.errors.some(e => e.blockLabel === 'Disabled child extract')).toBe(false);
            expect(result.warnings.some(w => w.blockLabel === 'Disabled child extract')).toBe(false);
        });

        it('should warn when a same-tab detail extraction flow cannot return to the list page', () => {
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            const click = new ClickBlock('Open detail', {
                selector: { value: '.title', type: SelectorType.CSS },
                openInNewTab: false,
            });
            const extract = new ExtractScopeBlock('Extract detail', {
                resetScope: true,
                fields: [{
                    key: 'image',
                    selector: { value: '.detail-image', type: SelectorType.CSS },
                    attribute: 'src',
                }],
            });
            click.parent = loop;
            extract.parent = loop;
            loop.children = [click, extract];
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('return to the listing page'))).toBe(true);
        });

        it('should warn when same-tab detail flow go back block is disabled', () => {
            const loop = new LoopElementsBlock('Loop', { selector: { value: '.item', type: SelectorType.CSS } });
            const click = new ClickBlock('Open detail', {
                selector: { value: '.title', type: SelectorType.CSS },
                openInNewTab: false,
            });
            const extract = new ExtractScopeBlock('Extract detail', {
                resetScope: true,
                fields: [{
                    key: 'image',
                    selector: { value: '.detail-image', type: SelectorType.CSS },
                    attribute: 'src',
                }],
            });
            const goBack = new GoBackBlock('Go Back', {});
            goBack.enabled = false;
            click.parent = loop;
            extract.parent = loop;
            goBack.parent = loop;
            loop.children = [click, extract, goBack];
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);

            expect(result.warnings.some(w => w.message.includes('Go Back block is disabled'))).toBe(true);
        });
    });

    describe('Complex Scenarios', () => {
        it('should validate complete scraping blueprint', () => {
            const nav = new NavigateBlock('Navigate', { url: 'https://example.com' });
            const wait = new WaitBlock('Wait', { type: 'timeout', timeout: 2000 });
            const loop = new LoopElementsBlock('Loop Items', { selector: { value: '.item', type: SelectorType.CSS } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [
                    { key: 'title', selector: { value: '.title', type: SelectorType.CSS }, attribute: 'text' },
                    { key: 'price', selector: { value: '.price', type: SelectorType.CSS }, attribute: 'text' }
                ]
            });

            loop.children = [extract];
            extract.parent = loop;

            blueprint.addBlock(nav);
            blueprint.addBlock(wait);
            blueprint.addBlock(loop);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should validate pagination with extraction', () => {
            const pagination = new LoopPaginationBlock('Pagination', {
                nextButtonSelector: { value: '.next', type: SelectorType.CSS },
                maxPages: 5
            });
            const loop = new LoopElementsBlock('Loop Items', { selector: { value: '.item', type: SelectorType.CSS } });
            const extract = new ExtractScopeBlock('Extract', {
                fields: [{ key: 'data', selector: { value: '.data', type: SelectorType.CSS }, attribute: 'text' }]
            });

            loop.children = [extract];
            extract.parent = loop;
            pagination.children = [loop];
            loop.parent = pagination;

            blueprint.addBlock(pagination);

            const result = validateBlueprint(blueprint);
            expect(result.valid).toBe(true);
        });
    });
});
