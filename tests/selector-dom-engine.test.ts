import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectorDOMEngine } from '../core/selector-engine/selector-dom-engine';

interface FakeElement {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    parentElement?: FakeElement | null;
    contains?: (node: unknown) => boolean;
    hasAttribute: (name: string) => boolean;
    getAttribute: (name: string) => string | null;
    getBoundingClientRect: () => DOMRect;
    closest: (selector: string) => FakeElement | null;
}

function createFakeElement(overrides: Partial<FakeElement> = {}): FakeElement {
    return {
        tagName: 'DIV',
        id: '',
        className: '',
        textContent: '',
        parentElement: null,
        contains: () => false,
        hasAttribute: () => false,
        getAttribute: () => null,
        getBoundingClientRect: () => ({
            top: 10,
            left: 10,
            right: 130,
            bottom: 50,
            width: 120,
            height: 40,
        } as DOMRect),
        closest: () => null,
        ...overrides,
    };
}

describe('SelectorDOMEngine', () => {
    beforeEach(() => {
        (globalThis as any).CSS = {
            escape: (value: string) => value,
        };
        (globalThis as any).XPathResult = {
            ORDERED_NODE_SNAPSHOT_TYPE: 7,
            FIRST_ORDERED_NODE_TYPE: 9,
        };
        (globalThis as any).document = {
            elementFromPoint: vi.fn(() => null),
            querySelectorAll: vi.fn(() => []),
        };
        (globalThis as any).window = {
            innerWidth: 1280,
            innerHeight: 720,
            scrollX: 0,
            scrollY: 0,
        };
    });

    it('locks hover tracking after a single element is selected', () => {
        const engine = new SelectorDOMEngine() as any;
        const first = createFakeElement({
            tagName: 'ARTICLE',
            className: 'product-card',
        });
        const second = createFakeElement({
            tagName: 'ARTICLE',
            className: 'product-card',
        });

        engine.isPicking = true;
        engine.mode = 'single';
        engine.hoveredElement = first;
        engine.updateSelectionVisuals = vi.fn();
        engine.emitSelector = vi.fn();
        engine.updateHoverLabel = vi.fn();
        engine.actionButtons = {
            show: vi.fn(),
            contains: vi.fn(() => false),
        };
        engine.tooltip = {
            hide: vi.fn(),
            update: vi.fn(),
        };
        engine.buildSelectors = vi.fn(() => ({ css: '.product-card', xpath: '//article', id: null }));
        (document.elementFromPoint as any).mockReturnValue(second);

        engine.toggleSelection(first);
        engine.handleMouseMove({
            clientX: 80,
            clientY: 40,
            target: second,
        });

        expect(engine.selectedElements).toEqual([first]);
        expect(engine.hoveredElement).toBe(first);
    });

    it('clears stale selector state when cancelling a selection', () => {
        const engine = new SelectorDOMEngine() as any;
        const selected = createFakeElement();
        const onSelect = vi.fn();

        engine.selectedElements = [selected];
        engine.lastComputedSelector = '.product-card';
        engine.actionButtons = { remove: vi.fn() };
        engine.clearMatchOverlays = vi.fn();
        engine.clearSelectionOverlays = vi.fn();
        engine.onSelectCallback = onSelect;

        engine.cancelSelection();

        expect(engine.selectedElements).toEqual([]);
        expect(engine.lastComputedSelector).toBe('');
        expect(onSelect).toHaveBeenCalledWith('', '');
    });

    it('hides the tooltip when the pointer moves outside the allowed scope', () => {
        const engine = new SelectorDOMEngine() as any;
        const inScope = createFakeElement({
            contains: (node) => node === inScope,
        });
        const outOfScope = createFakeElement();
        const hideTooltip = vi.fn();

        engine.isPicking = true;
        engine.scopeElement = inScope;
        engine.hoveredElement = inScope;
        engine.hoverOverlay = {
            style: { display: 'block' },
        };
        engine.maskOverlay = null;
        engine.matchOverlays = [];
        engine.selectionOverlays = [];
        engine.actionButtons = {
            contains: vi.fn(() => false),
        };
        engine.tooltip = {
            hide: hideTooltip,
        };
        (document.elementFromPoint as any).mockReturnValue(outOfScope);

        engine.handleMouseMove({
            clientX: 160,
            clientY: 90,
            target: outOfScope,
        });

        expect(engine.hoverOverlay.style.display).toBe('none');
        expect(hideTooltip).toHaveBeenCalled();
    });

    it('highlights similar matches after the first selection in multiple mode', () => {
        const engine = new SelectorDOMEngine() as any;
        const selected = createFakeElement({
            tagName: 'ARTICLE',
            className: 'product-card',
        });
        const similar = createFakeElement({
            tagName: 'ARTICLE',
            className: 'product-card',
        });

        engine.isPicking = true;
        engine.mode = 'multiple';
        engine.updateSelectionVisuals = vi.fn();
        engine.updateHoverLabel = vi.fn();
        engine.actionButtons = {
            show: vi.fn(),
            contains: vi.fn(() => false),
        };
        engine.tooltip = {
            hide: vi.fn(),
        };
        engine.getRelativeSelector = vi.fn(() => '.product-card');
        engine.getRelativeXPath = vi.fn(() => './/article[contains(@class, "product-card")]');
        engine.updateMatchVisuals = vi.fn();
        (document.querySelectorAll as any).mockReturnValue([selected, similar]);

        engine.toggleSelection(selected);

        expect(engine.selectedElements).toEqual([selected]);
        expect(engine.updateMatchVisuals).toHaveBeenCalledWith('.product-card');
        expect(engine.lastComputedSelector).toBe('.product-card');
    });

    it('safely finds closest ancestor when parent selector is an XPath', () => {
        const engine = new SelectorDOMEngine() as any;
        const child = createFakeElement({ tagName: 'SPAN' });
        const parent = createFakeElement({ tagName: 'DIV', className: 'product-item' });
        child.parentElement = parent as any;
        
        // Mock document.evaluate to return parent
        (globalThis as any).document.evaluate = vi.fn(() => ({
            snapshotLength: 1,
            snapshotItem: (idx: number) => (idx === 0 ? parent : null),
        }));

        const result = engine.closestAncestor(child as any, '//div[@class="product-item"]');
        expect(result).toBe(parent);
        expect(document.evaluate).toHaveBeenCalledWith(
            '//div[@class="product-item"]',
            document,
            null,
            expect.any(Number),
            null
        );
    });

    it('falls back to element.closest when parent selector is a CSS selector', () => {
        const engine = new SelectorDOMEngine() as any;
        const child = createFakeElement({ tagName: 'SPAN' });
        const closestMock = vi.fn();
        child.closest = closestMock;

        engine.closestAncestor(child as any, '.product-item');
        expect(closestMock).toHaveBeenCalledWith('.product-item');
    });

    it('getBestSelector validates CSS and XPath and returns the best matching one', () => {
        const engine = new SelectorDOMEngine() as any;
        const fakeEl = createFakeElement();
        engine.selectedElements = [fakeEl as any];

        // Mock document.querySelectorAll and evaluate
        const mockQuerySelectorAll = vi.fn();
        const mockEvaluate = vi.fn();
        (globalThis as any).document.querySelectorAll = mockQuerySelectorAll;
        (globalThis as any).document.evaluate = mockEvaluate;

        // Case 1: Both CSS and XPath match exactly -> Prefer CSS
        mockQuerySelectorAll.mockReturnValueOnce([fakeEl]);
        mockEvaluate.mockReturnValueOnce({
            snapshotLength: 1,
            snapshotItem: () => fakeEl
        });
        let result = engine.getBestSelector('.test-class', '//div[@class="test-class"]');
        expect(result).toBe('.test-class');

        // Case 2: CSS matches 0 but XPath matches exactly -> Prefer XPath
        mockQuerySelectorAll.mockReturnValueOnce([]);
        mockEvaluate.mockReturnValueOnce({
            snapshotLength: 1,
            snapshotItem: () => fakeEl
        });
        result = engine.getBestSelector('.test-class', '//div[@class="test-class"]');
        expect(result).toBe('//div[@class="test-class"]');

        // Case 3: CSS throws error but XPath matches exactly -> Prefer XPath
        mockQuerySelectorAll.mockImplementationOnce(() => { throw new Error('Invalid CSS'); });
        mockEvaluate.mockReturnValueOnce({
            snapshotLength: 1,
            snapshotItem: () => fakeEl
        });
        result = engine.getBestSelector('.test-class', '//div[@class="test-class"]');
        expect(result).toBe('//div[@class="test-class"]');
    });
});
