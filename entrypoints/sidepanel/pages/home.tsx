import { Button } from "@/components/ui/button";
import { Play, Pause, Square, SquarePen, Plus, Trash2, Upload, Database, Eye, RotateCcw } from "lucide-react";
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default observer(function Home() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const navigate = useNavigate();
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newBlueprintName, setNewBlueprintName] = useState('');
    const [newBlueprintDescription, setNewBlueprintDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (confirm('Are you sure you want to delete this blueprint?')) {
            const blueprint = blueprintBuilderStore.blueprints.find(b => b.id === blueprintId);
            if (blueprint) {
                await blueprintBuilderStore.deleteBlueprint(blueprint);
            }
        }
    };

    const handleCreateNew = () => {
        setNewBlueprintName('');
        setNewBlueprintDescription('');
        setIsCreateDialogOpen(true);
    };

    const handleCreateBlueprint = () => {
        if (!newBlueprintName.trim()) {
            alert('Please enter a blueprint name');
            return;
        }
        blueprintBuilderStore.createBlueprint(newBlueprintName.trim(), newBlueprintDescription.trim());
        setIsCreateDialogOpen(false);
        navigate('/blueprint-builder');
    };

    const handleImportClick = () => {
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
                alert('Invalid blueprint file format');
                return;
            }

            await blueprintBuilderStore.importBlueprint(text);
            alert(`Blueprint "${blueprint.name}" imported successfully!`);
        } catch (error) {
            console.error('Failed to import blueprint:', error);
            alert('Failed to import blueprint. Please check the file format.');
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
        <div className="h-full flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-semibold ml-2">Blueprints</h1>
                <div className="flex gap-2">
                    <Button onClick={handleImportClick} variant="outline" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import
                    </Button>
                    <Button onClick={handleCreateNew} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Blueprint
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
            <div className="flex flex-col gap-2 overflow-auto flex-1 p-2">
                {blueprintBuilderStore.blueprints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-gray-600">No Blueprints Yet</h2>
                            <p className="text-sm text-gray-500">Create your first blueprint to get started</p>
                        </div>
                        <Button onClick={handleCreateNew} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create Blueprint
                        </Button>
                    </div>
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
                                className={`bg-white p-4 border rounded-lg flex flex-col gap-2 transition-all ${isThisRunning ? 'border-blue-400 ring-2 ring-blue-200' :
                                    isThisPaused ? 'border-amber-400 ring-2 ring-amber-200' :
                                        'border-gray-300 hover:ring-2'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div
                                        className={`flex-1 ${isThisActive ? 'cursor-pointer' : ''}`}
                                        onClick={isThisActive ? () => handleViewExecution(blueprint.id) : undefined}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-lg font-semibold">{blueprint.name}</h1>
                                            {isThisRunning && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                    Running
                                                </span>
                                            )}
                                            {isThisPaused && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600">{blueprint.description || 'No description'}</p>
                                        <p className="text-xs text-gray-400 mt-1">{blueprint.blocks.length} blocks</p>
                                    </div>
                                    <div className="flex gap-1">
                                        {/* Play / Pause button */}
                                        <Button
                                            size="icon"
                                            variant={isThisActive ? 'default' : 'outline'}
                                            onClick={() => handleRun(blueprint.id)}
                                            title={isThisRunning ? 'Pause' : isThisPaused ? 'Resume' : 'Run Blueprint'}
                                            disabled={isOtherRunning}
                                            className={isThisRunning ? 'animate-pulse' : ''}
                                        >
                                            {isThisRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </Button>
                                        {/* Stop button - only when active */}
                                        {isThisActive && (
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => handleStop(blueprint.id)}
                                                title="Stop Execution"
                                                className="text-white"
                                            >
                                                <Square className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {/* View execution button - when active */}
                                        {isThisActive && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => handleViewExecution(blueprint.id)}
                                                title="View Execution"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {/* Resume button - when stopped with checkpoint (persisted across restart) */}
                                        {!isThisActive && !isOtherRunning && executorStore.hasResumableCheckpoint(blueprint.id) && (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                onClick={() => handleResume(blueprint.id)}
                                                title={`Resume from last checkpoint (${executorStore.resumableBlueprints[blueprint.id]?.itemsScraped || 0} rows)`}
                                                className="border-blue-500 text-blue-500 hover:bg-blue-50"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {/* Edit button */}
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleEdit(blueprint.id)}
                                            title="Edit Blueprint"
                                        >
                                            <SquarePen className="w-4 h-4" />
                                        </Button>
                                        {/* Delete button - only when not active */}
                                        {!isThisActive && (
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                onClick={() => handleDelete(blueprint.id)}
                                                title="Delete Blueprint"
                                                className="text-white"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Execution progress bar */}
                                {isThisActive && (
                                    <div className="mt-1">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <span className={isThisRunning ? 'text-blue-600' : 'text-amber-600'}>
                                                {executorStore.currentBlock?.label || 'Starting...'}
                                            </span>
                                            <span className="ml-auto">
                                                {executorStore.extractedData.length > 0 && (
                                                    <span className="mr-2 text-green-600">{executorStore.extractedData.length} rows</span>
                                                )}
                                                {executorStore.progress.current}/{executorStore.progress.total} blocks
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${isThisPaused ? 'bg-amber-500' : 'bg-blue-600'}`}
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
                                            <span className="text-blue-600 font-medium">• Can resume</span>
                                        )}
                                        <span className="ml-auto">{executorStore.durationFormatted}</span>
                                    </div>
                                )}
                                {/* Resumable checkpoint indicator - from previous session */}
                                {!isThisActive && executorStore.runningBlueprintId !== blueprint.id && executorStore.hasResumableCheckpoint(blueprint.id) && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Database className="w-3 h-3" />
                                        <span>{executorStore.resumableBlueprints[blueprint.id]?.itemsScraped || 0} rows extracted</span>
                                        <span className="text-blue-600 font-medium">• Can resume</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Blueprint Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
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
                    <DialogFooter>
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
