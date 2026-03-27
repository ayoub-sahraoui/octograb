import { makeObservable, observable, action, toJS } from "mobx";
import { v4 as uuidv4 } from 'uuid';
import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";

export interface SetVariableBlockConfig {
    /** Variable name */
    name: string;
    /** Variable value (can reference other variables with {{varName}}) */
    value: string;
    /** Variable scope: 'local' (default), 'global', or 'blueprint' */
    scope?: 'local' | 'global' | 'blueprint';
}

export class SetVariableBlock extends BlockBase {
    id: string = '';
    type: string = 'set_variable';
    config: SetVariableBlockConfig;

    constructor(name: string, config: SetVariableBlockConfig) {
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
            setVariableName: action,
            setVariableValue: action,
            setVariableScope: action,
        });
        this.id = uuidv4();
        this.label = name;
        this.enabled = true;
        this.description = '';
        this.onError = OnErrorStrategy.STOP;
        this.maxRetries = 0;
        this.retryDelay = 0;
        this.config = config;
    }

    // ─── Config-specific actions ───────────────────────────────────────────

    setVariableName(name: string) {
        this.config.name = name;
    }

    setVariableValue(value: string) {
        this.config.value = value;
    }

    setVariableScope(scope: 'local' | 'global' | 'blueprint') {
        this.config.scope = scope;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): SetVariableBlock {
        const block = new SetVariableBlock(json.label || 'Set Variable', json.config || { name: '', value: '' });
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
