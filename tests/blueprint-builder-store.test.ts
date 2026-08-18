import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Blueprint } from '../entrypoints/models/blueprint';
import { ConditionBlock } from '../entrypoints/models/condition-block';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { SelectorType } from '../entrypoints/models/selector';
import { WaitBlock } from '../entrypoints/models/wait-block';
import { serializeBlueprintToSavedPlan } from '../entrypoints/models/blueprint-persistence';

const sendToContentScriptMock = vi.fn(async () => ({ success: true }));
let contentMessageHandler: ((message: any) => void) | null = null;

vi.mock('../core/database', () => ({
    db: {
        getAllPlans: vi.fn(async () => []),
        savePlan: vi.fn(async () => 'saved'),
        deletePlan: vi.fn(async () => undefined),
    },
}));

vi.mock('../core/messaging', () => ({
    sendToContentScript: sendToContentScriptMock,
    onMessageFromContentScript: vi.fn((handler) => {
        contentMessageHandler = handler;
        return () => {
            if (contentMessageHandler === handler) {
                contentMessageHandler = null;
            }
        };
    }),
}));

vi.mock('../entrypoints/stores/license-store', () => ({
    FREE_TIER_LIMITS: {
        maxBlueprints: 1,
        maxBlocksPerBlueprint: 10,
    },
    useLicenseStore: () => ({
        isFreeUser: false,
        isProUser: true,
    }),
}));

vi.mock('../entrypoints/stores/notification-store', () => ({
    useNotificationStore: () => ({
        pushTipOnce: vi.fn(),
    }),
}));

vi.mock('../core/dev-mode', () => ({
    isDevMode: () => false,
}));

vi.mock('../entrypoints/stores/blueprint-executor-store', () => ({
    useBlueprintExecutorStore: () => ({
        hasResumableCheckpoint: vi.fn(() => false),
        clearResumableCheckpoint: vi.fn(async () => undefined),
    }),
}));

describe('blueprint builder store', () => {
    beforeEach(async () => {
        vi.resetModules();
        sendToContentScriptMock.mockReset();
        sendToContentScriptMock.mockResolvedValue({ success: true });
        contentMessageHandler = null;
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        store.setBlueprints([]);
        store.selectBlueprint(null as any);
    });

    it('opens a saved blueprint by id after loading blueprints', async () => {
        const { db } = await import('../core/database');
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        const blueprint = new Blueprint('Saved Blueprint', 'Loaded from store');

        vi.mocked(db.getAllPlans).mockResolvedValueOnce([serializeBlueprintToSavedPlan(blueprint)]);

        const opened = await store.openSavedBlueprintById(blueprint.id);

        expect(opened?.id).toBe(blueprint.id);
        expect(store.selectedBlueprint?.id).toBe(blueprint.id);
    });

    it('opens a draft blueprint directly and adds it to the list if needed', async () => {
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        const draft = new Blueprint('Draft Blueprint', 'From AI');

        const opened = store.openDraftBlueprint(draft);

        expect(opened).toBe(draft);
        expect(store.blueprints).toContain(draft);
        expect(store.selectedBlueprint).toBe(draft);
    });

    it('saves the selected blueprint after adding a child block through the builder store', async () => {
        const { db } = await import('../core/database');
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        const blueprint = new Blueprint('Parent Blueprint', 'Builder persistence');
        const condition = new ConditionBlock({
            selector: { value: '.exists', type: SelectorType.CSS },
            check: 'exists',
        });

        store.addBlueprint(blueprint);
        store.selectBlueprint(blueprint);
        blueprint.addBlock(condition);
        store.setParentBlockForChild(condition);

        const beforeCalls = vi.mocked(db.savePlan).mock.calls.length;
        const added = store.addChildBlockToParent(new WaitBlock('Wait child', { type: 'timeout', timeout: 250 }));
        await Promise.resolve();

        expect(added).toBe(true);
        expect(condition.children).toHaveLength(1);
        expect(vi.mocked(db.savePlan).mock.calls.length).toBeGreaterThan(beforeCalls);
    });

    it('removes else-branch blocks from elseChildren instead of leaving them attached', async () => {
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        const blueprint = new Blueprint('Else branch blueprint', 'Branch removal');
        const condition = new ConditionBlock({
            selector: { value: '.exists', type: SelectorType.CSS },
            check: 'exists',
        });
        const elseWait = new WaitBlock('Else wait', { type: 'timeout', timeout: 500 });

        condition.addElseChild(elseWait);
        blueprint.addBlock(condition);
        store.addBlueprint(blueprint);
        store.selectBlueprint(blueprint);

        store.removeBlockFromBlueprint(elseWait);

        expect((condition as any).elseChildren).toHaveLength(0);
    });

    it('rejects invalid imported blueprints instead of saving them anyway', async () => {
        const { db } = await import('../core/database');
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();

        const beforeSaveCalls = vi.mocked(db.savePlan).mock.calls.length;
        const result = await store.importBlueprint(JSON.stringify({
            name: 'Broken import',
            blocks: [
                new NavigateBlock('Broken navigate', { url: '' }).toJSON?.() ?? {
                    id: 'broken-nav',
                    type: 'navigate',
                    label: 'Broken navigate',
                    config: { url: '' },
                },
            ],
        }));

        expect(result.success).toBe(false);
        expect(result.errors?.some((error) => error.includes('URL'))).toBe(true);
        expect(store.blueprints.some((blueprint) => blueprint.name === 'Broken import')).toBe(false);
        expect(vi.mocked(db.savePlan).mock.calls.length).toBe(beforeSaveCalls);
    });

    it('keeps picker state active until the content script confirms stop cleanup', async () => {
        const { useBlueprintBuilderStore } = await import('../entrypoints/stores/blueprint-builder-store');
        const store = useBlueprintBuilderStore();
        const onSelect = vi.fn();

        const started = await store.startPicking(onSelect);
        expect(started).toBe(true);
        expect(store.isPicking).toBe(true);

        await store.stopPicking();

        expect(sendToContentScriptMock).toHaveBeenLastCalledWith({ type: 'STOP_PICKING' });
        expect(store.isPicking).toBe(true);
        expect(store.pickingCallback).not.toBeNull();

        contentMessageHandler?.({
            type: 'PICKING_DONE',
            data: { success: false },
        });

        expect(store.isPicking).toBe(false);
        expect(store.pickingCallback).toBeNull();
    });
});
