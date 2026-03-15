import { makeAutoObservable, runInAction, toJS } from "mobx";
import { Blueprint } from "../models/blueprint";
import { Block } from "../models/types";
import { sendToContentScript, onMessageFromContentScript } from "@/core/messaging";
import { db } from "@/core/database";
import { createBlockFromJSON } from "../models/block-factory";
import { validateBlueprint, ValidationResult } from "../models/blueprint-validator";

export class BlueprintBuilderStore {
    blueprints: Blueprint[] = [];
    selectedBlueprint?: Blueprint | null = null;
    selectedBlock?: Block | null = null;
    parentBlockForChild?: Block | null = null;

    // Validation state
    validationResult: ValidationResult | null = null;

    // Element picker state
    isPicking: boolean = false;
    pickingCallback: ((css: string, xpath: string) => void) | null = null;
    private _messageCleanup: (() => void) | null = null;

    constructor() {
        makeAutoObservable(this, {
            pickingCallback: false,
        });
        this.initMessageListener();
        this.loadBlueprints();
    }

    async loadBlueprints() {
        try {
            const savedPlans = await db.getAllPlans();
            runInAction(() => {
                this.blueprints = savedPlans.map(savedPlan => {
                    const plan = savedPlan.plan;
                    // Reconstruct Blueprint from Plan
                    const blueprint = new Blueprint(plan.meta.name, ''); // Description not in PlanMeta?
                    blueprint.id = savedPlan.id;
                    // We need to map Plan.pipeline (Block[]) to Blueprint.blocks
                    // But wait, Plan.pipeline is Block[] which IS compatible with Blueprint.blocks?
                    // Let's check types. Block in types.ts vs Block in models.
                    // They should be the same.
                    if (plan.pipeline) {
                        blueprint.blocks = plan.pipeline.map((b: any) => createBlockFromJSON(b));
                    }
                    return blueprint;
                });
            });
        } catch (error) {
            console.error('[OctoGrab] Failed to load blueprints:', error);
        }
    }

    async saveBlueprint(blueprint: Blueprint) {
        try {
            const json = blueprint.toJSON();
            // Construct a Plan object from Blueprint
            const plan: any = {
                meta: {
                    name: blueprint.name,
                    version: '1.0.0',
                    userAgent: navigator.userAgent
                },
                variables: {
                    baseUrl: '' // TODO: Add capabilities for variables
                },
                pipeline: json.blocks // Blueprint.blocks maps to Plan.pipeline
            };

            await db.savePlan({
                id: blueprint.id,
                name: blueprint.name,
                plan: plan,
                updatedAt: new Date().toISOString(),
            });

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
            runInAction(() => {
                this.blueprints = this.blueprints.filter(b => b.id !== blueprint.id);
                if (this.selectedBlueprint?.id === blueprint.id) {
                    this.selectedBlueprint = null;
                }
            });
        } catch (error) {
            console.error('[OctoGrab] Failed to delete blueprint:', error);
        }
    }

    private initMessageListener() {
        this._messageCleanup = onMessageFromContentScript((message) => {
            if (message.type === 'ELEMENT_SELECTED' && this.pickingCallback) {
                const { selector, xpath } = message.data;
                this.pickingCallback(selector, xpath);
            }

            if (message.type === 'PICKING_DONE') {
                runInAction(() => {
                    this.isPicking = false;
                    this.pickingCallback = null;
                });
            }
        });
    }

    /**
     * Start the element picker in the content script.
     * When an element is selected, the callback is invoked with the CSS selector and XPath.
     * The callback is called on every selection (not just once), so the UI can update in real-time.
     */
    async startPicking(
        onSelect: (css: string, xpath: string) => void,
        parentSelector: string | null = null
    ) {
        this.isPicking = true;
        this.pickingCallback = onSelect;

        const response = await sendToContentScript({
            type: 'START_PICKING',
            parentSelector,
        });

        if (!response.success) {
            runInAction(() => {
                this.isPicking = false;
                this.pickingCallback = null;
            });
            console.error('[OctoGrab] Failed to start picking:', response.error);
            return false;
        }
        return true;
    }

    async stopPicking() {
        await sendToContentScript({ type: 'STOP_PICKING' });
        runInAction(() => {
            this.isPicking = false;
            this.pickingCallback = null;
        });
    }

    createBlueprint(name: string, description: string) {
        const blueprint = new Blueprint(name, description);
        this.blueprints.push(blueprint);
        this.selectedBlueprint = blueprint;
        this.saveBlueprint(blueprint);
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

    addBlockToBlueprint(block: Block) {
        if (this.selectedBlueprint) {
            this.selectedBlueprint.addBlock(block);
            this.selectedBlock = block;
            this.validateCurrentBlueprint();
            this.saveBlueprint(this.selectedBlueprint);
        }
    }

    setParentBlockForChild(block: Block | null) {
        this.parentBlockForChild = block;
    }

    addChildBlockToParent(childBlock: Block) {
        if (this.parentBlockForChild) {
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
        }
    }

    removeBlockFromBlueprint(block: Block) {
        if (block.parent) {
            if (block.parent.children) {
                block.parent.children = block.parent.children.filter(b => b.id !== block.id);
            }
            // Clear parent reference
            block.parent = null;
        } else if (this.selectedBlueprint) {
            // Remove from root blueprint
            this.selectedBlueprint.removeBlock(block);
        }

        // Clear selection if the removed block was selected
        if (this.selectedBlock === block) {
            this.selectedBlock = null;
        }

        if (this.selectedBlueprint) {
            this.saveBlueprint(this.selectedBlueprint);
        }
    }

    clearBlockSelection() {
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

    async duplicateBlueprint(blueprint: Blueprint) {
        try {
            const json = blueprint.toJSON();
            const copy = new Blueprint(`${json.name} (Copy)`, json.description || '');
            if (json.blocks && json.blocks.length > 0) {
                copy.blocks = json.blocks.map((b: any) => createBlockFromJSON(b));
            }
            runInAction(() => {
                this.blueprints.push(copy);
            });
            await this.saveBlueprint(copy);
        } catch (error) {
            console.error('[OctoGrab] Failed to duplicate blueprint:', error);
        }
    }

    async importBlueprint(jsonContent: string) {
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.name || !Array.isArray(parsed.blocks)) {
                throw new Error('Invalid blueprint format');
            }

            // Create new blueprint
            const blueprint = new Blueprint(parsed.name, parsed.description || '');

            // Re-create blocks using factory to ensure they are instances of Block classes
            blueprint.blocks = parsed.blocks.map((b: any) => createBlockFromJSON(b));

            // Save and select
            runInAction(() => {
                this.blueprints.push(blueprint);
                this.selectedBlueprint = blueprint;
            });

            await this.saveBlueprint(blueprint);
            return true;
        } catch (e) {
            console.error('Failed to import blueprint:', e);
            return false;
        }
    }
}

const blueprintBuilderStore = new BlueprintBuilderStore();

export const useBlueprintBuilderStore = () => {
    return blueprintBuilderStore;
}