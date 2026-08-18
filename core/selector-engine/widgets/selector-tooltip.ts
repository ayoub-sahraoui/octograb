import { THEME } from './theme';

const TOOLTIP_WIDTH = 280;
const TOOLTIP_HEIGHT = 80;
const TOOLTIP_OFFSET = 16;
const TOOLTIP_MARGIN = 8;

const styles = {
    container: [
        'position: fixed',
        `background: ${THEME.colors.surface}`,
        `color: ${THEME.colors.text}`,
        'padding: 8px 12px',
        `border-radius: ${THEME.radius.md}`,
        `font-family: ${THEME.fonts.sans}`,
        'font-size: 12px',
        `z-index: ${THEME.zIndex}`,
        'pointer-events: none',
        'display: none',
        `box-shadow: ${THEME.shadow.tooltip}`,
        `min-width: 160px; max-width: ${TOOLTIP_WIDTH}px`,
    ].join('; '),

    tagBadge: [
        `background: linear-gradient(135deg, ${THEME.colors.primary}, ${THEME.colors.primaryLight})`,
        'color: white',
        'padding: 1px 7px',
        `border-radius: ${THEME.radius.sm}`,
        'font-size: 11px; font-weight: 600',
        `font-family: ${THEME.fonts.mono}`,
    ].join('; '),

    cssPill: [
        `font-family: ${THEME.fonts.mono}`,
        'font-size: 11px',
        `color: ${THEME.colors.primary}`,
        `background: ${THEME.colors.primaryBg}`,
        'padding: 3px 7px',
        `border-radius: ${THEME.radius.sm}`,
        'word-break: break-all',
    ].join('; '),

    idRow: [
        `font-family: ${THEME.fonts.mono}`,
        'font-size: 11px',
        `color: ${THEME.colors.textMuted}`,
        'margin-top: 4px',
    ].join('; '),
};

function buildTemplate(tagName: string, css: string, id: string | null): string {
    return `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:5px;">
            <span style="${styles.tagBadge}">${tagName}</span>
        </div>
        <div style="${styles.cssPill}">${css}</div>
        ${id ? `<div style="${styles.idRow}">${id}</div>` : ''}
    `;
}

function clampPosition(x: number, y: number): { left: number; top: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > vw ? x - TOOLTIP_OFFSET - TOOLTIP_WIDTH : x + TOOLTIP_OFFSET;
    const top = y + TOOLTIP_OFFSET + TOOLTIP_HEIGHT > vh ? y - TOOLTIP_OFFSET - TOOLTIP_HEIGHT : y + TOOLTIP_OFFSET;
    return {
        left: Math.max(TOOLTIP_MARGIN, left),
        top: Math.max(TOOLTIP_MARGIN, top),
    };
}

export class SelectorTooltip {
    private el: HTMLDivElement | null = null;

    create(): void {
        this.el = document.createElement('div');
        this.el.style.cssText = styles.container;
        document.documentElement.appendChild(this.el);
    }

    update(tagName: string, css: string, id: string | null, x: number, y: number): void {
        if (!this.el) return;
        this.el.innerHTML = buildTemplate(tagName, css, id);
        this.el.style.display = 'block';
        const pos = clampPosition(x, y);
        this.el.style.left = `${pos.left}px`;
        this.el.style.top = `${pos.top}px`;
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
