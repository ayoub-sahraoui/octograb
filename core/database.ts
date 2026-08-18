/**
 * Dexie Database - Local persistent storage for plans, jobs, and user data
 */

import Dexie, { Table } from 'dexie';
import { SavedPlan, Job, Plan, ExecutionResult } from './types';

export interface ExecutionHistory {
    id?: number;
    planId: string;
    planName: string;
    startedAt: string;
    completedAt?: string;
    status: 'running' | 'completed' | 'failed' | 'stopped';
    itemsScraped: number;
    results: ExecutionResult[];
    logs: string[];
    duration?: number;
}

export interface UserSettings {
    id?: number;
    key: string;
    value: any;
    updatedAt: string;
}

export interface AppNotification {
    id?: number;
    type: 'success' | 'error' | 'warning' | 'info' | 'tip';
    category: 'execution' | 'system' | 'tip';
    title: string;
    description: string;
    read: boolean;
    dismissed: boolean;
    createdAt: string;
    metadata?: Record<string, any>;
}

export interface ScraperProgress {
    id?: number;
    planId: string;
    executionId: number;
    blockId: string;
    loopIndex?: number; // Deprecated - kept for backward compatibility
    loopState?: Record<string, number>; // New: track multiple loop levels by blockId
    timestamp: number;
    url: string;
    completed: boolean;
}

export class OctoGrabDatabase extends Dexie {
    // Declare tables
    plans!: Table<SavedPlan, string>;
    jobs!: Table<Job, string>;
    executionHistory!: Table<ExecutionHistory, number>;
    settings!: Table<UserSettings, number>;
    progress!: Table<ScraperProgress, number>;
    notifications!: Table<AppNotification, number>;

    constructor() {
        super('OctoGrabDB');

        // Define schema
        this.version(1).stores({
            plans: 'id, name, updatedAt',
            jobs: 'id, planName, status, submittedAt',
            executionHistory: '++id, planId, startedAt, status',
            settings: '++id, &key, updatedAt',
            progress: '++id, planId, executionId, blockId, timestamp'
        });

        this.version(2).stores({
            plans: 'id, name, updatedAt',
            jobs: 'id, planName, status, submittedAt',
            executionHistory: '++id, planId, startedAt, status',
            settings: '++id, &key, updatedAt',
            progress: '++id, planId, executionId, blockId, timestamp',
            notifications: '++id, type, category, read, dismissed, createdAt'
        });
    }

    // Helper methods for Plans
    async savePlan(plan: SavedPlan): Promise<string> {
        await this.plans.put(plan);
        return plan.id;
    }

    async getPlan(id: string): Promise<SavedPlan | undefined> {
        return await this.plans.get(id);
    }

    async getAllPlans(): Promise<SavedPlan[]> {
        return await this.plans.orderBy('updatedAt').reverse().toArray();
    }

    async deletePlan(id: string): Promise<void> {
        await this.plans.delete(id);
    }

    async searchPlans(query: string): Promise<SavedPlan[]> {
        const lowerQuery = query.toLowerCase();
        return await this.plans
            .filter(plan =>
                plan.name.toLowerCase().includes(lowerQuery) ||
                plan.plan.meta?.name.toLowerCase().includes(lowerQuery)
            )
            .toArray();
    }

    // Helper methods for Jobs
    async createJob(job: Job): Promise<string> {
        await this.jobs.put(job);
        return job.id;
    }

    async getJob(id: string): Promise<Job | undefined> {
        return await this.jobs.get(id);
    }

    async getAllJobs(): Promise<Job[]> {
        return await this.jobs.orderBy('submittedAt').reverse().toArray();
    }

    async updateJobStatus(id: string, status: Job['status'], duration?: string, items?: number): Promise<void> {
        await this.jobs.update(id, { status, duration, items });
    }

    async deleteJob(id: string): Promise<void> {
        await this.jobs.delete(id);
    }

    async clearCompletedJobs(): Promise<number> {
        return await this.jobs.where('status').anyOf(['completed', 'failed']).delete();
    }

    // Helper methods for Execution History
    async saveExecution(execution: ExecutionHistory): Promise<number> {
        return await this.executionHistory.add(execution);
    }

    async getExecution(id: number): Promise<ExecutionHistory | undefined> {
        return await this.executionHistory.get(id);
    }

    async getExecutionsByPlan(planId: string): Promise<ExecutionHistory[]> {
        return await this.executionHistory
            .where('planId')
            .equals(planId)
            .reverse()
            .toArray();
    }

    async updateExecution(id: number, updates: Partial<ExecutionHistory>): Promise<void> {
        await this.executionHistory.update(id, updates);
    }

    async getRecentExecutions(limit: number = 10): Promise<ExecutionHistory[]> {
        return await this.executionHistory
            .orderBy('startedAt')
            .reverse()
            .limit(limit)
            .toArray();
    }

    async getAllExecutions(): Promise<ExecutionHistory[]> {
        return await this.executionHistory
            .orderBy('startedAt')
            .reverse()
            .toArray();
    }

    async deleteExecution(id: number): Promise<void> {
        await this.executionHistory.delete(id);
    }

    /**
     * Clean up old execution history, keeping only the most recent N entries.
     * Also strips full results from entries older than `keepResultsDays` days to save storage.
     */
    async cleanupExecutionHistory(maxEntries: number = 100, keepResultsDays: number = 30): Promise<number> {
        const all = await this.executionHistory.orderBy('startedAt').reverse().toArray();
        let cleaned = 0;

        // Delete entries beyond maxEntries
        if (all.length > maxEntries) {
            const toDelete = all.slice(maxEntries);
            for (const exec of toDelete) {
                if (exec.id) {
                    await this.executionHistory.delete(exec.id);
                    await this.progress.where('executionId').equals(exec.id).delete();
                    cleaned++;
                }
            }
        }

        // Strip results from old entries to save space (keep metadata)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - keepResultsDays);
        const cutoffStr = cutoff.toISOString();

        const remaining = await this.executionHistory.toArray();
        for (const exec of remaining) {
            if (exec.id && exec.startedAt < cutoffStr && exec.results && exec.results.length > 0) {
                await this.executionHistory.update(exec.id, { results: [], logs: [] });
            }
        }

        return cleaned;
    }

    // Helper methods for Notifications
    async addNotification(notification: Omit<AppNotification, 'id'>): Promise<number> {
        return await this.notifications.add(notification as AppNotification);
    }

    async getNotifications(limit: number = 50): Promise<AppNotification[]> {
        return await this.notifications
            .where('dismissed').equals(0)
            .reverse()
            .sortBy('createdAt');
    }

    async getAllNotifications(limit: number = 50): Promise<AppNotification[]> {
        return await this.notifications
            .orderBy('createdAt')
            .reverse()
            .limit(limit)
            .toArray();
    }

    async markNotificationRead(id: number): Promise<void> {
        await this.notifications.update(id, { read: true });
    }

    async markAllNotificationsRead(): Promise<void> {
        await this.notifications.where('read').equals(0).modify({ read: true });
    }

    async dismissNotification(id: number): Promise<void> {
        await this.notifications.update(id, { dismissed: true });
    }

    async getUnreadCount(): Promise<number> {
        return await this.notifications
            .where('dismissed').equals(0)
            .and(n => !n.read)
            .count();
    }

    async cleanupOldNotifications(maxAge: number = 30): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - maxAge);
        const cutoffStr = cutoff.toISOString();
        return await this.notifications
            .where('createdAt').below(cutoffStr)
            .delete();
    }

    // Helper methods for Settings
    async getSetting(key: string): Promise<any> {
        const setting = await this.settings.get({ key });
        return setting?.value;
    }

    async setSetting(key: string, value: any): Promise<void> {
        const existing = await this.settings.get({ key });
        if (existing) {
            await this.settings.update(existing.id!, { value, updatedAt: new Date().toISOString() });
        } else {
            await this.settings.add({ key, value, updatedAt: new Date().toISOString() });
        }
    }

    async getAllSettings(): Promise<Record<string, any>> {
        const settings = await this.settings.toArray();
        return settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    }

    // Helper methods for Progress
    async saveProgress(progress: ScraperProgress): Promise<number> {
        return await this.progress.add(progress);
    }

    async getProgressByExecution(executionId: number): Promise<ScraperProgress[]> {
        return await this.progress
            .where('executionId')
            .equals(executionId)
            .toArray();
    }

    async clearProgressByExecution(executionId: number): Promise<void> {
        await this.progress.where('executionId').equals(executionId).delete();
    }

    async getLastCheckpoint(planId: string): Promise<ScraperProgress | undefined> {
        return await this.progress
            .where('planId')
            .equals(planId)
            .and(p => !p.completed)
            .reverse()
            .first();
    }

    // Utility methods
    async exportDatabase(): Promise<Blob> {
        const data = {
            plans: await this.plans.toArray(),
            jobs: await this.jobs.toArray(),
            executionHistory: await this.executionHistory.toArray(),
            settings: await this.settings.toArray(),
            exportedAt: new Date().toISOString(),
            version: this.verno
        };
        return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }

    async importDatabase(jsonData: string): Promise<void> {
        const data = JSON.parse(jsonData);

        await this.transaction('rw', this.plans, this.jobs, this.executionHistory, this.settings, async () => {
            if (data.plans) await this.plans.bulkPut(data.plans);
            if (data.jobs) await this.jobs.bulkPut(data.jobs);
            if (data.executionHistory) await this.executionHistory.bulkPut(data.executionHistory);
            if (data.settings) await this.settings.bulkPut(data.settings);
        });
    }

    async clearAllData(): Promise<void> {
        await this.transaction('rw', [this.plans, this.jobs, this.executionHistory, this.settings, this.progress], async () => {
            await this.plans.clear();
            await this.jobs.clear();
            await this.executionHistory.clear();
            await this.settings.clear();
            await this.progress.clear();
        });
    }

    async getStatistics() {
        const [totalPlans, totalJobs, totalExecutions] = await Promise.all([
            this.plans.count(),
            this.jobs.count(),
            this.executionHistory.count()
        ]);

        const completedExecutions = await this.executionHistory
            .where('status')
            .equals('completed')
            .count();

        const totalItemsScraped = await this.executionHistory
            .where('status')
            .equals('completed')
            .toArray()
            .then(execs => execs.reduce((sum, exec) => sum + exec.itemsScraped, 0));

        return {
            totalPlans,
            totalJobs,
            totalExecutions,
            completedExecutions,
            totalItemsScraped,
            successRate: totalExecutions > 0
                ? Math.round((completedExecutions / totalExecutions) * 100)
                : 0
        };
    }
}

// Export singleton instance
export const db = new OctoGrabDatabase();
