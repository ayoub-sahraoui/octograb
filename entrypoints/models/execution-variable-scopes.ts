export type VariableScopeType = 'local' | 'global' | 'blueprint';

export interface ExecutionVariableSnapshot {
    localScopes: Array<Record<string, string>>;
    localResolved: Record<string, string>;
    global: Record<string, string>;
    blueprint: Record<string, string>;
    resolved: Record<string, string>;
}

export class ExecutionVariableScopes {
    private localScopes: Array<Map<string, string>> = [new Map()];
    private globalVariables = new Map<string, string>();
    private blueprintVariables = new Map<string, string>();

    pushLocalScope() {
        this.localScopes.push(new Map());
    }

    popLocalScope() {
        if (this.localScopes.length > 1) {
            this.localScopes.pop();
        }
    }

    clear() {
        this.localScopes = [new Map()];
        this.globalVariables.clear();
        this.blueprintVariables.clear();
    }

    set(name: string, value: string, scope: VariableScopeType = 'local') {
        if (scope === 'global') {
            this.globalVariables.set(name, value);
            return;
        }

        if (scope === 'blueprint') {
            this.blueprintVariables.set(name, value);
            return;
        }

        this.localScopes[this.localScopes.length - 1].set(name, value);
    }

    get(name: string, scope: VariableScopeType = 'local'): string | undefined {
        if (scope === 'global') {
            return this.globalVariables.get(name);
        }

        if (scope === 'blueprint') {
            return this.blueprintVariables.get(name);
        }

        return this.getLocal(name);
    }

    resolveReference(name: string): string | undefined {
        return this.getLocal(name)
            ?? this.globalVariables.get(name)
            ?? this.blueprintVariables.get(name);
    }

    resolveTemplate(value: string): string {
        return value.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => {
            return this.resolveReference(name.trim()) ?? '';
        });
    }

    getBlueprintValues(): Record<string, string> {
        return Object.fromEntries(this.blueprintVariables.entries());
    }

    setBlueprintValues(values: Record<string, string>) {
        this.blueprintVariables = new Map(Object.entries(values));
    }

    getSnapshot(): ExecutionVariableSnapshot {
        const localScopes = this.localScopes.map((scope) => Object.fromEntries(scope.entries()));
        const localResolved: Record<string, string> = {};
        for (const scope of localScopes) {
            Object.assign(localResolved, scope);
        }

        const global = Object.fromEntries(this.globalVariables.entries());
        const blueprint = Object.fromEntries(this.blueprintVariables.entries());

        return {
            localScopes,
            localResolved,
            global,
            blueprint,
            resolved: {
                ...blueprint,
                ...global,
                ...localResolved,
            },
        };
    }

    private getLocal(name: string): string | undefined {
        for (let index = this.localScopes.length - 1; index >= 0; index--) {
            const value = this.localScopes[index].get(name);
            if (value !== undefined) {
                return value;
            }
        }
        return undefined;
    }
}
