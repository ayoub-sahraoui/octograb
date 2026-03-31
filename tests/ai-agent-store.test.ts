import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageState = vi.hoisted(() => ({
    data: {} as Record<string, any>,
}));

const storageGet = vi.hoisted(() => vi.fn(async (keys: string[] | string) => {
    if (Array.isArray(keys)) {
        return keys.reduce<Record<string, any>>((acc, key) => {
            if (key in storageState.data) {
                acc[key] = storageState.data[key];
            }
            return acc;
        }, {});
    }

    return keys in storageState.data
        ? { [keys]: storageState.data[keys] }
        : {};
}));

const storageSet = vi.hoisted(() => vi.fn(async (value: Record<string, any>) => {
    Object.assign(storageState.data, value);
}));

vi.mock('wxt/browser', () => ({
    browser: {
        storage: {
            local: {
                get: storageGet,
                set: storageSet,
            },
        },
    },
}));

describe('ai agent store', () => {
    beforeEach(() => {
        vi.resetModules();
        storageGet.mockClear();
        storageSet.mockClear();
        storageState.data = {};
    });

    it('persists model changes when setModel is called', async () => {
        const { useAiAgentStore } = await import('../entrypoints/stores/ai-agent-store');
        const store = useAiAgentStore();

        await store.setModel('gpt-4.1-mini');

        expect(store.model).toBe('gpt-4.1-mini');
        expect(storageSet).toHaveBeenCalledWith({
            ai_selected_model: 'gpt-4.1-mini',
        });
    });
});
