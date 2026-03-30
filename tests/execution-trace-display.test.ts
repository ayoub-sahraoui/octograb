import { describe, expect, it } from 'vitest';
import { buildExecutionTraceDisplay, buildExecutionTraceSummary, filterExecutionTraces } from '../entrypoints/sidepanel/components/execution-trace-display';

describe('execution trace display', () => {
    it('builds compact hints and structured sections from rich trace details', () => {
        const display = buildExecutionTraceDisplay({
            id: 'trace-1',
            timestamp: Date.parse('2026-03-28T10:30:00.000Z'),
            blockId: 'block-1',
            blockType: 'click',
            blockLabel: 'Open Result',
            status: 'success',
            duration: 145,
            details: {
                block: {
                    id: 'block-1',
                    type: 'click',
                    label: 'Open Result',
                    parentId: 'loop-1',
                    parentBranch: 'children',
                    execution: {
                        executorMethod: 'executeClick',
                        allowsChildren: true,
                        managesChildrenExecution: false,
                    },
                },
                scope: {
                    selector: '.result',
                    selectorType: 'css',
                    index: 2,
                    depth: 2,
                    chain: [
                        { selector: '.results', selectorType: 'css', index: 0 },
                        { selector: '.result', selectorType: 'css', index: 2 },
                    ],
                },
                variables: {
                    localScopes: [{ keyword: 'laptop' }],
                    localResolved: { keyword: 'laptop' },
                    global: { sessionId: '42' },
                    blueprint: {},
                    resolved: { keyword: 'laptop', sessionId: '42' },
                },
                macroStack: ['search-flow'],
                attempt: 2,
            },
        });

        expect(display.hints).toEqual([
            { label: 'scope', value: 'depth 2' },
            { label: 'vars', value: '2 resolved' },
            { label: 'macros', value: '1 active' },
            { label: 'attempt', value: '2' },
        ]);

        expect(display.sections).toEqual([
            {
                title: 'Block',
                rows: [
                    { label: 'Block ID', value: 'block-1' },
                    { label: 'Parent', value: 'loop-1' },
                    { label: 'Branch', value: 'children' },
                    { label: 'Type', value: 'click' },
                ],
            },
            {
                title: 'Execution',
                rows: [
                    { label: 'Executor', value: 'executeClick' },
                    { label: 'Allows Children', value: 'Yes' },
                    { label: 'Manages Children', value: 'No' },
                ],
            },
            {
                title: 'Scope',
                rows: [
                    { label: 'Current', value: 'css:.result[2]' },
                    { label: 'Depth', value: '2' },
                    { label: 'Chain', value: 'css:.results[0] -> css:.result[2]' },
                ],
            },
            {
                title: 'Variables',
                rows: [
                    { label: 'Resolved', value: '2' },
                    { label: 'Local Scopes', value: '1' },
                    { label: 'Global', value: '1' },
                    { label: 'Blueprint', value: '0' },
                ],
                json: '{\n  "localScopes": [\n    {\n      "keyword": "laptop"\n    }\n  ],\n  "localResolved": {\n    "keyword": "laptop"\n  },\n  "global": {\n    "sessionId": "42"\n  },\n  "blueprint": {},\n  "resolved": {\n    "keyword": "laptop",\n    "sessionId": "42"\n  }\n}',
            },
            {
                title: 'Macros',
                rows: [
                    { label: 'Active Stack', value: 'search-flow' },
                ],
            },
        ]);
    });

    it('includes an error section when trace details contain a failure', () => {
        const display = buildExecutionTraceDisplay({
            id: 'trace-2',
            timestamp: Date.parse('2026-03-28T10:31:00.000Z'),
            blockId: 'block-2',
            blockType: 'macro',
            blockLabel: 'Run Macro',
            status: 'error',
            details: {
                error: {
                    message: 'Macro expansion failed',
                    stack: 'Error: Macro expansion failed',
                },
            },
        });

        expect(display.hints).toEqual([]);
        expect(display.sections).toEqual([
            {
                title: 'Error',
                rows: [
                    { label: 'Message', value: 'Macro expansion failed' },
                ],
                json: 'Error: Macro expansion failed',
            },
        ]);
    });

    it('filters traces by status, search text, and newest-first ordering', () => {
        const traces = [
            {
                id: 'trace-1',
                timestamp: Date.parse('2026-03-28T10:29:00.000Z'),
                blockId: 'block-1',
                blockType: 'click',
                blockLabel: 'Open Result',
                status: 'success' as const,
                details: {
                    error: { message: 'ignore me' },
                },
            },
            {
                id: 'trace-2',
                timestamp: Date.parse('2026-03-28T10:30:00.000Z'),
                blockId: 'block-2',
                blockType: 'macro',
                blockLabel: 'Search Macro',
                status: 'error' as const,
                details: {
                    block: { type: 'macro' },
                    error: { message: 'Macro expansion failed' },
                },
            },
            {
                id: 'trace-3',
                timestamp: Date.parse('2026-03-28T10:31:00.000Z'),
                blockId: 'block-3',
                blockType: 'wait',
                blockLabel: 'Wait For Results',
                status: 'start' as const,
                details: {},
            },
        ];

        expect(filterExecutionTraces(traces, { status: 'error', search: 'macro', newestFirst: true }).map((trace) => trace.id)).toEqual(['trace-2']);
        expect(filterExecutionTraces(traces, { status: 'all', search: 'result', newestFirst: true }).map((trace) => trace.id)).toEqual(['trace-3', 'trace-1']);
        expect(filterExecutionTraces(traces, { status: 'all', search: '', newestFirst: false }).map((trace) => trace.id)).toEqual(['trace-1', 'trace-2', 'trace-3']);
    });

    it('builds run stats and timeline summary from visible traces', () => {
        const summary = buildExecutionTraceSummary([
            {
                id: 'trace-1',
                timestamp: Date.parse('2026-03-28T10:29:00.000Z'),
                blockId: 'block-1',
                blockType: 'navigate',
                blockLabel: 'Open Search',
                status: 'start',
            },
            {
                id: 'trace-2',
                timestamp: Date.parse('2026-03-28T10:30:30.000Z'),
                blockId: 'block-2',
                blockType: 'click',
                blockLabel: 'Open Result',
                status: 'success',
                duration: 450,
            },
            {
                id: 'trace-3',
                timestamp: Date.parse('2026-03-28T10:31:00.000Z'),
                blockId: 'block-3',
                blockType: 'macro',
                blockLabel: 'Run Macro',
                status: 'error',
                duration: 1200,
                details: {
                    error: { message: 'Macro expansion failed' },
                },
            },
        ]);

        expect(summary).toEqual({
            total: 3,
            counts: {
                start: 1,
                success: 1,
                error: 1,
            },
            duration: {
                averageMs: 825,
                slowestMs: 1200,
                slowestBlockLabel: 'Run Macro',
            },
            timeline: {
                firstAt: Date.parse('2026-03-28T10:29:00.000Z'),
                lastAt: Date.parse('2026-03-28T10:31:00.000Z'),
                elapsedMs: 120000,
                latestBlockLabel: 'Run Macro',
                latestStatus: 'error',
            },
        });
    });
});
