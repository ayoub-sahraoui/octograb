import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClickBlock } from '../entrypoints/models/click-block';
import { SelectorType } from '../entrypoints/models/selector';

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: any) => <div>{children}</div>,
    closestCenter: vi.fn(),
    KeyboardSensor: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(),
    useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: any) => <div>{children}</div>,
    sortableKeyboardCoordinates: vi.fn(),
    verticalListSortingStrategy: {},
    useSortable: vi.fn(() => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: undefined,
        isDragging: false,
    })),
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => '' } },
}));

vi.mock('../components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <span>{children}</span>,
    TooltipTrigger: ({ children }: any) => <span>{children}</span>,
    TooltipContent: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('../entrypoints/stores/blueprint-builder-store', () => ({
    useBlueprintBuilderStore: () => ({
        selectedBlock: null,
        selectBlock: vi.fn(),
        setMacroSourceBlock: vi.fn(),
        selectedBlueprint: { reorderBlock: vi.fn() },
    }),
}));

describe('BlueprintBlock enable toggle', () => {
    it('shows disable action for enabled blocks', async () => {
        const { default: BlueprintBlock } = await import('../entrypoints/sidepanel/components/blueprint-block');
        const block = new ClickBlock('Click', {
            selector: { type: SelectorType.CSS, value: '.title' },
        });

        const html = renderToStaticMarkup(<BlueprintBlock block={block} />);

        expect(html).toContain('Disable block');
        expect(html).not.toContain('Disabled');
    });

    it('shows enable action and disabled badge for disabled blocks', async () => {
        const { default: BlueprintBlock } = await import('../entrypoints/sidepanel/components/blueprint-block');
        const block = new ClickBlock('Click', {
            selector: { type: SelectorType.CSS, value: '.title' },
        });
        block.enabled = false;

        const html = renderToStaticMarkup(<BlueprintBlock block={block} />);

        expect(html).toContain('Enable block');
        expect(html).toContain('Disabled');
    });
});
