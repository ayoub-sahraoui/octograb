/**
 * Database Utility Hooks - Convenient React hooks for database operations
 */

import { useState, useEffect } from 'react';
import { db } from './database';
import { SavedPlan, Job } from './types';

/**
 * Hook to get database statistics
 */
export function useDatabaseStats() {
    const [stats, setStats] = useState({
        totalPlans: 0,
        totalJobs: 0,
        totalExecutions: 0,
        completedExecutions: 0,
        totalItemsScraped: 0,
        successRate: 0
    });
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        const newStats = await db.getStatistics();
        setStats(newStats);
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, []);

    return { stats, loading, refresh };
}

/**
 * Hook to manage execution history for a specific plan
 */
export function useExecutionHistory(planId: string | null) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (planId) {
            loadHistory();
        }
    }, [planId]);

    const loadHistory = async () => {
        if (!planId) return;
        setLoading(true);
        const executions = await db.getExecutionsByPlan(planId);
        setHistory(executions);
        setLoading(false);
    };

    return { history, loading, refresh: loadHistory };
}

/**
 * Hook for database export/import
 */
export function useDatabaseBackup() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    const exportDatabase = async () => {
        setExporting(true);
        try {
            const blob = await db.exportDatabase();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `octograb-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return { success: true };
        } catch (error: any) {
            console.error('Export failed:', error);
            return { success: false, error: error.message };
        } finally {
            setExporting(false);
        }
    };

    const importDatabase = async (file: File) => {
        setImporting(true);
        try {
            const text = await file.text();
            await db.importDatabase(text);
            return { success: true };
        } catch (error: any) {
            console.error('Import failed:', error);
            return { success: false, error: error.message };
        } finally {
            setImporting(false);
        }
    };

    const clearAllData = async () => {
        if (!confirm('⚠️ This will delete ALL your data. Are you absolutely sure?')) {
            return { success: false, error: 'Cancelled' };
        }

        if (!confirm('Last chance! This cannot be undone. Delete everything?')) {
            return { success: false, error: 'Cancelled' };
        }

        try {
            await db.clearAllData();
            return { success: true };
        } catch (error: any) {
            console.error('Clear failed:', error);
            return { success: false, error: error.message };
        }
    };

    return { exportDatabase, importDatabase, clearAllData, exporting, importing };
}

/**
 * Hook to search plans
 */
export function useSearchPlans() {
    const [results, setResults] = useState<SavedPlan[]>([]);
    const [searching, setSearching] = useState(false);

    const search = async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        setSearching(true);
        const found = await db.searchPlans(query);
        setResults(found);
        setSearching(false);
    };

    return { results, searching, search };
}
