import type { Blueprint } from '@/entrypoints/models/blueprint';

export interface SavedBlueprintSignal {
    id: string;
    name: string;
    blockCount: number;
}

const pendingBlueprints = new Map<string, Blueprint>();
let activeConversationId: string | null = null;
let savedBlueprintSignal: SavedBlueprintSignal | null = null;

function toKey(conversationId: string | null | undefined): string {
    return conversationId || '__default__';
}

export function setActiveAiConversation(conversationId: string | null): void {
    activeConversationId = conversationId;
}

export function getActiveAiConversation(): string | null {
    return activeConversationId;
}

export function setPendingBlueprint(conversationId: string | null, blueprint: Blueprint): void {
    pendingBlueprints.set(toKey(conversationId), blueprint);
}

export function getPendingBlueprint(conversationId: string | null): Blueprint | undefined {
    return pendingBlueprints.get(toKey(conversationId));
}

export function clearPendingBlueprint(conversationId: string | null): void {
    pendingBlueprints.delete(toKey(conversationId));
}

export function setPendingBlueprintForActiveConversation(blueprint: Blueprint): void {
    setPendingBlueprint(activeConversationId, blueprint);
}

export function getPendingBlueprintForActiveConversation(): Blueprint | undefined {
    return getPendingBlueprint(activeConversationId);
}

export function clearPendingBlueprintForActiveConversation(): void {
    clearPendingBlueprint(activeConversationId);
}

export function setSavedBlueprintSignal(signal: SavedBlueprintSignal): void {
    savedBlueprintSignal = signal;
}

export function consumeSavedBlueprintSignal(): SavedBlueprintSignal | null {
    const signal = savedBlueprintSignal;
    savedBlueprintSignal = null;
    return signal;
}
