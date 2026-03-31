import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LibraryBig, Pencil, Puzzle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { macroRegistryStore } from '@/entrypoints/stores/macro-registry-store';
import { MacroDefinition } from '@/entrypoints/models/macro-block';
import { MacroParameterRowInput } from '@/entrypoints/models/macro-creation';
import { buildMacroLibraryDisplay, buildUpdatedMacroDefinition } from './macro-library-display';
import { useConfirm } from '../components/confirm-dialog';
import { CenteredState } from '../components/centered-state';

function formatMacroDate(value?: string): string | null {
    if (!value) return null;
    return new Date(value).toLocaleDateString();
}

export default observer(function MacroLibrary() {
    const navigate = useNavigate();
    const { confirm: showConfirm, alert: showAlert } = useConfirm();
    const display = useMemo(
        () => buildMacroLibraryDisplay(macroRegistryStore.getAllMacros()),
        [macroRegistryStore.macros.size, macroRegistryStore.isLoaded],
    );
    const [editingMacro, setEditingMacro] = useState<MacroDefinition | null>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editParameters, setEditParameters] = useState<MacroParameterRowInput[]>([]);

    const startEdit = (macro: MacroDefinition) => {
        setEditingMacro(macro);
        setEditName(macro.name);
        setEditDescription(macro.description || '');
        setEditParameters(
            (macro.parameters || []).map((parameter) => ({
                name: parameter.name,
                description: parameter.description || '',
                defaultValue: parameter.defaultValue || '',
                required: Boolean(parameter.required),
            })),
        );
    };

    const closeEdit = () => {
        setEditingMacro(null);
        setEditName('');
        setEditDescription('');
        setEditParameters([]);
    };

    const updateParameter = (index: number, patch: Partial<MacroParameterRowInput>) => {
        setEditParameters((rows) => rows.map((row, rowIndex) => (
            rowIndex === index ? { ...row, ...patch } : row
        )));
    };

    const removeParameter = (index: number) => {
        setEditParameters((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
    };

    const addParameter = () => {
        setEditParameters((rows) => [
            ...rows,
            { name: '', description: '', defaultValue: '', required: false },
        ]);
    };

    const handleSaveEdit = async () => {
        if (!editingMacro || !editName.trim()) {
            await showAlert('Missing Name', 'Please enter a macro name.');
            return;
        }

        const updated = buildUpdatedMacroDefinition(editingMacro, {
            name: editName,
            description: editDescription,
            parameters: editParameters,
        });

        await macroRegistryStore.registerMacro(updated);
        toast.success(`Updated macro "${updated.name}"`);
        closeEdit();
    };

    const handleDelete = async (macro: MacroDefinition) => {
        const ok = await showConfirm({
            title: 'Delete Macro',
            description: `Delete "${macro.name}" from your macro library?`,
            variant: 'destructive',
            confirmLabel: 'Delete',
        });
        if (!ok) return;

        const removed = await macroRegistryStore.removeMacro(macro.id);
        if (removed) {
            toast.success(`Deleted macro "${macro.name}"`);
            if (editingMacro?.id === macro.id) {
                closeEdit();
            }
            return;
        }

        toast.error('Failed to delete macro');
    };

    return (
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => navigate('/')} title="Back to Home" className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-xl font-semibold">Macro Library</h1>
                    <p className="text-xs text-muted-foreground">Manage your reusable automation sub-workflows.</p>
                </div>
            </div>

            <div className="flex-1 bg-gray-100 p-4 border border-gray-300 rounded-lg flex flex-col gap-3 overflow-y-auto">
                {display.cards.length === 0 ? (
                    <CenteredState
                        icon={<LibraryBig className="h-8 w-8" />}
                        title="No macros saved yet"
                        description="Create one from any block card using Save as Macro."
                        className="h-full"
                    />
                ) : (
                    display.cards.map((card) => (
                        <Card key={card.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-gray-200 p-2 shrink-0">
                                                <Puzzle className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <CardTitle className="truncate text-base">{card.name}</CardTitle>
                                                {card.description && (
                                                    <CardDescription className="line-clamp-2">{card.description}</CardDescription>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button size="icon" variant="outline" onClick={() => startEdit(macroRegistryStore.getMacro(card.id)!)} title="Edit Macro">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="outline" onClick={() => handleDelete(macroRegistryStore.getMacro(card.id)!)} title="Delete Macro">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{card.blockCount} {card.blockCount === 1 ? 'block' : 'blocks'}</Badge>
                                    <Badge variant="secondary">{card.parameterCount} {card.parameterCount === 1 ? 'param' : 'params'}</Badge>
                                    {card.updatedAt && <Badge variant="outline">Updated {formatMacroDate(card.updatedAt)}</Badge>}
                                </div>
                                {card.parameters.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs font-medium text-muted-foreground">Parameters</p>
                                        <div className="flex flex-wrap gap-2">
                                            {card.parameters.map((parameter) => (
                                                <Badge key={`${card.id}-${parameter.name}`} variant="outline">
                                                    {parameter.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={!!editingMacro} onOpenChange={(open) => { if (!open) closeEdit(); }}>
                <DialogContent className="flex max-h-[85vh] w-[min(640px,calc(100vw-1rem))] flex-col overflow-hidden p-0">
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle>Edit Macro</DialogTitle>
                        <DialogDescription>Update the macro metadata and parameter list.</DialogDescription>
                    </DialogHeader>

                    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="macro-library-name">Name</Label>
                                <Input
                                    id="macro-library-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Reusable product flow"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="macro-library-description">Description</Label>
                                <Textarea
                                    id="macro-library-description"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="min-h-[96px]"
                                    placeholder="Describe what this macro handles"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">Parameters</h3>
                                    <p className="text-xs text-muted-foreground">Adjust the values callers can pass into this macro.</p>
                                </div>
                                <Button type="button" variant="outline" onClick={addParameter}>
                                    Add Parameter
                                </Button>
                            </div>

                            {editParameters.length === 0 ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">No parameters</CardTitle>
                                        <CardDescription>This macro currently accepts no parameters.</CardDescription>
                                    </CardHeader>
                                </Card>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {editParameters.map((row, index) => (
                                        <Card key={`macro-library-param-${index}`}>
                                            <CardContent className="grid gap-4 pt-6">
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`macro-library-param-name-${index}`}>Parameter Name</Label>
                                                    <Input
                                                        id={`macro-library-param-name-${index}`}
                                                        value={row.name}
                                                        onChange={(e) => updateParameter(index, { name: e.target.value })}
                                                        placeholder="cardSelector"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`macro-library-param-description-${index}`}>Description</Label>
                                                    <Input
                                                        id={`macro-library-param-description-${index}`}
                                                        value={row.description || ''}
                                                        onChange={(e) => updateParameter(index, { description: e.target.value })}
                                                        placeholder="What this value controls"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor={`macro-library-param-default-${index}`}>Default Value</Label>
                                                    <Input
                                                        id={`macro-library-param-default-${index}`}
                                                        value={row.defaultValue || ''}
                                                        onChange={(e) => updateParameter(index, { defaultValue: e.target.value })}
                                                        placeholder="Optional default"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <Checkbox
                                                            id={`macro-library-param-required-${index}`}
                                                            checked={Boolean(row.required)}
                                                            onCheckedChange={(checked) => updateParameter(index, { required: checked === true })}
                                                        />
                                                        <Label htmlFor={`macro-library-param-required-${index}`}>Required</Label>
                                                    </div>
                                                    <Button type="button" variant="ghost" onClick={() => removeParameter(index)}>
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
                        <Button variant="outline" onClick={closeEdit}>Cancel</Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
});
