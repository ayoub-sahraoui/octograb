import { describe, expect, it } from 'vitest';
import { LoopElementsBlock } from '../entrypoints/models/loop-elements-block';
import { ClickBlock } from '../entrypoints/models/click-block';
import { ConditionBlock } from '../entrypoints/models/condition-block';
import { SelectorType } from '../entrypoints/models/selector';
import {
    buildMacroSourceSummary,
    buildMacroDefinitionFromBlock,
    normalizeMacroParameterRows,
} from '../entrypoints/models/macro-creation';

describe('macro creation helpers', () => {
    it('serializes a block subtree into a reusable macro definition', () => {
        const root = new LoopElementsBlock('Loop Products', {
            selector: { type: SelectorType.CSS, value: '.product-card' },
        });
        const click = new ClickBlock('Open Product', {
            selector: { type: SelectorType.CSS, value: 'a.product-link' },
        });

        root.addChild(click);

        const macro = buildMacroDefinitionFromBlock(root, {
            name: 'Product Flow',
            description: 'Loop product cards and open each detail page',
            parameterRows: [],
        });

        expect(macro.name).toBe('Product Flow');
        expect(macro.description).toBe('Loop product cards and open each detail page');
        expect(macro.parameters).toEqual([]);
        expect(macro.blocks).toHaveLength(1);
        expect(macro.blocks[0]).toMatchObject({
            type: 'loop_elements',
            label: 'Loop Products',
            children: [
                {
                    type: 'click',
                    label: 'Open Product',
                },
            ],
        });
    });

    it('preserves condition else branches in saved macro blocks', () => {
        const condition = new ConditionBlock({
            selector: { type: SelectorType.CSS, value: '.login-button' },
            check: 'exists',
        });
        const thenClick = new ClickBlock('Open Login', {
            selector: { type: SelectorType.CSS, value: '.login-button' },
        });
        const elseClick = new ClickBlock('Open Account', {
            selector: { type: SelectorType.CSS, value: '.account-link' },
        });

        condition.addChild(thenClick);
        condition.addElseChild(elseClick);

        const macro = buildMacroDefinitionFromBlock(condition, {
            name: 'Account Gate',
            description: '',
            parameterRows: [],
        });

        expect(macro.blocks[0]).toMatchObject({
            type: 'condition',
            children: [{ type: 'click', label: 'Open Login' }],
            elseChildren: [{ type: 'click', label: 'Open Account' }],
        });
    });

    it('builds a source summary for the selected subtree', () => {
        const root = new LoopElementsBlock('Loop Products', {
            selector: { type: SelectorType.CSS, value: '.product-card' },
        });
        root.addChild(new ClickBlock('Open Product', {
            selector: { type: SelectorType.CSS, value: 'a.product-link' },
        }));

        expect(buildMacroSourceSummary(root)).toEqual({
            rootLabel: 'Loop Products',
            rootType: 'loop_elements',
            blockCount: 2,
        });
    });

    it('normalizes valid parameter rows and drops empty ones', () => {
        const rows = normalizeMacroParameterRows([
            {
                name: ' cardSelector ',
                description: 'Selector for each card',
                defaultValue: '',
                required: true,
            },
            {
                name: ' ',
                description: 'Ignored',
                defaultValue: '',
                required: false,
            },
            {
                name: 'delayMs',
                description: '',
                defaultValue: '1000',
                required: false,
            },
        ]);

        expect(rows).toEqual([
            {
                name: 'cardSelector',
                description: 'Selector for each card',
                required: true,
            },
            {
                name: 'delayMs',
                defaultValue: '1000',
                required: false,
            },
        ]);
    });
});
