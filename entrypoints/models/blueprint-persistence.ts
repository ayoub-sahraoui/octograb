import { SavedPlan } from "@/core/types";
import { createBlockFromJSON } from "./block-factory";
import { createBlueprintPreview } from "./blueprint-analysis";
import { Blueprint } from "./blueprint";
import { BlueprintValidator } from "./blueprint-validator";

interface SerializeBlueprintOptions {
    userAgent?: string;
    updatedAt?: string;
}

function getDefaultUserAgent() {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
        return navigator.userAgent;
    }
    return 'unknown';
}

export function serializeBlueprintToSavedPlan(
    blueprint: Blueprint,
    options: SerializeBlueprintOptions = {}
): SavedPlan {
    const json = blueprint.toJSON();

    return {
        id: blueprint.id,
        name: blueprint.name,
        updatedAt: options.updatedAt || new Date().toISOString(),
        plan: {
            meta: {
                name: blueprint.name,
                description: blueprint.description || '',
                version: '1.0.0',
                userAgent: options.userAgent || getDefaultUserAgent(),
            },
            variables: {
                baseUrl: '',
            },
            pipeline: json.blocks,
        },
    };
}

export function deserializeSavedPlanToBlueprint(savedPlan: SavedPlan): Blueprint {
    const plan = savedPlan.plan;
    const blueprint = new Blueprint(plan.meta.name, plan.meta.description || '');
    blueprint.id = savedPlan.id;
    blueprint.blocks = (plan.pipeline || []).map((blockJson: any) => createBlockFromJSON(blockJson));
    return blueprint;
}

export function createSavedPlanPreview(savedPlan: SavedPlan) {
    const blueprint = deserializeSavedPlanToBlueprint(savedPlan);
    const validator = new BlueprintValidator();
    const validation = validator.validate(blueprint);
    return createBlueprintPreview(blueprint, validation);
}

export function createBlueprintPreviewFromPersistence(
    blueprint: Blueprint,
    options: SerializeBlueprintOptions = {}
) {
    return createSavedPlanPreview(serializeBlueprintToSavedPlan(blueprint, options));
}
