/**
 * Network Activity Monitor - Detect when page is truly idle
 * This helps avoid premature actions on dynamic content
 */

export class NetworkMonitor {
    private pendingRequests = new Set<string>();
    private idleTimeout: number | null = null;
    private onIdleCallback?: () => void;

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupMonitoring();
        }
    }

    private setupMonitoring() {
        // Monitor fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const requestId = `fetch_${Date.now()}_${Math.random()}`;
            this.pendingRequests.add(requestId);

            try {
                const response = await originalFetch(...args);
                this.pendingRequests.delete(requestId);
                this.checkIdle();
                return response;
            } catch (err) {
                this.pendingRequests.delete(requestId);
                this.checkIdle();
                throw err;
            }
        };

        // Monitor XHR requests
        const XHR = XMLHttpRequest.prototype;
        const originalOpen = XHR.open;
        const originalSend = XHR.send;

        XHR.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
            // @ts-ignore
            this._requestId = `xhr_${Date.now()}_${Math.random()}`;
            return originalOpen.call(this, method, url, async ?? true, username, password);
        };

        XHR.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
            // @ts-ignore
            const requestId = this._requestId;
            if (requestId) {
                // Access the monitor through a global reference
                const monitor = (window as any).__octoGrabNetworkMonitor__;
                if (monitor) {
                    monitor.pendingRequests.add(requestId);

                    this.addEventListener('loadend', () => {
                        monitor.pendingRequests.delete(requestId);
                        monitor.checkIdle();
                    });
                }
            }
            return originalSend.call(this, body);
        };

        // Store reference for XHR monitoring
        (window as any).__octoGrabNetworkMonitor__ = this;
    }

    private checkIdle() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
        }

        if (this.pendingRequests.size === 0) {
            this.idleTimeout = window.setTimeout(() => {
                if (this.onIdleCallback) {
                    this.onIdleCallback();
                }
            }, 500); // 500ms of no activity = idle
        }
    }

    waitForIdle(timeoutMs: number = 10000): Promise<void> {
        return new Promise((resolve) => {
            // If already idle, resolve immediately
            if (this.pendingRequests.size === 0) {
                resolve();
                return;
            }

            // Set timeout
            const timeout = setTimeout(() => {
                this.onIdleCallback = undefined;
                resolve();
            }, timeoutMs);

            // Wait for idle
            this.onIdleCallback = () => {
                clearTimeout(timeout);
                this.onIdleCallback = undefined;
                resolve();
            };
        });
    }

    getActiveRequestCount(): number {
        return this.pendingRequests.size;
    }
}
