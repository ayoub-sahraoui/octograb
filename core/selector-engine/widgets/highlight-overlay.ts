import { THEME } from './theme';

const styles = {
    base: [
        'position: fixed',
        'pointer-events: none',
        'box-sizing: border-box',
        `border-radius: ${THEME.radius.sm}`,
        `z-index: ${THEME.zIndex}`,
        'display: none',
        'transition: left 0.08s ease, top 0.08s ease, width 0.08s ease, height 0.08s ease',
    ].join('; '),
};

const state = {
    hover: {
        border: `2px dashed ${THEME.colors.primary}`,
        background: 'rgba(59, 166, 140, 0.06)',
        boxShadow: 'none',
    },
    selected: {
        border: `2px solid ${THEME.colors.primary}`,
        background: 'rgba(59, 166, 140, 0.12)',
        boxShadow: '0 0 0 3px rgba(59, 166, 140, 0.2), inset 0 0 0 1px rgba(59,166,140,0.1)',
    },
};

export class HighlightOverlay {
    private el: HTMLDivElement | null = null;

    create(): void {
        this.el = document.createElement('div');
        this.el.style.cssText = styles.base;
        document.documentElement.appendChild(this.el);
    }

    update(rect: DOMRect, selected = false): void {
        if (!this.el) return;
        const s = selected ? state.selected : state.hover;
        this.el.style.border = s.border;
        this.el.style.background = s.background;
        this.el.style.boxShadow = s.boxShadow;
        this.el.style.display = 'block';
        this.el.style.left = `${rect.left}px`;
        this.el.style.top = `${rect.top}px`;
        this.el.style.width = `${rect.width}px`;
        this.el.style.height = `${rect.height}px`;
    }

    hide(): void {
        if (this.el) this.el.style.display = 'none';
    }

    remove(): void {
        if (this.el) {
            this.el.remove();
            this.el = null;
        }
    }
}
