import { browser } from 'wxt/browser';

const STORAGE_KEY = 'octograbExecutionFrame';

export interface ExecutionFrameSessionState {
    activeTabId: number;
}

export async function setExecutionFrameSessionState(tabId: number): Promise<void> {
    await browser.storage.session.set({
        [STORAGE_KEY]: { activeTabId: tabId } satisfies ExecutionFrameSessionState,
    });
}

export async function getExecutionFrameSessionState(): Promise<ExecutionFrameSessionState | null> {
    const result = await browser.storage.session.get(STORAGE_KEY);
    return (result?.[STORAGE_KEY] as ExecutionFrameSessionState | undefined) ?? null;
}

export async function isExecutionFrameActiveForTab(tabId: number): Promise<boolean> {
    const state = await getExecutionFrameSessionState();
    return state?.activeTabId === tabId;
}

export async function clearExecutionFrameSessionState(): Promise<void> {
    await browser.storage.session.remove(STORAGE_KEY);
}
