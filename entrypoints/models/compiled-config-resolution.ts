import { ExecutionVariableScopes } from './execution-variable-scopes';

const TEMPLATE_SKIP_KEYS = new Set([
    'formula',
]);

export function resolveCompiledConfigTemplates<T>(config: T, variables: ExecutionVariableScopes): T {
    return resolveValue(config, variables, undefined) as T;
}

function resolveValue(
    value: unknown,
    variables: ExecutionVariableScopes,
    parentKey: string | undefined,
): unknown {
    if (typeof value === 'string') {
        if (parentKey && TEMPLATE_SKIP_KEYS.has(parentKey)) {
            return value;
        }
        return variables.resolveTemplate(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => resolveValue(item, variables, parentKey));
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
            key,
            resolveValue(nestedValue, variables, key),
        ]);
        return Object.fromEntries(entries);
    }

    return value;
}
