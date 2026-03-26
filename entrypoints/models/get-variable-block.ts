import { toJS } from "mobx";
import { BlockBase } from "./block-base";
import { OnErrorStrategy } from "./enums";

export interface GetVariableBlockConfig {
    /** Variable name to retrieve */
    name: string;
    /** Default value if variable doesn't exist */
    defaultValue?: string;
    /** Variable scope: 'local' (default), 'global', or 'blueprint' */
    scope?: 'local' | 'global' | 'blueprint';
}

export class GetVariableBlock extends BlockBase {
    id: string;
    type: string = 'get_variable';
    config: GetVariableBlockConfig;

    constructor(name: string, config: GetVariableBlockConfig) {
        super();
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

    setVariableName(name: string) {
        this.config.name = name;
    }

    setDefaultValue(value: string) {
        this.config.defaultValue = value;
    }

    setVariableScope(scope: 'local' | 'global' | 'blueprint') {
        this.config.scope = scope;
    }

    toJSON() {
        return toJS(this);
    }

    static fromJson(json: any): GetVariableBlock {
        const block = new GetVariableBlock(json.label || 'Get Variable', json.config || { name: '' });
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
