import { describe, expect, it, vi } from 'vitest';
import { buildFocusOverlayTemplate, FocusOverlay } from '../core/selector-engine/widgets/focus-overlay';
import { ActionButtons, getActionButtonsPosition } from '../core/selector-engine/widgets/action-buttons';

function createFakeDocument() {
    const rootChildren: any[] = [];
    const bodyChildren: any[] = [];

    return {
        mountedNodes: rootChildren,
        bodyNodes: bodyChildren,
        documentElement: {
            appendChild(node: any) {
                rootChildren.push(node);
            },
        },
        body: {
            appendChild(node: any) {
                bodyChildren.push(node);
            },
        },
        createElement() {
            return {
                style: { cssText: '', left: '', top: '', display: '' },
                innerHTML: '',
                listeners: new Map<string, Function[]>(),
                querySelectorAll() {
                    return [];
                },
                getBoundingClientRect() {
                    return { width: 220, height: 38 };
                },
                addEventListener(type: string, listener: Function) {
                    const listeners = this.listeners.get(type) || [];
                    listeners.push(listener);
                    this.listeners.set(type, listeners);
                },
                remove() {
                    const index = rootChildren.indexOf(this);
                    if (index >= 0) rootChildren.splice(index, 1);
                },
                dispatch(type: string, target: any) {
                    for (const listener of this.listeners.get(type) || []) {
                        listener({ target });
                    }
                },
            };
        },
    };
}

describe('selector engine widgets', () => {
    it('places action buttons below the target when there is no room above', () => {
        const position = getActionButtonsPosition(
            {
                top: 4,
                left: 960,
                right: 1080,
                bottom: 44,
                width: 120,
                height: 40,
            } as DOMRect,
            { width: 1024, height: 768 },
            { width: 220, height: 38 }
        );

        expect(position.top).toBeGreaterThan(40);
        expect(position.left).toBeLessThanOrEqual(804);
    });

    it('renders a branded focus overlay template with explicit start and cancel actions', () => {
        const template = buildFocusOverlayTemplate('single');

        expect(template).toContain('OctoGrab');
        expect(template).toContain('data-action="start"');
        expect(template).toContain('data-action="cancel"');
        expect(template).toContain('Select one element');
    });

    it('lets the focus overlay cancel before picking starts', () => {
        const fakeDocument = createFakeDocument();
        (globalThis as any).document = fakeDocument;

        const overlay = new FocusOverlay();
        const onActivate = vi.fn();
        const onCancel = vi.fn();

        overlay.show(onActivate, onCancel, 'single');
        const mountedNode = fakeDocument.mountedNodes[0];
        mountedNode.dispatch('click', {
            closest: () => ({ dataset: { action: 'cancel' } }),
        });

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onActivate).not.toHaveBeenCalled();
    });

    it('mounts action buttons into the page body and positions them immediately', () => {
        const fakeDocument = createFakeDocument();
        (globalThis as any).document = fakeDocument;
        (globalThis as any).window = {
            innerWidth: 1024,
            innerHeight: 768,
        };

        const buttons = new ActionButtons();
        buttons.show(
            {
                top: 120,
                left: 80,
                right: 220,
                bottom: 280,
                width: 140,
                height: 160,
            } as DOMRect,
            vi.fn(),
            vi.fn()
        );

        expect(fakeDocument.bodyNodes).toHaveLength(1);
        expect(fakeDocument.mountedNodes).toHaveLength(0);
        expect(fakeDocument.bodyNodes[0].style.left).toBe('80px');
        expect(fakeDocument.bodyNodes[0].style.top).not.toBe('');
        expect(fakeDocument.bodyNodes[0].style.display).toBe('flex');
    });
});
