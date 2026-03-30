import { Scope } from "@/core/env";
import { CompiledBlock } from "./blueprint-compiler";
import { ExecutionVariableScopes, ExecutionVariableSnapshot } from "./execution-variable-scopes";

export interface BuildExecutionTraceDetailsOptions {
    block: CompiledBlock;
    scope?: Scope;
    variables: ExecutionVariableScopes;
    macroStack: string[];
    attempt?: number;
    error?: Error;
}

interface ScopeChainEntry {
    selector: string;
    selectorType: Scope["selectorType"];
    index: number;
}

function buildScopeDetails(scope?: Scope) {
    if (!scope) {
        return null;
    }

    const chain: ScopeChainEntry[] = [];
    let current: Scope | undefined = scope;

    while (current) {
        chain.unshift({
            selector: current.selector,
            selectorType: current.selectorType,
            index: current.index,
        });
        current = current.parent;
    }

    return {
        selector: scope.selector,
        selectorType: scope.selectorType,
        index: scope.index,
        depth: chain.length,
        chain,
    };
}

function buildErrorDetails(error?: Error) {
    if (!error) {
        return undefined;
    }

    return {
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
    };
}

export function buildExecutionTraceDetails({
    block,
    scope,
    variables,
    macroStack,
    attempt,
    error,
}: BuildExecutionTraceDetailsOptions) {
    const details: {
        block: {
            id: string;
            type: string;
            label: string;
            parentId?: string;
            parentBranch?: "children" | "elseChildren";
            execution: CompiledBlock["execution"];
        };
        config: CompiledBlock["config"];
        scope: ReturnType<typeof buildScopeDetails>;
        variables: ExecutionVariableSnapshot;
        macroStack: string[];
        attempt?: number;
        error?: ReturnType<typeof buildErrorDetails>;
    } = {
        block: {
            id: block.id,
            type: block.type,
            label: block.label,
            parentId: block.parentId,
            parentBranch: block.parentBranch,
            execution: block.execution,
        },
        config: block.config,
        scope: buildScopeDetails(scope),
        variables: variables.getSnapshot(),
        macroStack: [...macroStack],
    };

    if (attempt !== undefined) {
        details.attempt = attempt;
    }

    const errorDetails = buildErrorDetails(error);
    if (errorDetails) {
        details.error = errorDetails;
    }

    return details;
}
