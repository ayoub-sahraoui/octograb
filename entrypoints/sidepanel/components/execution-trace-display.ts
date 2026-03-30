export interface ExecutionTraceDisplayRow {
    label: string;
    value: string;
}

export interface ExecutionTraceDisplaySection {
    title: string;
    rows: ExecutionTraceDisplayRow[];
    json?: string;
}

export interface ExecutionTraceDisplayHint {
    label: string;
    value: string;
}

export interface ExecutionTraceDisplayModel {
    hints: ExecutionTraceDisplayHint[];
    sections: ExecutionTraceDisplaySection[];
}

export interface ExecutionTraceSummary {
    total: number;
    counts: {
        start: number;
        success: number;
        error: number;
    };
    duration: {
        averageMs: number;
        slowestMs: number;
        slowestBlockLabel: string | null;
    };
    timeline: {
        firstAt: number | null;
        lastAt: number | null;
        elapsedMs: number;
        latestBlockLabel: string | null;
        latestStatus: ExecutionTraceLike['status'] | null;
    };
}

export interface ExecutionTraceFilterOptions {
    status: 'all' | 'start' | 'success' | 'error';
    search: string;
    newestFirst: boolean;
}

export interface ExecutionTraceLike {
    id: string;
    timestamp: number;
    blockId: string;
    blockType: string;
    blockLabel: string;
    status: 'start' | 'success' | 'error';
    details?: any;
    duration?: number;
}

function stringifyJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function formatScopeEntry(entry: { selector: string; selectorType: string; index: number }) {
    return `${entry.selectorType}:${entry.selector}[${entry.index}]`;
}

function getTraceSearchText(trace: ExecutionTraceLike): string {
    return [
        trace.blockLabel,
        trace.blockType,
        trace.blockId,
        trace.status,
        trace.details?.error?.message,
        trace.details?.block?.type,
        trace.details?.block?.execution?.executorMethod,
        trace.details?.scope?.selector,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

export function filterExecutionTraces(
    traces: ExecutionTraceLike[],
    { status, search, newestFirst }: ExecutionTraceFilterOptions
): ExecutionTraceLike[] {
    const searchText = search.trim().toLowerCase();
    const filtered = traces.filter((trace) => {
        if (status !== 'all' && trace.status !== status) {
            return false;
        }

        if (searchText && !getTraceSearchText(trace).includes(searchText)) {
            return false;
        }

        return true;
    });

    return [...filtered].sort((left, right) => {
        return newestFirst
            ? right.timestamp - left.timestamp
            : left.timestamp - right.timestamp;
    });
}

export function buildExecutionTraceSummary(traces: ExecutionTraceLike[]): ExecutionTraceSummary {
    if (traces.length === 0) {
        return {
            total: 0,
            counts: { start: 0, success: 0, error: 0 },
            duration: { averageMs: 0, slowestMs: 0, slowestBlockLabel: null },
            timeline: {
                firstAt: null,
                lastAt: null,
                elapsedMs: 0,
                latestBlockLabel: null,
                latestStatus: null,
            },
        };
    }

    const counts = traces.reduce(
        (acc, trace) => {
            acc[trace.status] += 1;
            return acc;
        },
        { start: 0, success: 0, error: 0 }
    );

    const tracesWithDuration = traces.filter((trace) => trace.duration !== undefined);
    const totalDuration = tracesWithDuration.reduce((sum, trace) => sum + (trace.duration || 0), 0);
    const slowestTrace = tracesWithDuration.reduce<ExecutionTraceLike | null>((slowest, trace) => {
        if (!slowest || (trace.duration || 0) > (slowest.duration || 0)) {
            return trace;
        }
        return slowest;
    }, null);

    const sorted = [...traces].sort((left, right) => left.timestamp - right.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
        total: traces.length,
        counts,
        duration: {
            averageMs: tracesWithDuration.length > 0 ? Math.round(totalDuration / tracesWithDuration.length) : 0,
            slowestMs: slowestTrace?.duration || 0,
            slowestBlockLabel: slowestTrace?.blockLabel || null,
        },
        timeline: {
            firstAt: first.timestamp,
            lastAt: last.timestamp,
            elapsedMs: Math.max(0, last.timestamp - first.timestamp),
            latestBlockLabel: last.blockLabel,
            latestStatus: last.status,
        },
    };
}

export function buildExecutionTraceDisplay(trace: ExecutionTraceLike): ExecutionTraceDisplayModel {
    const details = trace.details || {};
    const sections: ExecutionTraceDisplaySection[] = [];
    const hints: ExecutionTraceDisplayHint[] = [];

    if (details.block) {
        sections.push({
            title: 'Block',
            rows: [
                { label: 'Block ID', value: details.block.id },
                { label: 'Parent', value: details.block.parentId || 'root' },
                { label: 'Branch', value: details.block.parentBranch || 'root' },
                { label: 'Type', value: details.block.type || trace.blockType },
            ],
        });
    }

    if (details.block?.execution) {
        sections.push({
            title: 'Execution',
            rows: [
                { label: 'Executor', value: details.block.execution.executorMethod },
                { label: 'Allows Children', value: details.block.execution.allowsChildren ? 'Yes' : 'No' },
                { label: 'Manages Children', value: details.block.execution.managesChildrenExecution ? 'Yes' : 'No' },
            ],
        });
    }

    if (details.scope) {
        hints.push({ label: 'scope', value: `depth ${details.scope.depth}` });
        sections.push({
            title: 'Scope',
            rows: [
                { label: 'Current', value: formatScopeEntry(details.scope) },
                { label: 'Depth', value: String(details.scope.depth) },
                { label: 'Chain', value: (details.scope.chain || []).map(formatScopeEntry).join(' -> ') },
            ],
        });
    }

    if (details.variables) {
        const resolvedCount = Object.keys(details.variables.resolved || {}).length;
        hints.push({ label: 'vars', value: `${resolvedCount} resolved` });
        sections.push({
            title: 'Variables',
            rows: [
                { label: 'Resolved', value: String(resolvedCount) },
                { label: 'Local Scopes', value: String((details.variables.localScopes || []).length) },
                { label: 'Global', value: String(Object.keys(details.variables.global || {}).length) },
                { label: 'Blueprint', value: String(Object.keys(details.variables.blueprint || {}).length) },
            ],
            json: stringifyJson(details.variables),
        });
    }

    if (Array.isArray(details.macroStack) && details.macroStack.length > 0) {
        hints.push({ label: 'macros', value: `${details.macroStack.length} active` });
        sections.push({
            title: 'Macros',
            rows: [
                { label: 'Active Stack', value: details.macroStack.join(' -> ') },
            ],
        });
    }

    if (details.attempt !== undefined) {
        hints.push({ label: 'attempt', value: String(details.attempt) });
    }

    if (details.error) {
        sections.push({
            title: 'Error',
            rows: [
                { label: 'Message', value: details.error.message || 'Unknown error' },
            ],
            json: details.error.stack || undefined,
        });
    }

    return {
        hints,
        sections,
    };
}
