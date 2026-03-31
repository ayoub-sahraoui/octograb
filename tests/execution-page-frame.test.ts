import { beforeEach, describe, expect, it } from 'vitest';
import {
    ensureExecutionPageFrameVisible,
    FRAME_ID,
    hideExecutionPageFrame,
    showExecutionPageFrame,
} from '../entrypoints/content/execution-page-frame';

function createFakeDocument() {
    const nodes = new Map<string, any>();
    const headChildren: any[] = [];
    const bodyChildren: any[] = [];

    const createElement = (tagName: string) => {
        const node: any = {
            tagName,
            id: '',
            style: {},
            textContent: '',
            remove() {
                if (node.id) nodes.delete(node.id);
                const headIndex = headChildren.indexOf(node);
                if (headIndex >= 0) headChildren.splice(headIndex, 1);
                const bodyIndex = bodyChildren.indexOf(node);
                if (bodyIndex >= 0) bodyChildren.splice(bodyIndex, 1);
            },
        };

        return node;
    };

    return {
        documentElement: {
            appendChild(node: any) {
                bodyChildren.push(node);
                if (node.id) nodes.set(node.id, node);
            },
        },
        head: {
            appendChild(node: any) {
                headChildren.push(node);
                if (node.id) nodes.set(node.id, node);
            },
        },
        body: {
            innerHTML: '',
            appendChild(node: any) {
                bodyChildren.push(node);
                if (node.id) nodes.set(node.id, node);
            },
        },
        createElement,
        getElementById(id: string) {
            return nodes.get(id) ?? null;
        },
        querySelectorAll(selector: string) {
            if (!selector.startsWith('#')) return [];
            const node = nodes.get(selector.slice(1));
            return node ? [node] : [];
        },
    };
}

describe('execution page frame', () => {
    beforeEach(() => {
        (globalThis as any).document = createFakeDocument();
    });

    it('creates a single fixed overlay when shown', () => {
        showExecutionPageFrame();
        showExecutionPageFrame();

        const overlays = document.querySelectorAll(`#${FRAME_ID}`);
        expect(overlays).toHaveLength(1);

        const overlay = overlays[0] as HTMLElement;
        expect(overlay.style.position).toBe('fixed');
        expect(overlay.style.pointerEvents).toBe('none');
        expect(overlay.style.inset).toBe('0px');
        expect(overlay.style.borderWidth).toBe('0px');
        expect(overlay.style.backgroundImage).toContain('radial-gradient');
    });

    it('hides and removes the overlay cleanly', () => {
        showExecutionPageFrame();
        hideExecutionPageFrame();

        expect(document.getElementById(FRAME_ID)).toBeNull();
    });

    it('recreates the overlay when active state is still on and the node disappears', () => {
        showExecutionPageFrame();
        document.getElementById(FRAME_ID)?.remove();

        ensureExecutionPageFrameVisible();

        expect(document.getElementById(FRAME_ID)).not.toBeNull();
    });
});
