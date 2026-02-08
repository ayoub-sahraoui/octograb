import { CopyPlus, Database, FileStack, GitPullRequest, Globe, Hourglass, MousePointer, RefreshCcw, ScrollText, Trash, Type, Undo2 } from 'lucide-react'
import BlueprintBlock from '../components/blueprint-block'
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder';
import { observer } from 'mobx-react-lite';
import { Button } from '@/components/ui/button';
import { NavigateBlock } from '@/entrypoints/models/navigate-block';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import BlueprintBlockSelector from '../components/blueprint-block-selector'
import { useState } from 'react';
import {
    NavigateBlockConfig,
    ClickBlockConfig,
    InputBlockConfig,
    WaitBlockConfig,
    ScrollBlockConfig,
    GoBackBlockConfig,
    ConditionBlockConfig,
    LoopElementsBlockConfig,
    LoopPaginationBlockConfig,
    ExtractScopeBlockConfig,
} from '../components/block-configs';
import { ClickBlock } from '@/entrypoints/models/click-block';
import { InputBlock } from '@/entrypoints/models/input-block';
import { WaitBlock } from '@/entrypoints/models/wait-block';
import { ScrollBlock } from '@/entrypoints/models/scroll-block';
import { GoBackBlock } from '@/entrypoints/models/go-back-block';
import { ConditionBlock } from '@/entrypoints/models/condition-block';
import { LoopElementsBlock } from '@/entrypoints/models/loop-elements-block';
import { LoopPaginationBlock } from '@/entrypoints/models/loop-pagination-block';
import { ExtractScopeBlock } from '@/entrypoints/models/extract-scope-block';

export default function BlueprintBuilder() {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const [isAddBlockDrawerOpen, setIsAddBlockDrawerOpen] = useState(false);

    const AddNewBlock = () => {
        return <Drawer open={isAddBlockDrawerOpen} onOpenChange={setIsAddBlockDrawerOpen}>
            <DrawerTrigger>
                <Button onClick={() => {

                }}>Add Block</Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Add New Block</DrawerTitle>
                    <DrawerDescription>Choose the type of block you want to add</DrawerDescription>
                </DrawerHeader>
                <BlueprintBlockSelector onBlockSelect={() => setIsAddBlockDrawerOpen(false)} />
                <DrawerFooter>
                    <DrawerClose className='flex gap-2 justify-center w-full'>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    }

    const BlueprintBlocks = observer(() => {
        if (!blueprintBuilderStore.selectedBlueprint) {
            return null;
        }

        if (blueprintBuilderStore.selectedBlueprint.blocks.length === 0) {
            return (
                <div className="flex flex-col gap-2 items-center justify-center w-full h-full">
                    <div className="flex flex-col gap-2 items-center justify-center">
                        <CopyPlus className="w-10 h-10" />
                        <div className='flex flex-col justify-center items-center'>
                            <h2 className="text-lg font-semibold">No blocks found</h2>
                            <p className="text-center">Add blocks to your blueprint to start building your automation.</p>
                        </div>
                    </div>
                    <AddNewBlock />
                </div>
            )
        }
        return (
            <div className="flex flex-col gap-2 w-full">
                {blueprintBuilderStore.selectedBlueprint.blocks.map((block, index) => (
                    <BlueprintBlock key={block.id} block={block} />
                ))}
                <div className="flex justify-center mt-4">
                    <AddNewBlock />
                </div>
            </div>
        )
    });

    const BlockConfigDrawer = observer(() => {
        const selectedBlock = blueprintBuilderStore.selectedBlock;

        if (!selectedBlock) {
            return null;
        }

        const handleDone = () => {
            blueprintBuilderStore.clearBlockSelection();
        };

        const handleDelete = () => {
            blueprintBuilderStore.removeBlockFromBlueprint(selectedBlock);
        };

        return (
            <Drawer direction='right' open={!!selectedBlock} onOpenChange={(open) => {
                if (!open) {
                    blueprintBuilderStore.clearBlockSelection();
                }
            }}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Configure {selectedBlock.label}</DrawerTitle>
                        <DrawerDescription>
                            Update the block settings.
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 overflow-y-auto max-h-[60vh]">
                        {selectedBlock instanceof NavigateBlock && (
                            <NavigateBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ClickBlock && (
                            <ClickBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof InputBlock && (
                            <InputBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof WaitBlock && (
                            <WaitBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ScrollBlock && (
                            <ScrollBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof GoBackBlock && (
                            <GoBackBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ConditionBlock && (
                            <ConditionBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof LoopElementsBlock && (
                            <LoopElementsBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof LoopPaginationBlock && (
                            <LoopPaginationBlockConfig block={selectedBlock} />
                        )}
                        {selectedBlock instanceof ExtractScopeBlock && (
                            <ExtractScopeBlockConfig block={selectedBlock} />
                        )}
                    </div>
                    <DrawerFooter className="flex flex-row gap-2">
                        <Button onClick={handleDone} className="flex-1">Done</Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            <span className='text-white'>Delete</span>
                        </Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        )
    });

    return (
        <div className="h-full flex-1 flex flex-col gap-2">
            <h1 className="text-xl font-semibold ml-2">Blueprint Builder</h1>
            <div className="flex-1 bg-gray-100 p-4 border border-gray-300 rounded-lg flex flex-col justify-start items-center overflow-y-auto">
                { /* Blueprint blocks */}
                <BlueprintBlocks />
                { /* Block config drawer */}
                <BlockConfigDrawer />
            </div>
        </div>
    )
}