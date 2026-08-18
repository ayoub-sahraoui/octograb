import { THEME } from './theme';

type FocusOverlayMode = 'single' | 'multiple' | 'list';

const styles = {
    backdrop: [
        'position: fixed; inset: 0',
        `z-index: ${THEME.zIndexOverlay}`,
        `background: ${THEME.colors.overlayBg}`,
        'backdrop-filter: blur(2px)',
        'display: flex; align-items: center; justify-content: center',
        'cursor: default',
        `font-family: ${THEME.fonts.sans}`,
    ].join('; '),

    card: [
        `background: ${THEME.colors.surface}`,
        `color: ${THEME.colors.text}`,
        'padding: 24px',
        `border-radius: ${THEME.radius.lg}`,
        `font-family: ${THEME.fonts.sans}`,
        'font-size: 14px',
        'text-align: left',
        `box-shadow: ${THEME.shadow.card}`,
        'width: min(92vw, 360px)',
        'pointer-events: auto',
    ].join('; '),

    brandRow: [
        'display: flex; align-items: center; gap: 12px',
        'margin-bottom: 18px',
    ].join('; '),

    logoWrap: [
        'width: 48px; height: 48px',
        `background: linear-gradient(135deg, ${THEME.colors.primary}, ${THEME.colors.primaryLight})`,
        `border-radius: ${THEME.radius.lg}`,
        'display: flex; align-items: center; justify-content: center',
        'box-shadow: inset 0 1px 0 rgba(255,255,255,0.18)',
        'overflow: hidden',
    ].join('; '),

    brandEyebrow: [
        'font-size: 11px; font-weight: 700',
        `color: ${THEME.colors.primary}`,
        'letter-spacing: 0.08em',
        'text-transform: uppercase',
        'margin-bottom: 4px',
    ].join('; '),

    brandTitle: [
        'font-size: 18px; font-weight: 700',
        `color: ${THEME.colors.text}`,
        'margin: 0',
    ].join('; '),

    title: [
        'font-size: 18px; font-weight: 700',
        `color: ${THEME.colors.text}`,
        'margin: 0 0 8px 0',
    ].join('; '),

    description: [
        'font-size: 13px',
        `color: ${THEME.colors.textMuted}`,
        'line-height: 1.5',
        'margin: 0',
    ].join('; '),

    hint: [
        'margin-top: 16px; padding: 10px 12px',
        `background: ${THEME.colors.primaryBg}`,
        `border: 1px solid ${THEME.colors.primaryBorder}`,
        `border-radius: ${THEME.radius.md}`,
        'font-size: 12px',
        `color: ${THEME.colors.primary}`,
        `font-family: ${THEME.fonts.mono}`,
    ].join('; '),

    actions: [
        'display: flex; gap: 10px; justify-content: flex-end',
        'margin-top: 18px',
    ].join('; '),

    buttonBase: [
        'display: inline-flex; align-items: center; justify-content: center',
        'min-width: 110px',
        'border-radius: 999px',
        'padding: 10px 16px',
        'font-size: 12px',
        'font-weight: 700',
        'border: none',
        'cursor: pointer',
        `font-family: ${THEME.fonts.sans}`,
    ].join('; '),

    buttonGhost: [
        `background: ${THEME.colors.surface}`,
        `border: 1px solid ${THEME.colors.primarySubtle}`,
        `color: ${THEME.colors.textSecondary}`,
    ].join('; '),

    buttonPrimary: [
        `background: linear-gradient(135deg, ${THEME.colors.primary}, ${THEME.colors.primaryLight})`,
        'color: white',
        'box-shadow: inset 0 1px 0 rgba(255,255,255,0.18)',
    ].join('; '),
};

function getModeTitle(mode: FocusOverlayMode): string {
    if (mode === 'single') return 'Select one element';
    if (mode === 'list') return 'Select repeating items';
    return 'Select multiple elements';
}

function getModeDescription(mode: FocusOverlayMode): string {
    if (mode === 'single') {
        return 'Pick the exact element you want on the page. OctoGrab will keep the page steady after the first pick so the selection stays clear.';
    }
    if (mode === 'list') {
        return 'Pick examples of the repeating container on the page so OctoGrab can infer the list selector.';
    }
    return 'Pick the elements that belong together, then confirm once the preview looks right.';
}

function getLogoMarkup(logoSrc: string | null): string {
    if (logoSrc) {
        return `<img src="${logoSrc}" alt="OctoGrab logo" style="width:100%; height:100%; object-fit:cover" />`;
    }

    return `
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M20 14h24c7.732 0 14 6.268 14 14v8c0 11.046-8.954 20-20 20H26C14.954 56 6 47.046 6 36V28c0-7.732 6.268-14 14-14Z" fill="rgba(255,255,255,0.18)" />
            <path d="M21 24c0-3.314 2.686-6 6-6h10c6.627 0 12 5.373 12 12v1c0 8.284-6.716 15-15 15h-7c-3.314 0-6-2.686-6-6V24Z" fill="white" fill-opacity="0.92" />
            <circle cx="41" cy="27" r="3" fill="${THEME.colors.primary}" />
        </svg>
    `;
}

function resolveLogoSrc(): string | null {
    try {
        const runtime = (globalThis as any).browser?.runtime;
        if (runtime?.getURL) {
            return runtime.getURL('/octograb-logo.png');
        }
    } catch {
        // Ignore missing runtime in tests.
    }
    return null;
}

export function buildFocusOverlayTemplate(
    mode: FocusOverlayMode = 'single',
    logoSrc: string | null = resolveLogoSrc()
): string {
    return `
        <div style="${styles.card}">
            <div style="${styles.brandRow}">
                <div style="${styles.logoWrap}">${getLogoMarkup(logoSrc)}</div>
                <div>
                    <div style="${styles.brandEyebrow}">Selector Engine</div>
                    <p style="${styles.brandTitle}">OctoGrab</p>
                </div>
            </div>
            <p style="${styles.title}">${getModeTitle(mode)}</p>
            <p style="${styles.description}">${getModeDescription(mode)}</p>
            <div style="${styles.hint}">Tip: press ESC any time to exit the picker.</div>
            <div style="${styles.actions}">
                <button type="button" data-action="cancel" style="${styles.buttonBase}; ${styles.buttonGhost}">Cancel</button>
                <button type="button" data-action="start" style="${styles.buttonBase}; ${styles.buttonPrimary}">Start Picking</button>
            </div>
        </div>
    `;
}

export class FocusOverlay {
    private el: HTMLDivElement | null = null;

    show(onActivate: () => void, onCancel: (() => void) | null = null, mode: FocusOverlayMode = 'single'): void {
        this.el = document.createElement('div');
        this.el.style.cssText = styles.backdrop;
        this.el.innerHTML = buildFocusOverlayTemplate(mode);
        this.el.addEventListener('click', (event) => {
            const target = event.target as HTMLElement | null;
            const actionNode = target?.closest('[data-action]') as HTMLElement | null;
            const action = actionNode?.getAttribute?.('data-action') ?? actionNode?.dataset?.action;

            if (action === 'cancel') {
                this.remove();
                onCancel?.();
                return;
            }

            if (action === 'start' || target === this.el) {
                this.remove();
                onActivate();
            }
        });
        document.documentElement.appendChild(this.el);
    }

    remove(): void {
        if (this.el) {
            this.el.remove();
            this.el = null;
        }
    }
}
