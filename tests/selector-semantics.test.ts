import { describe, expect, it } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { ClickBlock } from '../entrypoints/models/click-block';
import { ExtractScopeBlock } from '../entrypoints/models/extract-scope-block';
import { LoopElementsBlock } from '../entrypoints/models/loop-elements-block';
import { SelectorType } from '../entrypoints/models/selector';
import { getSelectorContext } from '../entrypoints/models/selector-semantics';

describe('getSelectorContext', () => {
    it('returns global-field when no block is provided', () => {
        expect(getSelectorContext(null, 'extract-field')).toBe('global-field');
    });

    it('returns global-field when role is not extract-field', () => {
        const block = new ExtractScopeBlock('Extract', { fields: [] });
        expect(getSelectorContext(block, 'click-target')).toBe('global-field');
    });

    it('returns scope-field when custom scope selector exists on the extract block', () => {
        const block = new ExtractScopeBlock('Extract', {
            scopeSelector: { type: SelectorType.CSS, value: '.main-container' },
            fields: []
        });
        expect(getSelectorContext(block, 'extract-field')).toBe('scope-field');
    });

    it('returns list-field when inside a loop elements block and no click precedes it', () => {
        const loop = new LoopElementsBlock('Loop', {
            selector: { type: SelectorType.CSS, value: '.item' }
        });
        const extract = new ExtractScopeBlock('Extract', { fields: [] });
        loop.children = [extract];
        extract.parent = loop;

        expect(getSelectorContext(extract, 'extract-field')).toBe('list-field');
    });

    it('returns detail-field when inside a loop elements block with a preceding click and resetScope true', () => {
        const loop = new LoopElementsBlock('Loop', {
            selector: { type: SelectorType.CSS, value: '.item' }
        });
        const click = new ClickBlock('Click Item', {
            selector: { type: SelectorType.CSS, value: '.title-link' },
            openInNewTab: false
        });
        const extract = new ExtractScopeBlock('Extract Detail', {
            resetScope: true,
            fields: []
        });
        loop.children = [click, extract];
        click.parent = loop;
        extract.parent = loop;

        expect(getSelectorContext(extract, 'extract-field')).toBe('detail-field');
    });

    it('returns global-field when outside loop and resetScope true', () => {
        const extract = new ExtractScopeBlock('Extract Detail', {
            resetScope: true,
            fields: []
        });
        expect(getSelectorContext(extract, 'extract-field')).toBe('global-field');
    });

    it('returns detail-field when nested inside a click block (with children) inside a loop elements block', () => {
        const loop = new LoopElementsBlock('Loop', {
            selector: { type: SelectorType.CSS, value: '.item' }
        });
        const click = new ClickBlock('Click Item', {
            selector: { type: SelectorType.CSS, value: '.title-link' },
            openInNewTab: true
        });
        const extract = new ExtractScopeBlock('Extract Detail', {
            resetScope: true,
            fields: []
        });
        
        loop.children = [click];
        click.parent = loop;
        click.children = [extract];
        extract.parent = click;

        expect(getSelectorContext(extract, 'extract-field')).toBe('detail-field');
    });

    it('returns detail-field when nested inside a click block outside a loopElements block', () => {
        const click = new ClickBlock('Click Header', {
            selector: { type: SelectorType.CSS, value: '#header-btn' },
            openInNewTab: false
        });
        const extract = new ExtractScopeBlock('Extract Detail', {
            resetScope: true,
            fields: []
        });
        
        click.children = [extract];
        extract.parent = click;

        expect(getSelectorContext(extract, 'extract-field')).toBe('detail-field');
    });
});
