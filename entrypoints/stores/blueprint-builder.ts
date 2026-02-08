import { makeAutoObservable } from "mobx";
import { Blueprint } from "../models/blueprint";
import { Block } from "../models/types";

export class BlueprintBuilderStore {
    blueprints: Blueprint[] = [];
    selectedBlueprint?: Blueprint | null = null;
    selectedBlock?: Block | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    createBlueprint(name: string, description: string) {
        const blueprint = new Blueprint(name, description);
        this.blueprints.push(blueprint);
        this.selectedBlueprint = blueprint;
    }

    addBlueprint(blueprint: Blueprint) {
        this.blueprints.push(blueprint);
    }

    removeBlueprint(blueprint: Blueprint) {
        this.blueprints = this.blueprints.filter(b => b.id !== blueprint.id);
    }

    getBlueprintById(id: string) {
        return this.blueprints.find(b => b.id === id);
    }

    selectBlueprint(blueprint: Blueprint) {
        this.selectedBlueprint = blueprint;
    }

    selectBlock(block: Block | null) {
        this.selectedBlock = block;
    }

    /**
     * Creates a new block, adds it to the selected blueprint, and selects it for configuration
     */
    addBlockToBlueprint(block: Block) {
        if (this.selectedBlueprint) {
            this.selectedBlueprint.addBlock(block);
            this.selectedBlock = block;
        }
    }

    /**
     * Removes a block from the selected blueprint
     */
    removeBlockFromBlueprint(block: Block) {
        if (this.selectedBlueprint) {
            this.selectedBlueprint.removeBlock(block);
            // Clear selection if the removed block was selected
            if (this.selectedBlock === block) {
                this.selectedBlock = null;
            }
        }
    }

    /**
     * Clears the current block selection
     */
    clearBlockSelection() {
        this.selectedBlock = null;
    }
}

const blueprintBuilderStore = new BlueprintBuilderStore();

export const useBlueprintBuilderStore = () => {
    return blueprintBuilderStore;
}