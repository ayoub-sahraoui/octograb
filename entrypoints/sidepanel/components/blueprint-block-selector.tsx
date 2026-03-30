import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { toast } from 'sonner';
import { FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store';
import { getBlockSelectorGroups } from './block-selector-groups';

interface BlueprintBlockSelectorProps {
    onBlockSelect?: () => void;
    addAsChild?: boolean;
}

export default function BlueprintBlockSelector({ onBlockSelect, addAsChild = false }: BlueprintBlockSelectorProps) {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const groups = getBlockSelectorGroups();

    const handleBlockClick = (createBlock: () => any, event: React.MouseEvent<HTMLButtonElement>) => {
        // Check block limit before creating
        if (!blueprintBuilderStore.canAddBlock()) {
            toast.error('Block limit reached', {
                description: `Free plan allows up to ${FREE_TIER_LIMITS.maxBlocksPerBlueprint} blocks per blueprint. Upgrade for unlimited blocks.`,
            });
            (event.currentTarget as HTMLButtonElement).blur();
            onBlockSelect?.();
            return;
        }

        // Create the block
        const block = createBlock();

        if (addAsChild) {
            // Add as child to the parent block
            blueprintBuilderStore.addChildBlockToParent(block);
        } else {
            // Add to blueprint root
            blueprintBuilderStore.addBlockToBlueprint(block);
        }

        // Remove focus from button to prevent aria-hidden accessibility violation
        (event.currentTarget as HTMLButtonElement).blur();

        // Close the drawer
        onBlockSelect?.();
    };

    return (
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <div className="flex w-full flex-col gap-4">
                {groups.map((group, index) => (
                    <section key={group.title} className="flex flex-col gap-2">
                        {index > 0 && <Separator className="mb-1" />}
                        <div className="px-1">
                            <h3 className="text-sm font-semibold">{group.title}</h3>
                            <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {group.blocks.map((block) => (
                                <Button
                                    key={block.type}
                                    onClick={(e) => handleBlockClick(block.createBlock, e)}
                                    variant="outline"
                                    className="h-auto justify-start rounded-lg border border-gray-200 p-2 bg-gray-50 text-left"
                                >
                                    <div className="flex w-full items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200">
                                            <block.icon className="h-4 w-4 text-black" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium leading-5">{block.label}</div>
                                            <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                                                {block.description}
                                            </div>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    )
}
