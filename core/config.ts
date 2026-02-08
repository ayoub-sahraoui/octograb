/**
 * Global Configuration - Centralized settings management
 */

export interface ScraperConfig {
    // Execution Settings
    execution: {
        maxRetries: number;
        retryDelay: number;
        navigationTimeout: number;
        pageLoadTimeout: number;
        elementWaitTimeout: number;
        networkIdleWait: boolean;
    };

    // Performance Settings
    performance: {
        enableCache: boolean;
        cacheTTL: number;
        maxConcurrentRequests: number;
        throttleDelay: number;
    };

    // Safety Settings
    safety: {
        maxLoopIterations: number;
        maxPaginationPages: number;
        maxNestingDepth: number;
        respectRobotsTxt: boolean;
    };

    // Debugging
    debug: {
        verboseLogging: boolean;
        captureScreenshots: boolean;
        saveHTML: boolean;
        logNetworkRequests: boolean;
    };

    // User Agent
    userAgent: string;
}

export const DEFAULT_CONFIG: ScraperConfig = {
    execution: {
        maxRetries: 2,
        retryDelay: 1000,
        navigationTimeout: 30000,
        pageLoadTimeout: 30000,
        elementWaitTimeout: 10000,
        networkIdleWait: true
    },
    performance: {
        enableCache: true,
        cacheTTL: 5000,
        maxConcurrentRequests: 3,
        throttleDelay: 300
    },
    safety: {
        maxLoopIterations: 1000,
        maxPaginationPages: 100,
        maxNestingDepth: 10,
        respectRobotsTxt: false
    },
    debug: {
        verboseLogging: false,
        captureScreenshots: false,
        saveHTML: false,
        logNetworkRequests: false
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

export class ConfigManager {
    private config: ScraperConfig;

    constructor(customConfig?: Partial<ScraperConfig>) {
        this.config = this.mergeConfig(DEFAULT_CONFIG, customConfig);
    }

    get(key?: string): any {
        if (!key) return this.config;

        const parts = key.split('.');
        let value: any = this.config;

        for (const part of parts) {
            value = value?.[part];
            if (value === undefined) break;
        }

        return value;
    }

    set(key: string, value: any) {
        const parts = key.split('.');
        let obj: any = this.config;

        for (let i = 0; i < parts.length - 1; i++) {
            obj = obj[parts[i]];
        }

        obj[parts[parts.length - 1]] = value;
    }

    reset() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }

    private mergeConfig(base: ScraperConfig, custom?: Partial<ScraperConfig>): ScraperConfig {
        if (!custom) return JSON.parse(JSON.stringify(base));

        return {
            execution: { ...base.execution, ...custom.execution },
            performance: { ...base.performance, ...custom.performance },
            safety: { ...base.safety, ...custom.safety },
            debug: { ...base.debug, ...custom.debug },
            userAgent: custom.userAgent || base.userAgent
        };
    }

    exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    importConfig(jsonString: string) {
        try {
            const parsed = JSON.parse(jsonString);
            this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
        } catch (error) {
            throw new Error('Invalid configuration JSON');
        }
    }
}
