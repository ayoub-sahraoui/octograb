import { makeAutoObservable } from 'mobx';
import { db, AppNotification } from '@/core/database';

class NotificationStore {
    notifications: AppNotification[] = [];
    unreadCount: number = 0;
    isLoaded: boolean = false;

    constructor() {
        makeAutoObservable(this);
        this.load();
    }

    // ─── Action Methods ────────────────────────────────────────────────────

    setNotifications(notifications: AppNotification[]) {
        this.notifications = notifications;
    }

    addNotification(notification: AppNotification) {
        this.notifications.unshift(notification);
        this.unreadCount++;
    }

    setUnreadCount(count: number) {
        this.unreadCount = count;
    }

    setLoaded(loaded: boolean) {
        this.isLoaded = loaded;
    }

    markNotificationReadLocal(id: number) {
        const n = this.notifications.find(n => n.id === id);
        if (n && !n.read) {
            n.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
    }

    markAllReadLocal() {
        this.notifications.forEach(n => { n.read = true; });
        this.unreadCount = 0;
    }

    dismissNotificationLocal(id: number) {
        const idx = this.notifications.findIndex(n => n.id === id);
        if (idx !== -1) {
            const n = this.notifications[idx];
            if (!n.read) {
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }
            this.notifications.splice(idx, 1);
        }
    }

    clearAllLocal() {
        this.notifications = [];
        this.unreadCount = 0;
    }

    // ─── Async Methods ─────────────────────────────────────────────────────

    async load() {
        try {
            const [notifs, count] = await Promise.all([
                db.getAllNotifications(50),
                db.getUnreadCount(),
            ]);
            this.setNotifications(notifs.filter(n => !n.dismissed));
            this.setUnreadCount(count);
            this.setLoaded(true);

            // Run cleanup on load (remove >30 day old notifications)
            db.cleanupOldNotifications(30).catch(() => { });

            // Check for first-launch welcome
            await this.checkWelcome();
        } catch (e) {
            console.error('[OctoGrab] Failed to load notifications:', e);
            this.setLoaded(true);
        }
    }

    private async checkWelcome() {
        const shown = await db.getSetting('welcome_notification_shown');
        if (!shown) {
            await this.push({
                type: 'info',
                category: 'system',
                title: 'Welcome to OctoGrab!',
                description: 'Get started by creating your first automation blueprint. Click the + button above to begin.',
            });
            await db.setSetting('welcome_notification_shown', true);
        }
    }

    async push(params: {
        type: AppNotification['type'];
        category: AppNotification['category'];
        title: string;
        description: string;
        metadata?: Record<string, any>;
    }) {
        try {
            const notification: Omit<AppNotification, 'id'> = {
                type: params.type,
                category: params.category,
                title: params.title,
                description: params.description,
                read: false,
                dismissed: false,
                createdAt: new Date().toISOString(),
                metadata: params.metadata,
            };
            const id = await db.addNotification(notification);
            const full: AppNotification = { ...notification, id };
            this.addNotification(full);
            return id;
        } catch (e) {
            console.error('[OctoGrab] Failed to push notification:', e);
        }
    }

    async markRead(id: number) {
        try {
            await db.markNotificationRead(id);
            this.markNotificationReadLocal(id);
        } catch (e) {
            console.error('[OctoGrab] Failed to mark notification read:', e);
        }
    }

    async markAllRead() {
        try {
            await db.markAllNotificationsRead();
            this.markAllReadLocal();
        } catch (e) {
            console.error('[OctoGrab] Failed to mark all read:', e);
        }
    }

    async dismiss(id: number) {
        try {
            await db.dismissNotification(id);
            this.dismissNotificationLocal(id);
        } catch (e) {
            console.error('[OctoGrab] Failed to dismiss notification:', e);
        }
    }

    async clearAll() {
        try {
            for (const n of this.notifications) {
                if (n.id) await db.dismissNotification(n.id);
            }
            this.clearAllLocal();
        } catch (e) {
            console.error('[OctoGrab] Failed to clear notifications:', e);
        }
    }

    // --- Contextual tip helpers ---

    async pushTipOnce(key: string, params: { title: string; description: string }) {
        const shown = await db.getSetting(`tip_shown_${key}`);
        if (!shown) {
            await this.push({
                type: 'tip',
                category: 'tip',
                title: params.title,
                description: params.description,
                metadata: { tipKey: key },
            });
            await db.setSetting(`tip_shown_${key}`, true);
        }
    }

    // --- Execution event helpers ---

    async notifyExecutionCompleted(blueprintName: string, rowCount: number, duration: string) {
        await this.push({
            type: 'success',
            category: 'execution',
            title: 'Blueprint completed',
            description: `"${blueprintName}" finished successfully. ${rowCount} rows extracted in ${duration}.`,
            metadata: { blueprintName, rowCount, duration },
        });
    }

    async notifyExecutionFailed(blueprintName: string, error: string) {
        await this.push({
            type: 'error',
            category: 'execution',
            title: 'Blueprint failed',
            description: `"${blueprintName}" failed: ${error}`,
            metadata: { blueprintName, error },
        });
    }

    async notifyExecutionStopped(blueprintName: string, rowCount: number) {
        await this.push({
            type: 'warning',
            category: 'execution',
            title: 'Blueprint stopped',
            description: `"${blueprintName}" was stopped. ${rowCount} rows extracted so far. You can resume later.`,
            metadata: { blueprintName, rowCount },
        });
    }

    // --- System notification helpers ---

    async notifyLicenseExpiring(daysLeft: number) {
        await this.push({
            type: 'warning',
            category: 'system',
            title: 'License expiring soon',
            description: `Your license will expire in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to keep using Pro features.`,
            metadata: { daysLeft },
        });
    }

    async notifyLicenseGracePeriod() {
        await this.push({
            type: 'warning',
            category: 'system',
            title: 'License verification failed',
            description: 'Unable to verify your license. Running in grace period. Check your internet connection.',
        });
    }
}

let notificationStoreInstance: NotificationStore | null = null;

export function useNotificationStore(): NotificationStore {
    if (!notificationStoreInstance) {
        notificationStoreInstance = new NotificationStore();
    }
    return notificationStoreInstance;
}

export { NotificationStore };
