import { describe, expect, it } from 'vitest';
import { MacroDefinition } from '../entrypoints/models/macro-block';
import {
    buildMacroLibraryDisplay,
    buildUpdatedMacroDefinition,
} from '../entrypoints/sidepanel/pages/macro-library-display';

describe('macro library display', () => {
    const macros: MacroDefinition[] = [
        {
            id: 'beta',
            name: 'Beta Flow',
            description: 'Second flow',
            parameters: [{ name: 'delayMs', defaultValue: '500' }],
            blocks: [{ type: 'navigate' }, { type: 'click' }],
            createdAt: '2026-03-28T10:00:00.000Z',
            updatedAt: '2026-03-29T10:00:00.000Z',
        },
        {
            id: 'alpha',
            name: 'Alpha Flow',
            description: 'First flow',
            parameters: [],
            blocks: [{ type: 'loop_elements', children: [{ type: 'extract_scope' }] }],
            createdAt: '2026-03-27T10:00:00.000Z',
            updatedAt: '2026-03-30T10:00:00.000Z',
        },
    ];

    it('sorts macros by name and exposes summary counts', () => {
        const display = buildMacroLibraryDisplay(macros);

        expect(display.cards.map((card) => card.id)).toEqual(['alpha', 'beta']);
        expect(display.cards[0]).toMatchObject({
            id: 'alpha',
            name: 'Alpha Flow',
            parameterCount: 0,
            blockCount: 2,
        });
        expect(display.cards[1]).toMatchObject({
            id: 'beta',
            name: 'Beta Flow',
            parameterCount: 1,
            blockCount: 2,
        });
    });

    it('builds an updated macro definition without changing id or stored blocks', () => {
        const updated = buildUpdatedMacroDefinition(macros[0], {
            name: 'Alpha Flow Updated',
            description: 'Refined description',
            parameters: [
                {
                    name: 'cardSelector',
                    description: 'Selector for each card',
                    required: true,
                },
            ],
        });

        expect(updated).toMatchObject({
            id: 'beta',
            name: 'Alpha Flow Updated',
            description: 'Refined description',
            blocks: macros[0].blocks,
            createdAt: '2026-03-28T10:00:00.000Z',
        });
        expect(updated.parameters).toEqual([
            {
                name: 'cardSelector',
                description: 'Selector for each card',
                required: true,
            },
        ]);
    });
});
