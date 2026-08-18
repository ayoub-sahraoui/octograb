import { v4 as uuidv4 } from 'uuid';
import { toJS, makeAutoObservable } from 'mobx';
import { Block } from './types';
import { createBlockFromJSON } from './block-factory';

export class Blueprint {
    id: string;
    name: string;
    description: string;
    blocks: Block[];
    /** Schema version for migration support */
    version: number;

    constructor(name: string, description: string) {
        this.id = uuidv4();
        this.name = name;
        this.description = description;
        this.blocks = [];
        this.version = 1; // Current schema version
        makeAutoObservable(this);
    }

    addBlock(block: Block) {
        block.index = this.blocks.length;
        this.blocks.push(block);
    }

    removeBlock(block: Block) {
        this.blocks = this.blocks.filter(b => b.id !== block.id);
        this.updateIndices();
    }

    reorderBlock(block: Block, newIndex: number) {
        const container: Block[] | undefined = block.parent
            ? (block.parentBranch === 'elseChildren'
                ? (block.parent as any).elseChildren
                : block.parent.children)
            : this.blocks;

        if (!container) return;

        const currentIndex = container.findIndex(b => b.id === block.id);
        if (currentIndex === -1) return;

        // Clamp newIndex to valid range
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= container.length) newIndex = container.length - 1;

        if (currentIndex === newIndex) return;

        const [movedBlock] = container.splice(currentIndex, 1);
        container.splice(newIndex, 0, movedBlock);

        this.updateIndices(container);
    }

    setName(name: string) {
        this.name = name;
    }

    updateIndices(container: Block[] = this.blocks) {
        container.forEach((b, i) => {
            b.index = i;
        });
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            version: this.version,
            blocks: this.blocks.map(b => this.serializeBlock(b))
        };
    }

    private serializeBlock(block: Block): any {
        const serialized: any = {
            id: block.id,
            type: block.type,
            label: block.label,
            description: block.description,
            config: toJS(block.config),
            enabled: block.enabled,
            maxRetries: block.maxRetries,
            retryDelay: block.retryDelay,
            maxExecutionTime: block.maxExecutionTime,
            onError: block.onError,
            index: block.index
        };

        if (block.children && block.children.length > 0) {
            serialized.children = block.children.map(child => this.serializeBlock(child));
        }

        if ((block as any).elseChildren && (block as any).elseChildren.length > 0) {
            serialized.elseChildren = (block as any).elseChildren.map((child: Block) => this.serializeBlock(child));
        }

        return serialized;
    }

    static fromJSON(json: any): Blueprint {
        const blueprint = new Blueprint(json.name, json.description);
        blueprint.id = json.id;
        blueprint.version = json.version || 1; // Default to version 1 if not specified
        if (json.blocks && json.blocks.length > 0) {
            blueprint.blocks = json.blocks.map((b: any) => createBlockFromJSON(b));
        }
        return blueprint;
    }
}
