import { describe, expect, it } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { ConditionBlock } from '../entrypoints/models/condition-block';
import { ClickBlock } from '../entrypoints/models/click-block';
import { WaitBlock } from '../entrypoints/models/wait-block';
import { SelectorType } from '../entrypoints/models/selector';
import { compileBlueprint } from '../entrypoints/models/blueprint-compiler';

describe('Blueprint Compiler', () => {
    it('compiles blueprint blocks into plain execution blocks with registry metadata', () => {
        const blueprint = new Blueprint('Catalog scrape', 'Compile me');
        const navigate = new NavigateBlock('', { url: 'https://example.com' });
        navigate.setDescription('Visit the target page');
        navigate.setMaxExecutionTime(15000);
        blueprint.addBlock(navigate);

        const compiled = compileBlueprint(blueprint);
        const [compiledNavigate] = compiled.blocks;

        expect(compiled.name).toBe('Catalog scrape');
        expect(compiled.totalBlocks).toBe(1);
        expect(compiledNavigate.label).toBe('Navigate');
        expect(compiledNavigate.description).toBe('Visit the target page');
        expect(compiledNavigate.maxExecutionTime).toBe(15000);
        expect(compiledNavigate.execution.executorMethod).toBe('executeNavigate');
        expect(compiledNavigate.execution.managesChildrenExecution).toBe(false);
        expect(compiledNavigate.parentId).toBeUndefined();
    });

    it('compiles nested children and else branches without parent object references', () => {
        const blueprint = new Blueprint('Conditional flow', '');
        const condition = new ConditionBlock({
            selector: { type: SelectorType.CSS, value: '.product' },
            check: 'exists',
        });
        condition.setLabel('Check product');

        const thenClick = new ClickBlock('Click product', {
            selector: { type: SelectorType.CSS, value: '.product a' },
        });
        condition.addChild(thenClick);

        const elseWait = new WaitBlock('Wait for product', {
            type: 'timeout',
            timeout: 1000,
        });
        condition.addElseChild(elseWait);

        blueprint.addBlock(condition);

        const compiled = compileBlueprint(blueprint);
        const [compiledCondition] = compiled.blocks;

        expect(compiled.totalBlocks).toBe(3);
        expect(compiledCondition.execution.managesChildrenExecution).toBe(true);
        expect(compiledCondition.children).toHaveLength(1);
        expect(compiledCondition.elseChildren).toHaveLength(1);
        expect(compiledCondition.children[0].parentId).toBe(compiledCondition.id);
        expect(compiledCondition.children[0].parentBranch).toBe('children');
        expect(compiledCondition.elseChildren[0].parentId).toBe(compiledCondition.id);
        expect(compiledCondition.elseChildren[0].parentBranch).toBe('elseChildren');
        expect('parent' in compiledCondition.children[0]).toBe(false);
        expect('parent' in compiledCondition.elseChildren[0]).toBe(false);
    });
});
