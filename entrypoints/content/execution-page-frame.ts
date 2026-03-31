export const FRAME_ID = 'octograb-execution-frame';
const STYLE_ID = 'octograb-execution-frame-style';
let isFrameActive = false;
let frameObserver: MutationObserver | null = null;

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #${FRAME_ID} {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 2147483646;
            box-sizing: border-box;
            border: 0 solid transparent;
            background-image:
                radial-gradient(ellipse 100% 20vh at 50% 0%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%),
                radial-gradient(ellipse 100% 20vh at 50% 100%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%),
                radial-gradient(ellipse 20vw 100% at 0% 50%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%),
                radial-gradient(ellipse 20vw 100% at 100% 50%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%);
            background-repeat: no-repeat;
            animation: octograb-page-frame-pulse 1.8s ease-in-out infinite;
        }

        @keyframes octograb-page-frame-pulse {
            0%, 100% {
                opacity: 0.82;
                filter: saturate(1) brightness(1);
            }

            50% {
                opacity: 1;
                filter: saturate(1.18) brightness(1.08);
            }
        }
    `;

    document.head.appendChild(style);
}

function installFrameObserver(): void {
    if (frameObserver || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
        return;
    }

    frameObserver = new MutationObserver(() => {
        if (isFrameActive) {
            ensureExecutionPageFrameVisible();
        }
    });

    frameObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

function createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = FRAME_ID;
    overlay.style.position = 'fixed';
    overlay.style.inset = '0px';
    overlay.style.pointerEvents = 'none';
    overlay.style.borderWidth = '0px';
    overlay.style.backgroundImage = [
        'radial-gradient(ellipse 100% 20vh at 50% 0%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%)',
        'radial-gradient(ellipse 100% 20vh at 50% 100%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%)',
        'radial-gradient(ellipse 20vw 100% at 0% 50%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%)',
        'radial-gradient(ellipse 20vw 100% at 100% 50%, rgba(16, 185, 129, 0.42), rgba(16, 185, 129, 0.16) 48%, rgba(16, 185, 129, 0.05) 72%, transparent 100%)',
    ].join(', ');

    document.documentElement.appendChild(overlay);
    return overlay;
}

export function ensureExecutionPageFrameVisible(): void {
    if (typeof document === 'undefined' || !isFrameActive) return;

    ensureStyles();
    installFrameObserver();

    let overlay = document.getElementById(FRAME_ID) as HTMLDivElement | null;
    if (!overlay) {
        overlay = createOverlay();
    }

    overlay.style.position = 'fixed';
    overlay.style.inset = '0px';
    overlay.style.pointerEvents = 'none';
    overlay.style.borderWidth = '0px';
}

export function showExecutionPageFrame(): void {
    if (typeof document === 'undefined') return;
    isFrameActive = true;
    ensureExecutionPageFrameVisible();
}

export function hideExecutionPageFrame(): void {
    if (typeof document === 'undefined') return;
    isFrameActive = false;
    document.getElementById(FRAME_ID)?.remove();
}
