import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearPendingBlueprint,
    getPendingBlueprint,
    setPendingBlueprint,
} from '../core/ai/pending-blueprint-state';

describe('ai pending blueprint state', () => {
    beforeEach(() => {
        clearPendingBlueprint('conv-a');
        clearPendingBlueprint('conv-b');
    });

    it('stores pending blueprints per conversation', () => {
        const blueprintA = { id: 'bp-a' };
        const blueprintB = { id: 'bp-b' };

        setPendingBlueprint('conv-a', blueprintA as any);
        setPendingBlueprint('conv-b', blueprintB as any);

        expect(getPendingBlueprint('conv-a')).toBe(blueprintA);
        expect(getPendingBlueprint('conv-b')).toBe(blueprintB);
    });

    it('clears only the targeted conversation blueprint', () => {
        const blueprintA = { id: 'bp-a' };
        const blueprintB = { id: 'bp-b' };

        setPendingBlueprint('conv-a', blueprintA as any);
        setPendingBlueprint('conv-b', blueprintB as any);

        clearPendingBlueprint('conv-a');

        expect(getPendingBlueprint('conv-a')).toBeUndefined();
        expect(getPendingBlueprint('conv-b')).toBe(blueprintB);
    });
});
