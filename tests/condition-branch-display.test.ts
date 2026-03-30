import { describe, expect, it } from 'vitest';
import { buildConditionBranchDisplay } from '../entrypoints/sidepanel/components/condition-branch-display';
import { NavigateBlock } from '../entrypoints/models/navigate-block';

describe('condition branch display helpers', () => {
    it('builds explicit then and else branches in order', () => {
        const thenBlock = new NavigateBlock('Navigate', { url: 'https://example.com' });
        const elseBlock = new NavigateBlock('Fallback', { url: 'https://example.org' });

        const branches = buildConditionBranchDisplay([thenBlock], [elseBlock]);

        expect(branches).toHaveLength(2);
        expect(branches[0]).toMatchObject({
            branchName: 'children',
            title: 'THEN',
            subtitle: 'Runs when the condition is true',
            emptyMessage: 'No blocks in the THEN branch yet.',
            previewLabel: 'THEN branch',
            tone: 'success',
        });
        expect(branches[0].blocks).toEqual([thenBlock]);

        expect(branches[1]).toMatchObject({
            branchName: 'elseChildren',
            title: 'ELSE',
            subtitle: 'Runs when the condition is false',
            emptyMessage: 'No blocks in the ELSE branch yet.',
            previewLabel: 'ELSE branch',
            tone: 'fallback',
        });
        expect(branches[1].blocks).toEqual([elseBlock]);
    });
});
