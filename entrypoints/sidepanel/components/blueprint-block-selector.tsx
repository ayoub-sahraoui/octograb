import { Button } from '@/components/ui/button'
import { ArrowDown, BookOpen, Clock, Database, GitBranch, Globe, MousePointerClick, Repeat, Type, Undo2, Bug, Download, Hand, Puzzle, Variable, Frame } from 'lucide-react'
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
import { AssertBlock } from '@/entrypoints/models/assert-block';
import { GetVariableBlock } from '@/entrypoints/models/get-variable-block';
import { HoverBlock } from '@/entrypoints/models/hover-block';
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { SetVariableBlock } from '@/entrypoints/models/set-variable-block';
import { SwitchFrameBlock } from '@/entrypoints/models/switch-frame-block';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { SelectorType } from '@/entrypoints/models/selector';
import { toast } from 'sonner';
import { FREE_TIER_LIMITS } from '@/entrypoints/stores/license-store';

const blocks = [
    {
        type: 'navigate',
        icon: Globe,
        label: 'Navigate',
        description: 'Navigate to a URL',
        createBlock: () => new NavigateBlock("Navigate", { url: "" }),
    },
    {
        type: 'click',
        icon: MousePointerClick,
        label: 'Click',
        description: 'Click on an element',
        createBlock: () => new ClickBlock("Click", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'input',
        icon: Type,
        label: 'Input',
        description: 'Input text into an element',
        createBlock: () => new InputBlock("Input", { selector: { type: SelectorType.CSS, value: '' }, value: '' }),
    },
    {
        type: 'wait',
        icon: Clock,
        label: 'Wait',
        description: 'Wait for a specific time',
        createBlock: () => new WaitBlock("Wait", { type: 'timeout', timeout: 1000 }),
    },
    {
        type: 'scroll',
        icon: ArrowDown,
        label: 'Scroll',
        description: 'Scroll down the page',
        createBlock: () => new ScrollBlock("Scroll", { target: 'window', behavior: 'bottom' }),
    },
    {
        type: 'go_back',
        icon: Undo2,
        label: 'Go Back',
        description: 'Go back to previous page',
        createBlock: () => new GoBackBlock("Go Back", {}),
    },
    {
        type: 'loop_elements',
        icon: Repeat,
        label: 'Loop Elements',
        description: 'Loop through elements',
        createBlock: () => new LoopElementsBlock("Loop Elements", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'loop_pagination',
        icon: BookOpen,
        label: 'Loop Pagination',
        description: 'Loop through pagination',
        createBlock: () => new LoopPaginationBlock("Loop Pagination", { nextButtonSelector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'extract_scope',
        icon: Database,
        label: 'Extract Scope',
        description: 'Extract data from a scope',
        createBlock: () => new ExtractScopeBlock("Extract Scope", { fields: [] }),
    },
    {
        type: 'assert',
        icon: Bug,
        label: 'Assert',
        description: 'Assert element state',
        createBlock: () => new AssertBlock("Assert", { selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'condition',
        icon: GitBranch,
        label: 'Condition',
        description: 'Conditional execution',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'get_variable',
        icon: Download,
        label: 'Get Variable',
        description: 'Get variable value',
        createBlock: () => new GetVariableBlock("Get Variable", { name: '' }),
    },
    {
        type: 'hover',
        icon: Hand,
        label: 'Hover',
        description: 'Hover over element',
        createBlock: () => new HoverBlock("Hover", { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'macro',
        icon: Puzzle,
        label: 'Macro',
        description: 'Run a macro blueprint',
        createBlock: () => new MacroBlock("Macro", { macroId: '' }),
    },
    {
        type: 'set_variable',
        icon: Variable,
        label: 'Set Variable',
        description: 'Set variable value',
        createBlock: () => new SetVariableBlock("Set Variable", { name: '', value: '' }),
    },
    {
        type: 'switch_frame',
        icon: Frame,
        label: 'Switch Frame',
        description: 'Switch to iframe',
        createBlock: () => new SwitchFrameBlock("Switch Frame", { target: 'main' }),
    },
]

interface BlueprintBlockSelectorProps {
    onBlockSelect?: () => void;
    addAsChild?: boolean;
}

export default function BlueprintBlockSelector({ onBlockSelect, addAsChild = false }: BlueprintBlockSelectorProps) {
    const blueprintBuilderStore = useBlueprintBuilderStore();

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
        <div className='flex flex-col items-center p-4 gap-3'>
            <div className="flex flex-wrap w-full gap-2 items-center justify-center">
                {blocks.map((block, index) => (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={(e) => handleBlockClick(block.createBlock, e)}
                                variant="outline"
                                className='cursor-pointer rounded-full px-3 py-2 h-auto bg-white hover:bg-gray-50 border-gray-200'
                            >
                                <block.icon className="w-4 h-4 text-emerald-600 mr-2" />
                                <span className="text-sm text-gray-700">{block.label}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{block.description}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </div>
    )
}