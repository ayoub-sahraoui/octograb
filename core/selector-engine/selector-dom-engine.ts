import { FocusOverlay } from './widgets/focus-overlay';
import { SelectorTooltip } from './widgets/selector-tooltip';
import { ActionButtons } from './widgets/action-buttons';
import { THEME } from './widgets/theme';

interface ElementSelectors {
    css: string;
    id: string | null;
    xpath: string;
}

export class SelectorDOMEngine {
    isPicking: boolean = false;
    hoveredElement: HTMLElement | null = null;
    selectedElements: HTMLElement[] = [];

    // Callbacks
    onSelectCallback: ((selector: string, xpath: string, elementInfo?: any) => void) | null = null;
    onFinishCallback: ((success: boolean) => void) | null = null;

    // Scopes and modes
    parentSelector: string | null = null;
    scopeElement: Element | null = null;
    mode: 'single' | 'multiple' = 'single';

    // Widgets
    private focusOverlay = new FocusOverlay();
    private tooltip = new SelectorTooltip();
    private actionButtons = new ActionButtons();

    // Overlay elements
    private hoverOverlay: HTMLElement | null = null;
    private hoverLabel: HTMLElement | null = null;
    private maskOverlay: HTMLElement | null = null;
    private selectionOverlays: HTMLElement[] = [];
    private matchOverlays: HTMLElement[] = [];

    private scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    private isSessionPrimed = false;
    private selectionLocked = false;
    private boundHandleScroll: () => void;
    private boundHandleResize: () => void;
    private boundHandleMouseMove: (e: MouseEvent) => void;
    private boundHandleClick: (e: MouseEvent) => void;
    private boundHandleKeyDown: (e: KeyboardEvent) => void;

    private lastMouseX = 0;
    private lastMouseY = 0;
    private isKeyboardNavigating = false;
    private lastComputedSelector = '';

    constructor() {
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleResize = this.handleViewportChange.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleClick = this.handleClick.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    async activate(): Promise<void> {
        this.start(
            (css, xpath) => console.log('Selected:', css, xpath),
            null,
            (success) => console.log('Finished:', success),
            null,
            'single'
        );
    }

    start(
        onSelect: (selector: string, xpath: string, elementInfo?: any) => void,
        scopeElement: Element | null = null,
        onFinish: ((success: boolean) => void) | null = null,
        parentSelector: string | null = null,
        mode: 'single' | 'multiple' | 'list' = 'single'
    ): boolean {
        if (this.isPicking || this.isSessionPrimed) return false;

        this.onSelectCallback = onSelect;
        this.onFinishCallback = onFinish;
        this.scopeElement = scopeElement;
        this.parentSelector = parentSelector;
        this.mode = (mode === 'single') ? 'single' : 'multiple';

        this.selectedElements = [];
        this.lastComputedSelector = '';
        this.selectionLocked = false;
        this.isSessionPrimed = true;

        this.clearOverlays();

        // Resolve parent scope selector to scopeElement if needed
        if (!this.scopeElement && this.parentSelector) {
            try {
                let resolved: Element | null = null;
                const isXp = this.parentSelector.startsWith('/') || this.parentSelector.startsWith('./') || this.parentSelector.startsWith('(');
                if (isXp) {
                    const resultType = (globalThis as any).XPathResult?.FIRST_ORDERED_NODE_TYPE || 9;
                    const result = document.evaluate(this.parentSelector, document, null, resultType, null);
                    resolved = result.singleNodeValue as Element;
                } else {
                    resolved = document.querySelector(this.parentSelector);
                }

                if (resolved) {
                    this.scopeElement = resolved;
                    console.log('[OctoGrab] Resolved parentSelector to scope element:', this.parentSelector, resolved);
                } else {
                    console.warn('[OctoGrab] parentSelector did not match any element:', this.parentSelector);
                }
            } catch (e) {
                console.warn('[OctoGrab] Invalid parentSelector:', this.parentSelector, e);
            }
        }

        // Show Focus Overlay
        this.focusOverlay.show(
            () => this.startPicking(),
            () => this.finish(false),
            mode
        );
        return true;
    }

    private startPicking(): void {
        if (this.isPicking) return;
        this.isPicking = true;
        this.tooltip.create();

        // Create hover overlay and label
        this.hoverOverlay = this.createOverlayElement(`2px solid ${THEME.colors.primary}`, 'rgba(59, 166, 140, 0.06)');
        this.hoverLabel = document.createElement('span');
        Object.assign(this.hoverLabel.style, {
            position: 'absolute', top: '-24px', left: '0',
            backgroundColor: THEME.colors.primary, color: 'white',
            padding: '2px 6px', fontSize: '10px', borderRadius: '4px',
            fontFamily: THEME.fonts.sans, fontWeight: '700',
            whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            zIndex: THEME.zIndex
        });
        this.hoverOverlay.appendChild(this.hoverLabel);
        document.body.appendChild(this.hoverOverlay);

        // Draw scope overlay if scope exists
        if (this.scopeElement) {
            const rect = this.scopeElement.getBoundingClientRect();
            this.maskOverlay = document.createElement('div');
            Object.assign(this.maskOverlay.style, {
                position: 'absolute', pointerEvents: 'none', zIndex: THEME.zIndexOverlay,
                top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`,
                width: `${rect.width}px`, height: `${rect.height}px`,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                border: '2px dashed #f59e0b',
                borderRadius: '4px', transition: 'all 0.15s ease'
            });
            const scopeLabel = document.createElement('span');
            scopeLabel.textContent = this.parentSelector ? `Scope: ${this.parentSelector}` : "Extraction Scope";
            Object.assign(scopeLabel.style, {
                position: 'absolute', top: '-22px', left: '0',
                backgroundColor: '#f59e0b', color: '#000',
                padding: '2px 6px', fontSize: '9px', fontWeight: '700', borderRadius: '4px',
                fontFamily: THEME.fonts.mono, maxWidth: '280px', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            });
            this.maskOverlay.appendChild(scopeLabel);
            document.body.appendChild(this.maskOverlay);
        }

        document.addEventListener('mousemove', this.boundHandleMouseMove, true);
        document.addEventListener('click', this.boundHandleClick, true);
        document.addEventListener('keydown', this.boundHandleKeyDown, true);
        window.addEventListener('scroll', this.boundHandleScroll, true);
        window.addEventListener('resize', this.boundHandleResize, true);

        console.log('%cElement Picker Activated - ESC to cancel', 'color: #ff00ff; font-size: 16px');
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.isPicking) return;
        if (this.selectionLocked && this.mode === 'single') return;

        if (this.isKeyboardNavigating) {
            if (Math.abs(e.clientX - this.lastMouseX) < 10 && Math.abs(e.clientY - this.lastMouseY) < 10) return;
            this.isKeyboardNavigating = false;
        }

        if (Math.abs(e.clientX - this.lastMouseX) < 2 && Math.abs(e.clientY - this.lastMouseY) < 2) return;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const target = e.target as HTMLElement;
        if (target === this.hoverOverlay || target === this.maskOverlay || this.matchOverlays.includes(target) || this.selectionOverlays.includes(target)) return;
        if (this.actionButtons.contains(target)) return;

        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (!el || el === this.hoveredElement) return;

        if (this.scopeElement && !this.scopeElement.contains(el)) {
            if (this.hoverOverlay) this.hoverOverlay.style.display = 'none';
            this.tooltip.hide();
            this.hoveredElement = null;
            return;
        }

        this.hoveredElement = el;
        this.drawOverlay(el.getBoundingClientRect(), 'hover');

        const selectors = this.buildSelectors(el);
        this.tooltip.update(el.tagName.toLowerCase(), selectors.css, selectors.id, e.clientX, e.clientY);
        this.updateHoverLabel(el);
    }

    private handleClick(e: MouseEvent): void {
        if (!this.isPicking) return;

        const target = e.target as HTMLElement;
        if (this.actionButtons.contains(target)) return;
        if (this.hoverOverlay && this.hoverOverlay.contains(target)) return;
        if (this.maskOverlay && this.maskOverlay.contains(target)) return;
        if (this.selectionOverlays.some(o => o.contains(target))) return;
        if (this.matchOverlays.some(o => o.contains(target))) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        if (!el) return;

        if (this.scopeElement && !this.scopeElement.contains(el)) return;

        this.toggleSelection(el);
    }

    private toggleSelection(el: HTMLElement): void {
        if (this.mode === 'single') {
            if (this.selectedElements.includes(el)) {
                this.cancelSelection();
                return;
            }
            this.selectedElements = [el];
            this.hoveredElement = el;
            this.selectionLocked = true;
            this.updateSelectionVisuals();
            this.emitSelector();

            const rect = el.getBoundingClientRect();
            this.tooltip.hide();
            if (this.hoverOverlay) {
                this.hoverOverlay.style.display = 'none';
            }
            this.actionButtons.show(
                rect,
                () => this.confirmPick(),
                () => this.cancelSelection()
            );
        } else {
            const index = this.selectedElements.indexOf(el);
            if (index > -1) {
                this.selectedElements.splice(index, 1);
            } else {
                this.selectedElements.push(el);
            }

            this.updateSelectionVisuals();
            this.emitSelector();

            if (this.selectedElements.length > 0) {
                this.tooltip.hide();
                const lastEl = this.selectedElements[this.selectedElements.length - 1];
                this.actionButtons.show(
                    lastEl.getBoundingClientRect(),
                    () => this.confirmPick(),
                    () => this.cancelSelection()
                );
            } else {
                this.actionButtons.remove();
                this.clearMatchOverlays();
            }
        }

        if (this.hoveredElement) {
            this.updateHoverLabel(this.hoveredElement);
        }
    }

    private confirmPick(): void {
        this.finish(true);
    }

    private closestAncestor(el: HTMLElement, selector: string | null): HTMLElement | null {
        if (!selector) return null;
        const isXp = selector.startsWith('/') || selector.startsWith('./') || selector.startsWith('(');
        
        try {
            if (!isXp) {
                return el.closest(selector);
            }
            
            const resultType = (globalThis as any).XPathResult?.ORDERED_NODE_SNAPSHOT_TYPE || 7;
            const result = document.evaluate(selector, document, null, resultType, null);
            const matchedElements = new Set<Node>();
            for (let i = 0; i < result.snapshotLength; i++) {
                const item = result.snapshotItem(i);
                if (item) matchedElements.add(item);
            }
            
            let current: HTMLElement | null = el;
            while (current) {
                if (matchedElements.has(current)) {
                    return current;
                }
                current = current.parentElement;
            }
        } catch (e) {
            console.error('[OctoGrab] Error in closestAncestor:', e);
        }
        return null;
    }

    private getPreviewSelectorForMultipleSelection(el: HTMLElement): { selector: string; xpath: string } | null {
        let effectiveScope = this.scopeElement;
        if (!effectiveScope && this.parentSelector) {
            effectiveScope = this.closestAncestor(el, this.parentSelector);
        }

        const candidates: Array<{ selector: string; xpath: string }> = [];

        if (effectiveScope) {
            candidates.push({
                selector: this.getRelativeSelector(el, effectiveScope),
                xpath: this.getRelativeXPath(el, effectiveScope),
            });
        }

        candidates.push({
            selector: this.getRelativeSelector(el, null),
            xpath: this.getRelativeXPath(el, null),
        });

        for (const candidate of candidates) {
            if (!candidate.selector) continue;

            try {
                const root = effectiveScope || document;
                const matches = root.querySelectorAll(candidate.selector);
                const count = matches.length;
                if (count > 1 && count <= 50 && Array.from(matches).includes(el)) {
                    return candidate;
                }
            } catch {
                // Ignore invalid preview candidates and keep looking.
            }
        }

        return null;
    }

    private cancelSelection(): void {
        this.selectedElements = [];
        this.selectionLocked = false;
        this.lastComputedSelector = '';
        this.actionButtons.remove();
        this.tooltip.hide();
        this.clearMatchOverlays();
        this.clearSelectionOverlays();
        if (this.hoveredElement) {
            this.updateHoverLabel(this.hoveredElement);
        }
        if (this.onSelectCallback) {
            this.onSelectCallback('', '');
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            this.finish(false);
            return;
        }

        if (this.selectionLocked) return;
        if (!this.hoveredElement) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSelection(this.hoveredElement);
            return;
        }

        const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
        if (!isArrow) return;

        e.preventDefault();
        this.isKeyboardNavigating = true;
        let target: HTMLElement | null = null;

        if (e.key === 'ArrowUp') {
            const parent = this.hoveredElement.parentElement;
            if (parent && parent !== document.body && parent !== document.documentElement) {
                if (!this.scopeElement || this.scopeElement.contains(parent)) {
                    target = parent;
                }
            }
        } else if (e.key === 'ArrowDown') {
            const child = this.hoveredElement.firstElementChild as HTMLElement | null;
            if (child) {
                if (!this.scopeElement || this.scopeElement.contains(child)) {
                    target = child;
                }
            }
        } else if (e.key === 'ArrowLeft') {
            const prev = this.hoveredElement.previousElementSibling as HTMLElement | null;
            if (prev) {
                if (!this.scopeElement || this.scopeElement.contains(prev)) {
                    target = prev;
                }
            }
        } else if (e.key === 'ArrowRight') {
            const next = this.hoveredElement.nextElementSibling as HTMLElement | null;
            if (next) {
                if (!this.scopeElement || this.scopeElement.contains(next)) {
                    target = next;
                }
            }
        }

        if (target) {
            this.hoveredElement = target;
            this.drawOverlay(target.getBoundingClientRect(), 'hover');
            this.updateHoverLabel(target);

            const rect = target.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
    }

    private handleScroll(): void {
        if (!this.isPicking) return;
        this.handleViewportChange();
    }

    private handleViewportChange(): void {
        if (!this.isPicking) return;

        if (this.hoverOverlay) this.hoverOverlay.style.display = 'none';
        this.tooltip.hide();
        this.actionButtons.hide();
        this.clearSelectionOverlays();
        this.clearMatchOverlays();

        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            if (!this.isPicking) return;

            this.updateSelectionVisuals();
            if (this.lastComputedSelector) {
                this.updateMatchVisuals(this.lastComputedSelector);
            }
            if (this.hoveredElement && !this.selectionLocked) {
                this.drawOverlay(this.hoveredElement.getBoundingClientRect(), 'hover');
            }
            if (this.scopeElement && this.maskOverlay) {
                const rect = this.scopeElement.getBoundingClientRect();
                Object.assign(this.maskOverlay.style, {
                    top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`,
                    width: `${rect.width}px`, height: `${rect.height}px`
                });
            }

            if (this.selectedElements.length > 0) {
                const lastEl = this.selectedElements[this.selectedElements.length - 1];
                this.actionButtons.reposition(lastEl.getBoundingClientRect());
            }
        }, 150);
    }

    finish(success: boolean): void {
        const callback = this.onFinishCallback;
        this.onFinishCallback = null;
        this.onSelectCallback = null;
        this.deactivate();
        if (callback) {
            callback(success);
        }
    }

    deactivate(): void {
        this.isPicking = false;
        this.isSessionPrimed = false;
        this.selectionLocked = false;
        this.selectedElements = [];
        this.hoveredElement = null;
        this.lastComputedSelector = '';
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }

        document.removeEventListener('mousemove', this.boundHandleMouseMove, true);
        document.removeEventListener('click', this.boundHandleClick, true);
        document.removeEventListener('keydown', this.boundHandleKeyDown, true);
        window.removeEventListener('scroll', this.boundHandleScroll, true);
        window.removeEventListener('resize', this.boundHandleResize, true);

        this.focusOverlay.remove();
        this.tooltip.remove();
        this.actionButtons.remove();
        this.clearOverlays();
    }

    buildSelectors(el: HTMLElement): ElementSelectors {
        let effectiveScope = this.scopeElement;
        if (!effectiveScope && this.parentSelector) {
            effectiveScope = this.closestAncestor(el, this.parentSelector);
        }
        const useRelativeMode = effectiveScope !== null;

        let css = '';
        let xpath = '';

        if (useRelativeMode) {
            css = this.getRelativeSelector(el, effectiveScope);
            xpath = this.getRelativeXPath(el, effectiveScope);
        } else {
            css = this.getOptimalSelector(el, null);
            xpath = this.getSmartXPath(el) || this.getXPath(el);
        }

        return {
            css,
            id: el.id ? `#${el.id}` : null,
            xpath
        };
    }

    private updateHoverLabel(el: HTMLElement): void {
        if (!this.hoverLabel) return;
        const tagName = el.tagName.toLowerCase();
        let displayText = tagName;
        if (el.id) {
            displayText += `#${el.id}`;
        } else {
            const cls = this.getFirstSemanticClass(el);
            if (cls) displayText += `.${cls}`;
        }

        if (this.selectedElements.length > 0) {
            const isSelected = this.selectedElements.includes(el);
            this.hoverLabel.textContent = isSelected ? `✕ ${displayText}` : `+ ${displayText}`;
            this.hoverLabel.style.backgroundColor = isSelected ? '#ef4444' : THEME.colors.primary;
        } else {
            this.hoverLabel.textContent = displayText;
            this.hoverLabel.style.backgroundColor = THEME.colors.primary;
        }
    }

    private getFirstSemanticClass(el: HTMLElement): string | null {
        if (!el.className || typeof el.className !== 'string') return null;
        const classes = el.className.split(/\s+/).filter(c => c);
        for (const cls of classes) {
            if (!this.isUtilityClass(cls)) return cls;
        }
        return classes[0] || null;
    }

    createOverlayElement(border: string, bg: string): HTMLElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            position: 'absolute', pointerEvents: 'none', zIndex: THEME.zIndexOverlay, border, backgroundColor: bg,
            borderRadius: '3px', display: 'none', boxSizing: 'border-box',
            transition: 'top 0.08s ease, left 0.08s ease, width 0.08s ease, height 0.08s ease'
        });
        return el;
    }

    private positionOverlay(el: HTMLElement, rect: DOMRect) {
        Object.assign(el.style, {
            display: 'block',
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
        });
    }

    drawOverlay(rect: DOMRect, type: 'hover' | 'selected' | 'match' = 'hover'): HTMLElement | null {
        if (rect.width === 0 || rect.height === 0) return null;
        let el: HTMLElement;
        if (type === 'hover') {
            if (!this.hoverOverlay) return null;
            el = this.hoverOverlay;
        } else {
            const style = type === 'selected'
                ? { border: `2px solid ${THEME.colors.primary}`, bg: 'rgba(59, 166, 140, 0.12)' }
                : { border: `2px dashed ${THEME.colors.primaryLight}`, bg: 'rgba(92, 196, 168, 0.06)' };
            el = this.createOverlayElement(style.border, style.bg);
            document.body.appendChild(el);
            if (type === 'selected') this.selectionOverlays.push(el); else this.matchOverlays.push(el);
        }
        this.positionOverlay(el, rect);
        return el;
    }

    private emitSelector(): void {
        let effectiveScope = this.scopeElement;
        if (!effectiveScope && this.parentSelector && this.selectedElements.length > 0) {
            effectiveScope = this.closestAncestor(this.selectedElements[0], this.parentSelector);
        }

        const useRelativeMode = effectiveScope !== null;

        let finalSelector = '';
        let finalXPath = '';

        if (this.selectedElements.length > 1) {
            const common = this.getCommonSelector(this.selectedElements[0], this.selectedElements[1]);
            if (common) {
                finalSelector = common;
                this.updateMatchVisuals(finalSelector);
                finalXPath = this.cssToXPath(finalSelector);
                if (!finalXPath) finalXPath = this.getXPath(this.selectedElements[0]);
            } else {
                if (useRelativeMode) {
                    finalSelector = this.getRelativeSelector(this.selectedElements[this.selectedElements.length - 1], effectiveScope);
                    finalXPath = this.getRelativeXPath(this.selectedElements[this.selectedElements.length - 1], effectiveScope);
                } else {
                    finalSelector = this.getOptimalSelector(this.selectedElements[this.selectedElements.length - 1], effectiveScope);
                    finalXPath = this.getXPath(this.selectedElements[this.selectedElements.length - 1]);
                }
                this.clearMatchOverlays();
            }
        } else if (this.selectedElements.length === 1) {
            const el = this.selectedElements[0];
            if (this.mode === 'multiple') {
                const preview = this.getPreviewSelectorForMultipleSelection(el);
                if (preview) {
                    finalSelector = preview.selector;
                    finalXPath = preview.xpath || this.getXPath(el);
                    this.updateMatchVisuals(finalSelector);
                } else {
                    this.clearMatchOverlays();
                }
            } else {
                if (useRelativeMode) {
                    finalSelector = this.getRelativeSelector(el, effectiveScope);
                    finalXPath = this.getRelativeXPath(el, effectiveScope);
                } else {
                    finalSelector = this.getOptimalSelector(el, effectiveScope);
                    finalXPath = this.getSmartXPath(el) || this.getXPath(el);
                }
                this.clearMatchOverlays();
            }
        } else {
            this.clearMatchOverlays();
            this.lastComputedSelector = '';
            if (this.onSelectCallback) {
                this.onSelectCallback('', '');
            }
            return;
        }

        if (!finalSelector && this.selectedElements.length > 0) {
            const el = this.selectedElements[this.selectedElements.length - 1];
            finalSelector = this.getOptimalSelector(el, null);
            if (!finalXPath) finalXPath = this.getXPath(el);
        }

        this.lastComputedSelector = finalSelector;
        if (this.onSelectCallback && finalSelector) {
            const elementInfo = this.selectedElements.length > 0
                ? this.getElementInfo(this.selectedElements[this.selectedElements.length - 1])
                : undefined;
            if (elementInfo) {
                (elementInfo as any).bestSelector = this.getBestSelector(finalSelector, finalXPath, effectiveScope);
            }
            this.onSelectCallback(finalSelector, finalXPath, elementInfo);
        }
    }

    getElementInfo(el: Element): {
        tag: string;
        id?: string;
        classes?: string;
        text?: string;
        attributes: Record<string, string>;
    } {
        const tag = el.tagName.toLowerCase();
        const id = el.id || undefined;
        const classes = (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c)).join(' ')
            : undefined;

        const text = el.textContent?.trim().substring(0, 100) || undefined;

        const attributes: Record<string, string> = {};
        const relevantAttrs = ['data-testid', 'data-cy', 'data-type', 'role', 'name', 'aria-label', 'placeholder', 'type', 'href', 'src', 'alt'];
        for (const attr of relevantAttrs) {
            if (el.hasAttribute(attr)) {
                attributes[attr] = el.getAttribute(attr)!;
            }
        }

        return { tag, id, classes, text, attributes };
    }

    private isUtilityClass(cls: string): boolean {
        if (/^[\w-]*[a-z]:/.test(cls)) return true;

        const singles = new Set([
            'flex', 'grid', 'block', 'inline', 'hidden', 'visible', 'invisible',
            'relative', 'absolute', 'fixed', 'sticky', 'static', 'isolate',
            'uppercase', 'lowercase', 'capitalize', 'truncate', 'italic',
            'underline', 'overline', 'antialiased', 'subpixel-antialiased',
            'container', 'sr-only', 'not-sr-only', 'contents', 'flow-root',
            'inline-block', 'inline-flex', 'inline-grid', 'table',
        ]);
        if (singles.has(cls)) return true;

        if (/^-?(?:m|p|mx|my|mt|mb|ml|mr|ms|me|px|py|pt|pb|pl|pr|ps|pe|w|h|min-w|min-h|max-w|max-h|size|gap|space-x|space-y|inset|top|right|bottom|left|z|order|col|row|basis|grow|shrink|grid-cols|grid-rows|auto-cols|auto-rows|justify|items|self|place|content|font|text|leading|tracking|decoration|indent|align|whitespace|break|hyphens|bg|from|via|to|border|rounded|outline|ring|divide|shadow|opacity|mix-blend|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|backdrop|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|cursor|caret|pointer-events|resize|scroll|snap|touch|select|will-change|fill|stroke|float|clear|object|overflow|overscroll|aspect|line-clamp|columns|list|accent)-/.test(cls)) return true;

        return false;
    }

    getRelativeSelector(el: Element, scope: Element | null = null): string {
        if (!el || el.nodeType !== 1) return '';
        if (scope && el === scope) return ':scope';

        const root: Element | Document = scope || document;
        const tag = el.tagName.toLowerCase();

        const allClasses = (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/).filter(c => c)
            : [];
        const semanticClasses = allClasses.filter(c => !this.isUtilityClass(c));
        const utilityClasses = allClasses.filter(c => this.isUtilityClass(c));

        const countMatches = (sel: string): number => {
            try { return root.querySelectorAll(sel).length; } catch { return 0; }
        };

        const stableAttrs = ['data-testid', 'data-cy', 'data-test', 'aria-label', 'name', 'placeholder', 'type'];
        for (const attr of stableAttrs) {
            if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr)!;
                if (val && val.length < 80) {
                    const sel = `${tag}[${attr}="${escapeAttributeValue(val)}"]`;
                    const count = countMatches(sel);
                    if (count >= 1 && count <= 20) return sel;
                }
            }
        }

        const sortedSemantic = [...semanticClasses].sort((a, b) => b.length - a.length);
        for (const cls of sortedSemantic) {
            const sel = `${tag}.${CSS.escape(cls)}`;
            const count = countMatches(sel);
            if (count >= 1 && count <= 20) return sel;
        }

        for (const cls of sortedSemantic.slice(0, 3)) {
            const sel = `${tag}.${CSS.escape(cls)}`;
            if (countMatches(sel) >= 1) return sel;
        }

        if (sortedSemantic.length >= 2) {
            const sel = `${tag}.${CSS.escape(sortedSemantic[0])}.${CSS.escape(sortedSemantic[1])}`;
            if (countMatches(sel) >= 1) return sel;
        }

        for (const cls of sortedSemantic.slice(0, 2)) {
            const sel = `.${CSS.escape(cls)}`;
            if (countMatches(sel) >= 1 && countMatches(sel) <= 30) return sel;
        }

        if (el.hasAttribute('role')) {
            const role = el.getAttribute('role')!;
            const sel = `${tag}[role="${escapeAttributeValue(role)}"]`;
            if (countMatches(sel) >= 1) return sel;
        }

        const genericAttrs = ['data-type', 'data-category', 'data-variant'];
        for (const attr of genericAttrs) {
            if (el.hasAttribute(attr)) {
                const sel = `${tag}[${attr}]`;
                if (countMatches(sel) >= 1) return sel;
            }
        }

        const commonInteractiveTags = ['a', 'button', 'input', 'select', 'textarea', 'img'];
        if (commonInteractiveTags.includes(tag)) {
            const count = countMatches(tag);
            if (count >= 1 && count <= 50) return tag;
        }

        const boundary = scope || document.body;
        let path: string[] = [];
        let curr: Element | null = el;

        while (curr && curr !== boundary && curr !== document.body) {
            let seg = curr.tagName.toLowerCase();
            const currClasses = (curr.className && typeof curr.className === 'string')
                ? curr.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
                : [];

            if (currClasses.length > 0) {
                const bestClass = currClasses.sort((a, b) => b.length - a.length)[0];
                seg += `.${CSS.escape(bestClass)}`;
            }

            path.unshift(seg);
            curr = curr.parentElement;

            if (path.length >= 3) break;
        }

        if (path.length > 0) {
            return path.join(' ');
        }

        for (const cls of utilityClasses.slice(0, 2)) {
            const sel = `${tag}.${CSS.escape(cls)}`;
            if (countMatches(sel) >= 1) return sel;
        }

        return tag;
    }

    getRelativeXPath(el: Element, scope: Element | null = null): string {
        if (!el || el.nodeType !== 1) return '';
        if (scope && el === scope) return './/self::*';

        const tag = el.tagName.toLowerCase();

        const stableAttrs = ['data-testid', 'data-cy', 'data-test', 'aria-label', 'name', 'placeholder', 'type'];
        for (const attr of stableAttrs) {
            if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr)!;
                if (val && val.length < 80) {
                    return `.//${tag}[@${attr}="${val}"]`;
                }
            }
        }

        const allClasses = (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
            : [];

        if (allClasses.length > 0) {
            const bestClass = allClasses.sort((a, b) => b.length - a.length)[0];
            return `.//${tag}[contains(concat(" ", @class, " "), " ${bestClass} ")]`;
        }

        if (el.hasAttribute('role')) {
            const role = el.getAttribute('role')!;
            return `.//${tag}[@role="${role}"]`;
        }

        const commonTags = ['a', 'button', 'h1', 'h2', 'h3', 'h4', 'img', 'input'];
        if (commonTags.includes(tag)) {
            return `.//${tag}`;
        }

        const boundary = scope || document.body;
        let path: string[] = [];
        let curr: Element | null = el;

        while (curr && curr !== boundary && curr !== document.body) {
            const currTag = curr.tagName.toLowerCase();

            const currClasses = (curr.className && typeof curr.className === 'string')
                ? curr.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
                : [];

            if (currClasses.length > 0) {
                const bestClass = currClasses.sort((a, b) => b.length - a.length)[0];
                path.unshift(`${currTag}[contains(concat(" ", @class, " "), " ${bestClass} ")]`);
            } else {
                let ix = 0;
                let sib: Element | null = curr;
                while (sib = sib.previousElementSibling) {
                    if (sib.tagName === curr.tagName) ix++;
                }
                if (ix > 0) {
                    path.unshift(`${currTag}[${ix + 1}]`);
                } else {
                    path.unshift(currTag);
                }
            }

            curr = curr.parentElement;
            if (path.length >= 3) break;
        }

        if (path.length > 0) {
            return './/' + path.join('/');
        }

        return `.//${tag}`;
    }

    getOptimalSelector(el: Element, scope: Element | null = null): string {
        if (!el || el.nodeType !== 1) return '';

        if (scope && el === scope) return ':scope';

        const root: Element | Document = scope || document;
        const tag = el.tagName.toLowerCase();

        const isUnique = (sel: string): boolean => {
            try { return root.querySelectorAll(sel).length === 1; } catch { return false; }
        };

        const allClasses = (el.className && typeof el.className === 'string')
            ? el.className.split(/\s+/).filter(c => c)
            : [];
        const semanticClasses = allClasses.filter(c => !this.isUtilityClass(c));
        const utilityClasses = allClasses.filter(c => this.isUtilityClass(c));

        if (el.id) {
            const sel = `#${CSS.escape(el.id)}`;
            if (isUnique(sel)) return sel;
        }

        const semanticAttrs = ['data-testid', 'data-cy', 'data-test', 'name', 'aria-label'];
        for (const attr of semanticAttrs) {
            if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr)!;
                const sel1 = `${tag}[${attr}="${escapeAttributeValue(val)}"]`;
                if (isUnique(sel1)) return sel1;
                const sel2 = `[${attr}="${escapeAttributeValue(val)}"]`;
                if (isUnique(sel2)) return sel2;
            }
        }

        if (isUnique(tag)) return tag;

        for (const cls of semanticClasses) {
            const sel = `${tag}.${CSS.escape(cls)}`;
            if (isUnique(sel)) return sel;
        }

        for (const cls of semanticClasses) {
            const sel = `.${CSS.escape(cls)}`;
            if (isUnique(sel)) return sel;
        }

        if (el.hasAttribute('role')) {
            const role = el.getAttribute('role')!;
            const sel = `${tag}[role="${escapeAttributeValue(role)}"]`;
            if (isUnique(sel)) return sel;
        }

        for (const cls of utilityClasses) {
            const sel = `${tag}.${CSS.escape(cls)}`;
            if (isUnique(sel)) return sel;
        }

        for (const cls of utilityClasses) {
            const sel = `.${CSS.escape(cls)}`;
            if (isUnique(sel)) return sel;
        }

        if (allClasses.length >= 2) {
            const candidates = [...semanticClasses, ...utilityClasses].slice(0, 6);
            for (let i = 0; i < candidates.length; i++) {
                for (let j = i + 1; j < candidates.length; j++) {
                    const sel = `${tag}.${CSS.escape(candidates[i])}.${CSS.escape(candidates[j])}`;
                    if (isUnique(sel)) return sel;
                }
            }
        }

        const boundary = scope || document.body;
        let path: string[] = [], curr: Element | null = el;
        while (curr && curr !== boundary) {
            let seg = curr.tagName.toLowerCase();

            if (!scope && curr.id && isUnique(`#${CSS.escape(curr.id)}`)) {
                path.unshift(`#${CSS.escape(curr.id)}`);
                break;
            }

            const currClasses = (curr.className && typeof curr.className === 'string')
                ? curr.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
                : [];
            if (currClasses.length > 0) {
                seg += `.${CSS.escape(currClasses[0])}`;
            } else {
                let sib: Element | null = curr, nth = 1;
                while (sib = sib.previousElementSibling) if (sib.tagName === curr.tagName) nth++;
                if (nth > 1) seg += `:nth-of-type(${nth})`;
            }
            path.unshift(seg);
            curr = curr.parentElement;
        }
        return path.join(' > ');
    }

    cssToXPath(css: string): string {
        if (!css) return '';
        try {
            const parts = css.split(/\s+/).map(s => s.trim()).filter(Boolean);
            const xpathParts: string[] = [];

            for (const part of parts) {
                if (part === '>') {
                    const last = xpathParts.pop();
                    if (last) xpathParts.push(last.replace('//', './'));
                    continue;
                }

                let xp = '';
                const subParts = part.split('>').map(s => s.trim()).filter(Boolean);
                if (subParts.length > 1) {
                    const converted = subParts.map(sp => this.cssSingleToXPath(sp));
                    xp = converted.join('/');
                } else {
                    xp = this.cssSingleToXPath(part);
                }
                xpathParts.push(xp);
            }

            return '//' + xpathParts.join('//');
        } catch (e) {
            return '';
        }
    }

    private cssSingleToXPath(part: string): string {
        const tagMatch = part.match(/^([a-z][a-z0-9]*)?/i);
        const tag = tagMatch && tagMatch[1] ? tagMatch[1].toLowerCase() : '*';
        const conditions: string[] = [];

        const classMatches = part.matchAll(/\.([a-zA-Z0-9_-]+)/g);
        for (const m of classMatches) {
            conditions.push(`contains(concat(" ", @class, " "), " ${m[1]} ")`);
        }

        const attrMatches = part.matchAll(/\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/g);
        for (const m of attrMatches) {
            if (m[2] !== undefined) {
                conditions.push(`@${m[1]}="${m[2]}"`);
            } else {
                conditions.push(`@${m[1]}`);
            }
        }

        if (conditions.length > 0) {
            return `${tag}[${conditions.join(' and ')}]`;
        }
        return tag;
    }

    getXPath(el: Element): string {
        if (!el || el.nodeType !== 1) return '';
        if (el.id) {
            if (!el.id.includes('"')) return `//*[@id="${el.id}"]`;
            if (!el.id.includes("'")) return `//*[@id='${el.id}']`;
        }
        if (el === document.body) return '/html/body';
        if (el === document.documentElement) return '/html';

        let ix = 0;
        const siblings = el.parentNode ? el.parentNode.childNodes : [];

        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i] as Element;
            if (sibling === el) {
                const parentPath = this.getXPath(el.parentNode as Element);
                return parentPath ? `${parentPath}/${el.tagName.toLowerCase()}[${ix + 1}]` : '';
            }
            if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
        }
        return '';
    }

    getSmartXPath(el: Element): string | null {
        const tag = el.tagName.toLowerCase();

        if (el.id) {
            return `//${tag}[@id="${el.id}"]`;
        }

        const stableAttrs = ['data-testid', 'data-cy', 'data-test', 'aria-label', 'name', 'placeholder', 'type'];
        for (const attr of stableAttrs) {
            if (el.hasAttribute(attr)) {
                const val = el.getAttribute(attr)!;
                if (val && val.length < 80) {
                    return `//${tag}[@${attr}="${val}"]`;
                }
            }
        }

        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length <= 50) {
            let textPart = '';
            if (text.includes("'") && text.includes('"')) {
                return null;
            } else if (text.includes("'")) {
                textPart = `"${text}"`;
            } else {
                textPart = `'${text}'`;
            }
            return `//${tag}[normalize-space()=${textPart}]`;
        }

        return null;
    }

    getCommonSelector(el1: Element, el2: Element): string | null {
        const elements = this.selectedElements.length >= 2 ? this.selectedElements : [el1, el2];
        return this.getCommonSelectorForElements(elements);
    }

    private getCommonSelectorForElements(elements: Element[]): string | null {
        if (elements.length < 2) return null;

        const tag = elements[0].tagName.toLowerCase();
        if (!elements.every(el => el.tagName === elements[0].tagName)) return null;

        let commonClasses = Array.from(elements[0].classList);
        for (let i = 1; i < elements.length; i++) {
            const elClasses = Array.from(elements[i].classList);
            commonClasses = commonClasses.filter(c => elClasses.includes(c));
        }

        if (commonClasses.length > 0) {
            const bestClass = commonClasses.sort((a, b) => b.length - a.length)[0];
            const sel = `${tag}.${CSS.escape(bestClass)}`;
            const root = this.scopeElement || document;
            const matches = root.querySelectorAll(sel);
            const matchesAll = elements.every(el => Array.from(matches).includes(el));
            if (matchesAll) return sel;
        }

        const testAttrs = ['data-testid', 'data-type', 'role', 'itemprop', 'itemtype'];
        for (const attr of testAttrs) {
            if (elements.every(el => el.hasAttribute(attr))) {
                const values = elements.map(el => el.getAttribute(attr));
                if (values.every(v => v === values[0])) {
                    const sel = `${tag}[${attr}="${escapeAttributeValue(values[0]!)}"]`;
                    return sel;
                }
                const sel = `${tag}[${attr}]`;
                const root = this.scopeElement || document;
                const matches = root.querySelectorAll(sel);
                if (elements.every(el => Array.from(matches).includes(el))) return sel;
            }
        }

        const parents = elements.map(el => el.parentElement);
        if (parents.every(p => p !== null)) {
            if (parents.every(p => p === parents[0])) {
                const parentTag = parents[0]!.tagName.toLowerCase();
                const sel = `${parentTag} > ${tag}`;
                const root = this.scopeElement || document;
                const matches = root.querySelectorAll(sel);
                if (elements.every(el => Array.from(matches).includes(el))) return sel;
            }

            const parentTags = parents.map(p => p!.tagName);
            if (parentTags.every(t => t === parentTags[0])) {
                let parentCommonClasses = Array.from(parents[0]!.classList);
                for (let i = 1; i < parents.length; i++) {
                    const pc = Array.from(parents[i]!.classList);
                    parentCommonClasses = parentCommonClasses.filter(c => pc.includes(c));
                }
                if (parentCommonClasses.length > 0) {
                    const bestParentClass = parentCommonClasses.sort((a, b) => b.length - a.length)[0];
                    const sel = `.${CSS.escape(bestParentClass)} > ${tag}`;
                    const root = this.scopeElement || document;
                    const matches = root.querySelectorAll(sel);
                    if (elements.every(el => Array.from(matches).includes(el))) return sel;

                    const sel2 = `.${CSS.escape(bestParentClass)} ${tag}`;
                    const matches2 = root.querySelectorAll(sel2);
                    if (elements.every(el => Array.from(matches2).includes(el))) return sel2;
                }
            }
        }

        if (commonClasses.length >= 2) {
            const sel = tag + commonClasses.slice(0, 3).map(c => `.${CSS.escape(c)}`).join('');
            const root = this.scopeElement || document;
            const matches = root.querySelectorAll(sel);
            if (elements.every(el => Array.from(matches).includes(el))) return sel;
        }

        return null;
    }

    stop(): void {
        this.deactivate();
    }

    clearOverlays(): void {
        this.clearSelectionOverlays();
        this.clearMatchOverlays();
        if (this.hoverOverlay) {
            this.hoverOverlay.remove();
            this.hoverOverlay = null;
            this.hoverLabel = null;
        }
        if (this.maskOverlay) {
            this.maskOverlay.remove();
            this.maskOverlay = null;
        }
    }

    clearSelectionOverlays(): void {
        for (const el of this.selectionOverlays) {
            el.remove();
        }
        this.selectionOverlays = [];
    }

    clearMatchOverlays(): void {
        for (const el of this.matchOverlays) {
            el.remove();
        }
        this.matchOverlays = [];
    }

    updateSelectionVisuals(): void {
        this.clearSelectionOverlays();
        for (const el of this.selectedElements) {
            this.drawOverlay(el.getBoundingClientRect(), 'selected');
        }
    }

    updateMatchVisuals(selector: string): void {
        this.clearMatchOverlays();
        if (!selector) return;
        try {
            const root = this.scopeElement || document;
            const elements = root.querySelectorAll(selector);
            for (let i = 0; i < elements.length; i++) {
                const el = elements[i] as HTMLElement;
                if (!this.selectedElements.includes(el)) {
                    this.drawOverlay(el.getBoundingClientRect(), 'match');
                }
            }
        } catch (e) {
            console.warn('[OctoGrab] Error drawing match visuals:', e);
        }
    }

    getBestSelector(css: string, xpath: string, scope: Element | null = null): string {
        if (!css) return xpath;
        if (!xpath) return css;

        const root: Element | Document = scope || document;
        const selectedSet = new Set(this.selectedElements);

        // 1. Validate CSS
        let cssMatches: Element[] = [];
        let cssMatchesExactly = false;
        try {
            cssMatches = Array.from(root.querySelectorAll(css));
            cssMatchesExactly = cssMatches.length === this.selectedElements.length && 
                                cssMatches.every(el => selectedSet.has(el as HTMLElement));
        } catch (e) {
            // CSS selector is invalid
        }

        // 2. Validate XPath
        let xpathMatches: Element[] = [];
        let xpathMatchesExactly = false;
        try {
            let relativeXp = xpath;
            const isDocument = root.nodeType === 9;
            if (!isDocument && relativeXp.startsWith('/')) {
                relativeXp = '.' + (relativeXp.startsWith('//') ? relativeXp : relativeXp);
            }
            const doc = isDocument ? (root as Document) : (root.ownerDocument || document);
            const resultType = (globalThis as any).XPathResult?.ORDERED_NODE_SNAPSHOT_TYPE || 7;
            const result = doc.evaluate(relativeXp, root, null, resultType, null);
            for (let i = 0; i < result.snapshotLength; i++) {
                const item = result.snapshotItem(i);
                if (item) xpathMatches.push(item as Element);
            }
            xpathMatchesExactly = xpathMatches.length === this.selectedElements.length &&
                                  xpathMatches.every(el => selectedSet.has(el as HTMLElement));
        } catch (e) {
            // XPath is invalid
        }

        // Prefer CSS if it matches exactly
        if (cssMatchesExactly) {
            return css;
        }
        // Fallback to XPath if it matches exactly
        if (xpathMatchesExactly) {
            return xpath;
        }

        // If neither matches exactly, prefer whichever has matches
        if (cssMatches.length > 0) {
            return css;
        }
        if (xpathMatches.length > 0) {
            return xpath;
        }

        return css; // Fallback
    }
}

function escapeAttributeValue(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
