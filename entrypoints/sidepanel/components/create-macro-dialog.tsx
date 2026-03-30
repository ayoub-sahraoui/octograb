import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { macroRegistryStore } from '@/entrypoints/stores/macro-registry-store';
import {
    buildMacroDefinitionFromBlock,
    buildMacroSourceSummary,
    MacroParameterRowInput,
} from '@/entrypoints/models/macro-creation';

function createEmptyParameterRow(): MacroParameterRowInput {
    return {
        name: '',
        description: '',
        defaultValue: '',
        required: false,
    };
}

export const CreateMacroDialog = observer(() => {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const sourceBlock = blueprintBuilderStore.macroSourceBlock;
    const summary = sourceBlock ? buildMacroSourceSummary(sourceBlock) : null;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parameterRows, setParameterRows] = useState<MacroParameterRowInput[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!sourceBlock) {
            setName('');
            setDescription('');
            setParameterRows([]);
            setIsSaving(false);
            return;
        }

        setName(sourceBlock.label || 'New Macro');
        setDescription(sourceBlock.description || '');
        setParameterRows([]);
        setIsSaving(false);
    }, [sourceBlock]);

    const closeDialog = () => {
        blueprintBuilderStore.setMacroSourceBlock(null);
    };

    const addParameterRow = () => {
        setParameterRows((rows) => [...rows, createEmptyParameterRow()]);
    };

    const updateParameterRow = (index: number, patch: Partial<MacroParameterRowInput>) => {
        setParameterRows((rows) => rows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, ...patch } : row
        )));
    };

    const removeParameterRow = (index: number) => {
        setParameterRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
    };

    const handleSave = async () => {
        if (!sourceBlock || !name.trim()) {
            return;
        }

        try {
            setIsSaving(true);
            const macro = buildMacroDefinitionFromBlock(sourceBlock, {
                name,
                description,
                parameterRows,
            });

            await macroRegistryStore.registerMacro(macro);
            toast.success(`Saved macro "${macro.name}"`);
            closeDialog();
        } catch (error) {
            console.error('[OctoGrab] Failed to save macro:', error);
            toast.error('Failed to save macro');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={!!sourceBlock} onOpenChange={(open) => {
            if (!open) {
                closeDialog();
            }
        }}>
            <DialogContent className="flex max-h-[85vh] w-[min(640px,calc(100vw-1rem))] flex-col overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-4">
                    <DialogTitle>Create Macro</DialogTitle>
                    <DialogDescription>Save this block and its nested children as a reusable workflow.</DialogDescription>
                </DialogHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
                    {summary && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <CardTitle className="text-base">{summary.rootLabel}</CardTitle>
                                    <Badge variant="secondary">{summary.rootType}</Badge>
                                </div>
                                <CardDescription>
                                    This macro will save {summary.blockCount} {summary.blockCount === 1 ? 'block' : 'blocks'} from the selected subtree.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="macro-create-name">Name</Label>
                            <Input
                                id="macro-create-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Reusable product flow"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="macro-create-description">Description</Label>
                            <Textarea
                                id="macro-create-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this macro handles"
                                className="min-h-[96px]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Parameters</h3>
                                <p className="text-xs text-muted-foreground">Declare placeholders the macro caller can fill later.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={addParameterRow}>
                                Add Parameter
                            </Button>
                        </div>

                        {parameterRows.length === 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">No parameters yet</CardTitle>
                                    <CardDescription>Add parameters only when this macro needs dynamic values from the calling blueprint.</CardDescription>
                                </CardHeader>
                            </Card>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {parameterRows.map((row, index) => (
                                    <Card key={`macro-param-row-${index}`}>
                                        <CardContent className="grid gap-4 pt-6">
                                            <div className="grid gap-2">
                                                <Label htmlFor={`macro-param-name-${index}`}>Parameter Name</Label>
                                                <Input
                                                    id={`macro-param-name-${index}`}
                                                    value={row.name}
                                                    onChange={(e) => updateParameterRow(index, { name: e.target.value })}
                                                    placeholder="cardSelector"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor={`macro-param-description-${index}`}>Description</Label>
                                                <Input
                                                    id={`macro-param-description-${index}`}
                                                    value={row.description || ''}
                                                    onChange={(e) => updateParameterRow(index, { description: e.target.value })}
                                                    placeholder="What this value controls"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor={`macro-param-default-${index}`}>Default Value</Label>
                                                <Input
                                                    id={`macro-param-default-${index}`}
                                                    value={row.defaultValue || ''}
                                                    onChange={(e) => updateParameterRow(index, { defaultValue: e.target.value })}
                                                    placeholder="Optional default"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id={`macro-param-required-${index}`}
                                                        checked={Boolean(row.required)}
                                                        onCheckedChange={(checked) => updateParameterRow(index, { required: checked === true })}
                                                    />
                                                    <Label htmlFor={`macro-param-required-${index}`}>Required</Label>
                                                </div>
                                                <Button type="button" variant="ghost" onClick={() => removeParameterRow(index)}>
                                                    Remove
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t px-6 py-4">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={!name.trim() || isSaving}>
                        {isSaving ? 'Saving...' : 'Save Macro'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

