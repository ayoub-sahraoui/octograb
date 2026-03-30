import { MacroDefinition, MacroParameter } from '../../models/macro-block';
import { MacroParameterRowInput, normalizeMacroParameterRows } from '../../models/macro-creation';

export interface MacroLibraryCard {
    id: string;
    name: string;
    description?: string;
    parameterCount: number;
    blockCount: number;
    updatedAt?: string;
    createdAt?: string;
    parameters: MacroParameter[];
}

export interface MacroLibraryDisplay {
    cards: MacroLibraryCard[];
}

function countSerializedBlocks(blocks: any[]): number {
    return blocks.reduce((total, block) => {
        const children = Array.isArray(block.children) ? countSerializedBlocks(block.children) : 0;
        const elseChildren = Array.isArray(block.elseChildren) ? countSerializedBlocks(block.elseChildren) : 0;
        return total + 1 + children + elseChildren;
    }, 0);
}

export function buildMacroLibraryDisplay(macros: MacroDefinition[]): MacroLibraryDisplay {
    const cards = [...macros]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((macro) => ({
            id: macro.id,
            name: macro.name,
            description: macro.description,
            parameterCount: macro.parameters?.length || 0,
            blockCount: countSerializedBlocks(macro.blocks || []),
            updatedAt: macro.updatedAt,
            createdAt: macro.createdAt,
            parameters: macro.parameters || [],
        }));

    return { cards };
}

export function buildUpdatedMacroDefinition(
    macro: MacroDefinition,
    input: {
        name: string;
        description: string;
        parameters: MacroParameterRowInput[];
    },
): MacroDefinition {
    return {
        ...macro,
        name: input.name.trim(),
        description: input.description.trim(),
        parameters: normalizeMacroParameterRows(input.parameters),
    };
}
