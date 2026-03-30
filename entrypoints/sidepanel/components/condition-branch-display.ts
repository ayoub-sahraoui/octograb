import { Block } from '@/entrypoints/models/types';

export type ConditionBranchTone = 'success' | 'fallback';

export interface ConditionBranchDisplay {
    branchName: 'children' | 'elseChildren';
    title: 'THEN' | 'ELSE';
    subtitle: string;
    emptyMessage: string;
    previewLabel: string;
    tone: ConditionBranchTone;
    blocks: Block[];
}

export function buildConditionBranchDisplay(
    children: Block[],
    elseChildren: Block[],
): ConditionBranchDisplay[] {
    return [
        {
            branchName: 'children',
            title: 'THEN',
            subtitle: 'Runs when the condition is true',
            emptyMessage: 'No blocks in the THEN branch yet.',
            previewLabel: 'THEN branch',
            tone: 'success',
            blocks: children,
        },
        {
            branchName: 'elseChildren',
            title: 'ELSE',
            subtitle: 'Runs when the condition is false',
            emptyMessage: 'No blocks in the ELSE branch yet.',
            previewLabel: 'ELSE branch',
            tone: 'fallback',
            blocks: elseChildren,
        },
    ];
}
