import { makeAutoObservable, runInAction } from 'mobx';
import { getLicenseState, verifyLicense, deactivateLicense, type LicenseState } from '@/core/license';
import { useNotificationStore } from './notification-store';
import { isDevMode } from '@/core/dev-mode';

export const FREE_TIER_LIMITS = {
    maxBlueprints: 1,
    maxBlocksPerBlueprint: 10,
} as const;

const FREE_USER_STORAGE_KEY = 'octograb_free_user';

class LicenseStore {
    isActivated: boolean = false;
    isFreeUser: boolean = false;
    licenseKey: string | null = null;
    plan: string | null = null;
    status: LicenseState['status'] = 'inactive';
    isLoading: boolean = true;

    constructor() {
        makeAutoObservable(this);
        this.checkLicense();
    }

    get isProUser(): boolean {
        return this.isActivated && !this.isFreeUser;
    }

    async checkLicense() {
        // Dev mode: skip all license checks, act as pro user
        if (isDevMode()) {
            runInAction(() => {
                this.isActivated = true;
                this.isFreeUser = false;
                this.plan = 'dev';
                this.status = 'active';
                this.isLoading = false;
            });
            return;
        }

        runInAction(() => { this.isLoading = true; });

        try {
            // Check if user previously chose free tier
            const freeStored = await browser.storage.local.get(FREE_USER_STORAGE_KEY);
            const wasFree = freeStored[FREE_USER_STORAGE_KEY] === true;

            const state = await verifyLicense();
            runInAction(() => {
                this.isActivated = state.isActivated;
                this.licenseKey = state.licenseKey;
                this.plan = state.plan;
                this.status = state.status;
                // Keep free user flag if they were free and haven't activated a license
                this.isFreeUser = !state.isActivated && wasFree;
                this.isLoading = false;
            });

            // Notify on grace period
            if (state.status === 'grace') {
                try { useNotificationStore().notifyLicenseGracePeriod(); } catch { /* non-critical */ }
            }
        } catch (e) {
            // Fallback to cached state
            const freeStored = await browser.storage.local.get(FREE_USER_STORAGE_KEY);
            const wasFree = freeStored[FREE_USER_STORAGE_KEY] === true;

            const cached = await getLicenseState();
            runInAction(() => {
                this.isActivated = cached.isActivated;
                this.licenseKey = cached.licenseKey;
                this.plan = cached.plan;
                this.status = cached.status;
                this.isFreeUser = !cached.isActivated && wasFree;
                this.isLoading = false;
            });
        }
    }

    async continueFree() {
        await browser.storage.local.set({ [FREE_USER_STORAGE_KEY]: true });
        runInAction(() => {
            this.isFreeUser = true;
            this.plan = 'free';
        });
    }

    async deactivate() {
        await deactivateLicense();
        runInAction(() => {
            this.isActivated = false;
            this.licenseKey = null;
            this.plan = null;
            this.status = 'inactive';
            this.isFreeUser = false;
        });
        await browser.storage.local.remove(FREE_USER_STORAGE_KEY);
    }

    markActivated() {
        this.isActivated = true;
        this.isFreeUser = false;
        this.status = 'active';
        this.checkLicense();
    }
}

let licenseStoreInstance: LicenseStore | null = null;

export function useLicenseStore(): LicenseStore {
    if (!licenseStoreInstance) {
        licenseStoreInstance = new LicenseStore();
    }
    return licenseStoreInstance;
}

export { LicenseStore };
