import { Button } from '@/components/ui/button'
import { Database, FileStack, GitPullRequest, Globe, Hourglass, MousePointer, RefreshCcw, ScrollText, Type, Undo2 } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { NavigateBlock } from '@/entrypoints/models/navigate-block';
import { ClickBlock } from '@/entrypoints/models/click-block';
import { InputBlock } from '@/entrypoints/models/input-block';
import { WaitBlock } from '@/entrypoints/models/wait-block';
import { ScrollBlock } from '@/entrypoints/models/scroll-block';
import { GoBackBlock } from '@/entrypoints/models/go-back-block';
import { ConditionBlock } from '@/entrypoints/models/condition-block';
import { LoopElementsBlock } from '@/entrypoints/models/loop-elements-block';
import { LoopPaginationBlock } from '@/entrypoints/models/loop-pagination-block';
import { ExtractScopeBlock } from '@/entrypoints/models/extract-scope-block';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { SelectorType } from '@/entrypoints/models/selector';

const blocks = [
    {
        type: 'navigate',
        icon: Globe,
        name: 'Navigation',
        description: 'Navigate to a URL',
        createBlock: () => new NavigateBlock("Navigate", { url: "" }),
    },
    {
        type: 'click',
        icon: MousePointer,
        name: 'Click',
        description: 'Click on an element',
        createBlock: () => new ClickBlock("Click", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'input',
        icon: Type,
        name: 'Input',
        description: 'Input text into an element',
        createBlock: () => new InputBlock("Input", { selector: { type: SelectorType.CSS, value: '' }, value: '' }),
    },
    {
        type: 'loop_elements',
        icon: RefreshCcw,
        name: 'Loop Elements',
        description: 'Loop through elements',
        createBlock: () => new LoopElementsBlock("Loop Elements", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'loop_pagination',
        icon: FileStack,
        name: 'Loop Pagination',
        description: 'Loop through pagination',
        createBlock: () => new LoopPaginationBlock("Loop Pagination", { nextButtonSelector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'extract_scope',
        icon: Database,
        name: 'Extract Scope',
        description: 'Extract data from a scope',
        createBlock: () => new ExtractScopeBlock("Extract Scope", { fields: [] }),
    },
    {
        type: 'go_back',
        icon: Undo2,
        name: 'Go Back',
        description: 'Go back to previous page',
        createBlock: () => new GoBackBlock("Go Back", {}),
    },
    {
        type: 'scroll',
        icon: ScrollText,
        name: 'Scroll',
        description: 'Scroll down the page',
        createBlock: () => new ScrollBlock("Scroll", { target: 'window', behavior: 'bottom' }),
    },
    {
        type: 'wait',
        icon: Hourglass,
        name: 'Wait',
        description: 'Wait for a specific time',
        createBlock: () => new WaitBlock("Wait", { type: 'timeout', timeout: 1000 }),
    },
    {
        type: 'condition',
        icon: GitPullRequest,
        name: 'Condition',
        description: 'Conditional execution',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
]

interface BlueprintBlockSelectorProps {
    onBlockSelect?: () => void;
    addAsChild?: boolean;
}

export default function BlueprintBlockSelector({ onBlockSelect, addAsChild = false }: BlueprintBlockSelectorProps) {
    const blueprintBuilderStore = useBlueprintBuilderStore();

    const handleBlockClick = (createBlock: () => any) => {
        // Create the block
        const block = createBlock();

        if (addAsChild) {
            // Add as child to the parent block
            blueprintBuilderStore.addChildBlockToParent(block);
        } else {
            // Add to blueprint root
            blueprintBuilderStore.addBlockToBlueprint(block);
        }

        // Close the drawer
        onBlockSelect?.();
    };

    return (
        <div className='flex flex-col justify-center items-center p-4'>
            <div className="bg-gray-200 flex w-full gap-2 items-center justify-center border border-dashed border-gray-300 rounded-lg p-2 cursor-pointer">
                {
                    blocks.map((block, index) => {
                        return (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => handleBlockClick(block.createBlock)} size="icon" variant="outline" className='cursor-pointer'>
                                        <block.icon />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{block.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })
                }
            </div>
        </div>
    )
}