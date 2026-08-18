import { makeAutoObservable, toJS } from "mobx";
import { Blueprint } from "../models/blueprint";
import { Block } from "../models/types";
import { sendToContentScript, onMessageFromContentScript } from "@/core/messaging";
import { db } from "@/core/database";
import { createBlockFromJSON } from "../models/block-factory";
import { deserializeSavedPlanToBlueprint, serializeBlueprintToSavedPlan } from "../models/blueprint-persistence";
import { validateBlueprint, ValidationResult } from "../models/blueprint-validator";
import { useLicenseStore, FREE_TIER_LIMITS } from "./license-store";
import { useNotificationStore } from "./notification-store";
import { isDevMode } from '@/core/dev-mode';


function countBlocksRecursive(blocks: Block[]): number {
    let count = 0;
    for (const block of blocks) {
        count++;
        if (block.children && block.children.length > 0) {
            count += countBlocksRecursive(block.children);
        }
        if ((block as any).elseChildren && (block as any).elseChildren.length > 0) {
            count += countBlocksRecursive((block as any).elseChildren);
        }
    }
    return count;
}

// ─── Undo/redo storage (module-level, completely outside MobX) ────────────
const _undoStack: string[] = [];
const _redoStack: string[] = [];
let _isUndoRedoAction = false;
const MAX_UNDO_STACK = 50;

export class BlueprintBuilderStore {
    blueprints: Blueprint[] = [];
    selectedBlueprint: Blueprint | null = null;
    selectedBlock: Block | null = null;
    parentBlockForChild: Block | null = null;
    macroSourceBlock: Block | null = null;

    // Validation state
    validationResult: ValidationResult | null = null;

    // Element picker state
    isPicking: boolean = false;
    pickingCallback: ((css: string, xpath: string, elementInfo?: { tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> }) => void) | null = null;
    pickingDoneCallback: ((success: boolean) => void) | null = null;
    pendingCss: string = '';
    pendingXpath: string = '';
    pendingElementInfo: { tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> } | null = null;
    private _messageCleanup: (() => void) | null = null;
    private _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
    autoSavePending: boolean = false;

    // Bumped to let canUndo/canRedo recompute (the only observable piece of undo)
    undoVersion = 0;

    constructor() {
        makeAutoObservable(this);
        this.initMessageListener();
        this.loadBlueprints();
    }

    // ─── Action Methods ────────────────────────────────────────────────────

    setBlueprints(blueprints: Blueprint[]) {
        this.blueprints = blueprints;
    }

    setAutoSavePending(pending: boolean) {
        this.autoSavePending = pending;
    }

    removeBlueprintFromList(blueprintId: string) {
        this.blueprints = this.blueprints.filter(b => b.id !== blueprintId);
    }

    addBlueprintToList(blueprint: Blueprint) {
        this.blueprints.push(blueprint);
    }

    clearPickingState() {
        this.isPicking = false;
        this.pickingCallback = null;
        this.pickingDoneCallback = null;
        this.pendingCss = '';
        this.pendingXpath = '';
        this.pendingElementInfo = null;
    }

    setPendingCss(css: string) {
        this.pendingCss = css;
    }

    setPendingXpath(xpath: string) {
        this.pendingXpath = xpath;
    }

    setPendingSelectors(css: string, xpath: string, elementInfo?: { tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> }) {
        this.pendingCss = css;
        this.pendingXpath = xpath;
        if (elementInfo) {
            this.pendingElementInfo = elementInfo;
        }
    }

    // ─── Async Methods ─────────────────────────────────────────────────────

    async loadBlueprints() {
        try {
            const savedPlans = await db.getAllPlans();
            const blueprints = savedPlans.map((savedPlan) => deserializeSavedPlanToBlueprint(savedPlan));
            this.setBlueprints(blueprints);
        } catch (error) {
            console.error('[OctoGrab] Failed to load blueprints:', error);
        }
    }

    // ─── Undo / Redo ────────────────────────────────────────────────────

    get canUndo(): boolean { void this.undoVersion; return _undoStack.length > 0; }
    get canRedo(): boolean { void this.undoVersion; return _redoStack.length > 0; }

    pushSnapshot() {
        if (_isUndoRedoAction) return;
        const bp = this.selectedBlueprint;
        if (!bp) return;
        const snapshot = JSON.stringify(toJS(bp), (key, value) => key === 'parent' ? undefined : value);
        _undoStack.push(snapshot);
        if (_undoStack.length > MAX_UNDO_STACK) {
            _undoStack.shift();
        }
        // Any new change clears the redo stack
        _redoStack.length = 0;
        this.undoVersion++;
    }

    undo() {
        if (!this.canUndo || !this.selectedBlueprint) return;
        // Save current state to redo stack
        const currentSnapshot = JSON.stringify(toJS(this.selectedBlueprint), (key, value) => key === 'parent' ? undefined : value);
        _redoStack.push(currentSnapshot);
        // Pop last snapshot from undo stack
        const snapshot = _undoStack.pop()!;
        this.undoVersion++;
        this._applySnapshot(snapshot);
    }

    redo() {
        if (!this.canRedo || !this.selectedBlueprint) return;
        // Save current state to undo stack
        const currentSnapshot = JSON.stringify(toJS(this.selectedBlueprint), (key, value) => key === 'parent' ? undefined : value);
        _undoStack.push(currentSnapshot);
        // Pop from redo stack
        const snapshot = _redoStack.pop()!;
        this.undoVersion++;
        this._applySnapshot(snapshot);
    }

    private _applySnapshot(snapshot: string) {
        const bp = this.selectedBlueprint;
        if (!bp) return;
        try {
            _isUndoRedoAction = true;
            const parsed = JSON.parse(snapshot);
            bp.name = parsed.name;
            bp.description = parsed.description || '';
            bp.blocks = (parsed.blocks || []).map((b: any) => createBlockFromJSON(b));
            this.selectedBlock = null;
            this.validateCurrentBlueprint();
            this.triggerAutoSave();
        } catch (e) {
            console.error('[OctoGrab] Failed to apply undo/redo snapshot:', e);
        } finally {
            _isUndoRedoAction = false;
        }
    }

    clearUndoHistory() {
        _undoStack.length = 0;
        _redoStack.length = 0;
        this.undoVersion++;
    }

    // ─── Auto-save ──────────────────────────────────────────────────────

    triggerAutoSave() {
        if (!this.selectedBlueprint) return;
        const bp = this.selectedBlueprint;
        if (this._autoSaveTimer) clearTimeout(this._autoSaveTimer);
        this.setAutoSavePending(true);
        this._autoSaveTimer = setTimeout(() => {
            this.saveBlueprint(bp).then(() => {
                this.setAutoSavePending(false);
            });
        }, 1500);
    }

    async saveBlueprint(blueprint: Blueprint) {
        try {
            await db.savePlan(serializeBlueprintToSavedPlan(blueprint));

            // Clear any stale resumable checkpoint when blueprint config changes
            const { useBlueprintExecutorStore } = await import('./blueprint-executor-store');
            const executorStore = useBlueprintExecutorStore();
            if (executorStore.hasResumableCheckpoint(blueprint.id)) {
                await executorStore.clearResumableCheckpoint(blueprint.id);
            }
        } catch (error) {
            console.error('[OctoGrab] Failed to save blueprint:', error);
        }
    }

    async deleteBlueprint(blueprint: Blueprint) {
        try {
            await db.deletePlan(blueprint.id);
            this.removeBlueprintFromList(blueprint.id);
            if (this.selectedBlueprint?.id === blueprint.id) {
                this.selectedBlueprint = null;
            }
        } catch (error) {
            console.error('[OctoGrab] Failed to delete blueprint:', error);
        }
    }

    private initMessageListener() {
        this._messageCleanup = onMessageFromContentScript((message) => {
            if (message.type === 'ELEMENT_SELECTED' && this.pickingCallback) {
                const { selector, xpath, elementInfo } = message.data;
                this.pickingCallback(selector, xpath, elementInfo);
            }

            if (message.type === 'PICKING_DONE') {
                const doneCallback = this.pickingDoneCallback;
                const success = message.data?.success ?? false;
                // Don't clear state yet - let the callback access pending values first
                if (doneCallback) {
                    doneCallback(success);
                }
                this.clearPickingState();
            }
        });
    }

    /**
     * Start the element picker in the content script.
     * When an element is selected, the callback is invoked with the CSS selector and XPath.
     * The callback is called on every selection (not just once), so the UI can update in real-time.
     */
    async startPicking(
        onSelect: (css: string, xpath: string, elementInfo?: { tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> }) => void,
        parentSelector: string | null = null,
        onDone?: (success: boolean) => void,
        mode: 'single' | 'multiple' | 'list' = 'single'
    ) {
        this.isPicking = true;
        this.pickingCallback = onSelect;
        this.pickingDoneCallback = onDone || null;
        this.pendingCss = '';
        this.pendingXpath = '';

        const response = await sendToContentScript({
            type: 'START_PICKING',
            data: {
                mode,
                parentSelector,
            }
        });

        if (!response.success) {
            this.clearPickingState();
            console.error('[OctoGrab] Failed to start picking:', response.error);
            return false;
        }
        return true;
    }

    async stopPicking() {
        if (!this.isPicking) return;

        const response = await sendToContentScript({ type: 'STOP_PICKING' });
        if (!response.success) {
            this.clearPickingState();
        }
    }

    get isFreeTier(): boolean {
        if (isDevMode()) return false;
        const licenseStore = useLicenseStore();
        return licenseStore.isFreeUser && !licenseStore.isProUser;
    }

    get canCreateBlueprint(): boolean {
        if (!this.isFreeTier) return true;
        return this.blueprints.length < FREE_TIER_LIMITS.maxBlueprints;
    }

    canAddBlock(blueprint?: Blueprint | null): boolean {
        if (!this.isFreeTier) return true;
        const bp = blueprint || this.selectedBlueprint;
        if (!bp) return false;
        return countBlocksRecursive(bp.blocks) < FREE_TIER_LIMITS.maxBlocksPerBlueprint;
    }

    createBlueprint(name: string, description: string): boolean {
        if (!this.canCreateBlueprint) return false;
        const blueprint = new Blueprint(name, description);
        this.blueprints.push(blueprint);
        this.selectedBlueprint = blueprint;
        this.saveBlueprint(blueprint);

        // Tip on first blueprint
        try {
            useNotificationStore().pushTipOnce('first_blueprint', {
                title: 'Tip: Add blocks to your blueprint',
                description: 'Use the + button to add navigation, click, input, loop, and extract blocks to build your automation.',
            });
        } catch { /* non-critical */ }

        return true;
    }

    addBlueprint(blueprint: Blueprint) {
        this.blueprints.push(blueprint);
    }

    removeBlueprint(blueprint: Blueprint) {
        this.deleteBlueprint(blueprint);
    }

    getBlueprintById(id: string) {
        return this.blueprints.find(b => b.id === id);
    }

    async openSavedBlueprintById(id: string): Promise<Blueprint | null> {
        await this.loadBlueprints();
        const blueprint = this.getBlueprintById(id) || null;
        if (blueprint) {
            this.selectBlueprint(blueprint);
        }
        return blueprint;
    }

    openDraftBlueprint(blueprint: Blueprint): Blueprint {
        const existing = this.getBlueprintById(blueprint.id);
        if (!existing) {
            this.addBlueprintToList(blueprint);
        }
        const target = existing || blueprint;
        this.selectBlueprint(target);
        return target;
    }


    selectBlueprint(blueprint: Blueprint) {
        this.selectedBlueprint = blueprint;
        this.validateCurrentBlueprint();
    }

    validateCurrentBlueprint() {
        if (this.selectedBlueprint) {
            this.validationResult = validateBlueprint(this.selectedBlueprint);
        } else {
            this.validationResult = null;
        }
    }

    get hasValidationErrors(): boolean {
        return this.validationResult ? !this.validationResult.valid : false;
    }

    get hasValidationWarnings(): boolean {
        return this.validationResult ? this.validationResult.warnings.length > 0 : false;
    }

    selectBlock(block: Block | null) {
        this.selectedBlock = block;
    }

    addBlockToBlueprint(block: Block): boolean {
        if (this.selectedBlueprint) {
            if (!this.canAddBlock()) return false;
            this.selectedBlueprint.addBlock(block);
            this.selectedBlock = block;
            this.validateCurrentBlueprint();
            this.saveBlueprint(this.selectedBlueprint);
            return true;
        }
        return false;
    }

    setParentBlockForChild(block: Block | null) {
        this.parentBlockForChild = block;
    }

    setMacroSourceBlock(block: Block | null) {
        this.macroSourceBlock = block;
    }

    addChildBlockToParent(childBlock: Block): boolean {
        if (this.parentBlockForChild) {
            if (!this.canAddBlock()) return false;
            // Initialize children array if it doesn't exist
            if (!this.parentBlockForChild.children) {
                this.parentBlockForChild.children = [];
            }
            // Set parent reference on the child block
            childBlock.parent = this.parentBlockForChild;
            // Add child to parent's children array
            this.parentBlockForChild.children.push(childBlock);
            this.selectedBlock = childBlock;
            this.parentBlockForChild = null; // Close the drawer
            this.validateCurrentBlueprint();
            if (this.selectedBlueprint) {
                void this.saveBlueprint(this.selectedBlueprint);
            }
            return true;
        }
        return false;
    }

    removeBlockFromBlueprint(block: Block) {
        if (block.parent) {
            const parent = block.parent;
            const container = block.parentBranch === 'elseChildren'
                ? ((parent as any).elseChildren as Block[] | undefined)
                : parent.children;

            if (container) {
                const filtered = container.filter(b => b.id !== block.id);
                if (block.parentBranch === 'elseChildren') {
                    (parent as any).elseChildren = filtered;
                } else {
                    parent.children = filtered;
                }
                filtered.forEach((child, index) => {
                    child.index = index;
                });
            }
            // Clear parent reference
            block.parent = null;
        } else if (this.selectedBlueprint) {
            // Remove from root blueprint
            this.selectedBlueprint.removeBlock(block);
        }

        // Clear selection if the removed block was selected
        if (this.selectedBlock === block) {
            if (this.isPicking) {
                void this.stopPicking();
            }
            this.selectedBlock = null;
        }

        if (this.selectedBlueprint) {
            this.validateCurrentBlueprint();
            this.saveBlueprint(this.selectedBlueprint);
        }
    }

    clearBlockSelection() {
        if (this.isPicking) {
            void this.stopPicking();
        }
        this.selectedBlock = null;
    }

    exportBlueprint() {
        if (this.selectedBlueprint) {
            return JSON.stringify(toJS(this.selectedBlueprint), (key, value) => {
                if (key === 'parent') return undefined;
                return value;
            }, 2);
        }
        return null;
    }

    async duplicateBlueprint(blueprint: Blueprint): Promise<boolean> {
        if (!this.canCreateBlueprint) return false;
        try {
            const json = blueprint.toJSON();
            const copy = new Blueprint(`${json.name} (Copy)`, json.description || '');
            if (json.blocks && json.blocks.length > 0) {
                copy.blocks = json.blocks.map((b: any) => createBlockFromJSON(b));
            }
            this.addBlueprintToList(copy);
            await this.saveBlueprint(copy);
            return true;
        } catch (error) {
            console.error('[OctoGrab] Failed to duplicate blueprint:', error);
            return false;
        }
    }

    async importBlueprint(jsonContent: string): Promise<{ success: boolean; warnings?: string[]; errors?: string[] }> {
        if (!this.canCreateBlueprint) return { success: false, errors: ['Blueprint limit reached. Upgrade to create more blueprints.'] };
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.name || !Array.isArray(parsed.blocks)) {
                throw new Error('Invalid blueprint format: missing name or blocks array');
            }

            // Create new blueprint
            const blueprint = new Blueprint(parsed.name, parsed.description || '');

            // Re-create blocks using factory to ensure they are instances of Block classes
            blueprint.blocks = parsed.blocks.map((b: any) => createBlockFromJSON(b));

            // Validate the imported blueprint before saving
            const validation = validateBlueprint(blueprint);
            if (validation.errors.length > 0) {
                console.warn('[OctoGrab] Imported blueprint has validation errors:', validation.errors);
            }
            if (validation.warnings.length > 0) {
                console.warn('[OctoGrab] Imported blueprint has warnings:', validation.warnings);
            }

            if (validation.errors.length > 0) {
                return {
                    success: false,
                    warnings: validation.warnings.map(w => w.message),
                    errors: validation.errors.map(e => e.message),
                };
            }

            // Save and select (warnings are allowed; errors are blocked above)
            this.addBlueprintToList(blueprint);
            this.selectedBlueprint = blueprint;

            await this.saveBlueprint(blueprint);
            return {
                success: true,
                warnings: validation.warnings.map(w => w.message),
                errors: validation.errors.map(e => e.message),
            };
        } catch (e: any) {
            console.error('Failed to import blueprint:', e);
            return { success: false, errors: [e.message || 'Failed to import blueprint'] };
        }
    }

}

const blueprintBuilderStore = new BlueprintBuilderStore();

export const useBlueprintBuilderStore = () => {
    return blueprintBuilderStore;
}
