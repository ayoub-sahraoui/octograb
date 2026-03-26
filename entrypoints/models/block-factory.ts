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
import { AssertBlock } from "./assert-block";
import { SetVariableBlock } from "./set-variable-block";
import { GetVariableBlock } from "./get-variable-block";
import { HoverBlock } from "./hover-block";
import { SwitchFrameBlock } from "./switch-frame-block";
import { MacroBlock } from "./macro-block";
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
        case 'assert':
            block = new AssertBlock(json.label || 'Assert', json.config);
            break;
        case 'set_variable':
            block = new SetVariableBlock(json.label || 'Set Variable', json.config);
            break;
        case 'get_variable':
            block = new GetVariableBlock(json.label || 'Get Variable', json.config);
            break;
        case 'hover':
            block = new HoverBlock(json.label || 'Hover', json.config);
            break;
        case 'switch_frame':
            block = new SwitchFrameBlock(json.label || 'Switch Frame', json.config);
            break;
        case 'macro':
            block = new MacroBlock(json.label || 'Macro', json.config);
            break;
        default:
            throw new Error(`Unknown block type: ${json.type}`);
    }

    // Reapply serialized properties using action methods
    if (json.id) block.id = json.id;
    if (json.label !== undefined) block.setLabel(json.label);
    if (json.enabled !== undefined) block.setEnabled(json.enabled);
    if (json.description !== undefined) block.setDescription(json.description);
    if (json.onError !== undefined) block.setOnError(json.onError);
    if (json.maxRetries !== undefined) block.setMaxRetries(json.maxRetries);
    if (json.retryDelay !== undefined) block.setRetryDelay(json.retryDelay);
    if (json.maxExecutionTime !== undefined) block.setMaxExecutionTime(json.maxExecutionTime);
    if (json.index !== undefined) block.setIndex(json.index);

    // Recursively create children
    if (json.children && json.children.length > 0) {
        json.children.forEach((childJson: any) => {
            const child = createBlockFromJSON(childJson);
            block.addChild(child);
        });
    }

    // Recursively create elseChildren for ConditionBlock
    if (json.type === 'condition' && (json as any).elseChildren && (json as any).elseChildren.length > 0) {
        (json as any).elseChildren.forEach((childJson: any) => {
            const child = createBlockFromJSON(childJson);
            (block as any).addElseChild(child);
        });
    }

    return block;
}
