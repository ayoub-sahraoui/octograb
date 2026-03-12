import { Button } from "@/components/ui/button";
import { Download, Upload, Trash2, Database, Info, AlertCircle, Activity, ArrowLeft } from "lucide-react";
import { db } from "@/core/database";
import { useState } from "react";
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export default observer(function Settings() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);

    const loadStats = async () => {
        const statistics = await db.getStatistics();
        setStats(statistics);
    };

    useState(() => {
        loadStats();
    });

    const handleExportDatabase = async () => {
        try {
            const data = await db.exportDatabase();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `octograb-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export database:', error);
            alert('Failed to export database');
        }
    };

    const handleImportDatabase = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                try {
                    const text = await file.text();
                    await db.importDatabase(text);
                    await blueprintBuilderStore.loadBlueprints();
                    await loadStats();
                    alert('Database imported successfully!');
                } catch (error) {
                    console.error('Failed to import database:', error);
                    alert('Failed to import database');
                }
            }
        };
        input.click();
    };

    const handleClearDatabase = async () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            if (confirm('This will delete all blueprints, execution history, and settings. Are you absolutely sure?')) {
                try {
                    await db.plans.clear();
                    await db.executionHistory.clear();
                    await db.jobs.clear();
                    await db.progress.clear();
                    await blueprintBuilderStore.loadBlueprints();
                    executorStore.clearResults();
                    await loadStats();
                    alert('Database cleared successfully');
                } catch (error) {
                    console.error('Failed to clear database:', error);
                    alert('Failed to clear database');
                }
            }
        }
    };

    const handleClearExecutionHistory = async () => {
        if (confirm('Are you sure you want to clear all execution history?')) {
            try {
                await db.executionHistory.clear();
                await loadStats();
                alert('Execution history cleared');
            } catch (error) {
                console.error('Failed to clear execution history:', error);
                alert('Failed to clear execution history');
            }
        }
    };

    return (
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex items-center gap-2">
                {blueprintBuilderStore.selectedBlueprint && (
                    <Button size="icon" variant="outline" onClick={() => navigate('/blueprint-builder')} title="Back to Builder">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                )}
                <h1 className="text-xl font-semibold ml-2">Settings</h1>
            </div>
            <div className="flex-1 bg-gray-100 p-4 border border-gray-300 rounded-lg flex flex-col gap-6 overflow-y-auto">

                {/* Database Statistics */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Database Statistics</h2>
                    </div>
                    {stats ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Blueprints</p>
                                <p className="text-2xl font-semibold">{stats.totalPlans}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Executions</p>
                                <p className="text-2xl font-semibold">{stats.totalExecutions}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Total Blocks</p>
                                <p className="text-2xl font-semibold">{stats.totalBlocks}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Success Rate</p>
                                <p className="text-2xl font-semibold">{stats.successRate}%</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Loading statistics...</p>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadStats}
                        className="mt-4"
                    >
                        Refresh Stats
                    </Button>
                </div>

                <Separator />

                {/* Execution Settings */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Execution Settings</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Enable Logs</Label>
                                <p className="text-xs text-gray-500">Record execution logs (may impact performance)</p>
                            </div>
                            <Switch
                                checked={executorStore.enableLogs}
                                onCheckedChange={(checked) => executorStore.updateSettings(checked, executorStore.enableTrace)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium">Enable Trace</Label>
                                <p className="text-xs text-gray-500">Record detailed execution trace (may impact performance)</p>
                            </div>
                            <Switch
                                checked={executorStore.enableTrace}
                                onCheckedChange={(checked) => executorStore.updateSettings(executorStore.enableLogs, checked)}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Database Management */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <Database className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">Database Management</h2>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-sm font-medium">Export Database</Label>
                            <p className="text-xs text-gray-500 mb-2">Download all your blueprints and data as a JSON file</p>
                            <Button
                                variant="outline"
                                onClick={handleExportDatabase}
                                className="w-full gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export Database
                            </Button>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Import Database</Label>
                            <p className="text-xs text-gray-500 mb-2">Restore from a previously exported backup</p>
                            <Button
                                variant="outline"
                                onClick={handleImportDatabase}
                                className="w-full gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Import Database
                            </Button>
                        </div>

                        <div>
                            <Label className="text-sm font-medium">Clear Execution History</Label>
                            <p className="text-xs text-gray-500 mb-2">Remove all execution logs and history</p>
                            <Button
                                variant="outline"
                                onClick={handleClearExecutionHistory}
                                className="w-full gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear History
                            </Button>
                        </div>

                        <div>
                            <Label className="text-sm font-medium text-destructive">Clear All Data</Label>
                            <p className="text-xs text-gray-500 mb-2">Delete everything (blueprints, history, settings)</p>
                            <Button
                                variant="destructive"
                                onClick={handleClearDatabase}
                                className="w-full gap-2 text-white"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All Data
                            </Button>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* About */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">About</h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Extension Name</span>
                            <span className="font-medium">OctoGrab</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Version</span>
                            <span className="font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Database</span>
                            <span className="font-medium">Dexie.js (IndexedDB)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
});
