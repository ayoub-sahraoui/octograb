import { Block } from "./types";
import { getBlockRegistryEntry } from "./block-registry";

export function createBlockFromJSON(json: any): Block {
    const entry = getBlockRegistryEntry(json.type);
    if (!entry) throw new Error(`Unknown block type: ${json.type}`);

    const block = entry.create(json);

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
