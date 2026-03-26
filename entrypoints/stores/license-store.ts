import { makeAutoObservable } from 'mobx';
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

    // ─── Action Methods ────────────────────────────────────────────────────

    setLicenseState(state: Partial<LicenseStore>) {
        if (state.isActivated !== undefined) this.isActivated = state.isActivated;
        if (state.isFreeUser !== undefined) this.isFreeUser = state.isFreeUser;
        if (state.licenseKey !== undefined) this.licenseKey = state.licenseKey;
        if (state.plan !== undefined) this.plan = state.plan;
        if (state.status !== undefined) this.status = state.status;
        if (state.isLoading !== undefined) this.isLoading = state.isLoading;
    }

    setLoading(loading: boolean) {
        this.isLoading = loading;
    }

    resetLicense() {
        this.isActivated = false;
        this.licenseKey = null;
        this.plan = null;
        this.status = 'inactive';
        this.isFreeUser = false;
    }

    // ─── Async Methods ─────────────────────────────────────────────────────

    async checkLicense() {
        // Dev mode: skip all license checks, act as pro user
        if (isDevMode()) {
            this.setLicenseState({
                isActivated: true,
                isFreeUser: false,
                plan: 'dev',
                status: 'active',
                isLoading: false
            });
            return;
        }

        this.setLoading(true);

        try {
            // Check if user previously chose free tier
            const freeStored = await browser.storage.local.get(FREE_USER_STORAGE_KEY);
            const wasFree = freeStored[FREE_USER_STORAGE_KEY] === true;

            const state = await verifyLicense();
            this.setLicenseState({
                isActivated: state.isActivated,
                licenseKey: state.licenseKey,
                plan: state.plan,
                status: state.status,
                isFreeUser: !state.isActivated && wasFree,
                isLoading: false
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
            this.setLicenseState({
                isActivated: cached.isActivated,
                licenseKey: cached.licenseKey,
                plan: cached.plan,
                status: cached.status,
                isFreeUser: !cached.isActivated && wasFree,
                isLoading: false
            });
        }
    }

    async continueFree() {
        await browser.storage.local.set({ [FREE_USER_STORAGE_KEY]: true });
        this.setLicenseState({ isFreeUser: true, plan: 'free' });
    }

    async deactivate() {
        await deactivateLicense();
        this.resetLicense();
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
