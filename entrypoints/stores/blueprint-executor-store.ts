import { makeAutoObservable } from "mobx";
import { Blueprint } from "../models/blueprint";
import { Block } from "../models/types";
import { createBlockFromJSON } from "../models/block-factory";
import { ExtractionField } from "../models/extract-scope-block";
import { Scope } from "@/core/env";
import { sendToTab, isContentScriptReady } from "@/core/messaging";
import { browser } from "wxt/browser";
import { toJS } from "mobx";
import { db } from "@/core/database";
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { useNotificationStore } from './notification-store';
import { preRunCheck, getLicenseState } from '@/core/license';
import { isDevMode } from '@/core/dev-mode';
import { MacroDefinition } from "../models/macro-block";
import { macroRegistryStore } from "./macro-registry-store";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error' | 'stopped';

export interface ExecutionLog {
    timestamp: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warn' | 'block';
    blockId?: string;
    blockLabel?: string;
}

export interface ExecutionTrace {
    id: string;
    timestamp: number;
    blockId: string;
    blockType: string;
    blockLabel: string;
    status: 'start' | 'success' | 'error';
    details?: any;
    duration?: number;
}

// Blocks that manage their own children execution internally
const CONTAINER_BLOCKS = ['loop_elements', 'loop_pagination', 'condition', 'extract_scope'];

// ─── Store ───────────────────────────────────────────────────────────────────

export class BlueprintExecutorStore {
    status: ExecutionStatus = 'idle';
    currentBlock: Block | null = null;
    progress: { current: number; total: number } = { current: 0, total: 0 };
    logs: ExecutionLog[] = [];
    traces: ExecutionTrace[] = [];
    extractedData: Record<string, any>[] = [];
    extractedColumns: string[] = [];
    startTime: number | null = null;
    endTime: number | null = null;
    error: string | null = null;

    // Settings
    enableLogs: boolean = false;
    enableTrace: boolean = false;

    // Resume functionality
    currentExecutionId: number | null = null;
    canResume: boolean = false;
    lastCheckpoint: { blockId: string; loopIndex?: number; loopState?: Record<string, number>; url: string } | null = null;
    // Persisted map of blueprint IDs that have resumable checkpoints (survives extension restart)
    resumableBlueprints: Record<string, { executionId: number; itemsScraped: number; stoppedAt: string }> = {};

    // Track which blueprint is running
    runningBlueprintId: string | null = null;
    runningBlueprintName: string | null = null;

    private _abortController: AbortController | null = null;
    private _paused: boolean = false;
    private _pausePromise: Promise<void> | null = null;
    private _pauseResolve: (() => void) | null = null;
    private _returnUrl: string | null = null; // Store URL to return to after go_back
    private _variables: Map<string, string> = new Map(); // Variable storage for set_variable/get_variable
    // Tab ID tracking — locked to a specific tab during execution
    private _targetTabId: number | null = null;
    // Loop state tracking for resume - maps blockId to current iteration index
    private _loopState: Record<string, number> = {};
    // Auto-increment counters for static fields: maps "blockId:fieldKey" to current value
    private _autoIncrementCounters: Record<string, number> = {};
    // Hash-based deduplication set for O(1) lookups instead of O(n) per row
    private _deduplicationHashes: Set<string> = new Set();
    // Track which blocks have already been counted for progress (prevents loop inflation)
    private _progressCounted: Set<string> = new Set();

    constructor() {
        makeAutoObservable(this, {
            _abortController: false,
            _paused: false,
            _pausePromise: false,
            _pauseResolve: false,
            _returnUrl: false,
            _targetTabId: false,
            _loopState: false,
            _autoIncrementCounters: false,
            _deduplicationHashes: false,
            _progressCounted: false,
        } as any);
        this.loadSettings();
        this.loadResumableBlueprints();
    }

    // ─── Action Methods ────────────────────────────────────────────────────

    setStatus(status: ExecutionStatus) {
        this.status = status;
    }

    setError(error: string | null) {
        this.error = error;
    }

    setCurrentBlock(block: Block | null) {
        this.currentBlock = block;
    }

    setProgress(current: number, total: number) {
        this.progress = { current, total };
    }

    incrementProgress() {
        this.progress.current++;
    }

    setSettings(enableLogs: boolean, enableTrace: boolean) {
        this.enableLogs = enableLogs;
        this.enableTrace = enableTrace;
    }

    setRunningBlueprint(id: string | null, name: string | null) {
        this.runningBlueprintId = id;
        this.runningBlueprintName = name;
    }

    setTargetTabId(tabId: number | null) {
        this._targetTabId = tabId;
    }

    setExecutionTimes(startTime: number | null, endTime: number | null) {
        this.startTime = startTime;
        this.endTime = endTime;
    }

    addLogEntry(log: ExecutionLog) {
        this.logs.push(log);
    }

    addTraceEntry(trace: ExecutionTrace) {
        if (!this.enableTrace) return;
        this.traces.push(trace);
    }

    setExtractedData(data: Record<string, any>[], columns: string[]) {
        this.extractedData = data;
        this.extractedColumns = columns;
    }

    addExtractedRow(row: Record<string, any>, columns: string[]) {
        this.extractedData.push(row);
        for (const key of columns) {
            if (!this.extractedColumns.includes(key)) {
                this.extractedColumns.push(key);
            }
        }
    }

    setResumeState(canResume: boolean, lastCheckpoint: any) {
        this.canResume = canResume;
        this.lastCheckpoint = lastCheckpoint;
    }

    setResumableBlueprints(blueprints: Record<string, any>) {
        this.resumableBlueprints = blueprints;
    }

    removeResumableBlueprint(blueprintId: string) {
        delete this.resumableBlueprints[blueprintId];
    }

    markProgressCounted(blockId: string) {
        this._progressCounted.add(blockId);
    }

    isProgressCounted(blockId: string): boolean {
        return this._progressCounted.has(blockId);
    }

    clearTraces() {
        this.traces = [];
    }

    async loadSettings() {
        try {
            const logsSettings = await db.settings.where('key').equals('enableLogs').first();
            const traceSettings = await db.settings.where('key').equals('enableTrace').first();
            this.setSettings(
                logsSettings?.value ?? false,
                traceSettings?.value ?? false
            );
        } catch (e) {
            console.error('Failed to load executor settings', e);
        }
    }

    async updateSettings(enableLogs: boolean, enableTrace: boolean) {
        this.setSettings(enableLogs, enableTrace);
        try {
            await db.settings.put({ key: 'enableLogs', value: enableLogs, updatedAt: new Date().toISOString() });
            await db.settings.put({ key: 'enableTrace', value: enableTrace, updatedAt: new Date().toISOString() });
        } catch (e) {
            console.error('Failed to save executor settings', e);
        }
    }

    // ─── Computed ────────────────────────────────────────────────────────────

    get isRunning() { return this.status === 'running'; }
    get isPaused() { return this.status === 'paused'; }
    get isIdle() { return this.status === 'idle'; }
    get duration(): number | null {
        if (!this.startTime) return null;
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }
    get durationFormatted(): string {
        const ms = this.duration;
        if (ms === null) return '--';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
    }

    // ─── Tab-Targeted Messaging ─────────────────────────────────────────────

    /**
     * Send a message to the locked target tab (not the active tab).
     * This prevents commands going to the wrong tab if the user switches tabs.
     */
    private async send(message: any, timeout: number = 30000) {
        if (!this._targetTabId) throw new Error('No target tab set');
        const result = await Promise.race([
            sendToTab(this._targetTabId, message),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Message timeout (${timeout}ms) for ${message.type}`)), timeout)
            )
        ]);
        return result;
    }

    /**
     * Wait for the content script to be ready on the target tab.
     */
    private async waitForTab(timeout: number = 30000): Promise<void> {
        if (!this._targetTabId) throw new Error('No target tab set');
        const startMs = Date.now();
        while (Date.now() - startMs < timeout) {
            try {
                const resp = await sendToTab(this._targetTabId, { type: 'PING' } as any);
                if (resp.success) return;
            } catch { /* not ready yet */ }
            await this.delay(500);
        }
        throw new Error('Content script not ready after navigation');
    }

    // ─── Execution Control ──────────────────────────────────────────────────

    async execute(blueprint: Blueprint, resumeFromCheckpoint: boolean = false) {
        if (this.status === 'running') return;

        // ─── Server-side license verification before execution ─────────
        if (!isDevMode()) {
            try {
                const check = await preRunCheck();
                if (!check.allowed) {
                    this.setStatus('error');
                    this.setError(check.error || 'License verification failed. Please check your license.');
                    try {
                        useNotificationStore().push({
                            type: 'error',
                            category: 'system',
                            title: 'Execution Blocked',
                            description: check.error || 'Your license is no longer valid. Please re-activate or check your subscription.',
                        });
                    } catch { /* non-critical */ }
                    return;
                }

                // Validate blueprint block count against server-enforced limits
                if (check.limits && check.limits.maxBlocksPerBlueprint > 0) {
                    const blockCount = this.countBlocks(blueprint.blocks);
                    if (blockCount > check.limits.maxBlocksPerBlueprint) {
                        this.setStatus('error');
                        this.setError(`Blueprint exceeds ${check.plan || 'free'} plan limit of ${check.limits!.maxBlocksPerBlueprint} blocks (has ${blockCount}). Upgrade to run larger blueprints.`);
                        try {
                            useNotificationStore().push({
                                type: 'error',
                                category: 'system',
                                title: 'Block Limit Exceeded',
                                description: `Your blueprint has ${blockCount} blocks but the ${check.plan || 'free'} plan allows ${check.limits!.maxBlocksPerBlueprint}. Upgrade to remove limits.`,
                            });
                        } catch { /* non-critical */ }
                        return;
                    }
                }

                this.log('info', `✓ License verified (plan: ${check.plan || 'unknown'})`);
            } catch {
                // If pre-run check itself throws, log but allow execution (graceful degradation)
                this.log('warn', '⚠ Could not verify license — proceeding with cached state');
            }
        }
        // ───────────────────────────────────────────────────────────────

        if (!resumeFromCheckpoint) {
            this.resetState();
            // Clear any old resumable checkpoint for this blueprint
            this.clearResumableCheckpoint(blueprint.id);
        }
        this.setStatus('running');
        this.setRunningBlueprint(blueprint.id, blueprint.name);
        if (!resumeFromCheckpoint) {
            this.clearTraces();
        }
        if (!this.startTime) {
            this.setExecutionTimes(Date.now(), null);
        }
        this._abortController = new AbortController();

        // Overall execution timeout (2 hours max to prevent runaway blueprints)
        const maxExecutionMs = 2 * 60 * 60 * 1000;
        const executionTimer = setTimeout(() => {
            this.log('error', `❌ Execution timeout: exceeded ${maxExecutionMs / 60000} minutes`);
            this.stop();
        }, maxExecutionMs);

        // Lock to the currently active tab — all commands go here
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]?.id) {
            this.setStatus('error');
            this.setError('No active tab found');
            return;
        }
        this.setTargetTabId(tabs[0].id ?? null);

        // Monitor tab closure
        const onTabRemoved = (tabId: number) => {
            if (tabId === this._targetTabId) {
                this.log('error', '❌ Target tab closed by user');
                this.stop();
            }
        };
        browser.tabs.onRemoved.addListener(onTabRemoved);

        const totalBlocks = this.countBlocks(blueprint.blocks);
        this.setProgress(0, totalBlocks);

        // Create execution record at start so we can track it
        if (!this.currentExecutionId) {
            try {
                this.currentExecutionId = await db.saveExecution({
                    planId: blueprint.id,
                    planName: blueprint.name,
                    startedAt: new Date(this.startTime!).toISOString(),
                    status: 'running',
                    itemsScraped: 0,
                    results: [],
                    logs: [],
                });
            } catch (e) {
                console.error('Failed to create execution record', e);
            }
        } else {
            // Update existing execution to running
            try {
                await db.updateExecution(this.currentExecutionId, { status: 'running' });
            } catch (e) {
                console.error('Failed to update execution record', e);
            }
        }

        this.log('info', `▶ Starting blueprint: ${blueprint.name} (tab ${this._targetTabId})`);

        // Cleanup old execution history to prevent unbounded storage growth
        try { await db.cleanupExecutionHistory(100, 30); } catch { /* non-critical */ }

        try {
            // Execute top-level blocks sequentially with NO scope
            for (const block of blueprint.blocks) {
                if (this._abortController.signal.aborted) break;
                await this.executeBlock(block);
            }

            if (!this._abortController.signal.aborted) {
                this.setStatus('completed');
                this.setExecutionTimes(this.startTime, Date.now());
                this.log('success', `✅ Blueprint completed. ${this.extractedData.length} rows extracted in ${this.durationFormatted}`);

                // Push notification
                try {
                    const notifStore = useNotificationStore();
                    await notifStore.notifyExecutionCompleted(blueprint.name, this.extractedData.length, this.durationFormatted);
                    // Tip: first successful extraction
                    if (this.extractedData.length > 0) {
                        await notifStore.pushTipOnce('export_data', {
                            title: 'Tip: Export your data',
                            description: 'You can export extracted data to CSV, JSON, or Excel from the Extracted Data page.',
                        });
                    }
                } catch { /* non-critical */ }

                // Save history
                try {
                    if (this.currentExecutionId) {
                        await db.updateExecution(this.currentExecutionId, {
                            completedAt: new Date().toISOString(),
                            status: 'completed',
                            itemsScraped: this.extractedData.length,
                            results: toJS(this.extractedData),
                            logs: this.logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.message}`),
                            duration: Date.now() - this.startTime!
                        });
                        await db.clearProgressByExecution(this.currentExecutionId);
                    }
                    this.setResumeState(false, null);
                    // Clear resumable entry on successful completion
                    if (blueprint.id) {
                        this.clearResumableCheckpoint(blueprint.id);
                    }
                } catch (e) {
                    console.error('Failed to save execution history', e);
                }
            }
        } catch (err: any) {
            this.setStatus('error');
            this.setError(err.message);
            this.setExecutionTimes(this.startTime, Date.now());
            this.log('error', `❌ Execution failed: ${err.message}`);

            // Push notification
            try {
                const notifStore = useNotificationStore();
                await notifStore.notifyExecutionFailed(blueprint.name, err.message);
            } catch { /* non-critical */ }

            // Save history (failed)
            try {
                if (this.startTime && this.currentExecutionId) {
                    await db.updateExecution(this.currentExecutionId, {
                        completedAt: new Date().toISOString(),
                        status: 'failed',
                        itemsScraped: this.extractedData.length,
                        results: toJS(this.extractedData),
                        logs: this.logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.message}`),
                        duration: Date.now() - this.startTime
                    });
                }
            } catch (e) {
                console.error('Failed to save execution history', e);
            }
        } finally {
            clearTimeout(executionTimer);
            if (this._targetTabId) {
                browser.tabs.onRemoved.removeListener(onTabRemoved);
            }
            this._abortController = null;
        }
    }

    pause() {
        if (this.status !== 'running') return;
        this._paused = true;
        this.setStatus('paused');
        this.log('warn', '⏸ Execution paused');
    }

    resume() {
        if (this.status !== 'paused') return;
        this._paused = false;
        this.setStatus('running');
        this.log('info', '▶ Execution resumed');
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = null;
        }
    }

    async stop() {
        this._abortController?.abort();
        this._paused = false;
        if (this._pauseResolve) {
            this._pauseResolve();
            this._pauseResolve = null;
        }
        // Signal content script to cancel any long-running operations
        if (this._targetTabId) {
            try { await sendToTab(this._targetTabId, { type: 'ENV_ABORT' } as any); } catch { /* ignore */ }
        }
        this.setStatus('stopped');
        this.setExecutionTimes(this.startTime, Date.now());
        this.log('warn', '⏹ Execution stopped by user');

        // Save extracted data and checkpoint for resume
        if (this.currentExecutionId) {
            try {
                // Save current extracted data to DB so it persists
                await db.updateExecution(this.currentExecutionId, {
                    status: 'stopped',
                    itemsScraped: this.extractedData.length,
                    results: toJS(this.extractedData),
                    logs: this.logs.map(l => `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.message}`),
                    duration: this.startTime ? Date.now() - this.startTime : 0
                });

                // Save checkpoint for resume
                if (this.currentBlock && this.runningBlueprintId) {
                    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                    const currentUrl = tabs[0]?.url || '';
                    await db.saveProgress({
                        planId: this.runningBlueprintId,
                        executionId: this.currentExecutionId,
                        blockId: this.currentBlock.id,
                        loopState: Object.keys(this._loopState).length > 0 ? toJS(this._loopState) : undefined,
                        timestamp: Date.now(),
                        url: currentUrl,
                        completed: false
                    });
                    this.setResumeState(true, {
                        blockId: this.currentBlock.id,
                        loopState: this._loopState,
                        url: currentUrl
                    });
                    // Add to resumable blueprints map (persists across restart)
                    if (this.runningBlueprintId) {
                        this.resumableBlueprints[this.runningBlueprintId] = {
                            executionId: this.currentExecutionId!,
                            itemsScraped: this.extractedData.length,
                            stoppedAt: new Date().toISOString()
                        };
                    }
                    this.log('info', '💾 Checkpoint saved for resume');
                    this.log('info', `  📊 Loop state: ${JSON.stringify(this._loopState)}`);
                }

                // Push notification
                try {
                    const notifStore = useNotificationStore();
                    await notifStore.notifyExecutionStopped(
                        this.runningBlueprintName || 'Blueprint',
                        this.extractedData.length
                    );
                } catch { /* non-critical */ }
            } catch (e) {
                console.error('Failed to save execution state', e);
            }
        }
    }

    clearResults() {
        this.resetState();
    }

    async deleteExecution(executionId: number) {
        try {
            await db.deleteExecution(executionId);
            await db.progress.where('executionId').equals(executionId).delete();
        } catch (e) {
            console.error('Failed to delete execution', e);
        }
        if (this.currentExecutionId === executionId) {
            this.resetState();
        }
    }

    async loadResumableBlueprints() {
        try {
            // Find all stopped executions that have checkpoints
            const allExecutions = await db.getAllExecutions();
            const stoppedExecutions = allExecutions.filter(e => e.status === 'stopped');
            const resumable: Record<string, { executionId: number; itemsScraped: number; stoppedAt: string }> = {};

            for (const exec of stoppedExecutions) {
                if (!exec.id) continue;
                const checkpoint = await db.getLastCheckpoint(exec.planId);
                if (checkpoint && checkpoint.executionId === exec.id) {
                    // Only keep the most recent stopped execution per blueprint
                    if (!resumable[exec.planId] || new Date(exec.startedAt) > new Date(resumable[exec.planId].stoppedAt)) {
                        resumable[exec.planId] = {
                            executionId: exec.id,
                            itemsScraped: exec.itemsScraped,
                            stoppedAt: exec.completedAt || exec.startedAt
                        };
                    }
                }
            }

            this.setResumableBlueprints(resumable);
        } catch (e) {
            console.error('Failed to load resumable blueprints', e);
        }
    }

    hasResumableCheckpoint(blueprintId: string): boolean {
        return !!this.resumableBlueprints[blueprintId];
    }

    async clearResumableCheckpoint(blueprintId: string) {
        try {
            const entry = this.resumableBlueprints[blueprintId];
            if (entry) {
                await db.clearProgressByExecution(entry.executionId);
            }
            this.removeResumableBlueprint(blueprintId);
        } catch (e) {
            console.error('Failed to clear resumable checkpoint', e);
        }
    }

    async resumeBlueprint(blueprint: Blueprint) {
        // Load checkpoint from DB first
        const checkpoint = await this.loadLastCheckpoint(blueprint.id);
        if (!checkpoint) {
            // No checkpoint found, start fresh
            await this.execute(blueprint);
            return;
        }
        // Execute with resume flag
        await this.execute(blueprint, true);
    }

    async loadLastCheckpoint(blueprintId: string) {
        try {
            const checkpoint = await db.getLastCheckpoint(blueprintId);
            if (checkpoint) {
                // Also load the execution data
                const execution = await db.getExecution(checkpoint.executionId);
                this.setResumeState(true, {
                    blockId: checkpoint.blockId,
                    loopIndex: checkpoint.loopIndex,
                    loopState: checkpoint.loopState,
                    url: checkpoint.url
                });
                this.currentExecutionId = checkpoint.executionId;
                // Restore loop state for resume
                if (checkpoint.loopState) {
                    this._loopState = { ...checkpoint.loopState };
                }
                // Restore previously extracted data
                if (execution?.results && execution.results.length > 0) {
                    this.extractedData = execution.results as Record<string, any>[];
                    this.extractedColumns = [];
                    for (const row of this.extractedData) {
                        for (const key of Object.keys(row)) {
                            if (!this.extractedColumns.includes(key)) {
                                this.extractedColumns.push(key);
                            }
                        }
                    }
                    this.startTime = execution.startedAt ? new Date(execution.startedAt).getTime() : null;
                }
                return checkpoint;
            }
        } catch (e) {
            console.error('Failed to load checkpoint', e);
        }
        return null;
    }

    async loadExecutionData(executionId: number) {
        try {
            const execution = await db.getExecution(executionId);
            if (execution) {
                this.extractedData = (execution.results || []) as Record<string, any>[];
                this.extractedColumns = [];
                for (const row of this.extractedData) {
                    for (const key of Object.keys(row)) {
                        if (!this.extractedColumns.includes(key)) {
                            this.extractedColumns.push(key);
                        }
                    }
                }
                this.currentExecutionId = execution.id || null;
                this.runningBlueprintId = execution.planId;
                this.runningBlueprintName = execution.planName;
                this.startTime = execution.startedAt ? new Date(execution.startedAt).getTime() : null;
                this.endTime = execution.completedAt ? new Date(execution.completedAt).getTime() : null;
                this.status = (execution.status === 'running' ? 'stopped' : execution.status) as ExecutionStatus;
                return execution;
            }
        } catch (e) {
            console.error('Failed to load execution data', e);
        }
        return null;
    }

    addTrace(trace: Omit<ExecutionTrace, 'id' | 'timestamp'>) {
        if (!this.enableTrace) return;
        this.addTraceEntry({
            id: uuidv4(),
            timestamp: Date.now(),
            ...trace
        });
    }

    downloadTrace() {
        if (this.traces.length === 0) return;
        const blob = new Blob([JSON.stringify(this.traces, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trace-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ─── Block Router ───────────────────────────────────────────────────────

    /**
     * Execute a single block, then process its children if it's not a container block.
     * Container blocks (Loop, Condition, Extract) handle their own children internally
     * because they need special scope/iteration logic.
     * Non-container blocks (Navigate, Click, Wait, etc.) get automatic child processing.
     */
    private async executeBlock(block: Block, scope?: Scope) {
        if (this._abortController?.signal.aborted) return;
        await this.checkPause();

        if (block.enabled === false) {
            this.log('info', `⏭ Skipping disabled block: ${block.label}`);
            return;
        }

        this.setCurrentBlock(block);
        if (!this.isProgressCounted(block.id)) {
            this.markProgressCounted(block.id);
            this.incrementProgress();
        }

        // Detailed logging for debugging
        const scopeInfo = scope ? `[Scope: ${scope.selector}[${scope.index}]]` : '[No Scope]';
        const configPreview = JSON.stringify(block.config).substring(0, 100);
        this.log('block', `▶ Executing: ${block.label || block.type} ${scopeInfo}`, block.id, block.label);
        this.log('info', `  📋 Config: ${configPreview}${JSON.stringify(block.config).length > 100 ? '...' : ''}`);

        const retries = block.maxRetries || 0;
        const retryDelay = block.retryDelay || 1000;

        const startTraceTime = Date.now();
        this.addTrace({
            blockId: block.id,
            blockType: block.type,
            blockLabel: block.label || block.type,
            status: 'start',
            details: { config: block.config, scope }
        });

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (attempt > 0) {
                    this.log('warn', `↻ Retry ${attempt}/${retries}: ${block.label}`);
                    this.log('info', `  ⏱ Waiting ${retryDelay}ms before retry...`);
                    await this.delay(retryDelay);
                }

                // Apply delayBefore if the block config has it
                const delayBefore = (block.config as any)?.delayBefore;
                if (delayBefore && delayBefore > 0) {
                    this.log('info', `  ⏱ Delay before: ${delayBefore}ms`);
                    await this.delay(delayBefore);
                }

                // Block-level timeout: wrap execution with timeout
                const blockTimeout = block.maxExecutionTime || 30000; // Default 30s
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(
                        new Error(`Block "${block.label}" exceeded ${blockTimeout}ms timeout`)
                    ), blockTimeout);
                });

                // Race actual execution against timeout
                await Promise.race([
                    this.executeBlockWithType(block, scope),
                    timeoutPromise
                ]);

                // Apply delayAfter if the block config has it
                const delayAfter = (block.config as any)?.delayAfter;
                if (delayAfter && delayAfter > 0) {
                    this.log('info', `  ⏱ Delay after: ${delayAfter}ms`);
                    await this.delay(delayAfter);
                }

                const executionTime = Date.now() - startTraceTime;
                this.addTrace({
                    blockId: block.id,
                    blockType: block.type,
                    blockLabel: block.label || block.type,
                    status: 'success',
                    duration: executionTime
                });

                this.log('info', `  ⏱ Execution time: ${executionTime}ms`);
                break; // Success — exit retry loop
            } catch (err: any) {
                this.log('error', `  ❌ Error on attempt ${attempt + 1}: ${err.message}`);
                this.log('info', `  📍 Error stack: ${err.stack?.split('\n')[0] || 'No stack trace'}`);

                if (attempt >= retries) {
                    this.addTrace({
                        blockId: block.id,
                        blockType: block.type,
                        blockLabel: block.label || block.type,
                        status: 'error',
                        details: { error: err.message, stack: err.stack },
                        duration: Date.now() - startTraceTime
                    });

                    // Final attempt failed
                    if (block.onError === 'skip') {
                        this.log('warn', `⏭ Skipping failed block: ${block.label} (${err.message})`);
                        return;
                    }
                    this.log('error', `  💥 All ${retries + 1} attempts failed. Stopping execution.`);
                    throw err; // Propagate to stop execution
                }
            }
        }
    }

    /**
     * Execute block based on its type - extracted from executeBlock for timeout wrapping
     */
    private async executeBlockWithType(block: Block, scope?: Scope): Promise<void> {
        switch (block.type) {
            case 'navigate': await this.executeNavigate(block); break;
            case 'click': await this.executeClick(block, scope); break;
            case 'input': await this.executeInput(block, scope); break;
            case 'wait': await this.executeWait(block, scope); break;
            case 'scroll': await this.executeScroll(block, scope); break;
            case 'go_back': await this.executeGoBack(block); break;
            case 'condition': await this.executeCondition(block, scope); break;
            case 'assert': await this.executeAssert(block, scope); break;
            case 'set_variable': await this.executeSetVariable(block, scope); break;
            case 'get_variable': await this.executeGetVariable(block, scope); break;
            case 'hover': await this.executeHover(block, scope); break;
            case 'switch_frame': await this.executeSwitchFrame(block, scope); break;
            case 'macro': await this.executeMacro(block, scope); break;
            case 'loop_elements': await this.executeLoopElements(block, scope); break;
            case 'loop_pagination': await this.executeLoopPagination(block, scope); break;
            case 'extract_scope': await this.executeExtractScope(block, scope); break;
            default:
                this.log('warn', `Unknown block type: ${block.type}`);
        }

        // Generic child processing for NON-container blocks
        // Container blocks (loop, condition, extract) already handle children internally
        if (!CONTAINER_BLOCKS.includes(block.type) && block.children?.length) {
            this.log('info', `  👶 Processing ${block.children.length} children...`);
            for (const child of block.children) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, scope);
            }
        }
    }

    // ─── Block Executors ────────────────────────────────────────────────────

    private async executeNavigate(block: Block) {
        const config = block.config as any;
        const url = config.url;
        if (!url) throw new Error('Navigate block: URL is required');

        this.log('info', `🌐 Navigating to: ${url}`);
        this.log('info', `  📍 Behavior: ${config.behavior || 'same_tab'}`);
        this.log('info', `  ⏱ Timeout: ${config.timeout || 30000}ms`);
        this.log('info', `  🎯 Current tab ID: ${this._targetTabId}`);

        if (config.behavior === 'new_tab') {
            // Create new tab and switch the executor's target to it
            this.log('info', `  🆕 Creating new tab...`);
            const newTab = await browser.tabs.create({ url });
            if (newTab.id) {
                this._targetTabId = newTab.id;
                this.log('info', `  ↳ Opened new tab (id: ${newTab.id})`);
            }
        } else {
            // Navigate in the same target tab
            this.log('info', `  🔄 Navigating in current tab ${this._targetTabId}...`);

            // Listen for navigation completion
            let navigationCompleted = false;
            const onUpdated = (tabId: number, changeInfo: any) => {
                if (tabId === this._targetTabId && changeInfo.status === 'complete') {
                    navigationCompleted = true;
                }
            };
            browser.tabs.onUpdated.addListener(onUpdated);

            try {
                await browser.tabs.update(this._targetTabId!, { url });

                // Wait for navigation to complete
                const startWait = Date.now();
                const timeout = config.timeout || 30000;
                while (!navigationCompleted && Date.now() - startWait < timeout) {
                    await this.delay(100);
                }

                if (!navigationCompleted) {
                    throw new Error('Navigation timeout - page did not finish loading');
                }
            } finally {
                browser.tabs.onUpdated.removeListener(onUpdated);
            }
        }

        // Wait for content script to be ready in the (possibly new) target tab
        this.log('info', `  ⏳ Waiting for content script to be ready...`);
        await this.waitForTab(config.timeout || 30000);
        this.log('success', `✓ Navigated to: ${url}`);
    }

    private async executeClick(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value && !scope) throw new Error('Click block: selector or scope is required');

        // Special handling for openInNewTab - this is a container-like behavior
        if (config.openInNewTab) {
            this.log('info', `  🆕 Click will open new tab`);
            this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
            this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
            this.log('info', `  🔍 Has scope: ${scope ? 'Yes' : 'No'}`);

            let tabCreated = false;
            let newTabId: number | null = null;

            const onTabCreated = (tab: any) => {
                if (tab.id) {
                    newTabId = tab.id;
                    tabCreated = true;
                    this.log('info', `  ✨ New tab created: ${tab.id}`);
                }
            };

            browser.tabs.onCreated.addListener(onTabCreated);

            try {
                this.log('info', `  🖱 Sending click command...`);
                const response = await this.send({
                    type: 'ENV_CLICK',
                    data: {
                        selector: sel?.value || '',
                        selectorType: sel?.type || 'css',
                        scope: scope || undefined,
                        openInNewTab: true,
                    }
                });

                if (!response.success) throw new Error(response.error || 'Click failed');
                this.log('success', `✓ Clicked: ${sel?.value || 'scope element'}`);

                // Wait for the tab to be created
                this.log('info', `  ⏳ Waiting for new tab (max 5s)...`);
                const startWait = Date.now();
                while (!tabCreated && Date.now() - startWait < 5000) {
                    await this.delay(100);
                }

                if (newTabId) {
                    this.log('info', `  ↳ Switched to new tab (id: ${newTabId})`);

                    const oldTabId = this._targetTabId;
                    this._targetTabId = newTabId;

                    try {
                        this.log('info', `  ⏳ Waiting for content script in new tab...`);
                        await this.waitForTab(30000);

                        // Execute children in the new tab context
                        if (block.children?.length) {
                            this.log('info', `  👶 Executing ${block.children.length} children in new tab...`);
                            for (const child of block.children) {
                                if (this._abortController?.signal.aborted) break;
                                await this.executeBlock(child, scope);
                            }
                        }
                    } catch (e: any) {
                        this.log('error', `  ❌ Error in new tab execution: ${e.message}`);
                    } finally {
                        try {
                            this.log('info', `  🗑 Closing new tab ${newTabId}...`);
                            await browser.tabs.remove(newTabId);
                            this.log('info', `  ↳ Closed tab ${newTabId}`);
                        } catch (e) {
                            this.log('warn', `  ⚠ Failed to close tab ${newTabId}`);
                        }

                        this._targetTabId = oldTabId;
                        this.log('info', `  🔙 Switched back to tab ${oldTabId}`);
                        await this.delay(500);
                    }
                } else {
                    this.log('warn', '⚠ Click was supposed to open a new tab but none was detected.');
                }
            } finally {
                browser.tabs.onCreated.removeListener(onTabCreated);
            }
        } else {
            // Normal click - children will be handled by generic child processing
            this.log('info', `  🖱 Normal click`);
            this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
            this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
            this.log('info', `  🔍 Has scope: ${scope ? 'Yes' : 'No'}`);

            // Capture URL before click to detect if navigation happens
            let urlBeforeClick: string | undefined;
            try {
                const tabBefore = await browser.tabs.get(this._targetTabId!);
                urlBeforeClick = tabBefore.url;
            } catch { /* ignore */ }

            // Listen for navigation that the click might trigger
            let navigationDetected = false;
            const onNavListener = (tabId: number, changeInfo: any) => {
                if (tabId === this._targetTabId && changeInfo.status === 'loading') {
                    navigationDetected = true;
                }
            };
            browser.tabs.onUpdated.addListener(onNavListener);

            const response = await this.send({
                type: 'ENV_CLICK',
                data: {
                    selector: sel?.value || '',
                    selectorType: sel?.type || 'css',
                    scope: scope || undefined,
                    openInNewTab: false,
                }
            });

            if (!response.success) throw new Error(response.error || 'Click failed');
            this.log('success', `✓ Clicked: ${sel?.value || 'scope element'}`);

            // If click might cause navigation, wait for the page to settle
            if (config.waitAfterClick) {
                browser.tabs.onUpdated.removeListener(onNavListener);
                this.log('info', `  ⏳ Waiting ${config.waitAfterClick}ms after click...`);
                await this.delay(config.waitAfterClick);
                this.log('info', `  ⏳ Waiting for page to settle...`);
                await this.waitForTab(config.timeout || 15000);
            } else {
                // Auto-detect navigation: give the browser a moment to start navigating
                await this.delay(300);
                browser.tabs.onUpdated.removeListener(onNavListener);

                if (navigationDetected) {
                    this.log('info', `  🔀 Navigation detected after click, waiting for page load...`);
                    // Check if page already finished loading
                    let alreadyComplete = false;
                    try {
                        const tabNow = await browser.tabs.get(this._targetTabId!);
                        alreadyComplete = tabNow.status === 'complete';
                    } catch { /* ignore */ }

                    if (!alreadyComplete) {
                        try {
                            await this.waitForNavigation(this._targetTabId!, 30000);
                        } catch {
                            // Navigation may have already completed during the delay
                        }
                    }
                    await this.waitForTab(30000);
                    this.log('info', `  ✓ Page loaded after click-triggered navigation`);
                } else {
                    // Double-check by comparing URLs (handles fast navigations)
                    try {
                        const tabAfter = await browser.tabs.get(this._targetTabId!);
                        if (urlBeforeClick && tabAfter.url !== urlBeforeClick) {
                            this.log('info', `  🔀 URL changed after click, waiting for content script...`);
                            await this.waitForTab(30000);
                            this.log('info', `  ✓ Content script ready after navigation`);
                        }
                    } catch { /* ignore */ }
                }
            }
        }
    }

    private async executeInput(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value && !scope) throw new Error('Input block: selector or scope is required');

        this.log('info', `  ⌨️ Input value: "${config.value || ''}"`);
        this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
        this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
        this.log('info', `  🔍 Has scope: ${scope ? 'Yes' : 'No'}`);

        const response = await this.send({
            type: 'ENV_INPUT',
            data: {
                selector: sel?.value || '',
                selectorType: sel?.type || 'css',
                value: config.value || '',
                scope: scope || undefined,
            }
        });

        if (!response.success) throw new Error(response.error || 'Input failed');
        this.log('success', `✓ Input "${config.value}" into: ${sel?.value || 'scope element'}`);
    }

    private async executeWait(block: Block, scope?: Scope) {
        const config = block.config as any;

        this.log('info', `  ⏱ Wait type: ${config.type}`);

        if (config.type === 'timeout') {
            const ms = config.timeout || 1000;
            this.log('info', `  ⏳ Waiting ${ms}ms...`);
            await this.delay(ms);
        } else if (config.type === 'selector_visible' || config.type === 'selector_hidden') {
            const sel = config.selector;
            if (!sel?.value && !scope) throw new Error('Wait block: selector or scope is required for visibility wait');

            const targetVisible = config.type === 'selector_visible';
            const timeout = config.timeout || 10000;
            this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
            this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
            this.log('info', `  👁 Target state: ${targetVisible ? 'visible' : 'hidden'}`);
            this.log('info', `  ⏱ Timeout: ${timeout}ms`);
            this.log('info', `  ⏳ Waiting for ${sel?.value || 'scope element'} to be ${targetVisible ? 'visible' : 'hidden'}...`);

            const startMs = Date.now();
            let checkCount = 0;
            while (Date.now() - startMs < timeout) {
                if (this._abortController?.signal.aborted) return;

                checkCount++;
                const response = await this.send({
                    type: 'ENV_IS_VISIBLE',
                    data: {
                        selector: sel?.value || '',
                        selectorType: sel?.type || 'css',
                        scope: scope || undefined,
                    }
                });

                if (response.success) {
                    const isVisible = response.data as boolean;
                    this.log('info', `  🔍 Check #${checkCount}: Element is ${isVisible ? 'visible' : 'hidden'}`);
                    if (targetVisible === isVisible) {
                        this.log('success', `  ✓ Element ${targetVisible ? 'visible' : 'hidden'}: ${sel?.value || 'scope element'} (after ${Date.now() - startMs}ms)`);
                        return;
                    }
                }
                await this.delay(250);
            }
            this.log('error', `  ❌ Timeout after ${checkCount} checks (${timeout}ms)`);
            throw new Error(`Timeout waiting for ${sel?.value || 'scope element'} to be ${targetVisible ? 'visible' : 'hidden'}`);
        } else if (config.type === 'dom_content_loaded') {
            const timeout = config.timeout || 5000;
            this.log('info', `  ⏳ Waiting for DOM content loaded (${timeout}ms)...`);
            // Actually wait for content script readiness instead of just sleeping
            try {
                await this.waitForTab(timeout);
                this.log('info', `  ✓ Content script is ready`);
            } catch {
                this.log('warn', `  ⚠ Content script not ready after ${timeout}ms, continuing anyway`);
            }
            // Additional stabilization delay to let the page render dynamic content
            await this.delay(Math.min(timeout, 1000));
        } else if (config.type === 'network_idle') {
            const timeout = config.timeout || 10000;
            this.log('info', `  🌐 Waiting for network idle (timeout: ${timeout}ms)...`);

            const response = await this.send({
                type: 'ENV_WAIT_NETWORK_IDLE',
                data: { timeout }
            });

            if (!response.success) {
                this.log('warn', `⚠ Network idle wait failed: ${response.error}. Continuing...`);
            }
        }
    }

    private async executeScroll(block: Block, scope?: Scope) {
        const config = block.config as any;

        this.log('info', `  📜 Scroll target: ${config.target || 'window'}`);
        this.log('info', `  📍 Behavior: ${config.behavior || 'bottom'}`);
        if (config.behavior === 'pixels') {
            this.log('info', `  📏 Pixels: ${config.pixels || 0}`);
        }
        if (config.selector?.value) {
            this.log('info', `  🎯 Selector: ${config.selector.value}`);
        }

        const response = await this.send({
            type: 'ENV_SCROLL',
            data: {
                target: config.target || 'window',
                behavior: config.behavior || 'bottom',
                amount: config.pixels,
                selector: config.selector?.value,
                selectorType: config.selector?.type || 'css',
                scope: scope || undefined,
            }
        });

        if (!response.success) throw new Error(response.error || 'Scroll failed');

        // Log scroll position info if available
        if (response.data) {
            const info = response.data as any;
            this.log('info', `  📊 Position: ${info.afterScrollTop}px / ${info.scrollHeight}px (${Math.round((info.afterScrollTop / info.scrollHeight) * 100)}%)`);
            this.log('info', `  📏 Scrolled: ${info.scrolled}px | Remaining: ${info.remainingScroll}px`);
        }

        this.log('success', `  ✓ Scrolled ${config.behavior}`);

        // Wait for scroll animation to settle
        const settleTime = config.smooth ? 500 : 100;
        this.log('info', `  ⏱ Waiting ${settleTime}ms for scroll to settle...`);
        await this.delay(settleTime);
    }

    /**
     * Wait for a tab to finish navigating (status === 'complete') with a timeout.
     * This is critical because browser.tabs.update() resolves immediately before
     * the navigation actually starts, so waitForTab() can ping the OLD content script.
     */
    private waitForNavigation(tabId: number, timeout: number = 30000): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                browser.tabs.onUpdated.removeListener(listener);
                reject(new Error(`Navigation timeout after ${timeout}ms`));
            }, timeout);

            const listener = (updatedTabId: number, changeInfo: any) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    clearTimeout(timer);
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };

            browser.tabs.onUpdated.addListener(listener);
        });
    }

    private async executeGoBack(block: Block) {
        this.log('info', '↩ Going back...');
        this.log('info', `  🎯 Current tab ID: ${this._targetTabId}`);

        const maxRetries = 3;

        try {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                if (this._returnUrl) {
                    this.log('info', `  🔄 Navigating to stored URL${attempt > 1 ? ` (attempt ${attempt})` : ''}: ${this._returnUrl}`);

                    // Start listening for navigation BEFORE triggering it
                    const navPromise = this.waitForNavigation(this._targetTabId!, 30000);
                    await browser.tabs.update(this._targetTabId!, { url: this._returnUrl });

                    this.log('info', `  ⏳ Waiting for navigation to complete...`);
                    await navPromise;
                } else {
                    this.log('info', `  ⬅️ Using browser back button${attempt > 1 ? ` (attempt ${attempt})` : ''}`);

                    try {
                        const navPromise = this.waitForNavigation(this._targetTabId!, 30000);
                        await browser.tabs.goBack(this._targetTabId!);

                        this.log('info', `  ⏳ Waiting for navigation to complete...`);
                        await navPromise;
                    } catch (goBackErr: any) {
                        // tabs.goBack() can fail if there's no history entry
                        // Try to get the current tab URL from the loop context as a fallback
                        this.log('warn', `  ⚠️ Browser back failed: ${goBackErr.message}`);
                        throw goBackErr;
                    }
                }

                // Wait for content script to be ready on the NEW page
                this.log('info', `  ⏳ Waiting for content script to be ready...`);
                await this.waitForTab(30000);

                // Additional stabilization delay
                this.log('info', `  ⏱ Waiting 500ms for page stabilization...`);
                await this.delay(500);

                // Verify URL
                const tab = await browser.tabs.get(this._targetTabId!);
                this.log('info', `  📍 Current URL after go_back: ${tab.url}`);

                if (this._returnUrl && tab.url !== this._returnUrl) {
                    if (attempt < maxRetries) {
                        this.log('warn', `  ⚠️ URL mismatch (attempt ${attempt}/${maxRetries}). Retrying...`);
                        this.log('info', `    Expected: ${this._returnUrl}`);
                        this.log('info', `    Got: ${tab.url}`);
                        await this.delay(1000);
                        continue;
                    }
                    this.log('warn', `  ⚠️ URL mismatch after ${maxRetries} attempts. Expected: ${this._returnUrl}, Got: ${tab.url}`);
                }

                // Navigation succeeded (or we exhausted retries)
                break;
            }

            this.log('success', '✓ Went back');
        } catch (err: any) {
            this.log('error', `  ❌ Go back failed: ${err.message}`);
            throw err;
        }
    }

    private async executeCondition(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value && !scope) throw new Error('Condition block: selector or scope is required');

        this.log('info', `  🔀 Condition check: ${config.check}`);
        this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
        this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
        if (config.value !== undefined) {
            this.log('info', `  💬 Compare value: "${config.value}"`);
        }
        this.log('info', `  🔄 Negate: ${config.negate ? 'Yes' : 'No'}`);

        let conditionMet = false;

        switch (config.check) {
            case 'exists':
            case 'not_exists': {
                const countResp = await this.send({
                    type: 'ENV_COUNT',
                    data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                });

                if (!countResp.success) throw new Error(countResp.error || 'Failed to count elements');
                const count = countResp.data as number;
                this.log('info', `  🔢 Element count: ${count}`);
                conditionMet = config.check === 'exists' ? count > 0 : count === 0;
                break;
            }
            case 'visible':
            case 'hidden': {
                const visResp = await this.send({
                    type: 'ENV_IS_VISIBLE',
                    data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                });

                if (!visResp.success) throw new Error(visResp.error || 'Failed to check visibility');
                const isVisible = visResp.data as boolean;
                conditionMet = config.check === 'visible' ? isVisible : !isVisible;
                break;
            }
            case 'text_contains':
            case 'text_equals': {
                const textResp = await this.send({
                    type: 'ENV_GET_TEXT',
                    data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                });

                if (!textResp.success) throw new Error(textResp.error || 'Failed to get text');
                const text = textResp.data as string;
                this.log('info', `  📝 Element text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
                conditionMet = config.check === 'text_contains'
                    ? text.includes(config.value || '')
                    : text === (config.value || '');
                break;
            }
            case 'text_regex': {
                const textResp = await this.send({
                    type: 'ENV_GET_TEXT',
                    data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                });

                if (!textResp.success) throw new Error(textResp.error || 'Failed to get text');
                const text = textResp.data as string;
                try {
                    const regex = new RegExp(config.value || '', 'i');
                    conditionMet = regex.test(text);
                } catch (e) {
                    this.log('warn', `Invalid regex in condition: ${config.value}`);
                    conditionMet = false;
                }
                break;
            }
            case 'count_equals':
            case 'count_greater_than': {
                const cResp = await this.send({
                    type: 'ENV_COUNT',
                    data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                });

                if (!cResp.success) throw new Error(cResp.error || 'Failed to count elements');
                const c = cResp.data as number;
                const v = parseInt(config.value) || 0;
                conditionMet = config.check === 'count_equals' ? c === v : c > v;
                break;
            }
        }

        if (config.negate) conditionMet = !conditionMet;

        this.log('info', `  ✅ Condition result: ${conditionMet ? 'TRUE' : 'FALSE'}`);
        this.log('info', `  🔀 Condition "${config.check}" on ${sel?.value || 'scope element'}: ${conditionMet ? 'TRUE' : 'FALSE'}`);

        const branch = conditionMet ? (block.children || []) : ((block as any).elseChildren || []);
        const branchName = conditionMet ? 'THEN' : 'ELSE';
        this.log('info', `  ➡️ Executing ${branchName} branch (${branch.length} blocks)`);

        for (const child of branch) {
            if (this._abortController?.signal.aborted) break;
            await this.executeBlock(child, scope);
        }
    }

    private async executeAssert(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value && !scope) throw new Error('Assert block: selector or scope is required');

        this.log('info', `  ✓ Assert: ${config.check}`);
        this.log('info', `  🎯 Selector: ${sel?.value || 'scope element'}`);
        this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);

        const timeout = config.timeout || 5000;
        const startMs = Date.now();
        let assertPassed = false;
        let lastError: string | null = null;

        while (Date.now() - startMs < timeout) {
            if (this._abortController?.signal.aborted) return;

            try {
                switch (config.check) {
                    case 'exists': {
                        const countResp = await this.send({
                            type: 'ENV_COUNT',
                            data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                        });
                        if (countResp.success && (countResp.data as number) > 0) {
                            assertPassed = true;
                        }
                        break;
                    }
                    case 'not_exists': {
                        const countResp = await this.send({
                            type: 'ENV_COUNT',
                            data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                        });
                        if (countResp.success && (countResp.data as number) === 0) {
                            assertPassed = true;
                        }
                        break;
                    }
                    case 'visible':
                    case 'hidden': {
                        const visResp = await this.send({
                            type: 'ENV_IS_VISIBLE',
                            data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                        });
                        if (visResp.success) {
                            const isVisible = visResp.data as boolean;
                            assertPassed = config.check === 'visible' ? isVisible : !isVisible;
                        }
                        break;
                    }
                    case 'text_equals':
                    case 'text_contains': {
                        const textResp = await this.send({
                            type: 'ENV_GET_TEXT',
                            data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                        });
                        if (textResp.success) {
                            const text = textResp.data as string;
                            const expected = config.value || '';
                            assertPassed = config.check === 'text_equals'
                                ? text === expected
                                : text.includes(expected);
                        }
                        break;
                    }
                    case 'text_regex': {
                        const textResp = await this.send({
                            type: 'ENV_GET_TEXT',
                            data: { selector: sel?.value || '', selectorType: sel?.type || 'css', scope: scope || undefined }
                        });
                        if (textResp.success) {
                            const text = textResp.data as string;
                            try {
                                const regex = new RegExp(config.value || '', 'i');
                                assertPassed = regex.test(text);
                            } catch (e) {
                                lastError = `Invalid regex: ${config.value}`;
                            }
                        }
                        break;
                    }
                }

                if (assertPassed) {
                    this.log('success', `  ✓ Assert passed: ${config.check}`);
                    return;
                }
            } catch (err: any) {
                lastError = err.message;
            }

            await this.delay(250);
        }

        // Assertion failed
        const failMessage = config.failMessage || `Assertion failed: ${config.check} on ${sel?.value || 'scope element'}`;
        this.log('error', `  ❌ ${failMessage}`);
        if (lastError) {
            this.log('error', `     Last error: ${lastError}`);
        }
        throw new Error(failMessage);
    }

    private async executeSetVariable(block: Block, _scope?: Scope) {
        const config = block.config as any;
        const { name, value, scope = 'local' } = config;

        if (!name) throw new Error('Set Variable: name is required');

        // Simple variable substitution: replace {{varName}} with variable values
        let resolvedValue = value || '';
        const varPattern = /\{\{(\w+)\}\}/g;
        resolvedValue = resolvedValue.replace(varPattern, (_match: string, varName: string) => {
            return this._variables.get(varName) || '';
        });

        const varKey = scope === 'global' ? `global:${name}` : name;
        this._variables.set(varKey, resolvedValue);

        this.log('info', `  📝 Set variable: ${varKey} = "${resolvedValue}"`);
    }

    private async executeGetVariable(block: Block, _scope?: Scope) {
        const config = block.config as any;
        const { name, defaultValue = '', scope = 'local' } = config;

        if (!name) throw new Error('Get Variable: name is required');

        const varKey = scope === 'global' ? `global:${name}` : name;
        const value = this._variables.get(varKey) || defaultValue;

        this.log('info', `  📖 Get variable: ${varKey} = "${value}"`);

        // Return the value so it can be used by child blocks if needed
        return value;
    }

    private async executeHover(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value && !scope) throw new Error('Hover block: selector or scope is required');

        this.log('info', `  🖱 Hovering over: ${sel?.value || 'scope element'}`);
        this.log('info', `  📌 Selector type: ${sel?.type || 'css'}`);
        this.log('info', `  🔍 Has scope: ${scope ? 'Yes' : 'No'}`);

        const response = await this.send({
            type: 'ENV_HOVER',
            data: {
                selector: sel?.value || '',
                selectorType: sel?.type || 'css',
                scope: scope || undefined,
            }
        });

        if (!response.success) throw new Error(response.error || 'Hover failed');
        this.log('success', `✓ Hovered: ${sel?.value || 'scope element'}`);

        // Wait for hover delay if specified (for hover menus to appear)
        const hoverDelay = config.hoverDelay || 0;
        if (hoverDelay > 0) {
            this.log('info', `  ⏱ Waiting ${hoverDelay}ms for hover effect...`);
            await this.delay(hoverDelay);
        }
    }

    private async executeSwitchFrame(block: Block, _scope?: Scope) {
        const config = block.config as any;
        const { target, timeout = 5000 } = config;

        this.log('info', `  🖼 Switching to frame: ${target}`);

        const response = await this.send({
            type: 'ENV_SWITCH_FRAME',
            data: { target, timeout }
        });

        if (!response.success) throw new Error(response.error || 'Switch frame failed');
        if ((response.data as any)?.switched === false) {
            this.log('warn', `⚠ Frame "${target}" exists, but execution context did not switch. Continuing with current runtime limitations.`);
            return;
        }
        this.log('success', `✓ Switched to frame: ${target}`);
    }

    private async executeMacro(block: Block, scope?: Scope) {
        const config = block.config as any;
        const { macroId, parameters = {} } = config;

        if (!macroId) throw new Error('Macro block: macroId is required');

        // Look up the macro definition
        const macroDef = macroRegistryStore.getMacro(macroId);
        if (!macroDef) throw new Error(`Macro not found: ${macroId}`);

        this.log('info', `  🔧 Expanding macro: ${macroDef.name}`);
        this.log('info', `  📊 Macro blocks: ${macroDef.blocks?.length || 0}`);
        this.log('info', `  📝 Parameters: ${JSON.stringify(parameters)}`);

        // Validate required parameters
        for (const param of (macroDef.parameters || [])) {
            if (param.required && !parameters[param.name] && !param.defaultValue) {
                throw new Error(`Macro '${macroDef.name}': required parameter '${param.name}' not provided`);
            }
        }

        // Create blocks from macro definition with parameter substitution
        const macroBlocks = macroDef.blocks.map((blockJson: any) => {
            // Deep clone and substitute parameters
            const substituted = this.substituteParametersInBlock(blockJson, parameters, macroDef.parameters || []);
            return createBlockFromJSON(substituted);
        });

        // Execute the macro blocks
        for (const macroBlock of macroBlocks) {
            if (this._abortController?.signal.aborted) break;
            await this.executeBlock(macroBlock, scope);
        }

        this.log('success', `✓ Macro completed: ${macroDef.name}`);
    }

    /**
     * Recursively substitute parameters in a block and its children
     */
    private substituteParametersInBlock(blockJson: any, parameters: Record<string, string>, paramDefs: any[]): any {
        // Create a deep clone
        const result = JSON.parse(JSON.stringify(blockJson));

        // Substitute in string values throughout the object
        const substitute = (value: any): any => {
            if (typeof value === 'string') {
                let substituted = value;
                // Replace {{paramName}} with parameter value or default
                for (const paramDef of paramDefs) {
                    const paramValue = parameters[paramDef.name] || paramDef.defaultValue || '';
                    substituted = substituted.replace(new RegExp(`\\{\\{${paramDef.name}\\}\\}`, 'g'), paramValue);
                }
                return substituted;
            }
            if (Array.isArray(value)) {
                return value.map(substitute);
            }
            if (value && typeof value === 'object') {
                const newObj: any = {};
                for (const [k, v] of Object.entries(value)) {
                    newObj[k] = substitute(v);
                }
                return newObj;
            }
            return value;
        };

        // Process the entire block structure
        for (const key of Object.keys(result)) {
            result[key] = substitute(result[key]);
        }

        return result;
    }

    private async executeLoopElements(block: Block, scope?: Scope) {
        const config = block.config as any;
        const sel = config.selector;
        if (!sel?.value) throw new Error('Loop Elements: selector is required');

        this.log('info', `  🔁 Loop Elements`);
        this.log('info', `  🎯 Selector: ${sel.value}`);
        this.log('info', `  📌 Selector type: ${sel.type || 'css'}`);
        this.log('info', `  🔍 Has parent scope: ${scope ? 'Yes' : 'No'}`);

        // Store current URL before loop starts - for go_back to return to
        const currentTab = await browser.tabs.get(this._targetTabId!);
        const loopStartUrl = currentTab.url || null;
        this.log('info', `  📍 Loop start URL: ${loopStartUrl}`);

        // Save previous return URL to restore after loop completes
        const previousReturnUrl = this._returnUrl;

        // Count elements inside the current scope
        const countResp = await this.send({
            type: 'ENV_COUNT',
            data: { selector: sel.value, selectorType: sel.type || 'css', scope: scope || undefined }
        });

        if (!countResp.success) throw new Error(countResp.error || 'Failed to count loop elements');
        const totalItems = countResp.data as number;
        const maxIter = config.maxIterations ? Math.min(config.maxIterations, totalItems) : totalItems;

        this.log('info', `  📊 Found ${totalItems} elements`);
        this.log('info', `  🔄 Max iterations: ${config.maxIterations || 'unlimited'}`);
        this.log('info', `  ▶️ Will iterate: ${maxIter} times`);
        this.log('info', `  👶 Children per iteration: ${block.children?.length || 0}`);

        // Check if we're resuming from a checkpoint
        const startIndex = this._loopState[block.id] || 0;
        if (startIndex > 0) {
            this.log('info', `  🔄 Resuming from element ${startIndex + 1}`);
        }

        // Get processed items from parent context if available
        const processedItems = scope?.context?.loopItemsProcessed || new Set<number>();
        if (processedItems.size > 0) {
            this.log('info', `  📊 Items already processed: ${processedItems.size}`);
        }

        try {
            for (let i = startIndex; i < maxIter; i++) {
                // Periodic license check every 10 iterations
                if (i % 10 === 0 && i > 0) {
                    await this.checkLicenseRuntime();
                }

                // Set return URL for this iteration
                this._returnUrl = loopStartUrl;
                if (this._abortController?.signal.aborted) break;
                await this.checkPause();

                // Update loop state for checkpoint
                this._loopState[block.id] = i;

                // Check if this item was already processed
                if (processedItems.has(i)) {
                    this.log('info', `  ⏭️ Skipping item ${i + 1}/${maxIter} (already processed)`);
                    continue;
                }

                // Build the child scope for this loop iteration with context
                const childScope: Scope = {
                    selector: sel.value,
                    selectorType: (sel.type || 'css') as 'css' | 'xpath',
                    index: i,
                    parent: scope,
                    context: {
                        ...scope?.context,
                        loopItemIndex: i,
                        loopTotalItems: totalItems,
                        loopItemsProcessed: processedItems,
                    }
                };

                this.log('info', `  ━━━ Item ${i + 1}/${maxIter} ━━━`);

                // Wait for the element to exist (in case of navigation/re-render)
                let elementExists = false;
                const waitStart = Date.now();
                const maxWaitTime = 15000;
                this.log('info', `    🔍 Checking if element at index ${i} exists...`);
                let checkAttempts = 0;

                while (Date.now() - waitStart < maxWaitTime) {
                    checkAttempts++;
                    try {
                        const checkResp = await this.send({
                            type: 'ENV_COUNT',
                            data: {
                                selector: childScope.selector,
                                selectorType: childScope.selectorType,
                                scope: childScope.parent || undefined,
                            }
                        });

                        if (checkResp.success) {
                            const count = checkResp.data as number;
                            if (count > i) {
                                elementExists = true;
                                this.log('info', `    ✓ Element exists (${count} total elements, check attempt ${checkAttempts})`);
                                break;
                            } else {
                                this.log('info', `    ⏳ Found ${count} elements, need at least ${i + 1} (attempt ${checkAttempts})`);
                            }
                        }
                    } catch (err: any) {
                        this.log('warn', `    ⚠ Check attempt ${checkAttempts} failed: ${err.message}`);
                    }

                    await this.delay(500);
                }

                if (!elementExists) {
                    this.log('warn', `    ⚠ Element at index ${i} not found after ${checkAttempts} attempts (${maxWaitTime}ms). Loop stopped.`);
                    break;
                }

                let iterationFailed = false;
                try {
                    for (const child of (block.children || [])) {
                        if (this._abortController?.signal.aborted) break;
                        await this.executeBlock(child, childScope);
                    }
                } catch (iterErr: any) {
                    iterationFailed = true;
                    this.log('warn', `    ⚠ Item ${i + 1} failed: ${iterErr.message}`);
                    this.log('info', `    🔄 Attempting recovery for next iteration...`);

                    // Try to recover by navigating back to loop start URL
                    if (loopStartUrl) {
                        try {
                            await browser.tabs.update(this._targetTabId!, { url: loopStartUrl });
                            await this.waitForTab(30000);
                            await this.delay(1000);
                            this.log('info', `    ✓ Recovered — navigated back to loop URL`);
                        } catch (recoveryErr: any) {
                            this.log('error', `    ❌ Recovery failed: ${recoveryErr.message}. Stopping loop.`);
                            break;
                        }
                    } else {
                        // No stored URL — try browser back as last resort
                        try {
                            this.log('info', `    ⬅️ No stored URL, trying browser back for recovery...`);
                            await browser.tabs.goBack(this._targetTabId!);
                            await this.waitForTab(30000);
                            await this.delay(1000);
                            this.log('info', `    ✓ Recovered via browser back`);
                        } catch (recoveryErr: any) {
                            this.log('error', `    ❌ Recovery failed (no URL, back failed): ${recoveryErr.message}. Stopping loop.`);
                            break;
                        }
                    }
                }

                // Mark this item as processed (even if failed, to avoid re-processing)
                if (!iterationFailed) {
                    processedItems.add(i);
                }

                // Apply delay between iterations (not after last iteration)
                const delayMs = config.delayBetweenIterations || 0;
                if (i < maxIter - 1 && delayMs > 0) {
                    const jitter = config.randomJitter ? Math.floor(Math.random() * config.randomJitter) : 0;
                    const totalDelay = delayMs + jitter;
                    this.log('info', `    ⏱ Waiting ${totalDelay}ms before next iteration...`);
                    await this.delay(totalDelay);
                }
            }
        } finally {
            // Restore previous return URL, or clear if there was none
            this._returnUrl = previousReturnUrl;
            this.log('info', `  ↩️ Restored return URL: ${previousReturnUrl || 'null'}`);
        }

        this.log('success', `✓ Loop completed: ${maxIter} iterations`);
    }

    private clearChildLoopStates(block: Block) {
        for (const child of (block.children || [])) {
            delete this._loopState[child.id];
            if (child.children) {
                this.clearChildLoopStates(child);
            }
        }
    }

    private async executeLoopPagination(block: Block, scope?: Scope) {
        const config = block.config as any;
        const paginationType = config.paginationType || 'button';
        const maxPages = config.maxPages || 100;
        const delayBetween = config.delayBetweenPages || 1000;

        this.log('info', `  📄 Loop Pagination`);
        this.log('info', `  🔄 Pagination type: ${paginationType}`);
        this.log('info', `  � Max pages: ${maxPages}`);
        this.log('info', `  ⏱ Delay between pages: ${delayBetween}ms`);
        this.log('info', `  👶 Children per page: ${block.children?.length || 0}`);

        if (paginationType === 'scroll') {
            await this.executeScrollPagination(block, scope, maxPages, delayBetween);
        } else {
            await this.executeButtonPagination(block, scope, maxPages, delayBetween);
        }
    }

    private async executeButtonPagination(block: Block, scope: Scope | undefined, maxPages: number, delayBetween: number) {
        const config = block.config as any;
        const sel = config.nextButtonSelector;
        if (!sel?.value) throw new Error('Loop Pagination (button): next button selector required');

        this.log('info', `  🎯 Next button selector: ${sel.value}`);
        this.log('info', `  📌 Selector type: ${sel.type || 'css'}`);
        this.log('info', `  ⚠ On no next button: ${config.onNoNextButton || 'stop'}`);

        // Check if we're resuming from a checkpoint
        const startPage = this._loopState[block.id] || 0;
        if (startPage > 0) {
            this.log('info', `  🔄 Resuming from page ${startPage + 1}`);
        }

        let page = startPage;
        while (page < maxPages) {
            if (this._abortController?.signal.aborted) break;
            await this.checkPause();

            // Update loop state for checkpoint
            this._loopState[block.id] = page;

            this.log('info', `  ━━━ Page ${page + 1} ━━━`);

            // Periodic license check every 10 pages
            if (page % 10 === 0 && page > startPage) {
                await this.checkLicenseRuntime();
            }

            // Reset child loop states for new pages so loop_elements starts fresh
            if (page > startPage) {
                this.clearChildLoopStates(block);
            }

            // Execute children for this page
            this.log('info', `    👶 Executing ${block.children?.length || 0} children on this page...`);
            for (const child of (block.children || [])) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, scope);
            }

            page++;

            // Check if we've reached max pages
            if (page >= maxPages) {
                this.log('info', `    🛑 Reached max pages limit (${maxPages})`);
                break;
            }

            // Try to find and click the next button — also check disabled/hidden state
            this.log('info', `    🔍 Looking for next button...`);
            const clickableResp = await this.send({
                type: 'ENV_CHECK_CLICKABLE',
                data: { selector: sel.value, selectorType: sel.type || 'css', scope: scope || undefined }
            });

            const btnState = clickableResp.success ? clickableResp.data as { exists: boolean; visible: boolean; enabled: boolean; clickable: boolean } : null;

            if (!btnState?.exists) {
                this.log('info', `    ❌ Next button not found`);
                if (config.onNoNextButton === 'error') {
                    throw new Error('Next button not found');
                }
                this.log('info', `    🛑 Stopping pagination (no next button)`);
                break;
            }

            if (!btnState.clickable) {
                // Button exists but is disabled or hidden — this means we're on the last page
                const reason = !btnState.visible ? 'hidden' : 'disabled';
                this.log('info', `    ⚠ Next button is ${reason} — reached last page`);
                this.log('info', `    🛑 Stopping pagination (next button ${reason})`);
                break;
            }

            // Click next button
            this.log('info', `    ✓ Next button found and clickable`);
            this.log('info', `    👆 Clicking next button: ${sel.value}`);

            // Capture URL before click to detect full-page navigation
            let urlBeforePagination: string | undefined;
            try {
                const tabBefore = await browser.tabs.get(this._targetTabId!);
                urlBeforePagination = tabBefore.url;
            } catch { /* ignore */ }

            // Listen for navigation
            let paginationNavDetected = false;
            const onPagNav = (tabId: number, changeInfo: any) => {
                if (tabId === this._targetTabId && changeInfo.status === 'loading') {
                    paginationNavDetected = true;
                }
            };
            browser.tabs.onUpdated.addListener(onPagNav);

            await this.send({
                type: 'ENV_CLICK',
                data: { selector: sel.value, selectorType: sel.type || 'css', scope: scope || undefined }
            });

            // Give browser a moment to start navigating
            await this.delay(300);
            browser.tabs.onUpdated.removeListener(onPagNav);

            if (paginationNavDetected) {
                // Full page navigation — wait for it to complete
                this.log('info', `    🔀 Page navigation detected, waiting for load...`);
                let alreadyDone = false;
                try {
                    const tabNow = await browser.tabs.get(this._targetTabId!);
                    alreadyDone = tabNow.status === 'complete';
                } catch { /* ignore */ }
                if (!alreadyDone) {
                    try { await this.waitForNavigation(this._targetTabId!, 30000); } catch { /* may have completed */ }
                }
                await this.waitForTab(30000);
                this.log('info', `    ✓ Page loaded after pagination navigation`);
                // Wait for dynamic content to render (page may be "complete" before JS renders elements)
                this.log('info', `    ⏱ Waiting ${delayBetween}ms for dynamic content to render...`);
                await this.delay(delayBetween);
            } else {
                // SPA-style or no navigation — use delay + waitForTab
                this.log('info', `    ⏱ Waiting ${delayBetween}ms for page transition...`);
                await this.delay(delayBetween);
                // Double-check URL change
                try {
                    const tabAfter = await browser.tabs.get(this._targetTabId!);
                    if (urlBeforePagination && tabAfter.url !== urlBeforePagination) {
                        this.log('info', `    🔀 URL changed, waiting for content script...`);
                        await this.waitForTab(30000);
                    }
                } catch { /* ignore */ }
            }
            this.log('info', `    ⏳ Verifying page is ready...`);
            await this.waitForTab(15000);

            // Wait for child elements to appear on the new page (dynamic content like Amazon grids)
            const firstChildLoop = (block.children || []).find((c: Block) => c.type === 'loop_elements');
            if (firstChildLoop) {
                const childSel = (firstChildLoop.config as any)?.selector;
                if (childSel?.value) {
                    this.log('info', `    🔍 Waiting for elements (${childSel.value}) to appear...`);
                    const elemWaitStart = Date.now();
                    const elemWaitMax = 10000;
                    let elemFound = false;
                    while (Date.now() - elemWaitStart < elemWaitMax) {
                        try {
                            const checkResp = await this.send({
                                type: 'ENV_COUNT',
                                data: { selector: childSel.value, selectorType: childSel.type || 'css', scope: scope || undefined }
                            });
                            if (checkResp.success && (checkResp.data as number) > 0) {
                                this.log('info', `    ✓ Found ${checkResp.data} elements after ${Date.now() - elemWaitStart}ms`);
                                elemFound = true;
                                break;
                            }
                        } catch { /* retry */ }
                        await this.delay(500);
                    }
                    if (!elemFound) {
                        this.log('warn', `    ⚠ No elements found after ${elemWaitMax}ms — proceeding anyway`);
                    }
                }
            }
        }

        this.log('success', `✓ Button pagination completed: ${page} pages processed`);
    }

    private async executeScrollPagination(block: Block, scope: Scope | undefined, maxPages: number, delayBetween: number) {
        const config = block.config as any;
        const scrollStrategy = config.scrollStrategy || 'fixed_amount';

        this.log('info', `  📜 Scroll strategy: ${scrollStrategy}`);

        if (scrollStrategy === 'scroll_to_bottom') {
            await this.executeScrollToBottomStrategy(block, scope, maxPages, delayBetween);
        } else if (scrollStrategy === 'scroll_to_last_item') {
            await this.executeScrollToLastItemStrategy(block, scope, maxPages, delayBetween);
        } else {
            await this.executeFixedAmountStrategy(block, scope, maxPages, delayBetween);
        }
    }

    private async executeFixedAmountStrategy(block: Block, scope: Scope | undefined, maxPages: number, delayBetween: number) {
        const config = block.config as any;
        const scrollTarget = config.scrollTarget || 'window';
        const scrollAmount = config.scrollAmount || 1000;
        const scrollSelector = config.scrollSelector;

        this.log('info', `  📜 Scroll target: ${scrollTarget}`);
        this.log('info', `  📏 Scroll amount: ${scrollAmount}px`);
        if (scrollSelector?.value) {
            this.log('info', `  🎯 Scroll selector: ${scrollSelector.value}`);
        }

        let page = 0;
        let previousItemCount = 0;
        let noNewItemsCount = 0;

        while (page < maxPages) {
            if (this._abortController?.signal.aborted) break;
            await this.checkPause();

            this.log('info', `  ━━━ Iteration ${page + 1} ━━━`);

            // Periodic license check every 10 iterations
            if (page % 10 === 0 && page > 0) {
                await this.checkLicenseRuntime();
            }

            // Reset child loop states for new iterations so loop_elements starts fresh
            if (page > 0) {
                this.clearChildLoopStates(block);
            }

            // Execute children for current visible items
            this.log('info', `    👶 Executing ${block.children?.length || 0} children...`);
            for (const child of (block.children || [])) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, scope);
            }

            page++;

            if (page >= maxPages) {
                this.log('info', `    🛑 Reached max iterations limit (${maxPages})`);
                break;
            }

            // Scroll by fixed amount
            this.log('info', `    📜 Scrolling ${scrollAmount}px...`);
            const scrollResp = await this.send({
                type: 'ENV_SCROLL',
                data: {
                    target: scrollTarget,
                    behavior: 'pixels',
                    amount: scrollAmount,
                    selector: scrollSelector?.value,
                    selectorType: scrollSelector?.type || 'css',
                    scope: scope || undefined,
                }
            });

            if (scrollResp.success && scrollResp.data) {
                const info = scrollResp.data as any;
                this.log('info', `    📊 Position: ${info.afterScrollTop}px / ${info.scrollHeight}px (${Math.round((info.afterScrollTop / info.scrollHeight) * 100)}%)`);
                this.log('info', `    📏 Scrolled: ${info.scrolled}px | Remaining: ${info.remainingScroll}px`);
            }

            // Wait for new content
            this.log('info', `    ⏱ Waiting ${delayBetween}ms for content to load...`);
            await this.delay(delayBetween);

            // Check for new items
            const currentItemCount = this.extractedData.length;
            this.log('info', `    📊 Items: ${currentItemCount} (previous: ${previousItemCount})`);

            if (currentItemCount === previousItemCount) {
                noNewItemsCount++;
                this.log('info', `    ⚠ No new items (${noNewItemsCount}/3)`);
                if (noNewItemsCount >= 3) {
                    this.log('info', `    🛑 No new items after 3 attempts, stopping`);
                    break;
                }
            } else {
                noNewItemsCount = 0;
                this.log('info', `    ✓ New items: +${currentItemCount - previousItemCount}`);
            }
            previousItemCount = currentItemCount;
        }

        this.log('success', `✓ Scroll pagination completed: ${page} iterations, ${this.extractedData.length} total items`);
    }

    private async executeScrollToBottomStrategy(block: Block, scope: Scope | undefined, maxPages: number, delayBetween: number) {
        const config = block.config as any;
        const scrollTarget = config.scrollTarget || 'window';
        const scrollSelector = config.scrollSelector;

        this.log('info', `  📜 Strategy: Scroll to bottom once, then wait for items`);
        this.log('info', `  📜 Scroll target: ${scrollTarget}`);

        let iteration = 0;
        let previousItemCount = 0;
        let noNewItemsCount = 0;

        while (iteration < maxPages) {
            if (this._abortController?.signal.aborted) break;
            await this.checkPause();

            this.log('info', `  ━━━ Iteration ${iteration + 1} ━━━`);

            // Periodic license check every 10 iterations
            if (iteration % 10 === 0 && iteration > 0) {
                await this.checkLicenseRuntime();
            }

            // Reset child loop states for new iterations so loop_elements starts fresh
            if (iteration > 0) {
                this.clearChildLoopStates(block);
            }

            // Execute children for current visible items
            this.log('info', `    👶 Executing ${block.children?.length || 0} children...`);
            for (const child of (block.children || [])) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, scope);
            }

            iteration++;

            if (iteration >= maxPages) {
                this.log('info', `    🛑 Reached max iterations limit (${maxPages})`);
                break;
            }

            // Scroll to bottom
            this.log('info', `    📜 Scrolling to bottom...`);
            const scrollResp = await this.send({
                type: 'ENV_SCROLL',
                data: {
                    target: scrollTarget,
                    behavior: 'bottom',
                    selector: scrollSelector?.value,
                    selectorType: scrollSelector?.type || 'css',
                    scope: scope || undefined,
                }
            });

            if (scrollResp.success && scrollResp.data) {
                const info = scrollResp.data as any;
                this.log('info', `    📊 Position: ${info.afterScrollTop}px / ${info.scrollHeight}px`);
            }

            // Wait for new content to load
            this.log('info', `    ⏱ Waiting ${delayBetween}ms for new items...`);
            await this.delay(delayBetween);

            // Check for new items
            const currentItemCount = this.extractedData.length;
            this.log('info', `    📊 Items: ${currentItemCount} (previous: ${previousItemCount})`);

            if (currentItemCount === previousItemCount) {
                noNewItemsCount++;
                this.log('info', `    ⚠ No new items (${noNewItemsCount}/3)`);
                if (noNewItemsCount >= 3) {
                    this.log('info', `    🛑 No new items after 3 attempts, stopping`);
                    break;
                }
            } else {
                noNewItemsCount = 0;
                this.log('info', `    ✓ New items: +${currentItemCount - previousItemCount}`);
            }
            previousItemCount = currentItemCount;
        }

        this.log('success', `✓ Scroll pagination completed: ${iteration} iterations, ${this.extractedData.length} total items`);
    }

    private async executeScrollToLastItemStrategy(block: Block, scope: Scope | undefined, maxPages: number, delayBetween: number) {
        const config = block.config as any;
        const itemSelector = config.itemSelector;

        if (!itemSelector?.value) {
            throw new Error('Scroll to last item strategy requires item selector');
        }

        this.log('info', `  📜 Strategy: Scroll to last visible item`);
        this.log('info', `  🎯 Item selector: ${itemSelector.value}`);

        let iteration = 0;
        let previousDOMItemCount = 0;
        let previousExtractedCount = 0;
        let noChangeCount = 0;

        // Initialize context for tracking processed items
        const processedItems = new Set<number>();

        while (iteration < maxPages) {
            if (this._abortController?.signal.aborted) break;
            await this.checkPause();

            this.log('info', `  ━━━ Iteration ${iteration + 1} ━━━`);

            // Periodic license check every 10 iterations
            if (iteration % 10 === 0 && iteration > 0) {
                await this.checkLicenseRuntime();
            }

            // Count items BEFORE executing children
            const beforeCountResp = await this.send({
                type: 'ENV_COUNT',
                data: {
                    selector: itemSelector.value,
                    selectorType: itemSelector.type || 'css',
                    scope: scope || undefined
                }
            });

            if (!beforeCountResp.success || (beforeCountResp.data as number) === 0) {
                this.log('warn', `    ⚠ No items found with selector: ${itemSelector.value}`);
                break;
            }

            const beforeDOMCount = beforeCountResp.data as number;
            this.log('info', `    📊 DOM items before: ${beforeDOMCount}`);
            this.log('info', `    📊 Items processed: ${processedItems.size}`);

            // Create enhanced scope with context
            const scopeWithContext: Scope | undefined = scope ? {
                ...scope,
                context: {
                    ...scope.context,
                    loopIteration: iteration + 1,
                    loopTotalItems: beforeDOMCount,
                    loopItemsProcessed: processedItems,
                }
            } : undefined;

            // Reset child loop states for new iterations so loop_elements starts fresh
            if (iteration > 0) {
                this.clearChildLoopStates(block);
            }

            // Execute children for current visible items
            this.log('info', `    👶 Executing ${block.children?.length || 0} children...`);
            for (const child of (block.children || [])) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, scopeWithContext);
            }

            iteration++;

            if (iteration >= maxPages) {
                this.log('info', `    🛑 Reached max iterations limit (${maxPages})`);
                break;
            }

            // Scroll last item into view using index-based selection
            const lastItemIndex = beforeDOMCount - 1;
            this.log('info', `    📜 Scrolling to item index ${lastItemIndex}...`);

            const scrollResp = await this.send({
                type: 'ENV_SCROLL',
                data: {
                    target: 'element',
                    behavior: 'element_into_view',
                    selector: itemSelector.value,
                    selectorType: itemSelector.type || 'css',
                    elementIndex: lastItemIndex,
                    scope: scope || undefined
                }
            });

            if (!scrollResp.success) {
                this.log('warn', `    ⚠ Scroll failed: ${scrollResp.error}`);
            } else {
                this.log('info', `    ✓ Scrolled to item ${lastItemIndex}`);
            }

            // Wait for new items to load
            this.log('info', `    ⏱ Waiting ${delayBetween}ms for new items...`);
            await this.delay(delayBetween);

            // Count items AFTER waiting
            const afterCountResp = await this.send({
                type: 'ENV_COUNT',
                data: {
                    selector: itemSelector.value,
                    selectorType: itemSelector.type || 'css',
                    scope: scope || undefined
                }
            });

            const afterDOMCount = afterCountResp.success ? (afterCountResp.data as number) : beforeDOMCount;
            const currentExtractedCount = this.extractedData.length;

            this.log('info', `    📊 DOM items after: ${afterDOMCount} (was ${beforeDOMCount})`);
            this.log('info', `    📊 Extracted: ${currentExtractedCount} (was ${previousExtractedCount})`);

            // Check if anything changed
            const domChanged = afterDOMCount > previousDOMItemCount;
            const extractedChanged = currentExtractedCount > previousExtractedCount;

            if (!domChanged && !extractedChanged) {
                noChangeCount++;
                this.log('info', `    ⚠ No changes detected (${noChangeCount}/3)`);
                if (noChangeCount >= 3) {
                    this.log('info', `    🛑 No changes after 3 attempts, stopping`);
                    break;
                }
            } else {
                noChangeCount = 0;
                if (domChanged) {
                    this.log('info', `    ✓ DOM items increased: +${afterDOMCount - previousDOMItemCount}`);
                }
                if (extractedChanged) {
                    this.log('info', `    ✓ Extracted items increased: +${currentExtractedCount - previousExtractedCount}`);
                }
            }

            previousDOMItemCount = afterDOMCount;
            previousExtractedCount = currentExtractedCount;
        }

        this.log('success', `✓ Scroll pagination completed: ${iteration} iterations, ${this.extractedData.length} total items`);
    }

    private async executeExtractScope(block: Block, scope?: Scope) {
        const config = block.config as any;
        const fields: ExtractionField[] = config.fields || [];

        this.log('info', `  📦 Extract Scope`);
        this.log('info', `  📊 Fields to extract: ${fields.length}`);
        if (config.scopeSelector?.value) {
            this.log('info', `  🎯 Scope selector: ${config.scopeSelector.value}`);
        }
        this.log('info', `  🔄 Reset scope: ${config.resetScope ? 'Yes' : 'No'}`);
        this.log('info', `  🔍 Has parent scope: ${scope ? 'Yes' : 'No'}`);

        if (fields.length === 0) {
            this.log('warn', '  ⚠ Extract block has no fields defined');
            return;
        }

        // Separate fields into extracted (DOM) and static
        const extractedFields: any[] = [];
        const staticFields: any[] = [];
        const formulaFields: any[] = [];

        for (const f of fields) {
            if (f.mode === 'static') {
                staticFields.push(f);
            } else {
                extractedFields.push(f);
            }
            if (f.formula) {
                formulaFields.push(f);
            }
        }

        // Log field details
        fields.forEach((f: any, idx: number) => {
            if (f.mode === 'static') {
                this.log('info', `    ${idx + 1}. ${f.key}: [static] type="${f.staticType || 'constant'}"`);
            } else {
                this.log('info', `    ${idx + 1}. ${f.key}: selector="${f.selector?.value || 'scope'}" attr="${f.attribute}"`);
                if (f.transformers && f.transformers.length > 0) {
                    this.log('info', `       🔧 Transformers (${f.transformers.length}):`, f.transformers);
                }
            }
            if (f.formula) {
                this.log('info', `       📐 Formula: ${f.formula}`);
            }
        });

        // ─── Step 1: Compute static field values ─────────────────────────
        const record: Record<string, any> = {};

        for (const f of staticFields) {
            const key = f.key;
            if (!key) continue;
            try {
                const staticType = f.staticType || 'constant';
                let value: any = null;

                switch (staticType) {
                    case 'constant':
                        value = f.staticValue ?? '';
                        break;
                    case 'uuid':
                        value = uuidv4();
                        break;
                    case 'random_number': {
                        const min = f.staticMin ?? 0;
                        const max = f.staticMax ?? 1000;
                        value = Math.floor(Math.random() * (max - min + 1)) + min;
                        break;
                    }
                    case 'date': {
                        const now = new Date();
                        const fmt = f.staticDateFormat || 'YYYY-MM-DD HH:mm:ss';
                        value = this.formatDate(now, fmt);
                        break;
                    }
                    case 'auto_increment': {
                        const counterKey = `${block.id}:${key}`;
                        if (this._autoIncrementCounters[counterKey] === undefined) {
                            this._autoIncrementCounters[counterKey] = f.staticStartFrom ?? 1;
                        }
                        value = this._autoIncrementCounters[counterKey];
                        this._autoIncrementCounters[counterKey]++;
                        break;
                    }
                }

                record[key] = value;
                this.log('info', `    🗄️ Static "${key}" = "${String(value).substring(0, 50)}"`);
            } catch (err) {
                this.log('warn', `  ⚠ Failed to compute static field "${key}": ${err}`);
                record[key] = null;
            }
        }

        // ─── Step 2: Extract DOM fields (only if there are extracted fields) ─
        if (extractedFields.length > 0) {
            // Build extraction fields in the format env-handler expects
            // IMPORTANT: Convert MobX Proxy objects to plain JS objects for Chrome messaging
            const envFields = extractedFields.map((f: any) => ({
                key: f.key,
                selector: f.selector?.value || '',
                selectorType: (f.selector?.type || 'css') as string,
                attribute: f.attribute || 'text',
                transformers: f.transformers ? JSON.parse(JSON.stringify(f.transformers)) : [],
                required: f.required || false,
                multiple: f.multiple || false,
            }));

            this.log('info', `  📤 Extraction fields being sent: ${envFields.map((f: any) => f.key).join(', ')}`);

            // Log transformers for debugging
            envFields.forEach((field: any) => {
                if (field.transformers && field.transformers.length > 0) {
                    this.log('info', `     Field "${field.key}" transformers: ${JSON.stringify(field.transformers)}`);
                }
            });

            // Determine the extraction scope
            let extractScope = scope;
            if (config.resetScope) {
                this.log('info', `  🔄 Resetting scope to document root`);
                extractScope = undefined;
            }

            if (config.scopeSelector?.value) {
                this.log('info', `  🎯 Building nested scope: ${config.scopeSelector.value}`);
                const scopeResponse = await this.send({
                    type: 'ENV_GET_SCOPE',
                    data: {
                        selector: config.scopeSelector.value,
                        selectorType: config.scopeSelector.type || 'css',
                        scope: extractScope || undefined,
                    }
                });
                if (!scopeResponse.success) throw new Error('Failed to build nested scope');
                extractScope = scopeResponse.data;
            }

            this.log('info', `  📤 Sending extraction request...`);

            // Identify fields with transformers — these may need retries if content is lazy-loaded
            const fieldsWithTransformers = new Set(
                envFields.filter((f: any) => f.transformers && f.transformers.length > 0).map((f: any) => f.key)
            );

            const maxExtractionAttempts = fieldsWithTransformers.size > 0 ? 3 : 1;
            let extractedRecord: Record<string, any> = {};

            for (let attempt = 1; attempt <= maxExtractionAttempts; attempt++) {
                const response = await this.send({
                    type: 'ENV_EXTRACT_RECORD',
                    data: {
                        fields: envFields,
                        scope: extractScope || undefined,
                    }
                });

                if (!response.success) throw new Error(response.error || 'Extraction failed');

                extractedRecord = response.data as Record<string, any>;

                // Check if any transformer-dependent fields returned empty (possible lazy-load issue)
                if (attempt < maxExtractionAttempts && fieldsWithTransformers.size > 0) {
                    const emptyTransformerFields = Array.from(fieldsWithTransformers).filter(
                        key => !extractedRecord[key] || extractedRecord[key] === ''
                    );
                    if (emptyTransformerFields.length > 0) {
                        this.log('info', `  🔄 Retry ${attempt}/${maxExtractionAttempts}: fields [${emptyTransformerFields.join(', ')}] empty (possible lazy-load), waiting 1.5s...`);
                        await this.delay(1500);
                        continue;
                    }
                }
                break;
            }

            // Merge extracted values into record
            for (const [key, value] of Object.entries(extractedRecord)) {
                record[key] = value;
            }
        }

        // ─── Step 3: Apply formulas ──────────────────────────────────────
        for (const f of formulaFields) {
            if (!f.key || !f.formula) continue;
            try {
                const result = this.evaluateFormula(f.formula, record);
                this.log('info', `    📐 Formula "${f.key}": ${f.formula} = ${result}`);
                record[f.key] = result;
            } catch (err) {
                this.log('warn', `  ⚠ Formula error for "${f.key}": ${err}`);
                // Keep the original value if formula fails
            }
        }

        // ─── Step 4: Apply default values for empty fields ───────────────
        for (const f of fields) {
            if (f.defaultValue !== undefined && f.defaultValue !== '' &&
                (record[f.key] === null || record[f.key] === undefined || record[f.key] === '')) {
                record[f.key] = f.defaultValue;
            }
        }

        // Check required fields
        for (const field of fields) {
            if (field.required && (record[field.key] === null || record[field.key] === undefined || record[field.key] === '')) {
                this.log('warn', `  ⚠ Required field "${field.key}" is empty, skipping record`);
                return;
            }
        }

        // Log extracted values
        this.log('info', `  📝 Extracted values:`);
        Object.entries(record).forEach(([key, value]) => {
            const valueStr = String(value || '').substring(0, 50);
            this.log('info', `    ${key}: "${valueStr}${String(value || '').length > 50 ? '...' : ''}"`);
        });

        // Determine extractScope for children (need to recompute since it was scoped above)
        let childScope = scope;
        if (config.resetScope) {
            childScope = undefined;
        }
        if (config.scopeSelector?.value) {
            const scopeResponse = await this.send({
                type: 'ENV_GET_SCOPE',
                data: {
                    selector: config.scopeSelector.value,
                    selectorType: config.scopeSelector.type || 'css',
                    scope: childScope || undefined,
                }
            });
            if (scopeResponse.success) {
                childScope = scopeResponse.data;
            }
        }

        // Deduplication: O(1) hash-based check instead of O(n) full scan
        const hashKey = JSON.stringify(Object.keys(record).sort().map(k => [k, record[k]]));
        if (this._deduplicationHashes.has(hashKey)) {
            this.log('warn', `  ⏭ Duplicate record skipped`);
            return;
        }
        this._deduplicationHashes.add(hashKey);

        // Update extracted data
        this.addExtractedRow(record, fields.map(f => f.key).filter(Boolean) as string[]);
        // Also add any extra keys from record not in fields (safety fallback)
        for (const key of Object.keys(record)) {
            if (!this.extractedColumns.includes(key)) {
                this.extractedColumns.push(key);
            }
        }

        this.log('success', `  ✓ Extracted row #${this.extractedData.length}`);
        this.log('info', `  📊 Total rows collected: ${this.extractedData.length}`);

        // Execute children if any (for nested extractions)
        if (block.children?.length) {
            this.log('info', `  👶 Executing ${block.children.length} children for nested extraction...`);
            for (const child of (block.children || [])) {
                if (this._abortController?.signal.aborted) break;
                await this.executeBlock(child, childScope);
            }
        }
    }

    /**
     * Evaluate a formula string by substituting {{fieldKey}} references and evaluating math.
     * Uses a safe recursive-descent parser — no eval/Function (blocked by Chrome extension CSP).
     */
    private evaluateFormula(formula: string, record: Record<string, any>): any {
        // Check if any referenced field is null/empty — if so, return null
        // (formula can't produce a meaningful result from missing data)
        let hasNullReference = false;
        const expression = formula.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const val = record[key];
            if (val === null || val === undefined || val === '') {
                hasNullReference = true;
                return '0';
            }
            const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
            if (isNaN(num)) {
                hasNullReference = true;
                return '0';
            }
            return String(num);
        });

        if (hasNullReference) return null;

        const result = this.parseMathExpression(expression.trim());
        return typeof result === 'number' && !isNaN(result) ? result : null;
    }

    /**
     * Safe recursive-descent math parser.
     * Supports: +, -, *, /, (), unary minus, and Math.round/floor/ceil/abs/min/max/pow/sqrt
     */
    private parseMathExpression(expr: string): number {
        let pos = 0;

        const skipWhitespace = () => {
            while (pos < expr.length && expr[pos] === ' ') pos++;
        };

        const parseNumber = (): number => {
            skipWhitespace();
            let numStr = '';
            // Handle unary minus
            if (expr[pos] === '-') {
                numStr += '-';
                pos++;
            }
            while (pos < expr.length && (expr[pos] >= '0' && expr[pos] <= '9' || expr[pos] === '.')) {
                numStr += expr[pos++];
            }
            if (numStr === '' || numStr === '-') throw new Error(`Expected number at position ${pos}`);
            return parseFloat(numStr);
        };

        const parseMathFunction = (): number | null => {
            skipWhitespace();
            const mathFns: Record<string, (...args: number[]) => number> = {
                'Math.round': Math.round,
                'Math.floor': Math.floor,
                'Math.ceil': Math.ceil,
                'Math.abs': Math.abs,
                'Math.sqrt': Math.sqrt,
                'Math.min': Math.min,
                'Math.max': Math.max,
                'Math.pow': Math.pow,
            };
            for (const [name, fn] of Object.entries(mathFns)) {
                if (expr.substring(pos, pos + name.length) === name) {
                    pos += name.length;
                    skipWhitespace();
                    if (expr[pos] !== '(') throw new Error(`Expected '(' after ${name}`);
                    pos++; // skip (
                    const args: number[] = [parseAddSub()];
                    skipWhitespace();
                    while (expr[pos] === ',') {
                        pos++; // skip ,
                        args.push(parseAddSub());
                        skipWhitespace();
                    }
                    if (expr[pos] !== ')') throw new Error(`Expected ')' after ${name} args`);
                    pos++; // skip )
                    return fn(...args);
                }
            }
            return null;
        };

        const parsePrimary = (): number => {
            skipWhitespace();
            // Try Math.xxx function first
            const fnResult = parseMathFunction();
            if (fnResult !== null) return fnResult;

            // Parenthesized expression
            if (expr[pos] === '(') {
                pos++; // skip (
                const val = parseAddSub();
                skipWhitespace();
                if (expr[pos] !== ')') throw new Error(`Expected ')' at position ${pos}`);
                pos++; // skip )
                return val;
            }

            return parseNumber();
        };

        const parseMulDiv = (): number => {
            let left = parsePrimary();
            skipWhitespace();
            while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
                const op = expr[pos++];
                const right = parsePrimary();
                left = op === '*' ? left * right : left / right;
                skipWhitespace();
            }
            return left;
        };

        const parseAddSub = (): number => {
            let left = parseMulDiv();
            skipWhitespace();
            while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
                const op = expr[pos++];
                const right = parseMulDiv();
                left = op === '+' ? left + right : left - right;
                skipWhitespace();
            }
            return left;
        };

        const result = parseAddSub();
        return result;
    }

    /**
     * Format a date using a simple pattern string.
     * Supports: YYYY, MM, DD, HH, mm, ss
     */
    private formatDate(date: Date, format: string): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return format
            .replace('YYYY', String(date.getFullYear()))
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()))
            .replace('HH', pad(date.getHours()))
            .replace('mm', pad(date.getMinutes()))
            .replace('ss', pad(date.getSeconds()));
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    exportAsJSON(): string {
        return JSON.stringify(this.extractedData, null, 2);
    }

    exportAsCSV(): string {
        if (this.extractedData.length === 0) return '';

        const cols = this.extractedColumns;
        const header = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
        const rows = this.extractedData.map(row => {
            return cols.map(col => {
                const val = row[col] ?? '';
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',');
        });

        return [header, ...rows].join('\n');
    }

    downloadJSON() {
        const json = this.exportAsJSON();
        this.downloadBlob(json, 'extracted-data.json', 'application/json');
    }

    downloadCSV() {
        const csv = this.exportAsCSV();
        this.downloadBlob(csv, 'extracted-data.csv', 'text/csv');
    }

    downloadExcel() {
        if (this.extractedData.length === 0) return;

        const cols = this.extractedColumns;
        const wsData = [
            cols,
            ...this.extractedData.map(row => cols.map(col => row[col] ?? ''))
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-size columns based on content
        ws['!cols'] = cols.map(col => {
            const maxLen = Math.max(
                col.length,
                ...this.extractedData.map(row => String(row[col] ?? '').length)
            );
            return { wch: Math.min(maxLen + 2, 50) };
        });

        XLSX.utils.book_append_sheet(wb, ws, 'Extracted Data');
        const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted-data.xlsx';
        a.click();
        URL.revokeObjectURL(url);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static readonly MAX_LOG_ENTRIES = 5000;

    private log(type: ExecutionLog['type'], message: string, blockId?: string, blockLabel?: string) {
        if (!this.enableLogs) return;
        this.addLogEntry({
            timestamp: Date.now(),
            message,
            type,
            blockId,
            blockLabel,
        });
        // Cap log size to prevent unbounded memory growth during long runs
        if (this.logs.length > BlueprintExecutorStore.MAX_LOG_ENTRIES) {
            this.logs.splice(0, this.logs.length - BlueprintExecutorStore.MAX_LOG_ENTRIES);
        }
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Runtime license check for long-running executions.
     * Called periodically during loops to detect license revocation.
     * Throws error if license is no longer valid.
     */
    private async checkLicenseRuntime(): Promise<void> {
        if (isDevMode()) return; // Skip in dev mode

        const state = await getLicenseState();
        if (!state.isActivated) {
            throw new Error(`License ${state.status}: Execution halted. Please re-activate your license.`);
        }
    }

    private async checkPause(): Promise<void> {
        if (this._paused) {
            return new Promise<void>(resolve => {
                this._pauseResolve = resolve;
            });
        }
    }

    private countBlocks(blocks: Block[]): number {
        let count = 0;
        for (const block of blocks) {
            count++;
            if (block.children) count += this.countBlocks(block.children);
            if ((block as any).elseChildren) count += this.countBlocks((block as any).elseChildren);
        }
        return count;
    }

    private resetState() {
        this.status = 'idle';
        this.currentBlock = null;
        this.progress = { current: 0, total: 0 };
        this.logs = [];
        this.extractedData = [];
        this.extractedColumns = [];
        this.startTime = null;
        this.endTime = null;
        this.error = null;
        this._paused = false;
        this._pauseResolve = null;
        this._targetTabId = null;
        this.currentExecutionId = null;
        this.canResume = false;
        this.lastCheckpoint = null;
        this.runningBlueprintId = null;
        this.runningBlueprintName = null;
        this._loopState = {};
        this._autoIncrementCounters = {};
        this._deduplicationHashes = new Set();
        this._progressCounted = new Set();
        this._returnUrl = null;
        this._variables.clear();
    }

    private downloadBlob(content: string, filename: string, mimeType: string) {
        // Add UTF-8 BOM for CSV files to ensure proper encoding
        const bom = mimeType.includes('csv') ? '\uFEFF' : '';
        const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Singleton
const blueprintExecutorStore = new BlueprintExecutorStore();

export const useBlueprintExecutorStore = () => {
    return blueprintExecutorStore;
};
