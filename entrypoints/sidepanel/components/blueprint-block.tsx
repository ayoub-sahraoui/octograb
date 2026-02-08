import { Button } from '@/components/ui/button'
import { CirclePlus, Database, FileStack, GitPullRequest, Globe, Hourglass, MousePointer, RefreshCcw, ScrollText, Settings2, Type, Undo2 } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Block } from '@/entrypoints/models/types';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder';
import { observer } from 'mobx-react-lite';
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
import { SelectorType } from '@/entrypoints/models/selector';

// Block type definitions with icons and factory functions
const blockTypes = [
    {
        type: 'navigate',
        icon: Globe,
        name: 'Navigation',
        createBlock: () => new NavigateBlock("Navigate", { url: "" }),
    },
    {
        type: 'click',
        icon: MousePointer,
        name: 'Click',
        createBlock: () => new ClickBlock("Click", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'input',
        icon: Type,
        name: 'Input',
        createBlock: () => new InputBlock("Input", { selector: { type: SelectorType.CSS, value: '' }, value: '' }),
    },
    {
        type: 'loop_elements',
        icon: RefreshCcw,
        name: 'Loop Elements',
        createBlock: () => new LoopElementsBlock("Loop Elements", { selector: { type: SelectorType.CSS, value: '' }, children: [] }),
    },
    {
        type: 'loop_pagination',
        icon: FileStack,
        name: 'Loop Pagination',
        createBlock: () => new LoopPaginationBlock("Loop Pagination", { nextButtonSelector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'extract_scope',
        icon: Database,
        name: 'Extract Scope',
        createBlock: () => new ExtractScopeBlock("Extract Scope", { fields: [] }),
    },
    {
        type: 'go_back',
        icon: Undo2,
        name: 'Go Back',
        createBlock: () => new GoBackBlock("Go Back", {}),
    },
    {
        type: 'scroll',
        icon: ScrollText,
        name: 'Scroll',
        createBlock: () => new ScrollBlock("Scroll", { target: 'window', behavior: 'bottom' }),
    },
    {
        type: 'wait',
        icon: Hourglass,
        name: 'Wait',
        createBlock: () => new WaitBlock("Wait", { type: 'timeout', timeout: 1000 }),
    },
    {
        type: 'condition',
        icon: GitPullRequest,
        name: 'Condition',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
];

// Block type to icon mapping for displaying existing blocks
const blockTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {};
blockTypes.forEach(b => { blockTypeIcons[b.type] = b.icon; });

export interface BlueprintBlockProps {
    block: Block;
}

const BlueprintBlock = observer(({ block }: BlueprintBlockProps) => {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const isSelected = blueprintBuilderStore.selectedBlock?.id === block.id;

    const handleConfigClick = () => {
        // Select the block to open the config drawer
        blueprintBuilderStore.selectBlock(block);
    };

    const handleBlockClick = () => {
        // Select the block when clicking on it
        blueprintBuilderStore.selectBlock(block);
    };

    const handleAddBlock = (createBlock: () => Block) => {
        const newBlock = createBlock();
        blueprintBuilderStore.addBlockToBlueprint(newBlock);
    };

    // Get the icon for this block type
    const IconComponent = blockTypeIcons[block.type] || Globe;

    return (
        <div className='flex flex-col justify-center items-center w-full'>
            {/* Block Card */}
            <div
                onClick={handleBlockClick}
                className={`flex w-full gap-2 items-center justify-between border rounded-lg p-2 cursor-pointer transition-all ${isSelected
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                        : 'border-gray-300 hover:ring-2 hover:ring-gray-300'
                    }`}
            >
                <div className='w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center'>
                    <span className='text-xl font-semibold'>
                        <IconComponent />
                    </span>
                </div>
                <div className="flex-1">
                    <h1 className="text-lg">{block.label}</h1>
                    <p className='text-xs text-gray-500'>{block.type}</p>
                </div>
                <Button onClick={(e) => {
                    e.stopPropagation();
                    handleConfigClick();
                }} size="icon" variant="outline" className='cursor-pointer'>
                    <Settings2 />
                </Button>
            </div>

            {/* Inline Block Selector */}
            <div className="relative bg-gray-200 flex w-full gap-2 items-center mt-4 justify-center border border-dashed border-gray-300 rounded-lg p-2 hover:ring-2 hover:ring-gray-300 cursor-pointer">
                {blockTypes.map((blockType, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={() => handleAddBlock(blockType.createBlock)}
                                size="icon"
                                variant="outline"
                                className='cursor-pointer'
                            >
                                <blockType.icon />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{blockType.name}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
                <div className='absolute mx-auto -top-4 right-0 left-0 w-0.5 h-4 bg-gray-300 rounded-full'></div>
            </div>

            {/* Add New Step Button */}
            <div
                onClick={() => handleAddBlock(blockTypes[0].createBlock)}
                className='relative flex w-fit text-gray-600 bg-gray-200 px-3 py-2 rounded-full items-center gap-2 hover:ring-2 hover:ring-gray-300 cursor-pointer mt-4'
            >
                <CirclePlus />
                <p className='font-semibold'>Add New Step</p>
                <div className='absolute mx-auto -top-4 right-0 left-0 w-0.5 h-4 bg-gray-300 rounded-full'></div>
            </div>
        </div>
    )
});

export default BlueprintBlock;