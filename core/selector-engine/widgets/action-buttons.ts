import { THEME } from './theme';

const BTN_OFFSET_Y = 46;
const BTN_FALLBACK_GAP_Y = 10;
const BTN_MIN_Y = 8;
const BTN_MIN_X = 8;
const DEFAULT_PANEL_WIDTH = 220;
const DEFAULT_PANEL_HEIGHT = 38;

const styles = {
    wrapper: [
        'position: fixed',
        `z-index: ${THEME.zIndex}`,
        'display: flex; gap: 6px; align-items: center',
        `filter: ${THEME.shadow.buttons}`,
    ].join('; '),

    btnBase: [
        'display: inline-flex; align-items: center; gap: 5px',
        'border: none',
        'border-radius: 7px',
        'padding: 6px 14px',
        `font-family: ${THEME.fonts.sans}`,
        'font-size: 12px; font-weight: 600',
        'cursor: pointer',
        'transition: opacity 0.15s ease, transform 0.1s ease',
        'white-space: nowrap',
    ].join('; '),

    btnConfirm: [
        `background: linear-gradient(135deg, ${THEME.colors.primary}, ${THEME.colors.primaryLight})`,
        `color: ${THEME.colors.surface}`,
        'box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset',
    ].join('; '),

    btnDeselect: [
        `background: ${THEME.colors.surface}`,
        `color: ${THEME.colors.textSecondary}`,
        `border: 1px solid ${THEME.colors.primarySubtle}`,
    ].join('; '),
};

const ICON_CHECK = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CROSS = `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" style="flex-shrink:0"><path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function getActionButtonsPosition(
    rect: Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>,
    viewport: { width: number; height: number },
    panel: { width: number; height: number }
): { left: number; top: number } {
    const maxLeft = Math.max(BTN_MIN_X, viewport.width - panel.width - BTN_MIN_X);
    const left = clamp(rect.left, BTN_MIN_X, maxLeft);

    const preferredTop = rect.top - BTN_OFFSET_Y;
    const fallbackTop = rect.bottom + BTN_FALLBACK_GAP_Y;
    const maxTop = Math.max(BTN_MIN_Y, viewport.height - panel.height - BTN_MIN_Y);
    const top = preferredTop >= BTN_MIN_Y
        ? preferredTop
        : clamp(fallbackTop, BTN_MIN_Y, maxTop);

    return { left, top };
}

function buildTemplate(btnBase: string, btnConfirm: string, btnDeselect: string): string {
    return `
        <button data-action="confirm" style="${btnBase}; ${btnConfirm}">
            ${ICON_CHECK} Confirm
        </button>
        <button data-action="deselect" style="${btnBase}; ${btnDeselect}">
            ${ICON_CROSS} Deselect
        </button>
    `;
}

function attachHoverEffects(el: HTMLDivElement): void {
    el.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('mouseenter', () => {
            (btn as HTMLButtonElement).style.opacity = '0.88';
            (btn as HTMLButtonElement).style.transform = 'translateY(-1px)';
        });
        btn.addEventListener('mouseleave', () => {
            (btn as HTMLButtonElement).style.opacity = '1';
            (btn as HTMLButtonElement).style.transform = 'none';
        });
    });
}

export class ActionButtons {
    private el: HTMLDivElement | null = null;
    private getMountRoot(): HTMLElement {
        return document.body || document.documentElement;
    }

    private applyPosition(rect: DOMRect): void {
        if (!this.el) return;

        const measuredRect = typeof this.el.getBoundingClientRect === 'function'
            ? this.el.getBoundingClientRect()
            : null;
        const panel = {
            width: measuredRect?.width || DEFAULT_PANEL_WIDTH,
            height: measuredRect?.height || DEFAULT_PANEL_HEIGHT,
        };
        const viewport = {
            width: window.innerWidth || 1280,
            height: window.innerHeight || 720,
        };
        const position = getActionButtonsPosition(rect, viewport, panel);

        this.el.style.left = `${position.left}px`;
        this.el.style.top = `${position.top}px`;
        this.el.style.display = 'flex';
    }

    show(rect: DOMRect, onConfirm: () => void, onDeselect: () => void): void {
        if (this.el) this.el.remove();

        this.el = document.createElement('div');
        this.el.style.cssText = styles.wrapper;
        this.el.innerHTML = buildTemplate(styles.btnBase, styles.btnConfirm, styles.btnDeselect);

        attachHoverEffects(this.el);

        this.el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const action = (e.target as HTMLElement).closest('button')?.dataset.action;
            if (action === 'confirm') onConfirm();
            else if (action === 'deselect') onDeselect();
        }, true);

        this.getMountRoot().appendChild(this.el);
        this.applyPosition(rect);
    }

    reposition(rect: DOMRect): void {
        this.applyPosition(rect);
    }

    hide(): void {
        if (this.el) this.el.style.display = 'none';
    }

    contains(node: Node): boolean {
        return this.el?.contains(node) ?? false;
    }

    remove(): void {
        if (this.el) {
            this.el.remove();
            this.el = null;
        }
    }
}
