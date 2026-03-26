import { Button } from "@/components/ui/button";
import { Download, Upload, Trash2, Database, Info, AlertCircle, Activity, ArrowLeft, KeyRound, LogOut, Zap, Bot, Eye, EyeOff } from "lucide-react";
import { db } from "@/core/database";
import { useState, useEffect } from "react";
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { useBlueprintExecutorStore } from '@/entrypoints/stores/blueprint-executor-store';
import { useLicenseStore, FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store';
import { useAiAgentStore } from '@/entrypoints/stores/ai-agent-store';
import { PROVIDERS } from '@/core/ai/providers';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirm } from '../components/confirm-dialog';

export default observer(function Settings() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const executorStore = useBlueprintExecutorStore();
    const licenseStore = useLicenseStore();
    const aiStore = useAiAgentStore();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const { confirm: showConfirm, alert: showAlert } = useConfirm();

    const loadStats = async () => {
        const statistics = await db.getStatistics();
        setStats(statistics);
    };

    useEffect(() => {
        loadStats();
    }, []);

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
            showAlert('Export Failed', 'Failed to export database');
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
                    showAlert('Import Complete', 'Database imported successfully!');
                } catch (error) {
                    console.error('Failed to import database:', error);
                    showAlert('Import Failed', 'Failed to import database');
                }
            }
        };
        input.click();
    };

    const handleClearDatabase = async () => {
        const first = await showConfirm({ title: 'Clear All Data', description: 'Are you sure you want to clear ALL data? This cannot be undone!', variant: 'destructive', confirmLabel: 'Continue' });
        if (!first) return;
        const second = await showConfirm({ title: 'Are you absolutely sure?', description: 'This will delete all blueprints, execution history, and settings.', variant: 'destructive', confirmLabel: 'Delete Everything' });
        if (!second) return;
        try {
            await db.plans.clear();
            await db.executionHistory.clear();
            await db.jobs.clear();
            await db.progress.clear();
            await blueprintBuilderStore.loadBlueprints();
            executorStore.clearResults();
            await loadStats();
            await showAlert('Success', 'Database cleared successfully');
        } catch (error) {
            console.error('Failed to clear database:', error);
            await showAlert('Error', 'Failed to clear database');
        }
    };

    const handleClearExecutionHistory = async () => {
        const ok = await showConfirm({ title: 'Clear History', description: 'Are you sure you want to clear all execution history?', variant: 'destructive', confirmLabel: 'Clear' });
        if (!ok) return;
        try {
            await db.executionHistory.clear();
            await loadStats();
            await showAlert('Success', 'Execution history cleared');
        } catch (error) {
            console.error('Failed to clear execution history:', error);
            await showAlert('Error', 'Failed to clear execution history');
        }
    };

    return (
        <div className="h-full flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => navigate('/')} title="Back to Home" className="h-8 w-8">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-xl font-semibold">Settings</h1>
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

                {/* AI Assistant */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <Bot className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-semibold">AI Assistant</h2>
                    </div>
                    <div className="space-y-4">
                        {/* Provider selector */}
                        <div>
                            <Label className="text-sm font-medium">Provider</Label>
                            <p className="text-xs text-gray-500 mb-2">Choose your LLM provider</p>
                            <Select value={aiStore.provider} onValueChange={(v) => aiStore.setProvider(v as any)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(PROVIDERS).map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{p.label}</span>
                                                <span className="text-xs text-gray-400">{p.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* API Key for selected provider */}
                        <div>
                            <Label className="text-sm font-medium">{aiStore.providerConfig.label} API Key</Label>
                            <p className="text-xs text-gray-500 mb-2">
                                Your key is stored locally and never sent to our servers.{' '}
                                <a
                                    href={aiStore.providerConfig.apiKeyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 underline"
                                >
                                    Get a key
                                </a>
                            </p>
                            <div className="relative">
                                <Input
                                    type={showApiKey ? 'text' : 'password'}
                                    placeholder={aiStore.providerConfig.apiKeyPlaceholder}
                                    value={aiStore.apiKey}
                                    onChange={(e) => aiStore.setApiKey(aiStore.provider, e.target.value)}
                                    className="pr-10 font-mono text-xs"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {aiStore.hasApiKey && (
                                <p className="text-xs text-emerald-600 mt-1">✓ API key configured</p>
                            )}
                        </div>

                        {/* Model selector */}
                        <div>
                            <Label className="text-sm font-medium">Model</Label>
                            <p className="text-xs text-gray-500 mb-2">Select which model to use from {aiStore.providerConfig.label}</p>
                            <Select value={aiStore.model} onValueChange={(v) => aiStore.setModel(v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {aiStore.providerConfig.models.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.label}{m.recommended ? ' (recommended)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

                {/* License */}
                <div className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                        <KeyRound className="w-5 h-5" />
                        <h2 className="text-lg font-semibold">License</h2>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Plan</span>
                            <span className={`font-medium ${licenseStore.isFreeUser ? 'text-amber-600' : licenseStore.isActivated ? 'text-green-600' : 'text-gray-600'}`}>
                                {licenseStore.isFreeUser ? 'Free' : licenseStore.isActivated ? 'Pro' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-medium ${licenseStore.status === 'active' ? 'text-green-600' :
                                licenseStore.status === 'grace' ? 'text-yellow-600' :
                                    licenseStore.isFreeUser ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                {licenseStore.isFreeUser ? '● Free Plan' :
                                    licenseStore.status === 'active' ? '● Active' :
                                        licenseStore.status === 'grace' ? '● Grace Period' : '● ' + licenseStore.status}
                            </span>
                        </div>
                        {licenseStore.licenseKey && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">License Key</span>
                                <span className="font-mono text-xs">
                                    {licenseStore.licenseKey.slice(0, 9)}...{licenseStore.licenseKey.slice(-4)}
                                </span>
                            </div>
                        )}
                        {licenseStore.isFreeUser && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                                <p className="font-medium">Free Plan Limits:</p>
                                <p>{FREE_TIER_LIMITS.maxBlueprints} blueprint, {FREE_TIER_LIMITS.maxBlocksPerBlueprint} blocks max per blueprint</p>
                            </div>
                        )}
                    </div>
                    {licenseStore.isFreeUser && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => window.open('https://octograb.online/pricing.html', '_blank')}
                            className="mt-4 w-full gap-2"
                        >
                            <Zap className="w-4 h-4" />
                            Upgrade to Pro
                        </Button>
                    )}
                    {licenseStore.isActivated && licenseStore.licenseKey && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                const ok = await showConfirm({ title: 'Deactivate License', description: 'Are you sure you want to deactivate this device? You can reactivate later with your license key.', variant: 'destructive', confirmLabel: 'Deactivate' });
                                if (ok) await licenseStore.deactivate();
                            }}
                            className="mt-4 w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <LogOut className="w-4 h-4" />
                            Deactivate License
                        </Button>
                    )}
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
                            <span className="font-medium">local database</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
});
