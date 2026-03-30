import { CirclePlus, CopyPlus, Database, Download, FileStack, GitPullRequest, Globe, Hourglass, MousePointer, Pause, Play, RefreshCcw, Save, ScrollText, Square, Trash, Type, Undo2, GripVertical, BarChart3, List, Activity, X, RotateCcw, FileDown, FileUp, Upload, Lock, ArrowLeft } from 'lucide-react'
import BlueprintBlock from '../components/blueprint-block'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store';
import { toast } from 'sonner';
import { observer } from 'mobx-react-lite';
import { reaction, toJS } from 'mobx';
import { Button } from '@/components/ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import BlueprintBlockSelector from '../components/blueprint-block-selector'
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    AssertBlockConfig,
    MacroBlockConfig,
    SetVariableBlockConfig,
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
import { AssertBlock } from '@/entrypoints/models/assert-block';
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { SetVariableBlock } from '@/entrypoints/models/set-variable-block';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SortableBlueprintBlock } from '../components/sortable-blueprint-block';
import { buildExecutionTraceDisplay, buildExecutionTraceSummary, filterExecutionTraces } from '../components/execution-trace-display';

// ─── Extracted observer components (stable identity, never remounted on parent re-render) ───

const BlockConfigDrawer = observer(function BlockConfigDrawer() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
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
                    {selectedBlock instanceof AssertBlock && (
                        <AssertBlockConfig block={selectedBlock} />
                    )}
                    {selectedBlock instanceof MacroBlock && (
                        <MacroBlockConfig block={selectedBlock} />
                    )}
                    {selectedBlock instanceof SetVariableBlock && (
                        <SetVariableBlockConfig block={selectedBlock} />
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

const AddNewChildBlock = observer(function AddNewChildBlock() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const parentBlock = blueprintBuilderStore.parentBlockForChild;

    const handleChildBlockSelect = () => {
        blueprintBuilderStore.setParentBlockForChild(null);
    };

    return (
        <Dialog open={!!parentBlock} onOpenChange={(open) => {
            if (!open) {
                blueprintBuilderStore.setParentBlockForChild(null);
            }
        }}>
            <DialogContent className="flex h-[min(85vh,760px)] w-[min(560px,calc(100vw-1rem))] min-h-0 flex-col gap-0 bg-background p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Add Child Block to {parentBlock?.label}</DialogTitle>
                    <DialogDescription>Choose the type of block to add as a child</DialogDescription>
                </DialogHeader>
                <BlueprintBlockSelector
                    onBlockSelect={handleChildBlockSelect}
                    addAsChild={true}
                />
                <DialogFooter className="border-t px-6 py-4">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={handleChildBlockSelect}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

interface AddNewBlockProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

function AddNewBlock({ isOpen, setIsOpen }: AddNewBlockProps) {
    return <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button className='w-40 rounded-full px-3 py-2 mx-auto my-2'>
                <div className='flex gap-2 items-center'>
                    <CopyPlus />
                    <p className='font-semibold'>Add Block</p>
                </div>
            </Button>
        </DialogTrigger>
        <DialogContent className="bg-white flex h-[min(85vh,760px)] w-[min(560px,calc(100vw-1rem))] min-h-0 flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-2">
                <DialogTitle>Add New Block</DialogTitle>
                <DialogDescription>Choose the type of block you want to add</DialogDescription>
            </DialogHeader>
            <BlueprintBlockSelector onBlockSelect={() => setIsOpen(false)} />
            <DialogFooter className="border-t px-6 py-4">
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsOpen(false)}>Cancel</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

interface BlueprintBlocksProps {
    sensors: ReturnType<typeof useSensors>;
    handleDragEnd: (event: DragEndEvent) => void;
    isAddBlockDrawerOpen: boolean;
    setIsAddBlockDrawerOpen: (open: boolean) => void;
}

const BlueprintBlocks = observer(function BlueprintBlocks({ sensors, handleDragEnd, isAddBlockDrawerOpen, setIsAddBlockDrawerOpen }: BlueprintBlocksProps) {
    const blueprintBuilderStore = useBlueprintBuilderStore();

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
                <AddNewBlock isOpen={isAddBlockDrawerOpen} setIsOpen={setIsAddBlockDrawerOpen} />
            </div>
        )
    }

    const blockIds = blueprintBuilderStore.selectedBlueprint.blocks.map(b => b.id);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 w-full flex-1">
                    {blueprintBuilderStore.selectedBlueprint.blocks.map((block) => (
                        <SortableBlueprintBlock key={block.id} block={block} />
                    ))}
                    <AddNewBlock isOpen={isAddBlockDrawerOpen} setIsOpen={setIsAddBlockDrawerOpen} />
                </div>
            </SortableContext>
        </DndContext>
    )
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default observer(function BlueprintBuilder() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const navigate = useNavigate();
    const [isAddBlockDrawerOpen, setIsAddBlockDrawerOpen] = useState(false);
    const [isResultsDrawerOpen, setIsResultsDrawerOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    const [traceStatusFilter, setTraceStatusFilter] = useState<'all' | 'start' | 'success' | 'error'>('all');
    const [traceSearch, setTraceSearch] = useState('');
    const [traceNewestFirst, setTraceNewestFirst] = useState(true);

    const copyTraceText = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
        } catch {
            toast.error(`Failed to copy ${label.toLowerCase()}`);
        }
    };

    const visibleTraces = filterExecutionTraces(executorStore.traces, {
        status: traceStatusFilter,
        search: traceSearch,
        newestFirst: traceNewestFirst,
    });
    const traceSummary = buildExecutionTraceSummary(visibleTraces);

    const formatTraceSummaryDuration = (value: number) => {
        if (value <= 0) return '0ms';
        if (value < 1000) return `${value}ms`;
        if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
        return `${Math.floor(value / 60000)}m ${Math.round((value % 60000) / 1000)}s`;
    };

    // Reset executor state when component unmounts
    useEffect(() => {
        return () => {
            // Only cleanup when leaving if nothing is running and no data to preserve
            if (executorStore.status !== 'running' && executorStore.status !== 'paused') {
                // Don't clear if there's data from a stopped execution (user might want to resume)
                const bpId = blueprintBuilderStore.selectedBlueprint?.id;
                const hasCheckpoint = bpId ? executorStore.hasResumableCheckpoint(bpId) : false;
                if (!executorStore.canResume && !hasCheckpoint && executorStore.extractedData.length === 0) {
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

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                blueprintBuilderStore.undo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                blueprintBuilderStore.redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Auto-save: watch for any changes to the selected blueprint and debounce-save
    const isFirstRender = useRef(true);
    useEffect(() => {
        const bp = blueprintBuilderStore.selectedBlueprint;
        if (!bp) return;
        isFirstRender.current = true;
        const dispose = reaction(
            () => JSON.stringify(toJS(bp), (key, value) => key === 'parent' ? undefined : value),
            () => {
                // Skip the initial snapshot (first render)
                if (isFirstRender.current) { isFirstRender.current = false; return; }
                blueprintBuilderStore.pushSnapshot();
                blueprintBuilderStore.triggerAutoSave();
            },
        );
        return () => dispose();
    }, [blueprintBuilderStore.selectedBlueprint?.id]);

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
        await executorStore.resumeBlueprint(blueprint);
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

            const block = blueprint.blocks[oldIndex];
            if (block) {
                blueprint.reorderBlock(block, newIndex);
            }
        }
    };


    const executionResultsDrawer = (
        <Drawer open={isResultsDrawerOpen} onOpenChange={setIsResultsDrawerOpen}>
            <DrawerContent>
                <DrawerHeader className="pb-2">
                    <div className="flex items-center justify-between w-full gap-2">
                        <div className='flex flex-col gap-0.5 items-start min-w-0'>
                            <DrawerTitle className="text-base">Execution Results</DrawerTitle>
                            <DrawerDescription>
                                {executorStore.status === 'running' && (
                                    <span className="text-emerald-600">
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
                                        {executorStore.canResume && <span className="ml-2 text-emerald-600">(Can Resume)</span>}
                                    </span>
                                )}
                            </DrawerDescription>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            {executorStore.extractedData.length > 0 && (
                                <>
                                    <Button size="sm" variant="outline" onClick={() => executorStore.downloadCSV()} className="h-7 px-2 text-xs">
                                        CSV
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => executorStore.downloadExcel()} className="h-7 px-2 text-xs">
                                        Excel
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => executorStore.downloadJSON()} className="h-7 px-2 text-xs">
                                        JSON
                                    </Button>
                                </>
                            )}
                            {executorStore.enableLogs && executorStore.logs.length > 0 && (
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
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
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => executorStore.downloadTrace()}>
                                    Trace
                                </Button>
                            )}
                            <DrawerClose asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
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

                    <TabsContent value="data" className="max-h-[50vh] overflow-auto mt-2">
                        {executorStore.extractedData.length > 0 ? (
                            <div className="border rounded-lg overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px] text-xs">#</TableHead>
                                            {executorStore.extractedColumns.map(col => (
                                                <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {executorStore.extractedData.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
                                                {executorStore.extractedColumns.map(col => (
                                                    <TableCell key={col} className="max-w-[120px] truncate text-xs whitespace-nowrap" title={String(row[col] ?? '')}>
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
                        <TabsContent value="logs" className="max-h-[50vh] overflow-auto mt-2">
                            <div className="space-y-1 font-mono text-xs">
                                {executorStore.logs.length > 0 ? (
                                    executorStore.logs.map((log, idx) => (
                                        <div key={idx} className={`p-2 rounded ${log.type === 'error' ? 'bg-red-50 text-red-700' :
                                            log.type === 'warn' ? 'bg-amber-50 text-amber-700' :
                                                log.type === 'success' ? 'bg-green-50 text-green-700' :
                                                    log.type === 'block' ? 'bg-emerald-50 text-emerald-700 font-semibold' :
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
                        <TabsContent value="trace" className="max-h-[50vh] overflow-auto mt-2">
                            <div className="space-y-2">
                                {executorStore.traces.length > 0 ? (
                                    <>
                                        <div className="rounded-lg border bg-muted/30 p-2 space-y-2">
                                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                <div className="rounded-md border bg-background/80 p-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Visible Traces</div>
                                                    <div className="mt-1 text-lg font-semibold">{traceSummary.total}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        start {traceSummary.counts.start} | success {traceSummary.counts.success} | error {traceSummary.counts.error}
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-background/80 p-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Durations</div>
                                                    <div className="mt-1 text-sm font-semibold">
                                                        avg {formatTraceSummaryDuration(traceSummary.duration.averageMs)}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        slowest {formatTraceSummaryDuration(traceSummary.duration.slowestMs)}
                                                        {traceSummary.duration.slowestBlockLabel ? ` · ${traceSummary.duration.slowestBlockLabel}` : ''}
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-background/80 p-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Timeline</div>
                                                    <div className="mt-1 text-sm font-semibold">
                                                        {formatTraceSummaryDuration(traceSummary.timeline.elapsedMs)}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {traceSummary.timeline.firstAt !== null && traceSummary.timeline.lastAt !== null
                                                            ? `${new Date(traceSummary.timeline.firstAt).toLocaleTimeString()} -> ${new Date(traceSummary.timeline.lastAt).toLocaleTimeString()}`
                                                            : 'No visible timeline'}
                                                    </div>
                                                </div>
                                                <div className="rounded-md border bg-background/80 p-2">
                                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest Visible</div>
                                                    <div className="mt-1 text-sm font-semibold truncate">
                                                        {traceSummary.timeline.latestBlockLabel || 'None'}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground capitalize">
                                                        {traceSummary.timeline.latestStatus || 'No status'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    value={traceSearch}
                                                    onChange={(e) => setTraceSearch(e.target.value)}
                                                    placeholder="Search traces by block, type, executor, scope..."
                                                    className="h-8 min-w-[220px] flex-1 rounded-md border bg-background px-3 text-xs outline-none"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2 text-xs"
                                                    onClick={() => setTraceNewestFirst((current) => !current)}
                                                >
                                                    {traceNewestFirst ? 'Newest First' : 'Oldest First'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-2 text-xs"
                                                    onClick={() => copyTraceText(JSON.stringify(visibleTraces, null, 2), 'Filtered traces')}
                                                >
                                                    Copy Visible
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(['all', 'start', 'success', 'error'] as const).map((status) => (
                                                    <Button
                                                        key={status}
                                                        size="sm"
                                                        variant={traceStatusFilter === status ? 'default' : 'outline'}
                                                        className="h-7 px-2 text-xs capitalize"
                                                        onClick={() => setTraceStatusFilter(status)}
                                                    >
                                                        {status}
                                                    </Button>
                                                ))}
                                                <span className="ml-auto text-[11px] text-muted-foreground self-center">
                                                    Showing {visibleTraces.length} of {executorStore.traces.length}
                                                </span>
                                            </div>
                                        </div>

                                        {visibleTraces.length > 0 ? (
                                            <Accordion type="multiple" className="space-y-2">
                                                {visibleTraces.map((trace, idx) => {
                                                    const display = buildExecutionTraceDisplay(trace);
                                                    const cardClasses = trace.status === 'error'
                                                        ? 'border-red-200 bg-red-50'
                                                        : trace.status === 'success'
                                                            ? 'border-green-200 bg-green-50'
                                                            : 'border-emerald-200 bg-emerald-50';
                                                    const dotClasses = trace.status === 'error'
                                                        ? 'bg-red-500'
                                                        : trace.status === 'success'
                                                            ? 'bg-green-500'
                                                            : 'bg-emerald-500';

                                                    return (
                                                        <AccordionItem key={trace.id || idx} value={trace.id || `trace-${idx}`} className={`rounded-lg border px-3 ${cardClasses}`}>
                                                            <AccordionTrigger className="py-3 hover:no-underline">
                                                                <div className="flex flex-1 flex-col gap-2 text-left pr-3">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="flex min-w-0 items-center gap-2">
                                                                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClasses}`} />
                                                                            <span className="font-semibold text-sm truncate">{trace.blockLabel}</span>
                                                                            <span className="text-xs text-gray-500 shrink-0">({trace.blockType})</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {trace.duration !== undefined && (
                                                                                <span className="text-xs text-gray-600">{trace.duration}ms</span>
                                                                            )}
                                                                            <span className="text-xs text-gray-600">{new Date(trace.timestamp).toLocaleTimeString()}</span>
                                                                        </div>
                                                                    </div>
                                                                    {display.hints.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {display.hints.map((hint) => (
                                                                                <span key={`${trace.id}-${hint.label}`} className="rounded-full border border-white/70 bg-white/70 px-2 py-0.5 text-[11px] text-gray-700">
                                                                                    <span className="font-medium">{hint.label}</span>: {hint.value}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </AccordionTrigger>
                                                            <AccordionContent className="pt-1">
                                                                <div className="space-y-3">
                                                                    {display.sections.map((section) => (
                                                                        <div key={`${trace.id}-${section.title}`} className="rounded-md border border-white/70 bg-white/60 p-3">
                                                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                                                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                                                                    {section.title}
                                                                                </div>
                                                                                {(section.json || section.rows.length > 0) && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        className="h-6 px-2 text-[11px]"
                                                                                        onClick={(event) => {
                                                                                            event.stopPropagation();
                                                                                            const payload = section.json || JSON.stringify(section.rows, null, 2);
                                                                                            void copyTraceText(payload, `${section.title} details`);
                                                                                        }}
                                                                                    >
                                                                                        Copy
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                {section.rows.map((row) => (
                                                                                    <div key={`${section.title}-${row.label}`} className="flex items-start justify-between gap-3 text-xs">
                                                                                        <span className="text-gray-500 shrink-0">{row.label}</span>
                                                                                        <span className="text-right break-all text-gray-800">{row.value}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            {section.json && (
                                                                                <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-gray-950/90 p-3 text-[11px] text-gray-100 whitespace-pre-wrap break-all">
                                                                                    {section.json}
                                                                                </pre>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 px-2 text-xs"
                                                                            onClick={(event) => {
                                                                                event.stopPropagation();
                                                                                void copyTraceText(JSON.stringify(trace, null, 2), 'Trace');
                                                                            }}
                                                                        >
                                                                            Copy Trace JSON
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    );
                                                })}
                                            </Accordion>
                                        ) : (
                                            <div className="text-center text-muted-foreground py-8 text-sm">
                                                No traces match the current filters.
                                            </div>
                                        )}
                                    </>
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
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full">Close</Button>
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
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className='flex justify-between items-center shrink-0'>
                <div className="flex items-center gap-1 min-w-0 shrink">
                    <Button size="icon" variant="ghost" onClick={() => navigate('/')} title="Back to Home" className="h-8 w-8 shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex flex-col min-w-0">
                        {isEditingName && blueprintBuilderStore.selectedBlueprint ? (
                            <input
                                autoFocus
                                className="text-lg font-semibold bg-transparent border-b border-primary outline-none w-full"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                onBlur={async () => {
                                    if (editNameValue.trim() && blueprintBuilderStore.selectedBlueprint) {
                                        const bp = blueprintBuilderStore.selectedBlueprint;
                                        bp.setName(editNameValue.trim());
                                        await blueprintBuilderStore.saveBlueprint(bp);
                                    }
                                    setIsEditingName(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                            />
                        ) : (
                            <h1
                                className={`text-lg font-semibold shrink-0 ${blueprintBuilderStore.selectedBlueprint ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                                title={blueprintBuilderStore.selectedBlueprint ? 'Click to rename' : undefined}
                                onClick={() => {
                                    if (blueprintBuilderStore.selectedBlueprint) {
                                        setEditNameValue(blueprintBuilderStore.selectedBlueprint.name);
                                        setIsEditingName(true);
                                    }
                                }}
                            >
                                {blueprintBuilderStore.selectedBlueprint?.name || 'Blueprint Builder'}
                            </h1>
                        )}
                    </div>
                </div>
                <div className='flex gap-1 flex-wrap justify-end'>
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
                    {(executorStore.canResume || (blueprintBuilderStore.selectedBlueprint && executorStore.hasResumableCheckpoint(blueprintBuilderStore.selectedBlueprint.id))) && !executorStore.isRunning && (
                        <Button
                            size={"icon"}
                            variant={'outline'}
                            onClick={handleResume}
                            title="Resume from last checkpoint"
                            className="border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                        >
                            <RotateCcw />
                        </Button>
                    )}
                    {executorStore.extractedData.length > 0 && (
                        <Button size={"icon"} variant={'outline'} onClick={() => setIsResultsDrawerOpen(true)}>
                            <Database />
                        </Button>
                    )}
                    <Button size={"icon"} variant={'outline'} onClick={() => blueprintBuilderStore.undo()} disabled={!blueprintBuilderStore.canUndo} title="Undo (Ctrl+Z)">
                        <Undo2 />
                    </Button>
                    <Button size={"icon"} variant={'outline'} onClick={() => blueprintBuilderStore.redo()} disabled={!blueprintBuilderStore.canRedo} title="Redo (Ctrl+Y)">
                        <RefreshCcw />
                    </Button>
                    <Button size={"icon"} variant={'outline'} onClick={handleSave} className="relative" title={blueprintBuilderStore.autoSavePending ? 'Saving...' : 'Save blueprint'}>
                        <Save />
                        {blueprintBuilderStore.autoSavePending && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
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
                        <Upload />
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
                        <span className={executorStore.isRunning ? 'text-emerald-600' : 'text-amber-600'}>
                            {executorStore.isRunning ? '●' : '⏸'} {executorStore.currentBlock?.label || 'Starting...'}
                        </span>
                        <span className="ml-auto">{executorStore.progress.current}/{executorStore.progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${executorStore.isPaused ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            style={{ width: `${executorStore.progress.total > 0 ? (executorStore.progress.current / executorStore.progress.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {blueprintBuilderStore.isFreeTier && blueprintBuilderStore.selectedBlueprint && (
                <div className="mx-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">
                        <span className="font-medium">Blocks:</span> {blueprintBuilderStore.selectedBlueprint.blocks.length}/{FREE_TIER_LIMITS.maxBlocksPerBlueprint}
                        {!blueprintBuilderStore.canAddBlock() && <span className="ml-1 text-red-600 font-medium">(Limit reached)</span>}
                    </p>
                </div>
            )}

            <div
                className="flex-1 bg-gray-100 border border-gray-300 rounded-lg overflow-y-auto min-h-0 custom-scrollbar"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#9ca3af #e5e7eb'
                } as React.CSSProperties}
            >
                <div className="flex flex-col items-center p-4 w-full">
                    <BlueprintBlocks
                        sensors={sensors}
                        handleDragEnd={handleDragEnd}
                        isAddBlockDrawerOpen={isAddBlockDrawerOpen}
                        setIsAddBlockDrawerOpen={setIsAddBlockDrawerOpen}
                    />
                    <BlockConfigDrawer />
                    <AddNewChildBlock />
                </div>
                {executionResultsDrawer}
            </div>
        </div>
    )
});
