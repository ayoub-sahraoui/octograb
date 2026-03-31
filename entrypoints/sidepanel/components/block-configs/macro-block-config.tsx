import { observer } from 'mobx-react-lite';
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Braces, Info, LibraryBig, Puzzle } from 'lucide-react';
import { macroRegistryStore } from '@/entrypoints/stores/macro-registry-store';
import { buildMacroConfigDisplay } from './macro-config-display';
import { CenteredState } from '../centered-state';

interface MacroBlockConfigProps {
    block: MacroBlock;
}

export const MacroBlockConfig = observer(({ block }: MacroBlockConfigProps) => {
    const display = buildMacroConfigDisplay(
        macroRegistryStore.getAllMacros(),
        block.config.macroId,
        block.config.parameters || {},
    );

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <Label htmlFor="macroId">Macro ID</Label>
                <Select
                    value={block.config.macroId || undefined}
                    onValueChange={(value) => {
                        block.setMacroId(value);
                        const nextMacro = macroRegistryStore.getMacro(value);
                        const seededParameters = Object.fromEntries(
                            (nextMacro?.parameters || []).map((parameter) => [
                                parameter.name,
                                block.config.parameters?.[parameter.name] ?? parameter.defaultValue ?? '',
                            ]),
                        );
                        block.setParameters(seededParameters);
                    }}
                >
                    <SelectTrigger id="macroId">
                        <SelectValue placeholder="Choose a saved macro" />
                    </SelectTrigger>
                    <SelectContent>
                        {display.macros.map((macro) => (
                            <SelectItem key={macro.id} value={macro.id}>
                                {macro.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Pick a saved reusable workflow to run at this point in the blueprint.
                </p>
            </div>

            {display.macros.length === 0 && (
                <CenteredState
                    icon={<LibraryBig className="h-6 w-6" />}
                    title="No saved macros yet"
                    description="Create one from any block card using Save as Macro, then come back here to reuse it."
                    compact
                    className="rounded-lg border bg-white"
                />
            )}

            {display.missingMacroId && (
                <CenteredState
                    icon={<AlertCircle className="h-6 w-6" />}
                    title="Saved macro not found"
                    description={`This block still points to ${display.missingMacroId}, but that macro is no longer in your saved library.`}
                    tone="error"
                    compact
                    className="rounded-lg border bg-white"
                />
            )}

            {display.selectedMacro && (
                <Card className="shadow-none">
                    <CardHeader className="flex-row items-start gap-3 space-y-0">
                        <div className="rounded-md border bg-muted/40 p-2">
                            <Puzzle className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-base">{display.selectedMacro.name}</CardTitle>
                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                    {display.parameterRows.length} params
                                </Badge>
                            </div>
                            {display.selectedMacro.description && (
                                <CardDescription>{display.selectedMacro.description}</CardDescription>
                            )}
                        </div>
                    </CardHeader>
                </Card>
            )}

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <Label>Parameters</Label>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Braces className="h-3.5 w-3.5" />
                        Passed into the macro at runtime
                    </div>
                </div>
                <Separator />

                {!display.selectedMacro && !display.missingMacroId && display.macros.length > 0 && (
                    <CenteredState
                        icon={<Info className="h-6 w-6" />}
                        title="Select a macro to continue"
                        description="Once you choose a macro, its expected parameters will appear here."
                        compact
                        className="rounded-lg border bg-white"
                    />
                )}

                {display.selectedMacro && (
                    <div className="flex flex-col gap-3">
                        {display.parameterRows.length > 0 ? (
                            display.parameterRows.map((parameter) => (
                                <Card key={parameter.name} className="shadow-none">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-sm">{parameter.name}</CardTitle>
                                            {parameter.required && (
                                                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                                                    Required
                                                </Badge>
                                            )}
                                        </div>
                                        {parameter.description && (
                                            <CardDescription>{parameter.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <Input
                                            id={`macro-param-${parameter.name}`}
                                            placeholder={parameter.required ? 'Enter a value' : 'Optional value'}
                                            value={parameter.value}
                                            onChange={(e) => block.setParameter(parameter.name, e.target.value)}
                                        />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <CenteredState
                                icon={<Braces className="h-6 w-6" />}
                                title="No parameters"
                                description="This macro does not declare any parameters."
                                compact
                                className="rounded-lg border bg-white"
                            />
                        )}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Use normal text or {'{{variableName}}'} values when the macro expects dynamic input.
                </p>
            </div>
        </div>
    );
});
