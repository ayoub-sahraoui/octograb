import { Blueprint } from './blueprint';
import { compileBlueprint, CompiledBlock, CompiledBlueprint } from './blueprint-compiler';
import { macroRegistryStore } from '../stores/macro-registry-store';
import { MacroDefinition } from './macro-block';
import { analyzeMacroExpansion } from './macro-safety';

export interface AnalysisIssue {
    blockId?: string;
    blockLabel?: string;
    message: string;
    severity: 'error' | 'warning';
    path?: string;
}

export interface BlueprintAnalysis {
    blockCount: number;
    maxDepth: number;
    blockTypes: string[];
    blockTypeCounts: Record<string, number>;
    variableReferences: string[];
    macroIds: string[];
    containerBlockCount: number;
    issues: AnalysisIssue[];
}

export interface BlueprintPreview {
    name: string;
    description: string;
    blockCount: number;
    valid: boolean;
    errors: string[];
    warnings: string[];
    blockTypes: string[];
    maxDepth: number;
    variableReferences: string[];
    macroIds: string[];
}

interface CompileTimeWalkResult {
    issues: AnalysisIssue[];
    localVariables: Set<string>;
    rootVariables: Set<string>;
}

function collectStringValues(value: unknown, collector: string[]) {
    if (typeof value === 'string') {
        collector.push(value);
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectStringValues(item, collector);
        }
        return;
    }

    if (value && typeof value === 'object') {
        for (const nested of Object.values(value)) {
            collectStringValues(nested, collector);
        }
    }
}

function extractVariableReferences(block: CompiledBlock): string[] {
    const strings: string[] = [];
    collectStringValues(block.config, strings);
    const refs = new Set<string>();

    for (const value of strings) {
        const matches = value.matchAll(/\{\{([^}]+)\}\}/g);
        for (const match of matches) {
            const name = match[1]?.trim();
            if (name) refs.add(name);
        }
    }

    return Array.from(refs);
}

function analyzeCompileTimeSequence(
    blocks: CompiledBlock[],
    localVariables: Set<string>,
    rootVariables: Set<string>,
    macroDefinitions: Map<string, MacroDefinition>,
): CompileTimeWalkResult {
    const issues: AnalysisIssue[] = [];
    const currentLocal = new Set(localVariables);
    const currentRoot = new Set(rootVariables);

    for (const block of blocks) {
        const variableReferences = extractVariableReferences(block);
        for (const variableName of variableReferences) {
            if (!currentLocal.has(variableName) && !currentRoot.has(variableName)) {
                issues.push({
                    blockId: block.id,
                    blockLabel: block.label,
                    message: `Unresolved variable reference: ${variableName}`,
                    severity: 'warning',
                });
            }
        }

        if (block.type === 'macro') {
            const macroId = String((block.config as any)?.macroId || '').trim();
            const providedParameters = ((block.config as any)?.parameters || {}) as Record<string, string>;
            const macroDefinition = macroDefinitions.get(macroId);
            if (macroDefinition) {
                const parameterNames = new Set((macroDefinition.parameters || []).map((parameter) => parameter.name));
                for (const parameter of macroDefinition.parameters || []) {
                    const providedValue = providedParameters[parameter.name];
                    if (parameter.required && (providedValue === undefined || providedValue === '') && !parameter.defaultValue) {
                        issues.push({
                            blockId: block.id,
                            blockLabel: block.label,
                            message: `Macro is missing required macro parameter "${parameter.name}"`,
                            severity: 'error',
                        });
                    }
                }

                for (const providedName of Object.keys(providedParameters)) {
                    if (!parameterNames.has(providedName)) {
                        issues.push({
                            blockId: block.id,
                            blockLabel: block.label,
                            message: `Unknown macro parameter "${providedName}"`,
                            severity: 'warning',
                        });
                    }
                }

                const macroSafety = analyzeMacroExpansion(macroId, macroDefinitions);
                for (const message of macroSafety.issues) {
                    issues.push({
                        blockId: block.id,
                        blockLabel: block.label,
                        message,
                        severity: 'error',
                    });
                }
            }
        }

        if (block.type === 'set_variable') {
            const variableName = String((block.config as any)?.name || '').trim();
            const scope = ((block.config as any)?.scope || 'local') as 'local' | 'global' | 'blueprint';
            if (variableName) {
                if (scope === 'local') {
                    currentLocal.add(variableName);
                } else {
                    currentRoot.add(variableName);
                }
            }
        }

        if (block.type === 'condition') {
            const thenResult = analyzeCompileTimeSequence(block.children, new Set(currentLocal), new Set(currentRoot), macroDefinitions);
            const elseResult = analyzeCompileTimeSequence(block.elseChildren, new Set(currentLocal), new Set(currentRoot), macroDefinitions);
            issues.push(...thenResult.issues, ...elseResult.issues);
            thenResult.rootVariables.forEach((name) => currentRoot.add(name));
            elseResult.rootVariables.forEach((name) => currentRoot.add(name));
            continue;
        }

        if (block.children.length > 0) {
            const childStartsNewLocalScope = block.type === 'loop_elements'
                || block.type === 'loop_pagination'
                || block.type === 'extract_scope';
            const childResult = analyzeCompileTimeSequence(
                block.children,
                childStartsNewLocalScope ? new Set<string>() : new Set(currentLocal),
                new Set(currentRoot),
                macroDefinitions,
            );
            issues.push(...childResult.issues);
            childResult.rootVariables.forEach((name) => currentRoot.add(name));
        }
    }

    return { issues, localVariables: currentLocal, rootVariables: currentRoot };
}

function analyzeCompiledBlock(
    block: CompiledBlock,
    path: string[],
    depth: number,
    loopDepth: number,
    parent?: CompiledBlock,
): Omit<BlueprintAnalysis, 'blockTypes'> {
    const currentPath = [...path, block.label || block.type];
    const pathStr = currentPath.join(' > ');
    const issues: AnalysisIssue[] = [];
    const blockTypeCounts: Record<string, number> = { [block.type]: 1 };
    const variableReferences = extractVariableReferences(block);
    const macroIds = block.type === 'macro' && typeof (block.config as any)?.macroId === 'string'
        ? [(block.config as any).macroId]
        : [];

    if (!block.execution.allowsChildren && block.children.length > 0) {
        issues.push({
            blockId: block.id,
            blockLabel: block.label,
            message: `Block type "${block.type}" should not have children`,
            severity: 'error',
            path: pathStr,
        });
    }

    if (loopDepth > 0 && block.type === 'navigate') {
        issues.push({
            blockId: block.id,
            blockLabel: block.label,
            message: 'Navigate inside a loop may cause unexpected behavior',
            severity: 'warning',
            path: pathStr,
        });
    }

    if (parent?.type === 'click' && (parent.config as any)?.openInNewTab && block.type === 'go_back') {
        issues.push({
            blockId: block.id,
            blockLabel: block.label,
            message: 'Go Back inside a new tab click will close the tab',
            severity: 'warning',
            path: pathStr,
        });
    }

    if (block.type === 'extract_scope' && loopDepth === 0) {
        issues.push({
            blockId: block.id,
            blockLabel: block.label,
            message: 'Extract block outside a loop will only extract once',
            severity: 'warning',
            path: pathStr,
        });
    }

    let maxDepth = depth;
    let containerBlockCount = block.execution.managesChildrenExecution ? 1 : 0;
    const nextLoopDepth = loopDepth + ((block.type === 'loop_elements' || block.type === 'loop_pagination') ? 1 : 0);

    for (const child of block.children) {
        const childAnalysis = analyzeCompiledBlock(child, currentPath, depth + 1, nextLoopDepth, block);
        maxDepth = Math.max(maxDepth, childAnalysis.maxDepth);
        containerBlockCount += childAnalysis.containerBlockCount;
        issues.push(...childAnalysis.issues);
        variableReferences.push(...childAnalysis.variableReferences);
        macroIds.push(...childAnalysis.macroIds);
        for (const [type, count] of Object.entries(childAnalysis.blockTypeCounts)) {
            blockTypeCounts[type] = (blockTypeCounts[type] || 0) + count;
        }
    }

    for (const child of block.elseChildren) {
        const childAnalysis = analyzeCompiledBlock(child, [...currentPath, 'else'], depth + 1, nextLoopDepth, block);
        maxDepth = Math.max(maxDepth, childAnalysis.maxDepth);
        containerBlockCount += childAnalysis.containerBlockCount;
        issues.push(...childAnalysis.issues);
        variableReferences.push(...childAnalysis.variableReferences);
        macroIds.push(...childAnalysis.macroIds);
        for (const [type, count] of Object.entries(childAnalysis.blockTypeCounts)) {
            blockTypeCounts[type] = (blockTypeCounts[type] || 0) + count;
        }
    }

    return {
        blockCount: 1 + block.children.length + block.elseChildren.length,
        maxDepth,
        blockTypeCounts,
        variableReferences: Array.from(new Set(variableReferences)),
        macroIds: Array.from(new Set(macroIds)),
        containerBlockCount,
        issues,
    };
}

export function analyzeCompiledBlueprint(compiledBlueprint: CompiledBlueprint): BlueprintAnalysis {
    const issues: AnalysisIssue[] = [];
    const blockTypeCounts: Record<string, number> = {};
    const variableRefs = new Set<string>();
    const macroIds = new Set<string>();
    const macroDefinitions = new Map(macroRegistryStore.getAllMacros().map((macro) => [macro.id, macro]));
    let maxDepth = 0;
    let containerBlockCount = 0;

    for (const block of compiledBlueprint.blocks) {
        const analysis = analyzeCompiledBlock(block, [], 0, 0);
        maxDepth = Math.max(maxDepth, analysis.maxDepth);
        containerBlockCount += analysis.containerBlockCount;
        issues.push(...analysis.issues);
        analysis.variableReferences.forEach((ref) => variableRefs.add(ref));
        analysis.macroIds.forEach((id) => macroIds.add(id));
        for (const [type, count] of Object.entries(analysis.blockTypeCounts)) {
            blockTypeCounts[type] = (blockTypeCounts[type] || 0) + count;
        }
    }

    const compileTimeResult = analyzeCompileTimeSequence(compiledBlueprint.blocks, new Set<string>(), new Set<string>(), macroDefinitions);
    issues.push(...compileTimeResult.issues);

    return {
        blockCount: compiledBlueprint.totalBlocks,
        maxDepth,
        blockTypes: Object.keys(blockTypeCounts).sort(),
        blockTypeCounts,
        variableReferences: Array.from(variableRefs).sort(),
        macroIds: Array.from(macroIds).sort(),
        containerBlockCount,
        issues,
    };
}

export function analyzeBlueprint(blueprint: Blueprint): BlueprintAnalysis {
    return analyzeCompiledBlueprint(compileBlueprint(blueprint));
}

export function createBlueprintPreview(
    blueprint: Blueprint,
    validation: { valid: boolean; errors: { message: string }[]; warnings: { message: string }[] },
): BlueprintPreview {
    const analysis = analyzeBlueprint(blueprint);

    return {
        name: blueprint.name,
        description: blueprint.description,
        blockCount: analysis.blockCount,
        valid: validation.valid,
        errors: validation.errors.map((error) => error.message),
        warnings: validation.warnings.map((warning) => warning.message),
        blockTypes: analysis.blockTypes,
        maxDepth: analysis.maxDepth,
        variableReferences: analysis.variableReferences,
        macroIds: analysis.macroIds,
    };
}
