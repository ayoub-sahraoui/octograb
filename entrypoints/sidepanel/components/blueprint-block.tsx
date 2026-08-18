import { ArrowDown, BookOpen, ChevronDown, ChevronUp, Database, GitBranch, Globe, GripVertical, MousePointerClick, Plus, Repeat, Settings2, Type, Undo2, Clock, Bug, Puzzle, Variable, Save, Power, PowerOff } from 'lucide-react'
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
import { ReactNode, useState } from 'react';
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
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { SetVariableBlock } from '@/entrypoints/models/set-variable-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { buildConditionBranchDisplay } from './condition-branch-display';

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
        createBlock: () => new ClickBlock("Click", { selector: { type: SelectorType.Auto, value: '' } }),
    },
    {
        type: 'input',
        icon: Type,
        name: 'Input',
        createBlock: () => new InputBlock("Input", { selector: { type: SelectorType.Auto, value: '' }, value: '' }),
    },
    {
        type: 'loop_elements',
        icon: Repeat,
        name: 'Loop Elements',
        createBlock: () => new LoopElementsBlock("Loop Elements", { selector: { type: SelectorType.Auto, value: '' } }),
    },
    {
        type: 'loop_pagination',
        icon: BookOpen,
        name: 'Loop Pagination',
        createBlock: () => new LoopPaginationBlock("Loop Pagination", { nextButtonSelector: { type: SelectorType.Auto, value: '' } }),
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
        createBlock: () => new AssertBlock("Assert", { selector: { type: SelectorType.Auto, value: '' }, check: 'exists' }),
    },
    {
        type: 'condition',
        icon: GitBranch,
        name: 'Condition',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.Auto, value: '' }, check: 'exists' }),
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
];

// Block type to icon mapping for displaying existing blocks
const blockTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {};
blockTypes.forEach(b => { blockTypeIcons[b.type] = b.icon; });

type BranchName = 'children' | 'elseChildren';

export interface BlueprintBlockProps {
    block: Block;
    level?: number;
    leadingControl?: ReactNode;
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

const BlueprintBlock = observer(({ block, level = 0, leadingControl }: BlueprintBlockProps) => {
    const blueprintBuilderStore = useBlueprintBuilderStore();
    const isSelected = blueprintBuilderStore.selectedBlock?.id === block.id;
    const [showAddBlock, setShowAddBlock] = useState(false);
    const [openBranchAdder, setOpenBranchAdder] = useState<BranchName | null>(null);
    const isConditionBlock = block instanceof ConditionBlock;
    const elseChildren = isConditionBlock ? (block.elseChildren || []) : [];
    const isDisabled = block.enabled === false;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleChildDragEnd = (event: DragEndEvent, branchName: BranchName = 'children') => {
        const { active, over } = event;

        const branchBlocks = branchName === 'elseChildren' && isConditionBlock
            ? elseChildren
            : (block.children || []);

        if (over && active.id !== over.id && branchBlocks.length > 0) {
            const oldIndex = branchBlocks.findIndex(b => b.id === active.id);
            const newIndex = branchBlocks.findIndex(b => b.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const targetBlock = branchBlocks[oldIndex];
            blueprintBuilderStore.selectedBlueprint?.reorderBlock(targetBlock, newIndex);
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

    const handleAddBranchChildBlock = (branchName: BranchName, createBlock: () => Block) => {
        const newBlock = createBlock();

        if (branchName === 'elseChildren' && isConditionBlock) {
            block.addElseChild(newBlock);
        } else {
            block.addChild(newBlock);
        }

        blueprintBuilderStore.selectBlock(newBlock);
        setOpenBranchAdder(null);
    };

    // Get the icon for this block type
    const IconComponent = blockTypeIcons[block.type] || Globe;

    const conditionBranches = isConditionBlock
        ? buildConditionBranchDisplay(block.children || [], elseChildren)
        : [];

    return (
        <div className='flex flex-col justify-center items-center w-full min-w-0'>
            {/* Block Card */}
            <div
                onClick={handleBlockClick}
                className={`bg-white flex w-full gap-2 items-center justify-between border rounded-lg p-2 cursor-pointer transition-all ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50'
                    : 'border-gray-300 hover:ring-2 hover:ring-gray-300'
                    } ${isDisabled ? 'opacity-60 border-dashed bg-slate-50' : ''}`}
            >
                <div className='w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center'>
                    <span className='text-xl font-semibold'>
                        <IconComponent />
                    </span>
                </div>
                {leadingControl}
                <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-lg">{block.label}</h1>
                        {isDisabled ? (
                            <span className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                Disabled
                            </span>
                        ) : null}
                    </div>
                    <p className='text-xs text-gray-500'>{block.type}</p>
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                block.toggleEnabled();
                            }}
                            size="icon"
                            variant="outline"
                            className='cursor-pointer'
                        >
                            {isDisabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isDisabled ? 'Enable block' : 'Disable block'}</TooltipContent>
                </Tooltip>
                <Button onClick={(e) => {
                    e.stopPropagation();
                    handleConfigClick();
                }} size="icon" variant="outline" className='cursor-pointer'>
                    <Settings2 />
                </Button>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                blueprintBuilderStore.setMacroSourceBlock(block);
                            }}
                            size="icon"
                            variant="outline"
                            className='cursor-pointer'
                        >
                            <Save />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save as Macro</TooltipContent>
                </Tooltip>
                {!isConditionBlock && (
                    <Button onClick={(e) => {
                        e.stopPropagation();
                        setShowAddBlock(!showAddBlock);
                    }} size="icon" variant="outline" className='cursor-pointer'>
                        {showAddBlock ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                )}
            </div>

            {/* Inline Block Selector */}
            {!isConditionBlock && showAddBlock &&
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

            {isConditionBlock && (
                <div className="relative w-full mt-4 pl-6 ml-4">
                    <div className='absolute left-2 -top-4 w-px h-[calc(100%+12px)] bg-gray-300 rounded-full'></div>
                    <div className="flex flex-col gap-3 pl-4 sm:pl-6">
                    {conditionBranches.map((branch) => {
                        const toneClasses = branch.tone === 'success'
                            ? {
                                panel: 'border-emerald-200 bg-emerald-50/50',
                                badge: 'bg-emerald-600 text-white',
                                button: 'border-emerald-200 hover:border-emerald-400 hover:text-emerald-700',
                                empty: 'border-emerald-200 bg-white/70 text-emerald-700',
                            }
                            : {
                                panel: 'border-amber-200 bg-amber-50/50',
                                badge: 'bg-amber-500 text-white',
                                button: 'border-amber-200 hover:border-amber-400 hover:text-amber-700',
                                empty: 'border-amber-200 bg-white/70 text-amber-700',
                            };

                        return (
                            <div key={branch.branchName} className='relative'>
                                <div className='absolute -left-4 top-8 my-auto w-4 h-px bg-gray-300 rounded-full'></div>
                                <div className={`rounded-xl border p-3 ${toneClasses.panel}`}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClasses.badge}`}>
                                            {branch.title}
                                        </span>
                                        <p className="text-xs text-slate-600">{branch.subtitle}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className={`h-8 gap-1 text-xs ${toneClasses.button}`}
                                        onClick={() => setOpenBranchAdder(openBranchAdder === branch.branchName ? null : branch.branchName)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add
                                    </Button>
                                </div>

                                {openBranchAdder === branch.branchName && (
                                    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white/80 p-2">
                                        <div className="flex gap-2 items-center justify-start overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                                            {blockTypes.map((blockType, index) => (
                                                <Tooltip key={`${branch.branchName}-${index}`}>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            onClick={() => handleAddBranchChildBlock(branch.branchName, blockType.createBlock)}
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
                                    </div>
                                )}

                                {branch.blocks.length > 0 ? (
                                    <div className="relative mt-3">
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(event) => handleChildDragEnd(event, branch.branchName)}
                                        >
                                            <SortableContext items={branch.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                                <div className="flex flex-col gap-2 pl-4 sm:pl-6">
                                                    {branch.blocks.map((childBlock) => (
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
                                        <div className='absolute left-2 -top-2 w-px h-[calc(100%+10px)] bg-gray-300 rounded-full'></div>
                                        <div className='absolute left-[8px] -bottom-[1px] w-[8px] h-px bg-gray-300 rounded-full'></div>
                                    </div>
                                ) : (
                                    <div className={`mt-3 rounded-lg border border-dashed p-3 text-xs ${toneClasses.empty}`}>
                                        {branch.emptyMessage}
                                    </div>
                                )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                </div>
            )}

            {/* Render Children Blocks */}
            {!isConditionBlock && block.children && block.children.length > 0 && (
                <div className="relative w-full mt-4 pl-6 ml-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleChildDragEnd(event, 'children')}>
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
