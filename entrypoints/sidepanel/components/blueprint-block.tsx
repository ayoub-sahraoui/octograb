import { ArrowDown, BookOpen, ChevronDown, ChevronUp, Database, GitBranch, Globe, GripVertical, MousePointerClick, Plus, Repeat, Settings2, Type, Undo2, Clock, Bug, Download, Hand, Puzzle, Variable, Frame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Block } from '@/entrypoints/models/types';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
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
import { AssertBlock } from '@/entrypoints/models/assert-block';
import { GetVariableBlock } from '@/entrypoints/models/get-variable-block';
import { HoverBlock } from '@/entrypoints/models/hover-block';
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { SetVariableBlock } from '@/entrypoints/models/set-variable-block';
import { SwitchFrameBlock } from '@/entrypoints/models/switch-frame-block';
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
        icon: MousePointerClick,
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
        icon: Repeat,
        name: 'Loop Elements',
        createBlock: () => new LoopElementsBlock("Loop Elements", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'loop_pagination',
        icon: BookOpen,
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
        icon: ArrowDown,
        name: 'Scroll',
        createBlock: () => new ScrollBlock("Scroll", { target: 'window', behavior: 'bottom' }),
    },
    {
        type: 'wait',
        icon: Clock,
        name: 'Wait',
        createBlock: () => new WaitBlock("Wait", { type: 'timeout', timeout: 1000 }),
    },
    {
        type: 'assert',
        icon: Bug,
        name: 'Assert',
        createBlock: () => new AssertBlock("Assert", { selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'condition',
        icon: GitBranch,
        name: 'Condition',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'get_variable',
        icon: Download,
        name: 'Get Variable',
        createBlock: () => new GetVariableBlock("Get Variable", { name: '' }),
    },
    {
        type: 'hover',
        icon: Hand,
        name: 'Hover',
        createBlock: () => new HoverBlock("Hover", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'macro',
        icon: Puzzle,
        name: 'Macro',
        createBlock: () => new MacroBlock("Macro", { macroId: '' }),
    },
    {
        type: 'set_variable',
        icon: Variable,
        name: 'Set Variable',
        createBlock: () => new SetVariableBlock("Set Variable", { name: '', value: '' }),
    },
    {
        type: 'switch_frame',
        icon: Frame,
        name: 'Switch Frame',
        createBlock: () => new SwitchFrameBlock("Switch Frame", { target: 'main' }),
    },
];

// Block type to icon mapping for displaying existing blocks
const blockTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {};
blockTypes.forEach(b => { blockTypeIcons[b.type] = b.icon; });

export interface BlueprintBlockProps {
    block: Block;
    level?: number;
}

const SortableChildBlock = ({ block, level }: { block: Block; level: number }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative">
            <div className="absolute left-0 top-1 flex items-center -ml-6 z-10">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                >
                    <GripVertical className="w-3 h-3 text-gray-400" />
                </div>
            </div>
            <BlueprintBlock block={block} level={level} />
        </div>
    );
};

const BlueprintBlock = observer(({ block, level = 0 }: BlueprintBlockProps) => {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const isSelected = blueprintBuilderStore.selectedBlock?.id === block.id;
    const [showAddBlock, setShowAddBlock] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleChildDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && block.children) {
            const oldIndex = block.children.findIndex(b => b.id === active.id);
            const newIndex = block.children.findIndex(b => b.id === over.id);
            block.moveChild(oldIndex, newIndex);
        }
    };

    const handleConfigClick = () => {
        // Select the block to open the config drawer
        blueprintBuilderStore.selectBlock(block);
    };

    const handleBlockClick = () => {
        // Select the block when clicking on it
        blueprintBuilderStore.selectBlock(block);
    };

    const handleAddChildBlock = (createBlock: () => Block) => {
        const newBlock = createBlock();
        block.addChild(newBlock);
        // Select the new block for configuration
        blueprintBuilderStore.selectBlock(newBlock);
    };

    // Get the icon for this block type
    const IconComponent = blockTypeIcons[block.type] || Globe;

    return (
        <div className='flex flex-col justify-center items-center w-full min-w-[300px]'>
            {/* Block Card */}
            <div
                onClick={handleBlockClick}
                className={`bg-white flex w-full gap-2 items-center justify-between border rounded-lg p-2 cursor-pointer transition-all ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50'
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
                <Button onClick={(e) => {
                    e.stopPropagation();
                    setShowAddBlock(!showAddBlock);
                }} size="icon" variant="outline" className='cursor-pointer'>
                    {showAddBlock ? <ChevronUp /> : <ChevronDown />}
                </Button>
            </div>

            {/* Inline Block Selector */}
            {showAddBlock &&
                <div className="relative bg-gray-200 w-full mt-4 border border-dashed border-gray-300 rounded-lg p-2 hover:ring-2 hover:ring-gray-300">
                    <div className="flex gap-2 items-center justify-start overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                        {blockTypes.map((blockType, index) => (
                            <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => handleAddChildBlock(blockType.createBlock)}
                                        size="icon"
                                        variant="outline"
                                        className='cursor-pointer flex-shrink-0 w-10 h-10'
                                    >
                                        <blockType.icon className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{blockType.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                    <div className='absolute mx-auto -top-[17px] right-0 left-0 w-px h-4 bg-gray-300 rounded-full'></div>
                </div>}

            {/* Render Children Blocks */}
            {block.children && block.children.length > 0 && (
                <div className="relative w-full mt-4 pl-6 ml-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
                        <SortableContext items={block.children.map(b => b.id)} strategy={verticalListSortingStrategy}>
                            <div className="flex flex-col gap-2 pl-6">
                                {block.children.map((childBlock) => (
                                    <div key={childBlock.id} className='relative'>
                                        <SortableChildBlock
                                            block={childBlock}
                                            level={level + 1}
                                        />
                                        <div className='absolute -left-4 top-8 my-auto w-4 h-px bg-gray-300 rounded-full'></div>
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <div className='absolute left-2 -top-4 w-px h-[calc(100%+25px)] bg-gray-300 rounded-full'></div>
                    <div className='absolute left-[8px] -bottom-[9px] w-[8px] h-px bg-gray-300 rounded-full'></div>
                </div>
            )}
        </div>
    )
});

export default BlueprintBlock;