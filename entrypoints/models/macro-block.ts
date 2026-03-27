import { makeObservable, observable, action, toJS } from "mobx";
import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";

/** Parameter definition for a macro */
export interface MacroParameter {
    /** Parameter name (used for substitution) */
    name: string;
    /** Human-readable description */
    description?: string;
    /** Default value if not provided */
    defaultValue?: string;
    /** Whether this parameter is required */
    required?: boolean;
}

/** A macro definition containing reusable blocks */
export interface MacroDefinition {
    /** Unique macro identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what this macro does */
    description?: string;
    /** Parameters the macro accepts */
    parameters?: MacroParameter[];
    /** The blocks that make up this macro (serialized) */
    blocks: any[];
    /** When this macro was created */
    createdAt?: string;
    /** When this macro was last modified */
    updatedAt?: string;
}

export interface MacroBlockConfig {
    /** Reference to the macro definition ID */
    macroId: string;
    /** Parameter values keyed by parameter name */
    parameters?: Record<string, string>;
}

export class MacroBlock extends BlockBase {
    id: string;
    type: string = 'macro';
    config: MacroBlockConfig;

    constructor(name: string, config: MacroBlockConfig) {
        super();
        makeObservable(this, {
            id: observable,
            type: observable,
            config: observable,
            label: observable,
            enabled: observable,
            description: observable,
            onError: observable,
            maxRetries: observable,
            retryDelay: observable,
            parent: observable,
            children: observable,
            index: observable,
            setLabel: action,
            setEnabled: action,
            toggleEnabled: action,
            setDescription: action,
            setOnError: action,
            setMaxRetries: action,
            setRetryDelay: action,
            setMaxExecutionTime: action,
            setConfig: action,
            updateConfig: action,
            setConfigValue: action,
            setParent: action,
            addChild: action,
            removeChild: action,
            moveChild: action,
            clearChildren: action,
            setIndex: action,
        });
        this.id = crypto.randomUUID();
        this.label = name;
        this.enabled = true;
        this.description = '';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 0;
        this.retryDelay = 0;
        this.config = config;
    }

    // ─── Config-specific actions ───────────────────────────────────────────

    setMacroId(macroId: string) {
        this.config.macroId = macroId;
    }

    setParameter(name: string, value: string) {
        if (!this.config.parameters) {
            this.config.parameters = {};
        }
        this.config.parameters[name] = value;
    }

    removeParameter(name: string) {
        if (this.config.parameters) {
            delete this.config.parameters[name];
        }
    }

    setParameters(parameters: Record<string, string>) {
        this.config.parameters = parameters;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): MacroBlock {
        const block = new MacroBlock(json.label || 'Macro', json.config || { macroId: '' });
        if (json.id) block.id = json.id;
        if (json.enabled !== undefined) block.setEnabled(json.enabled);
        if (json.description !== undefined) block.setDescription(json.description);
        if (json.onError !== undefined) block.setOnError(json.onError);
        if (json.maxRetries !== undefined) block.setMaxRetries(json.maxRetries);
        if (json.retryDelay !== undefined) block.setRetryDelay(json.retryDelay);
        if (json.maxExecutionTime !== undefined) block.setMaxExecutionTime(json.maxExecutionTime);
        if (json.index !== undefined) block.setIndex(json.index);
        return block;
    }
}
