import { toJS } from 'mobx';
import { Block } from './types';
import { MacroDefinition, MacroParameter } from './macro-block';

export interface MacroParameterRowInput {
    name: string;
    description?: string;
    defaultValue?: string;
    required?: boolean;
}

export interface BuildMacroDefinitionInput {
    name: string;
    description: string;
    parameterRows: MacroParameterRowInput[];
}

export interface MacroSourceSummary {
    rootLabel: string;
    rootType: string;
    blockCount: number;
}

function serializeBlockSubtree(block: Block): any {
    const serialized: any = {
        id: block.id,
        type: block.type,
        label: block.label,
        description: block.description,
        config: toJS(block.config),
        enabled: block.enabled,
        maxRetries: block.maxRetries,
        retryDelay: block.retryDelay,
        maxExecutionTime: block.maxExecutionTime,
        onError: block.onError,
        index: block.index,
    };

    if (block.children && block.children.length > 0) {
        serialized.children = block.children.map((child) => serializeBlockSubtree(child));
    }

    if ((block as any).elseChildren && (block as any).elseChildren.length > 0) {
        serialized.elseChildren = (block as any).elseChildren.map((child: Block) => serializeBlockSubtree(child));
    }

    return serialized;
}

export function countBlockSubtree(block: Block): number {
    const childCount = (block.children || []).reduce((total, child) => total + countBlockSubtree(child), 0);
    const elseCount = ((block as any).elseChildren || []).reduce(
        (total: number, child: Block) => total + countBlockSubtree(child),
        0,
    );

    return 1 + childCount + elseCount;
}

export function buildMacroSourceSummary(block: Block): MacroSourceSummary {
    return {
        rootLabel: block.label || block.type,
        rootType: block.type,
        blockCount: countBlockSubtree(block),
    };
}

export function normalizeMacroParameterRows(rows: MacroParameterRowInput[]): MacroParameter[] {
    return rows
        .map((row) => ({
            name: row.name.trim(),
            description: row.description?.trim() || undefined,
            defaultValue: row.defaultValue?.trim() || undefined,
            required: Boolean(row.required),
        }))
        .filter((row) => row.name.length > 0);
}

export function buildMacroDefinitionFromBlock(
    block: Block,
    input: BuildMacroDefinitionInput,
): MacroDefinition {
    return {
        id: crypto.randomUUID(),
        name: input.name.trim() || block.label || block.type,
        description: input.description.trim(),
        parameters: normalizeMacroParameterRows(input.parameterRows),
        blocks: [serializeBlockSubtree(block)],
    };
}
