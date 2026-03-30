import { MacroDefinition } from '@/entrypoints/models/macro-block';

export interface MacroParameterRow {
    name: string;
    description?: string;
    required: boolean;
    value: string;
}

export interface MacroConfigDisplay {
    macros: MacroDefinition[];
    selectedMacro?: MacroDefinition;
    missingMacroId?: string;
    parameterRows: MacroParameterRow[];
}

export function buildMacroConfigDisplay(
    macros: MacroDefinition[],
    selectedMacroId: string,
    currentParameters: Record<string, string> = {},
): MacroConfigDisplay {
    const sortedMacros = [...macros].sort((a, b) => a.name.localeCompare(b.name));
    const selectedMacro = sortedMacros.find((macro) => macro.id === selectedMacroId);

    return {
        macros: sortedMacros,
        selectedMacro,
        missingMacroId: selectedMacroId && !selectedMacro ? selectedMacroId : undefined,
        parameterRows: selectedMacro
            ? (selectedMacro.parameters || []).map((parameter) => ({
                name: parameter.name,
                description: parameter.description,
                required: parameter.required === true,
                value: currentParameters[parameter.name] ?? parameter.defaultValue ?? '',
            }))
            : [],
    };
}
