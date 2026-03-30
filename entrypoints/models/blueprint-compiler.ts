import { toJS } from 'mobx';
import { Blueprint } from './blueprint';
import { ExecutorMethodName, getBlockRegistryEntry } from './block-registry';
import { Block } from './types';

export interface CompiledBlockExecution {
    executorMethod: ExecutorMethodName;
    allowsChildren: boolean;
    managesChildrenExecution: boolean;
}

export interface CompiledBlock {
    id: string;
    type: Block['type'];
    label: string;
    description?: string;
    enabled: boolean;
    onError?: Block['onError'];
    maxRetries: number;
    retryDelay: number;
    maxExecutionTime?: number;
    config: any;
    index: number;
    parentId?: string;
    parentBranch?: 'children' | 'elseChildren';
    children: CompiledBlock[];
    elseChildren: CompiledBlock[];
    execution: CompiledBlockExecution;
}

export interface CompiledBlueprint {
    id: string;
    name: string;
    description: string;
    version: number;
    blocks: CompiledBlock[];
    totalBlocks: number;
}

interface CompileParentContext {
    parentId?: string;
    parentBranch?: 'children' | 'elseChildren';
}

function countCompiledBlocks(blocks: CompiledBlock[]): number {
    return blocks.reduce((count, block) => {
        return count + 1 + countCompiledBlocks(block.children) + countCompiledBlocks(block.elseChildren);
    }, 0);
}

export function compileBlock(block: Block, parentContext: CompileParentContext = {}): CompiledBlock {
    const entry = getBlockRegistryEntry(block.type);
    if (!entry) {
        throw new Error(`Unknown block type: ${block.type}`);
    }

    const children = (block.children || []).map((child) =>
        compileBlock(child, { parentId: block.id, parentBranch: 'children' })
    );
    const elseChildren = (((block as any).elseChildren || []) as Block[]).map((child) =>
        compileBlock(child, { parentId: block.id, parentBranch: 'elseChildren' })
    );

    return {
        id: block.id,
        type: block.type,
        label: block.label || entry.defaultLabel,
        description: block.description,
        enabled: block.enabled !== false,
        onError: block.onError,
        maxRetries: block.maxRetries ?? 0,
        retryDelay: block.retryDelay ?? 1000,
        maxExecutionTime: block.maxExecutionTime,
        config: toJS(block.config),
        index: block.index ?? 0,
        parentId: parentContext.parentId,
        parentBranch: parentContext.parentBranch,
        children,
        elseChildren,
        execution: {
            executorMethod: entry.executorMethod,
            allowsChildren: entry.allowsChildren,
            managesChildrenExecution: entry.managesChildrenExecution,
        },
    };
}

export function compileBlueprint(blueprint: Blueprint): CompiledBlueprint {
    const blocks = blueprint.blocks.map((block) => compileBlock(block));

    return {
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        blocks,
        totalBlocks: countCompiledBlocks(blocks),
    };
}
