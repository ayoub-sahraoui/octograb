import { LucideIcon, ArrowDown, BookOpen, Bug, Clock, Database, GitBranch, Globe, MousePointerClick, Puzzle, Repeat, Type, Undo2, Variable } from 'lucide-react';
import { AssertBlock } from '../../models/assert-block';
import { ClickBlock } from '../../models/click-block';
import { ConditionBlock } from '../../models/condition-block';
import { ExtractScopeBlock } from '../../models/extract-scope-block';
import { GoBackBlock } from '../../models/go-back-block';
import { InputBlock } from '../../models/input-block';
import { LoopElementsBlock } from '../../models/loop-elements-block';
import { LoopPaginationBlock } from '../../models/loop-pagination-block';
import { MacroBlock } from '../../models/macro-block';
import { NavigateBlock } from '../../models/navigate-block';
import { ScrollBlock } from '../../models/scroll-block';
import { SelectorType } from '../../models/selector';
import { SetVariableBlock } from '../../models/set-variable-block';
import { WaitBlock } from '../../models/wait-block';

export interface BlockSelectorOption {
    type: string;
    icon: LucideIcon;
    label: string;
    description: string;
    createBlock: () => any;
}

export interface BlockSelectorGroup {
    title: string;
    description: string;
    blocks: BlockSelectorOption[];
}

const blockOptions: BlockSelectorOption[] = [
    {
        type: 'navigate',
        icon: Globe,
        label: 'Navigate',
        description: 'Open a URL in this tab or a new tab.',
        createBlock: () => new NavigateBlock('Navigate', { url: '' }),
    },
    {
        type: 'click',
        icon: MousePointerClick,
        label: 'Click',
        description: 'Click one target element on the page.',
        createBlock: () => new ClickBlock('Click', { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'input',
        icon: Type,
        label: 'Input',
        description: 'Type text into a form field.',
        createBlock: () => new InputBlock('Input', { selector: { type: SelectorType.CSS, value: '' }, value: '' }),
    },
    {
        type: 'wait',
        icon: Clock,
        label: 'Wait',
        description: 'Pause or wait for a page state.',
        createBlock: () => new WaitBlock('Wait', { type: 'timeout', timeout: 1000 }),
    },
    {
        type: 'scroll',
        icon: ArrowDown,
        label: 'Scroll',
        description: 'Move the page or an element.',
        createBlock: () => new ScrollBlock('Scroll', { target: 'window', behavior: 'bottom' }),
    },
    {
        type: 'go_back',
        icon: Undo2,
        label: 'Go Back',
        description: 'Return to the previous page.',
        createBlock: () => new GoBackBlock('Go Back', {}),
    },
    {
        type: 'loop_elements',
        icon: Repeat,
        label: 'Loop Elements',
        description: 'Repeat child blocks for each item.',
        createBlock: () => new LoopElementsBlock('Loop Elements', { selector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'loop_pagination',
        icon: BookOpen,
        label: 'Loop Pagination',
        description: 'Move through pages or infinite loading.',
        createBlock: () => new LoopPaginationBlock('Loop Pagination', { nextButtonSelector: { type: SelectorType.CSS, value: '' } }),
    },
    {
        type: 'extract_scope',
        icon: Database,
        label: 'Extract Scope',
        description: 'Collect fields from one scope.',
        createBlock: () => new ExtractScopeBlock('Extract Scope', { fields: [] }),
    },
    {
        type: 'assert',
        icon: Bug,
        label: 'Assert',
        description: 'Fail if a required check is not met.',
        createBlock: () => new AssertBlock('Assert', { selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'condition',
        icon: GitBranch,
        label: 'Condition',
        description: 'Run THEN or ELSE based on a check.',
        createBlock: () => new ConditionBlock({ selector: { type: SelectorType.CSS, value: '' }, check: 'exists' }),
    },
    {
        type: 'macro',
        icon: Puzzle,
        label: 'Macro',
        description: 'Run a saved reusable mini-blueprint.',
        createBlock: () => new MacroBlock('Macro', { macroId: '' }),
    },
    {
        type: 'set_variable',
        icon: Variable,
        label: 'Set Variable',
        description: 'Store a value for later steps.',
        createBlock: () => new SetVariableBlock('Set Variable', { name: '', value: '' }),
    },
];

const groupedTypes = [
    {
        title: 'Actions',
        description: 'Direct steps that act on the page or browser.',
        types: ['navigate', 'click', 'input', 'wait', 'scroll', 'go_back'],
    },
    {
        title: 'Flow',
        description: 'Control execution, branching, loops, and reusable logic.',
        types: ['loop_elements', 'loop_pagination', 'condition', 'assert', 'macro'],
    },
    {
        title: 'Data',
        description: 'Capture data or store values for later steps.',
        types: ['extract_scope', 'set_variable'],
    },
];

export function getBlockSelectorGroups(): BlockSelectorGroup[] {
    return groupedTypes.map((group) => ({
        title: group.title,
        description: group.description,
        blocks: group.types
            .map((type) => blockOptions.find((block) => block.type === type))
            .filter((block): block is BlockSelectorOption => Boolean(block)),
    }));
}
