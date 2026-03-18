import React, { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store'
import { Button } from '@/components/ui/button'
import { Download, FileJson, FileSpreadsheet, Trash2, Database, ArrowLeft, Clock, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db, ExecutionHistory } from '@/core/database'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default observer(function ExtractedData() {
    const executorStore = useBlueprintExecutorStore();
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const navigate = useNavigate();
    const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const history = await db.getRecentExecutions(20);
        setExecutionHistory(history.filter(h => h.itemsScraped > 0));
    };

    const loadExecutionData = async (execution: ExecutionHistory) => {
        if (execution.id) {
            await executorStore.loadExecutionData(execution.id);
        }
    };

    const hasCurrentData = executorStore.extractedData.length > 0;

    return (
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className='flex justify-between items-center shrink-0'>
                <div className="flex items-center gap-1 shrink-0">
                    {blueprintBuilderStore.selectedBlueprint && (
                        <Button size="icon" variant="outline" onClick={() => navigate('/blueprint-builder')} title="Back to Builder" className="h-8 w-8">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <h1 className="text-lg font-semibold ml-1">Extracted Data</h1>
                </div>
                <div className='flex gap-1'>
                    {hasCurrentData && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => executorStore.downloadCSV()} className="gap-1 h-8 px-2 text-xs">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                CSV
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => executorStore.downloadExcel()} className="gap-1 h-8 px-2 text-xs">
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Excel
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => executorStore.downloadJSON()} className="gap-1 h-8 px-2 text-xs">
                                <FileJson className="w-3.5 h-3.5" />
                                JSON
                            </Button>
                            <Button size="sm" variant="ghost" onClick={async () => { if (executorStore.currentExecutionId) { await executorStore.deleteExecution(executorStore.currentExecutionId); } else { executorStore.clearResults(); } await loadHistory(); }} className="text-destructive hover:text-destructive h-8 w-8 p-0">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-gray-100 p-3 border border-gray-300 rounded-lg flex flex-col overflow-hidden min-h-0">
                {hasCurrentData ? (
                    <>
                        {/* Summary */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-xs text-muted-foreground">
                            <span>{executorStore.extractedData.length} rows</span>
                            <span>{executorStore.extractedColumns.length} columns</span>
                            {executorStore.duration !== null && (
                                <span>Extracted in {executorStore.durationFormatted}</span>
                            )}
                            {executorStore.runningBlueprintName && (
                                <span className="font-medium text-gray-700">{executorStore.runningBlueprintName}</span>
                            )}
                            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${executorStore.status === 'completed' ? 'bg-green-100 text-green-700' :
                                executorStore.status === 'error' ? 'bg-red-100 text-red-700' :
                                    executorStore.status === 'running' ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {executorStore.status}
                            </span>
                        </div>

                        {/* Data Table */}
                        <div className="flex-1 overflow-auto border rounded-lg bg-white">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px] sticky top-0 bg-white">#</TableHead>
                                        {executorStore.extractedColumns.map(col => (
                                            <TableHead key={col} className="sticky top-0 bg-white">{col}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {executorStore.extractedData.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="text-muted-foreground text-xs font-mono">{idx + 1}</TableCell>
                                            {executorStore.extractedColumns.map(col => (
                                                <TableCell key={col} className="max-w-[150px] truncate text-xs whitespace-nowrap" title={String(row[col] ?? '')}>
                                                    {String(row[col] ?? '')}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                ) : executionHistory.length > 0 ? (
                    <div className="flex-1 flex flex-col gap-2 overflow-auto p-2">
                        <p className="text-sm text-muted-foreground mb-2">Previous executions with data:</p>
                        {executionHistory.map((exec) => (
                            <div
                                key={exec.id}
                                className="relative bg-white p-3 pr-10 border rounded-lg flex items-center gap-3 cursor-pointer hover:ring-2 transition-all"
                                onClick={() => loadExecutionData(exec)}
                            >
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={async (e) => { e.stopPropagation(); if (exec.id) { await executorStore.deleteExecution(exec.id); await loadHistory(); } }}
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <Database className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{exec.planName}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${exec.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            exec.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                exec.status === 'stopped' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {exec.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span>{exec.itemsScraped} rows</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {exec.startedAt ? new Date(exec.startedAt).toLocaleString() : 'Unknown'}
                                        </span>
                                        {exec.duration && <span>{Math.round(exec.duration / 1000)}s</span>}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Database className="w-12 h-12 text-gray-300" />
                        <div className="text-center">
                            <h2 className="text-lg font-medium text-gray-500">No Data Yet</h2>
                            <p className="text-sm">Run a blueprint with extraction blocks to see data here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
});
