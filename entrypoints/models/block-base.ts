import { makeAutoObservable, toJS } from "mobx";
import { OnErrorStrategy } from "./enums";
import { Block } from "./types";

/**
 * Abstract base class for all block types with common MobX action methods.
 * Provides standardized setters and utility methods for block manipulation.
 */
export abstract class BlockBase {
    abstract id: string;
    abstract type: string;
    label?: string;
    enabled?: boolean;
    description?: string;
    onError?: OnErrorStrategy;
    maxRetries?: number;
    retryDelay?: number;
    maxExecutionTime?: number;
    abstract config: any;
    parent?: Block | null;
    parentBranch?: 'children' | 'elseChildren';
    children?: Block[];
    index?: number;

    constructor() {
        // Note: makeAutoObservable must be called in subclass constructors
        // because MobX doesn't allow makeAutoObservable on classes with superclasses
    }

    // ─── Label ───────────────────────────────────────────────────────────

    setLabel(label: string) {
        this.label = label;
    }

    // ─── Enabled State ───────────────────────────────────────────────────

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    toggleEnabled() {
        this.enabled = !this.enabled;
    }

    // ─── Description ─────────────────────────────────────────────────────

    setDescription(description: string) {
        this.description = description;
    }

    // ─── Error Handling ──────────────────────────────────────────────────

    setOnError(strategy: OnErrorStrategy) {
        this.onError = strategy;
    }

    setMaxRetries(retries: number) {
        this.maxRetries = retries;
    }

    setRetryDelay(delay: number) {
        this.retryDelay = delay;
    }

    // ─── Execution Time ──────────────────────────────────────────────────

    setMaxExecutionTime(time: number) {
        this.maxExecutionTime = time;
    }

    // ─── Config ────────────────────────────────────────────────────────────

    setConfig(config: any) {
        this.config = config;
    }

    updateConfig(updates: Partial<any>) {
        this.config = { ...this.config, ...updates };
    }

    setConfigValue(key: string, value: any) {
        this.config = { ...this.config, [key]: value };
    }

    // ─── Parent/Child Hierarchy ───────────────────────────────────────────

    setParent(parent: Block | null) {
        this.parent = parent;
    }

    addChild(child: Block) {
        if (!this.children) {
            this.children = [];
        }
        child.parent = this as unknown as Block;
        child.parentBranch = 'children';
        child.index = this.children.length;
        this.children.push(child);
    }

    removeChild(child: Block) {
        if (!this.children) return;
        this.children = this.children.filter(c => c.id !== child.id);
        // Update indices
        this.children.forEach((c, i) => c.index = i);
    }

    moveChild(oldIndex: number, newIndex: number) {
        if (!this.children || oldIndex < 0 || oldIndex >= this.children.length || newIndex < 0 || newIndex >= this.children.length) return;
        const [item] = this.children.splice(oldIndex, 1);
        this.children.splice(newIndex, 0, item);
        // Update indices
        this.children.forEach((c, i) => c.index = i);
    }

    clearChildren() {
        this.children = [];
    }

    // ─── Index ─────────────────────────────────────────────────────────────

    setIndex(index: number) {
        this.index = index;
    }

    // ─── Serialization ─────────────────────────────────────────────────────

    abstract toJSON(): any;

    /**
     * Common serialization helper - use in subclasses
     */
    protected baseToJSON(): any {
        return toJS({
            id: this.id,
            type: this.type,
            label: this.label,
            enabled: this.enabled,
            description: this.description,
            onError: this.onError,
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay,
            maxExecutionTime: this.maxExecutionTime,
            config: this.config,
            index: this.index,
        });
    }
}
