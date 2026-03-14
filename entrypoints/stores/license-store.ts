import { makeAutoObservable, runInAction } from 'mobx';
import { getLicenseState, verifyLicense, deactivateLicense, type LicenseState } from '@/core/license';

class LicenseStore {
    isActivated: boolean = false;
    licenseKey: string | null = null;
    plan: string | null = null;
    status: LicenseState['status'] = 'inactive';
    isLoading: boolean = true;

    constructor() {
        makeAutoObservable(this);
        this.checkLicense();
    }

    async checkLicense() {
        runInAction(() => { this.isLoading = true; });

        try {
            const state = await verifyLicense();
            runInAction(() => {
                this.isActivated = state.isActivated;
                this.licenseKey = state.licenseKey;
                this.plan = state.plan;
                this.status = state.status;
                this.isLoading = false;
            });
        } catch (e) {
            // Fallback to cached state
            const cached = await getLicenseState();
            runInAction(() => {
                this.isActivated = cached.isActivated;
                this.licenseKey = cached.licenseKey;
                this.plan = cached.plan;
                this.status = cached.status;
                this.isLoading = false;
            });
        }
    }

    async deactivate() {
        await deactivateLicense();
        runInAction(() => {
            this.isActivated = false;
            this.licenseKey = null;
            this.plan = null;
            this.status = 'inactive';
        });
    }

    markActivated() {
        this.isActivated = true;
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
