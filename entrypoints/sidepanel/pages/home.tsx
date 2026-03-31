import { Button } from "@/components/ui/button";
import { Play, Pause, Square, Plus, Trash2, Upload, Database, RotateCcw, Copy, Lock, MoreVertical, SquarePen } from "lucide-react";
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { useLicenseStore, FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from '../components/confirm-dialog';
import { CenteredState } from '../components/centered-state';

export default observer(function Home() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const licenseStore = useLicenseStore();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { confirm: showConfirm, alert: showAlert } = useConfirm();

    useEffect(() => {
        blueprintBuilderStore.loadBlueprints();
    }, []);

    const handleEdit = (blueprintId: string) => {
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
            blueprintBuilderStore.selectBlueprint(blueprint);
            navigate('/blueprint-builder');
        }
    };

    const handleRun = async (blueprintId: string) => {
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (!blueprint) return;

        const isThisRunning = executorStore.runningBlueprintId === blueprintId;

        if (isThisRunning && executorStore.isRunning) {
            executorStore.pause();
        } else if (isThisRunning && executorStore.isPaused) {
            executorStore.resume();
        } else if (!executorStore.isRunning && !executorStore.isPaused) {
            await executorStore.execute(blueprint);
        }
    };

    const handleStop = async (blueprintId: string) => {
        if (executorStore.runningBlueprintId === blueprintId) {
            await executorStore.stop();
        }
    };

    const handleResume = async (blueprintId: string) => {
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (!blueprint) return;
        await executorStore.resumeBlueprint(blueprint);
    };

    const handleViewExecution = (blueprintId: string) => {
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
            blueprintBuilderStore.selectBlueprint(blueprint);
            navigate('/blueprint-builder');
        }
    };

    const handleDelete = async (blueprintId: string) => {
        const ok = await showConfirm({ title: 'Delete Blueprint', description: 'Are you sure you want to delete this blueprint?', variant: 'destructive', confirmLabel: 'Delete' });
        if (!ok) return;
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
            await blueprintBuilderStore.deleteBlueprint(blueprint);
        }
    };

    const handleDuplicate = async (blueprintId: string) => {
        const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
        if (blueprint) {
            const duplicated = await blueprintBuilderStore.duplicateBlueprint(blueprint);
            if (!duplicated) {
                toast.error('Free plan limit reached', {
                    description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to duplicate.`,
                });
            }
        }
    };

    const handleCreateNew = () => {
        if (!blueprintBuilderStore.canCreateBlueprint) {
            toast.error('Free plan limit reached', {
                description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to create more.`,
            });
            return;
        }
        setNewBlueprintName('');
        setNewBlueprintDescription('');
        setIsCreateDialogOpen(true);
    };

    const handleCreateBlueprint = async () => {
        if (!newBlueprintName.trim()) {
            await showAlert('Missing Name', 'Please enter a blueprint name');
            return;
        }
        const created = blueprintBuilderStore.createBlueprint(newBlueprintName.trim(), newBlueprintDescription.trim());
        if (!created) {
            toast.error('Free plan limit reached', {
                description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to create more.`,
            });
            return;
        }
        setIsCreateDialogOpen(false);
        navigate('/blueprint-builder');
    };

    const handleImportClick = () => {
        if (!blueprintBuilderStore.canCreateBlueprint) {
            toast.error('Free plan limit reached', {
                description: `Free plan allows ${FREE_TIER_LIMITS.maxBlueprints} blueprint. Upgrade to import more.`,
            });
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();

            // Validate JSON can be parsed
            const blueprint = JSON.parse(text);
            if (!blueprint.name || !Array.isArray(blueprint.blocks)) {
                await showAlert('Invalid Format', 'Invalid blueprint file format');
                return;
            }

            const result = await blueprintBuilderStore.importBlueprint(text);
            if (result.success) {
                const msg = result.warnings?.length
                    ? `Blueprint "${blueprint.name}" imported with ${result.warnings.length} warning(s).`
                    : `Blueprint "${blueprint.name}" imported successfully!`;
                await showAlert('Import Complete', msg);
            } else {
                await showAlert('Import Failed', result.errors?.join('\n') || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to import blueprint:', error);
            await showAlert('Import Failed', 'Failed to import blueprint. Please check the file format.');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getBlueprintStatus = (blueprintId: string) => {
        if (executorStore.runningBlueprintId !== blueprintId) return 'idle';
        return executorStore.status;
    };

    return (
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {blueprintBuilderStore.isFreeTier && (
                <div className="mx-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 shrink-0">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">
                        <span className="font-medium">Free Plan:</span> {FREE_TIER_LIMITS.maxBlueprints} blueprint, {FREE_TIER_LIMITS.maxBlocksPerBlueprint} blocks max.
                        <a href="https://octograb.online/pricing.html" target="_blank" rel="noopener noreferrer" className="ml-1 text-emerald-600 hover:underline font-medium">Upgrade</a>
                    </p>
                </div>
            )}
            <div className="flex justify-between items-center shrink-0">
                <h1 className="text-lg font-semibold ml-1">Blueprints</h1>
                <div className="flex gap-1">
                    <Button size="sm" onClick={handleImportClick} variant="outline" className="flex items-center gap-1 h-8 px-2 text-xs">
                        <Upload className="w-3.5 h-3.5" />
                        Import
                    </Button>
                    <Button size="sm" onClick={handleCreateNew} className="flex items-center gap-1 h-8 px-2 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        New
                    </Button>
                </div>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
            />
            <div className="flex flex-col gap-2 overflow-auto flex-1 min-h-0 p-2">
                {blueprintBuilderStore.blueprints.length === 0 ? (
                    <CenteredState
                        icon={<Database className="h-8 w-8" />}
                        title="No blueprints yet"
                        description="Create your first blueprint to start building automations."
                        className="h-full"
                        action={(
                            <Button onClick={handleCreateNew} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Create Blueprint
                            </Button>
                        )}
                    />
                ) : (
                    blueprintBuilderStore.blueprints.map((blueprint) => {
                        const status = getBlueprintStatus(blueprint.id);
                        const isThisRunning = status === 'running';
                        const isThisPaused = status === 'paused';
                        const isThisActive = isThisRunning || isThisPaused;
                        const isOtherRunning = (executorStore.isRunning || executorStore.isPaused) && !isThisActive;

                        return (
                            <div
                                key={blueprint.id}
                                className={`bg-white p-4 border rounded-lg flex flex-col gap-2 transition-all cursor-pointer ${isThisRunning ? 'border-emerald-400 ring-2 ring-emerald-200' :
                                    isThisPaused ? 'border-amber-400 ring-2 ring-amber-200' :
                                        'border-gray-300 hover:ring-2 hover:ring-emerald-200'
                                    }`}
                                onClick={() => handleEdit(blueprint.id)}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-base font-semibold truncate">{blueprint.name}</h1>
                                            {isThisRunning && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Running
                                                </span>
                                            )}
                                            {isThisPaused && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                        {blueprint.description && (
                                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{blueprint.description}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">{blueprint.blocks.length} block{blueprint.blocks.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex gap-1 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {/* Play / Pause / Resume */}
                                        <Button
                                            size="icon"
                                            variant={isThisActive ? 'default' : 'outline'}
                                            onClick={() => handleRun(blueprint.id)}
                                            title={isThisRunning ? 'Pause' : isThisPaused ? 'Resume' : 'Run'}
                                            disabled={isOtherRunning}
                                            className={`h-8 w-8 ${isThisRunning ? 'animate-pulse' : ''}`}
                                        >
                                            {isThisRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </Button>
                                        {/* Stop button - only when active */}
                                        {isThisActive && (
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => handleStop(blueprint.id)}
                                                title="Stop"
                                                className="text-white h-8 w-8"
                                            >
                                                <Square className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {/* Resume from checkpoint */}
                                        {!isThisActive && !isOtherRunning && executorStore.hasResumableCheckpoint(blueprint.id) && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => handleResume(blueprint.id)}
                                                title={`Resume (${executorStore.resumableBlueprints[blueprint.id]?.itemsScraped || 0} rows)`}
                                                className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 h-8 w-8"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {/* More actions dropdown */}
                                        {!isThisActive && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem onClick={() => handleEdit(blueprint.id)} className="gap-2 cursor-pointer">
                                                        <SquarePen className="w-4 h-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDuplicate(blueprint.id)} className="gap-2 cursor-pointer">
                                                        <Copy className="w-4 h-4" />
                                                        Duplicate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(blueprint.id)} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>

                                {/* Execution progress bar */}
                                {isThisActive && (
                                    <div className="mt-1 w-full min-w-0">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 min-w-0">
                                            <span className={`truncate ${isThisRunning ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {executorStore.currentBlock?.label || 'Starting...'}
                                            </span>
                                            <span className="ml-auto shrink-0">
                                                {executorStore.extractedData.length > 0 && (
                                                    <span className="mr-2 text-emerald-600">{executorStore.extractedData.length} rows</span>
                                                )}
                                                {executorStore.progress.current}/{executorStore.progress.total} blocks
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${isThisPaused ? 'bg-amber-500' : 'bg-emerald-600'}`}
                                                style={{ width: `${executorStore.progress.total > 0 ? (executorStore.progress.current / executorStore.progress.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Stopped with data indicator - from current session */}
                                {!isThisActive && executorStore.runningBlueprintId === blueprint.id && executorStore.extractedData.length > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Database className="w-3 h-3" />
                                        <span>{executorStore.extractedData.length} rows extracted</span>
                                        {executorStore.hasResumableCheckpoint(blueprint.id) && (
                                            <span className="text-emerald-600 font-medium">• Can resume</span>
                                        )}
                                        <span className="ml-auto">{executorStore.durationFormatted}</span>
                                    </div>
                                )}
                                {/* Resumable checkpoint indicator - from previous session */}
                                {!isThisActive && executorStore.runningBlueprintId !== blueprint.id && executorStore.hasResumableCheckpoint(blueprint.id) && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Database className="w-3 h-3" />
                                        <span>{executorStore.resumableBlueprints[blueprint.id]?.itemsScraped || 0} rows extracted</span>
                                        <span className="text-emerald-600 font-medium">• Can resume</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Blueprint Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="bg-gray-50">
                    <DialogHeader>
                        <DialogTitle>Create New Blueprint</DialogTitle>
                        <DialogDescription>
                            Enter a name and description for your new automation blueprint.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                placeholder="My Automation Blueprint"
                                value={newBlueprintName}
                                onChange={(e) => setNewBlueprintName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateBlueprint();
                                    }
                                }}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="What does this blueprint do?"
                                value={newBlueprintDescription}
                                onChange={(e) => setNewBlueprintDescription(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateBlueprint}>
                            Create Blueprint
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
});
