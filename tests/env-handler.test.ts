import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSwitchFrameResult } from '../entrypoints/content/switch-frame-result';

const envHandlerMocks = vi.hoisted(() => ({
    handler: null as any,
    cleanup: vi.fn(),
}));

vi.mock('../core/messaging', () => ({
    registerRpcHandler: vi.fn((handler: any) => {
        envHandlerMocks.handler = handler;
        return envHandlerMocks.cleanup;
    }),
}));

vi.mock('../core/dom-query', () => ({
    resolveScope: vi.fn(() => ({ tagName: 'DIV' })),
    getElement: vi.fn(() => null),
    getElements: vi.fn(() => []),
}));

describe('env-handler switch frame downgrade', () => {
    beforeEach(() => {
        envHandlerMocks.handler = null;
        envHandlerMocks.cleanup.mockClear();
    });

    it('should report frame existence without claiming execution context switched', () => {
        const result = buildSwitchFrameResult('sidebar-frame');

        expect(result.success).toBe(true);
        expect(result.message).toContain('frame exists');
        expect(result.message).toContain('execution context did not switch');
        expect(result.data).toEqual({
            frameFound: true,
            switched: false,
            warning: 'Frame exists, but Chrome extension execution context did not switch. Use frame-aware selectors or a future frame routing implementation.'
        });
    });

    it('should clear the aborted state before a later execution reuses the same content script', async () => {
        vi.resetModules();

        const originalWindow = globalThis.window;
        const originalDocument = globalThis.document;

        Object.assign(globalThis, {
            window: { frames: [] },
            document: {},
        });

        try {
            const { initEnvHandler } = await import('../entrypoints/content/env-handler');
            initEnvHandler();

            expect(envHandlerMocks.handler).toBeTypeOf('function');

            await envHandlerMocks.handler({ type: 'ENV_ABORT' });

            const blocked = await envHandlerMocks.handler({
                type: 'ENV_SWITCH_FRAME',
                data: { target: 0, timeout: 10 },
            });
            expect(blocked.success).toBe(false);
            expect(blocked.error).toContain('aborted');

            const reset = await envHandlerMocks.handler({ type: 'ENV_RESET_ABORT' });
            expect(reset).toEqual({ success: true });

            const resumed = await envHandlerMocks.handler({
                type: 'ENV_SWITCH_FRAME',
                data: { target: 0, timeout: 10 },
            });
            expect(resumed.success).toBe(true);
        } finally {
            Object.assign(globalThis, {
                window: originalWindow,
                document: originalDocument,
            });
        }
    });
});

describe('dispatchHoverSequence', () => {
    it('should dispatch the hover event sequence modern sites commonly listen for', async () => {
        const originalWindow = globalThis.window;
        const originalDocument = globalThis.document;
        const originalElement = globalThis.Element;
        const originalHTMLElement = globalThis.HTMLElement;
        const originalMouseEvent = globalThis.MouseEvent;
        const originalPointerEvent = globalThis.PointerEvent;

        class FakeMouseEvent extends Event {
            clientX: number;
            clientY: number;
            view: any;

            constructor(type: string, init: any = {}) {
                super(type, { bubbles: init.bubbles, cancelable: init.cancelable });
                this.clientX = init.clientX ?? 0;
                this.clientY = init.clientY ?? 0;
                this.view = init.view;
            }
        }

        class FakePointerEvent extends FakeMouseEvent {
            pointerType: string;
            isPrimary: boolean;

            constructor(type: string, init: any = {}) {
                super(type, init);
                this.pointerType = init.pointerType ?? 'mouse';
                this.isPrimary = init.isPrimary ?? true;
            }
        }

        class FakeElement extends EventTarget {
            tagName: string;
            ownerDocument: { activeElement: FakeElement | null };

            constructor(tagName: string, ownerDocument: { activeElement: FakeElement | null }) {
                super();
                this.tagName = tagName.toUpperCase();
                this.ownerDocument = ownerDocument;
            }

            hasAttribute() {
                return false;
            }

            getAttribute() {
                return null;
            }

            getBoundingClientRect() {
                return { left: 10, top: 20, width: 100, height: 40 };
            }

            focus() {
                this.ownerDocument.activeElement = this;
            }
        }

        const fakeDocument = { activeElement: null as FakeElement | null };
        const fakeWindow = {};
        Object.assign(globalThis, {
            window: fakeWindow,
            document: fakeDocument,
            Element: FakeElement,
            HTMLElement: FakeElement,
            MouseEvent: FakeMouseEvent,
            PointerEvent: FakePointerEvent,
        });

        try {
            const { dispatchHoverSequence } = await import('../entrypoints/content/env-handler');
            const target = new FakeElement('button', fakeDocument);

            const events: string[] = [];
            ['pointerover', 'pointerenter', 'pointermove', 'mouseover', 'mouseenter', 'mousemove'].forEach((eventName) => {
                target.addEventListener(eventName, () => events.push(eventName));
            });

            dispatchHoverSequence(target as unknown as Element);

            expect(events.slice(0, 3)).toEqual(['pointerover', 'pointerenter', 'pointermove']);
            expect(events).toContain('mouseover');
            expect(events).toContain('mouseenter');
            expect(events).toContain('mousemove');
            expect(fakeDocument.activeElement).toBe(target);
        } finally {
            Object.assign(globalThis, {
                window: originalWindow,
                document: originalDocument,
                Element: originalElement,
                HTMLElement: originalHTMLElement,
                MouseEvent: originalMouseEvent,
                PointerEvent: originalPointerEvent,
            });
        }
    });
});
