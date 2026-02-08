import { v4 as uuidv4 } from 'uuid';
import { toJS, makeAutoObservable } from 'mobx';
import { Block } from './types';

export class Blueprint {
    id: string;
    name: string;
    description: string;
    blocks: Block[];

    constructor(name: string, description: string) {
        this.id = uuidv4();
        this.name = name;
        this.description = description;
        this.blocks = [];
        makeAutoObservable(this);
    }

    addBlock(block: Block) {
        this.blocks.push(block);
    }

    removeBlock(block: Block) {
        this.blocks = this.blocks.filter(b => b.id !== block.id);
    }

    toJSON() {
    return toJS(this);
  }
}