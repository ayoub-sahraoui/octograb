import { describe, expect, it } from 'vitest';
import { getBlockSelectorGroups } from '../entrypoints/sidepanel/components/block-selector-groups';

describe('block selector groups', () => {
    it('groups block options into action, flow, and data sections', () => {
        const groups = getBlockSelectorGroups();

        expect(groups.map((group) => group.title)).toEqual([
            'Actions',
            'Flow',
            'Data',
        ]);

        expect(groups[0].blocks.map((block) => block.type)).toEqual([
            'navigate',
            'click',
            'input',
            'wait',
            'scroll',
            'go_back',
        ]);

        expect(groups[1].blocks.map((block) => block.type)).toEqual([
            'loop_elements',
            'loop_pagination',
            'condition',
            'assert',
            'macro',
        ]);

        expect(groups[2].blocks.map((block) => block.type)).toEqual([
            'extract_scope',
            'set_variable',
        ]);
    });

    it('keeps descriptions compact for the half-height picker sheet', () => {
        const groups = getBlockSelectorGroups();

        for (const group of groups) {
            for (const block of group.blocks) {
                expect(block.description.length).toBeLessThanOrEqual(46);
            }
        }
    });
});
