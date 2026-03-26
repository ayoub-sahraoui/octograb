import { runInAction } from "mobx";
import { Block } from "./types";
import { NavigateBlock } from "./navigate-block";
import { ClickBlock } from "./click-block";
import { InputBlock } from "./input-block";
import { WaitBlock } from "./wait-block";
import { ScrollBlock } from "./scroll-block";
import { GoBackBlock } from "./go-back-block";
import { ConditionBlock } from "./condition-block";
import { LoopElementsBlock } from "./loop-elements-block";
import { LoopPaginationBlock } from "./loop-pagination-block";
import { ExtractScopeBlock } from "./extract-scope-block";

export function createBlockFromJSON(json: any): Block {
    let block: Block;

    switch (json.type) {
        case 'navigate':
            block = new NavigateBlock(json.label || 'Navigate', json.config);
            break;
        case 'click':
            block = new ClickBlock(json.label || 'Click', json.config);
            break;
        case 'input':
            block = new InputBlock(json.label || 'Input', json.config);
            break;
        case 'wait':
            block = new WaitBlock(json.label || 'Wait', json.config);
            break;
        case 'scroll':
            block = new ScrollBlock(json.label || 'Scroll', json.config);
            break;
        case 'go_back':
            block = new GoBackBlock(json.label || 'Go Back', json.config);
            break;
        case 'condition':
            block = new ConditionBlock(json.config);
            break;
        case 'loop_elements':
            block = new LoopElementsBlock(json.label || 'Loop Elements', json.config);
            break;
        case 'loop_pagination':
            block = new LoopPaginationBlock(json.label || 'Pagination', json.config);
            break;
        case 'extract_scope':
            block = new ExtractScopeBlock(json.label || 'Extract Data', json.config);
            break;
        default:
            throw new Error(`Unknown block type: ${json.type}`);
    }

    // Reapply serialized properties (id, label, enabled, etc.) inside an action
    runInAction(() => {
        const { children, elseChildren, type, config, parent, ...rest } = json;
        Object.assign(block, rest);
    });

    // Recursively create children
    if (json.children && json.children.length > 0) {
        runInAction(() => {
            block.children = json.children.map((childJson: any) => {
                const child = createBlockFromJSON(childJson);
                child.parent = block;
                return child;
            });
        });
    }

    // Recursively create elseChildren for ConditionBlock
    if (json.type === 'condition' && (json as any).elseChildren && (json as any).elseChildren.length > 0) {
        runInAction(() => {
            (block as any).elseChildren = (json as any).elseChildren.map((childJson: any) => {
                const child = createBlockFromJSON(childJson);
                child.parent = block;
                return child;
            });
        });
    }

    return block;
}
