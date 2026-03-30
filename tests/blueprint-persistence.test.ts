import { describe, expect, it } from 'vitest';
import { SavedPlan } from '../core/types';
import { Blueprint } from '../entrypoints/models/blueprint';
import { createBlueprintPreviewFromPersistence, createSavedPlanPreview, deserializeSavedPlanToBlueprint, serializeBlueprintToSavedPlan } from '../entrypoints/models/blueprint-persistence';
import { NavigateBlock } from '../entrypoints/models/navigate-block';
import { SetVariableBlock } from '../entrypoints/models/set-variable-block';

describe('blueprint persistence', () => {
    it('serializes a blueprint into the shared saved-plan shape', () => {
        const blueprint = new Blueprint('Catalog Scraper', 'Scrapes the catalog listing');
        blueprint.id = 'blueprint-1';
        blueprint.addBlock(new NavigateBlock('Open Page', { url: 'https://example.com' }));
        blueprint.addBlock(new SetVariableBlock('Set Query', {
            name: 'query',
            value: 'laptops',
            scope: 'global',
        }));

        expect(serializeBlueprintToSavedPlan(blueprint, {
            userAgent: 'vitest',
            updatedAt: '2026-03-28T00:00:00.000Z',
        })).toEqual({
            id: 'blueprint-1',
            name: 'Catalog Scraper',
            updatedAt: '2026-03-28T00:00:00.000Z',
            plan: {
                meta: {
                    name: 'Catalog Scraper',
                    description: 'Scrapes the catalog listing',
                    version: '1.0.0',
                    userAgent: 'vitest',
                },
                variables: {
                    baseUrl: '',
                },
                pipeline: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'navigate',
                        label: 'Open Page',
                    }),
                    expect.objectContaining({
                        type: 'set_variable',
                        label: 'Set Query',
                    }),
                ]),
            },
        });
    });

    it('deserializes a saved plan back into a blueprint with description', () => {
        const savedPlan: SavedPlan = {
            id: 'blueprint-2',
            name: 'Saved Blueprint',
            updatedAt: '2026-03-28T00:00:00.000Z',
            plan: {
                meta: {
                    name: 'Saved Blueprint',
                    description: 'Loaded from storage',
                    version: '1.0.0',
                    userAgent: 'vitest',
                },
                variables: {
                    baseUrl: '',
                },
                pipeline: [
                    {
                        id: 'nav-1',
                        type: 'navigate',
                        label: 'Open',
                        config: { url: 'https://example.com' },
                    },
                ],
            },
        };

        const blueprint = deserializeSavedPlanToBlueprint(savedPlan);

        expect(blueprint.id).toBe('blueprint-2');
        expect(blueprint.name).toBe('Saved Blueprint');
        expect(blueprint.description).toBe('Loaded from storage');
        expect(blueprint.blocks).toHaveLength(1);
        expect(blueprint.blocks[0].type).toBe('navigate');
    });

    it('creates the same preview shape from a saved plan through the shared adapter', () => {
        const savedPlan: SavedPlan = {
            id: 'blueprint-3',
            name: 'Preview Blueprint',
            updatedAt: '2026-03-28T00:00:00.000Z',
            plan: {
                meta: {
                    name: 'Preview Blueprint',
                    description: 'Preview me',
                    version: '1.0.0',
                    userAgent: 'vitest',
                },
                variables: {
                    baseUrl: '',
                },
                pipeline: [
                    {
                        id: 'nav-1',
                        type: 'navigate',
                        label: 'Open',
                        config: { url: 'https://example.com' },
                    },
                    {
                        id: 'set-1',
                        type: 'set_variable',
                        label: 'Set Query',
                        config: { name: 'query', value: 'laptops', scope: 'global' },
                    },
                ],
            },
        };

        expect(createSavedPlanPreview(savedPlan)).toEqual({
            name: 'Preview Blueprint',
            description: 'Preview me',
            blockCount: 2,
            valid: true,
            errors: [],
            warnings: [],
            blockTypes: ['navigate', 'set_variable'],
            maxDepth: 0,
            variableReferences: [],
            macroIds: [],
        });
    });

    it('can generate a preview directly from a blueprint through the persistence path', () => {
        const blueprint = new Blueprint('Preview From Blueprint', 'Through shared persistence');
        blueprint.addBlock(new NavigateBlock('Open Page', { url: 'https://example.com' }));

        expect(createBlueprintPreviewFromPersistence(blueprint, { userAgent: 'vitest' })).toEqual({
            name: 'Preview From Blueprint',
            description: 'Through shared persistence',
            blockCount: 1,
            valid: true,
            errors: [],
            warnings: [],
            blockTypes: ['navigate'],
            maxDepth: 0,
            variableReferences: [],
            macroIds: [],
        });
    });
});
