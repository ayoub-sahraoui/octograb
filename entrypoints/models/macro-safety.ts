import { MacroDefinition } from './macro-block';

export const MAX_MACRO_EXPANSION_DEPTH = 5;
export const MAX_MACRO_EXPANSION_BLOCKS = 200;

export interface MacroExecutionGuardInput {
    macroId: string;
    macroName: string;
    activeStack: string[];
    nextBlockCount: number;
    expandedBlockCount: number;
}

export function countSerializedBlocks(blocks: any[]): number {
    return blocks.reduce((count, block) => {
        return count
            + 1
            + countSerializedBlocks(block.children || [])
            + countSerializedBlocks(block.elseChildren || []);
    }, 0);
}

export function guardMacroExecution(input: MacroExecutionGuardInput) {
    const { macroId, macroName, activeStack, nextBlockCount, expandedBlockCount } = input;

    if (activeStack.includes(macroId)) {
        const cyclePath = [...activeStack, macroId].join(' -> ');
        throw new Error(`Macro cycle detected: ${cyclePath}`);
    }

    if (activeStack.length >= MAX_MACRO_EXPANSION_DEPTH) {
        throw new Error(`Macro expansion depth exceeded (${MAX_MACRO_EXPANSION_DEPTH}) at ${macroName}`);
    }

    if (expandedBlockCount + nextBlockCount > MAX_MACRO_EXPANSION_BLOCKS) {
        throw new Error(`Macro expansion would exceed max block limit (${MAX_MACRO_EXPANSION_BLOCKS})`);
    }
}

export function analyzeMacroExpansion(
    macroId: string,
    macroDefinitions: Map<string, MacroDefinition>,
    activeStack: string[] = [],
): { issues: string[]; expandedBlockCount: number } {
    const macroDefinition = macroDefinitions.get(macroId);
    if (!macroDefinition) {
        return { issues: [], expandedBlockCount: 0 };
    }

    const issues: string[] = [];
    const stack = [...activeStack];

    try {
        guardMacroExecution({
            macroId,
            macroName: macroDefinition.name,
            activeStack: stack,
            nextBlockCount: countSerializedBlocks(macroDefinition.blocks || []),
            expandedBlockCount: 0,
        });
    } catch (error: any) {
        issues.push(error.message);
        return { issues, expandedBlockCount: 0 };
    }

    const nextStack = [...stack, macroId];
    let expandedBlockCount = countSerializedBlocks(macroDefinition.blocks || []);

    for (const block of macroDefinition.blocks || []) {
        if (block.type !== 'macro') continue;
        const childMacroId = String(block.config?.macroId || '').trim();
        if (!childMacroId) continue;

        const child = analyzeMacroExpansion(childMacroId, macroDefinitions, nextStack);
        issues.push(...child.issues);
        expandedBlockCount += child.expandedBlockCount;
    }

    if (expandedBlockCount > MAX_MACRO_EXPANSION_BLOCKS) {
        issues.push(`Macro expansion would exceed max block limit (${MAX_MACRO_EXPANSION_BLOCKS})`);
    }

    return { issues: Array.from(new Set(issues)), expandedBlockCount };
}
