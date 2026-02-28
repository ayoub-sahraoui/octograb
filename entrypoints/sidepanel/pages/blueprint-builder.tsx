import { CirclePlus, CopyPlus, Database, Download, FileStack, GitPullRequest, Globe, Hourglass, MousePointer, Pause, Play, RefreshCcw, Save, ScrollText, Square, Trash, Type, Undo2, GripVertical, BarChart3, List, Activity, X, RotateCcw } from 'lucide-react'
import BlueprintBlock from '../components/blueprint-block'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { toast } from 'sonner';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NavigateBlock } from '@/entrypoints/models/navigate-block';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import BlueprintBlockSelector from '../components/blueprint-block-selector'
import { useState, useEffect } from 'react';
import {
    NavigateBlockConfig,
    ClickBlockConfig,
    InputBlockConfig,
    WaitBlockConfig,
    ScrollBlockConfig,
    GoBackBlockConfig,
    ConditionBlockConfig,
    LoopElementsBlockConfig,
    LoopPaginationBlockConfig,
    ExtractScopeBlockConfig,
} from '../components/block-configs';
import { ClickBlock } from '@/entrypoints/models/click-block';
import { InputBlock } from '@/entrypoints/models/input-block';
import { WaitBlock } from '@/entrypoints/models/wait-block';
import { ScrollBlock } from '@/entrypoints/models/scroll-block';
import { GoBackBlock } from '@/entrypoints/models/go-back-block';
import { ConditionBlock } from '@/entrypoints/models/condition-block';
import { LoopElementsBlock } from '@/entrypoints/models/loop-elements-block';
import { LoopPaginationBlock } from '@/entrypoints/models/loop-pagination-block';
import { ExtractScopeBlock } from '@/entrypoints/models/extract-scope-block';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SortableBlueprintBlock } from '../components/sortable-blueprint-block';

export default observer(function BlueprintBuilder() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const [isAddBlockDrawerOpen, setIsAddBlockDrawerOpen] = useState(false);
    const [isResultsDrawerOpen, setIsResultsDrawerOpen] = useState(false);

    // Reset executor state when component unmounts
    useEffect(() => {
        return () => {
            // Only cleanup when leaving if nothing is running and no data to preserve
            if (executorStore.status !== 'running' && executorStore.status !== 'paused') {
                // Don't clear if there's data from a stopped execution (user might want to resume)
                if (!executorStore.canResume && executorStore.extractedData.length === 0) {
                    executorStore.clearResults();
                }
            }
        };
    }, []);

    // When switching blueprints, load checkpoint or clear stale data
    useEffect(() => {
        const bpId = blueprintBuilderStore.selectedBlueprint?.id;
        if (!bpId) return;

        // If this blueprint is currently running, just open the drawer
        if (executorStore.runningBlueprintId === bpId && (executorStore.isRunning || executorStore.isPaused)) {
            setIsResultsDrawerOpen(true);
            return;
        }

        // If a different blueprint was running, don't clear its state
        if (executorStore.runningBlueprintId && executorStore.runningBlueprintId !== bpId) {
            // Only clear if not running
            if (!executorStore.isRunning && !executorStore.isPaused) {
                executorStore.clearResults();
            }
        }

        // Load last checkpoint if available for this blueprint
        executorStore.loadLastCheckpoint(bpId);
    }, [blueprintBuilderStore.selectedBlueprint?.id]);

    // Auto-open results drawer when execution starts or when there's data
    useEffect(() => {
        if (executorStore.isRunning || executorStore.isPaused) {
            setIsResultsDrawerOpen(true);
        }
    }, [executorStore.isRunning, executorStore.isPaused]);

    // Auto-open when data loads (e.g. from checkpoint)
    useEffect(() => {
        if (executorStore.extractedData.length > 0 && executorStore.runningBlueprintId === blueprintBuilderStore.selectedBlueprint?.id) {
            setIsResultsDrawerOpen(true);
        }
    }, [executorStore.extractedData.length]);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handles
    const handleExport = () => {
        const blueprint = blueprintBuilderStore.exportBlueprint();
        if (blueprint) {
            const blob = new Blob([blueprint], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'blueprint.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleSave = async () => {
        const blueprint = blueprintBuilderStore.selectedBlueprint;
        if (blueprint) {
            await blueprintBuilderStore.saveBlueprint(blueprint);
            toast.success("Blueprint Saved", {
                description: `"${blueprint.name}" has been saved successfully.`,
                duration: 3000,
            });
        }
    };

    const handleRun = async () => {
        const blueprint = blueprintBuilderStore.selectedBlueprint;
        if (!blueprint) return;

        if (executorStore.isRunning) {
            executorStore.pause();
        } else if (executorStore.isPaused) {
            executorStore.resume();
        } else {
            setIsResultsDrawerOpen(true);
            await executorStore.execute(blueprint);
        }
    };

    const handleResume = async () => {
        const blueprint = blueprintBuilderStore.selectedBlueprint;
        if (!blueprint) return;

        setIsResultsDrawerOpen(true);
        await executorStore.execute(blueprint, true);
    };

    const handleStop = async () => {
        await executorStore.stop();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const blueprint = blueprintBuilderStore.selectedBlueprint;
            if (!blueprint) return;

            const oldIndex = blueprint.blocks.findIndex(b => b.id === active.id);
            const newIndex = blueprint.blocks.findIndex(b => b.id === over.id);

            const newBlocks = arrayMove(blueprint.blocks, oldIndex, newIndex);
            blueprint.blocks = newBlocks;
            blueprint.updateIndices();
        }
    };

    const AddNewBlock = () => {
        return <Drawer open={isAddBlockDrawerOpen} onOpenChange={setIsAddBlockDrawerOpen}>
            <DrawerTrigger>
                <Button className='w-40 rounded-full px-3 py-2'>
                    <div className='flex gap-2 items-center'>
                        <CopyPlus />
                        <p className='font-semibold'>Add Block</p>
                    </div>
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add New Block</DrawerTitle>
                    <DrawerDescription>Choose the type of block you want to add</DrawerDescription>
                </DrawerHeader>
                <BlueprintBlockSelector onBlockSelect={() => setIsAddBlockDrawerOpen(false)} />
                <DrawerFooter>
                    <DrawerClose className='flex gap-2 justify-center w-full'>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    }

    const AddNewChildBlock = observer(() => {
        const parentBlock = blueprintBuilderStore.parentBlockForChild;

        const handleChildBlockSelect = () => {
            blueprintBuilderStore.setParentBlockForChild(null);
        };

        return (
            <Drawer open={!!parentBlock} onOpenChange={(open) => {
                if (!open) {
                    blueprintBuilderStore.setParentBlockForChild(null);
                }
            }}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Add Child Block to {parentBlock?.label}</DrawerTitle>
                        <DrawerDescription>Choose the type of block to add as a child</DrawerDescription>
                    </DrawerHeader>
                    <BlueprintBlockSelector
                        onBlockSelect={handleChildBlockSelect}
                        addAsChild={true}
                    />
                    <DrawerFooter>
                        <DrawerClose className='flex gap-2 justify-center w-full'>
                            <Button variant="outline">Cancel</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    });

    const BlueprintBlocks = observer(() => {
        if (!blueprintBuilderStore.selectedBlueprint) {
            return null;
        }

        if (blueprintBuilderStore.selectedBlueprint.blocks.length === 0) {
            return (
                <div className="flex flex-col gap-2 items-center justify-center w-full h-full">
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <CopyPlus className="w-10 h-10" />
                        <div className='flex flex-col justify-center items-center'>
                            <h2 className="text-lg font-semibold">No blocks found</h2>
                            <p className="text-center">Add blocks to your blueprint to start building your automation.</p>
                        </div>
                    </div>
                    <AddNewBlock />
                </div>
            )
        }

        const blockIds = blueprintBuilderStore.selectedBlueprint.blocks.map(b => b.id);

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2 w-full overflow-y-auto flex-1 pl-8">
                        {blueprintBuilderStore.selectedBlueprint.blocks.map((block) => (
                            <SortableBlueprintBlock key={block.id} block={block} />
                        ))}
                        <AddNewBlock />
                    </div>
                </SortableContext>
            </DndContext>
        )
    });

    const BlockConfigDrawer = observer(() => {
        const selectedBlock = blueprintBuilderStore.selectedBlock;

        if (!selectedBlock) {
            return null;
        }

        const handleDone = () => {
            blueprintBuilderStore.clearBlockSelection();
        };

        const handleDelete = () => {
            blueprintBuilderStore.removeBlockFromBlueprint(selectedBlock);
        };

        return (
            <Drawer direction='right' open={!!selectedBlock} onOpenChange={(open) => {
                if (!open) {
                    blueprintBuilderStore.clearBlockSelection();
                }
            }}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Configure {selectedBlock.label}</DrawerTitle>
                        <DrawerDescription>
                            Update the block settings.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 overflow-y-auto flex-1">
                        {selectedBlock instanceof NavigateBlock && (
                            <NavigateBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ClickBlock && (
                            <ClickBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof InputBlock && (
                            <InputBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof WaitBlock && (
                            <WaitBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ScrollBlock && (
                            <ScrollBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof GoBackBlock && (
                            <GoBackBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ConditionBlock && (
                            <ConditionBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof LoopElementsBlock && (
                            <LoopElementsBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof LoopPaginationBlock && (
                            <LoopPaginationBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ExtractScopeBlock && (
                            <ExtractScopeBlockConfig block={selectedBlock} />
                        )}
                    </div>
                    <DrawerFooter className="flex flex-row gap-2">
                        <Button onClick={handleDone} className="flex-1">Done</Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <span className='text-white'>Delete</span>
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )
    });

    const executionResultsDrawer = (
        <Drawer open={isResultsDrawerOpen} onOpenChange={setIsResultsDrawerOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <div className="flex items-center justify-between w-full">
                        <div className='flex flex-col gap-1 items-start'>
                            <DrawerTitle>Execution Results</DrawerTitle>
                            <DrawerDescription>
                                {executorStore.status === 'running' && (
                                    <span className="text-blue-600">
                                        Running... {executorStore.progress.current}/{executorStore.progress.total} blocks • {executorStore.durationFormatted}
                                    </span>
                                )}
                                {executorStore.status === 'paused' && (
                                    <span className="text-amber-600">Paused • {executorStore.durationFormatted}</span>
                                )}
                                {executorStore.status === 'completed' && (
                                    <span className="text-green-600">
                                        Completed • {executorStore.extractedData.length} rows • {executorStore.durationFormatted}
                                    </span>
                                )}
                                {executorStore.status === 'error' && (
                                    <span className="text-red-600">Error: {executorStore.error}</span>
                                )}
                                {executorStore.status === 'stopped' && (
                                    <span className="text-gray-600">
                                        Stopped • {executorStore.extractedData.length} rows
                                        {executorStore.canResume && <span className="ml-2 text-blue-600">(Can Resume)</span>}
                                    </span>
                                )}
                            </DrawerDescription>
                        </div>
                        <div className="flex gap-1">
                            {executorStore.extractedData.length > 0 && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => executorStore.downloadCSV()}>
                                        CSV
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => executorStore.downloadJSON()}>
                                        JSON
                                    </Button>
                                </>
                            )}
                            {executorStore.enableLogs && executorStore.logs.length > 0 && (
                                <Button size="sm" variant="outline" onClick={() => {
                                    const logsText = executorStore.logs.map(l =>
                                        `[${new Date(l.timestamp).toISOString()}] [${l.type.toUpperCase()}] ${l.message}`
                                    ).join('\n');
                                    const blob = new Blob([logsText], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}>
                                    Logs
                                </Button>
                            )}
                            {executorStore.enableTrace && executorStore.traces.length > 0 && (
                                <Button size="sm" variant="outline" onClick={() => executorStore.downloadTrace()}>
                                    Trace
                                </Button>
                            )}
                            <DrawerClose asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                    <X className="h-4 w-4" />
                                </Button>
                            </DrawerClose>
                        </div>
                    </div>
                </DrawerHeader>

                <Tabs defaultValue="data" className="px-4">
                    <TabsList className={`grid w-full ${executorStore.enableLogs && executorStore.enableTrace ? 'grid-cols-3' : executorStore.enableLogs || executorStore.enableTrace ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <TabsTrigger value="data" className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Data ({executorStore.extractedData.length})
                        </TabsTrigger>
                        {executorStore.enableLogs && (
                            <TabsTrigger value="logs" className="flex items-center gap-2">
                                <List className="w-4 h-4" />
                                Logs ({executorStore.logs.length})
                            </TabsTrigger>
                        )}
                        {executorStore.enableTrace && (
                            <TabsTrigger value="trace" className="flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Trace ({executorStore.traces.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="data" className="max-h-[50vh] overflow-auto mt-4">
                        {executorStore.extractedData.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            {executorStore.extractedColumns.map(col => (
                                                <TableHead key={col}>{col}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {executorStore.extractedData.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                                {executorStore.extractedColumns.map(col => (
                                                    <TableCell key={col} className="max-w-[200px] truncate text-xs" title={String(row[col] ?? '')}>
                                                        {String(row[col] ?? '')}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-8 text-sm">
                                {executorStore.isRunning ? 'Waiting for data...' : 'No data extracted yet.'}
                            </div>
                        )}
                    </TabsContent>

                    {executorStore.enableLogs && (
                        <TabsContent value="logs" className="max-h-[50vh] overflow-auto mt-4">
                            <div className="space-y-1 font-mono text-xs">
                                {executorStore.logs.length > 0 ? (
                                    executorStore.logs.map((log, idx) => (
                                        <div key={idx} className={`p-2 rounded ${log.type === 'error' ? 'bg-red-50 text-red-700' :
                                            log.type === 'warn' ? 'bg-amber-50 text-amber-700' :
                                                log.type === 'success' ? 'bg-green-50 text-green-700' :
                                                    log.type === 'block' ? 'bg-blue-50 text-blue-700 font-semibold' :
                                                        'bg-gray-50 text-gray-700'
                                            }`}>
                                            <span className="text-gray-400 mr-2">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                            {log.message}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        No logs yet
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    )}

                    {executorStore.enableTrace && (
                        <TabsContent value="trace" className="max-h-[50vh] overflow-auto mt-4">
                            <div className="space-y-2">
                                {executorStore.traces.length > 0 ? (
                                    executorStore.traces.map((trace, idx) => (
                                        <div key={idx} className={`p-3 rounded-lg border ${trace.status === 'error' ? 'border-red-200 bg-red-50' :
                                            trace.status === 'success' ? 'border-green-200 bg-green-50' :
                                                'border-blue-200 bg-blue-50'
                                            }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${trace.status === 'error' ? 'bg-red-500' :
                                                        trace.status === 'success' ? 'bg-green-500' :
                                                            'bg-blue-500'
                                                        }`} />
                                                    <span className="font-semibold text-sm">{trace.blockLabel}</span>
                                                    <span className="text-xs text-gray-500">({trace.blockType})</span>
                                                </div>
                                                {trace.duration && (
                                                    <span className="text-xs text-gray-600">{trace.duration}ms</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-600 ml-4">
                                                {new Date(trace.timestamp).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-muted-foreground py-8 text-sm">
                                        No trace data yet
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>

                <DrawerFooter>
                    <DrawerClose className='flex gap-2 justify-center w-full'>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );

    const getPlayIcon = () => {
        if (executorStore.isRunning) return <Pause />;
        return <Play />;
    };

    const getPlayVariant = (): 'outline' | 'default' | 'destructive' => {
        if (executorStore.isRunning) return 'default';
        if (executorStore.isPaused) return 'default';
        return 'outline';
    };

    return (
        <div className="h-full flex-1 flex flex-col gap-2">
            <div className='flex justify-between items-center'>
                <h1 className="text-xl font-semibold ml-2">Blueprint Builder</h1>
                <div className='flex gap-2'>
                    <Button
                        size={"icon"}
                        variant={getPlayVariant()}
                        onClick={handleRun}
                        disabled={!blueprintBuilderStore.selectedBlueprint}
                        className={executorStore.isRunning ? 'animate-pulse' : ''}
                    >
                        {getPlayIcon()}
                    </Button>
                    {(executorStore.isRunning || executorStore.isPaused) && (
                        <Button size={"icon"} variant={'destructive'} onClick={handleStop}>
                            <Square className="text-white" />
                        </Button>
                    )}
                    {executorStore.canResume && !executorStore.isRunning && (
                        <Button
                            size={"icon"}
                            variant={'outline'}
                            onClick={handleResume}
                            title="Resume from last checkpoint"
                            className="border-blue-500 text-blue-500 hover:bg-blue-50"
                        >
                            <RotateCcw />
                        </Button>
                    )}
                    {executorStore.extractedData.length > 0 && (
                        <Button size={"icon"} variant={'outline'} onClick={() => setIsResultsDrawerOpen(true)}>
                            <Database />
                        </Button>
                    )}
                    <Button size={"icon"} variant={'outline'} onClick={handleSave}>
                        <Save />
                    </Button>
                    <Button size={"icon"} variant={'outline'} onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                                const text = await file.text();
                                await blueprintBuilderStore.importBlueprint(text);
                            }
                        };
                        input.click();
                    }} title="Import Blueprint">
                        <FileStack />
                    </Button>
                    <Button size={"icon"} variant={'outline'} onClick={handleExport} title="Export Blueprint">
                        <Download />
                    </Button>
                    {executorStore.traces.length > 0 && (
                        <Button size="icon" variant={'outline'} onClick={() => executorStore.downloadTrace()} title="Download Trace">
                            <ScrollText />
                        </Button>
                    )}
                </div>
            </div>

            {(executorStore.isRunning || executorStore.isPaused) && (
                <div className="mx-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className={executorStore.isRunning ? 'text-blue-600' : 'text-amber-600'}>
                            {executorStore.isRunning ? '●' : '⏸'} {executorStore.currentBlock?.label || 'Starting...'}
                        </span>
                        <span className="ml-auto">{executorStore.progress.current}/{executorStore.progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${executorStore.isPaused ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{ width: `${executorStore.progress.total > 0 ? (executorStore.progress.current / executorStore.progress.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 h-full bg-gray-100 p-4 border border-gray-300 rounded-lg flex flex-col justify-start items-center overflow-y-auto">
                <BlueprintBlocks />
                <BlockConfigDrawer />
                <AddNewChildBlock />
                {executionResultsDrawer}
            </div>
        </div>
    )
});
