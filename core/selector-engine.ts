// ─── Theme colors ────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#10b981',       // emerald-500
  primaryDark: '#059669',   // emerald-600
  primaryLight: '#d1fae5',  // emerald-100
  primaryBg: 'rgba(16, 185, 129, 0.08)',
  selected: '#059669',      // emerald-600
  selectedBg: 'rgba(5, 150, 105, 0.15)',
  match: '#10b981',         // emerald-500
  matchBg: 'rgba(16, 185, 129, 0.08)',
  deselect: '#ef4444',      // red-500
  scope: '#f59e0b',         // amber-500
  text: '#1e293b',          // slate-800
  textMuted: '#64748b',     // slate-500
  bg: '#ffffff',
  bgMuted: '#f1f5f9',      // slate-100
  border: '#e2e8f0',       // slate-200
};

export class SelectorEngine {
  active: boolean = false;
  hoveredEl: Element | null = null;
  scopeElement: Element | null = null;
  maskOverlay: HTMLElement | null = null;
  hoverOverlay: HTMLElement | null = null;
  selectionOverlays: HTMLElement[] = [];
  matchOverlays: HTMLElement[] = [];
  onSelectCallback: ((selector: string, xpath: string, elementInfo?: { tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> }) => void) | null = null;
  onFinishCallback: ((success: boolean) => void) | null = null;
  selectedElements: Element[] = [];
  label: HTMLElement | null = null;

  constructor() {
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  parentSelector: string | null = null;
  controlPanel: HTMLElement | null = null;
  infoSpan: HTMLElement | null = null;
  breadcrumbSpan: HTMLElement | null = null;
  countBadge: HTMLElement | null = null;
  clearBtn: HTMLElement | null = null;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  isKeyboardNavigating: boolean = false;
  private lastComputedSelector: string = '';

  start(
    onSelect: (selector: string, xpath: string) => void,
    scopeElement: Element | null = null,
    onFinish: ((success: boolean) => void) | null = null,
    parentSelector: string | null = null
  ) {
    if (this.active) return;
    this.active = true;
    this.onSelectCallback = onSelect;
    this.onFinishCallback = onFinish;
    this.scopeElement = scopeElement;
    this.parentSelector = parentSelector;
    this.selectedElements = [];
    this.lastComputedSelector = '';
    this.clearOverlays();

    // If parentSelector is provided but no direct scopeElement, resolve it to a DOM element
    // This is the key to scope-aware picking: the sidepanel sends the CSS selector of the parent
    // block (e.g. ".product-card") and we restrict picking to within the first matching element.
    if (!this.scopeElement && this.parentSelector) {
      try {
        const resolved = document.querySelector(this.parentSelector);
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

    if (this.scopeElement) {
      const rect = this.scopeElement.getBoundingClientRect();
      this.maskOverlay = document.createElement('div');
      Object.assign(this.maskOverlay.style, {
        position: 'absolute', pointerEvents: 'none', zIndex: '999980',
        top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
        border: `2px dashed ${COLORS.scope}`,
        borderRadius: '4px', transition: 'all 0.15s ease'
      });
      const scopeLabel = document.createElement('span');
      scopeLabel.textContent = this.parentSelector
        ? `Scope: ${this.parentSelector}`
        : "Extraction Scope";
      Object.assign(scopeLabel.style, {
        position: 'absolute', top: '-26px', left: '0',
        backgroundColor: COLORS.scope, color: '#000',
        padding: '3px 8px', fontSize: '10px', fontWeight: '700', borderRadius: '4px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', letterSpacing: '-0.01em'
      });
      this.maskOverlay.appendChild(scopeLabel);
      document.body.appendChild(this.maskOverlay);
    }

    this.hoverOverlay = this.createOverlayElement(`2px solid ${COLORS.primary}`, COLORS.primaryBg);
    this.label = document.createElement('span');
    Object.assign(this.label.style, {
      position: 'absolute', top: '-26px', left: '0',
      backgroundColor: COLORS.primary, color: 'white',
      padding: '3px 8px', fontSize: '10px', borderRadius: '4px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      whiteSpace: 'nowrap', fontWeight: '700',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: '1000000', pointerEvents: 'none', letterSpacing: '-0.01em'
    });
    this.hoverOverlay.appendChild(this.label);
    document.body.appendChild(this.hoverOverlay);

    this.createControlPanel();

    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
    window.addEventListener('scroll', this.handleScroll, true);
  }

  createControlPanel() {
    this.controlPanel = document.createElement('div');
    Object.assign(this.controlPanel.style, {
      position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: COLORS.bg, padding: '0', borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
      zIndex: '1000001', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      minWidth: '320px', maxWidth: '500px'
    });

    // ── Top row: breadcrumb path ──
    this.breadcrumbSpan = document.createElement('div');
    Object.assign(this.breadcrumbSpan.style, {
      padding: '8px 16px', fontSize: '11px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: COLORS.textMuted, backgroundColor: COLORS.bgMuted,
      borderBottom: `1px solid ${COLORS.border}`,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      minHeight: '18px', letterSpacing: '-0.01em'
    });
    this.breadcrumbSpan.textContent = 'Hover over an element to start';
    this.controlPanel.appendChild(this.breadcrumbSpan);

    // ── Middle row: info + count badge ──
    const infoRow = document.createElement('div');
    Object.assign(infoRow.style, {
      padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px'
    });

    this.infoSpan = document.createElement('span');
    this.infoSpan.textContent = 'Click to select';
    Object.assign(this.infoSpan.style, {
      fontWeight: '600', color: COLORS.text, fontSize: '13px', flex: '1'
    });

    this.countBadge = document.createElement('span');
    this.countBadge.style.display = 'none';
    Object.assign(this.countBadge.style, {
      backgroundColor: COLORS.primaryLight, color: COLORS.primaryDark,
      padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
      whiteSpace: 'nowrap'
    });

    infoRow.appendChild(this.infoSpan);
    infoRow.appendChild(this.countBadge);
    this.controlPanel.appendChild(infoRow);

    // ── Bottom row: action buttons ──
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      padding: '0 12px 12px', display: 'flex', alignItems: 'center', gap: '8px'
    });

    const doneBtn = this.createButton('Done Selecting', COLORS.primary, 'white', () => this.finish(true));
    doneBtn.onmouseover = () => doneBtn.style.backgroundColor = COLORS.primaryDark;
    doneBtn.onmouseout = () => doneBtn.style.backgroundColor = COLORS.primary;

    this.clearBtn = this.createButton('Clear', COLORS.bgMuted, COLORS.textMuted, () => {
      this.selectedElements = [];
      this.lastComputedSelector = '';
      this.updateSelectionVisuals();
      this.clearMatchOverlays();
      this.updateControlPanel();
    });
    this.clearBtn.onmouseover = () => { this.clearBtn!.style.backgroundColor = '#e2e8f0'; };
    this.clearBtn.onmouseout = () => { this.clearBtn!.style.backgroundColor = COLORS.bgMuted; };
    this.clearBtn.style.display = 'none';

    const cancelBtn = this.createButton('Cancel', COLORS.bgMuted, COLORS.textMuted, () => this.finish(false));
    cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#e2e8f0';
    cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = COLORS.bgMuted;

    btnRow.appendChild(doneBtn);
    btnRow.appendChild(this.clearBtn);
    btnRow.appendChild(cancelBtn);
    this.controlPanel.appendChild(btnRow);

    document.body.appendChild(this.controlPanel);
  }

  private createButton(text: string, bg: string, color: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      backgroundColor: bg, color, border: 'none', padding: '7px 14px',
      borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
      transition: 'all 0.15s ease', lineHeight: '1', whiteSpace: 'nowrap',
      fontFamily: 'inherit'
    });
    btn.onclick = (e) => { e.stopPropagation(); onClick(); };
    return btn;
  }

  private updateControlPanel() {
    const count = this.selectedElements.length;

    if (this.countBadge) {
      if (count > 0) {
        this.countBadge.style.display = '';
        this.countBadge.textContent = `${count} selected`;
      } else {
        this.countBadge.style.display = 'none';
      }
    }

    if (this.clearBtn) {
      this.clearBtn.style.display = count > 0 ? '' : 'none';
    }

    if (this.infoSpan) {
      if (count === 0) {
        this.infoSpan.textContent = 'Click to select';
        this.infoSpan.style.color = COLORS.text;
      } else {
        this.infoSpan.textContent = `${count} element${count === 1 ? '' : 's'} selected`;
        this.infoSpan.style.color = COLORS.primaryDark;
      }
    }
  }

  /** Build a short breadcrumb path for the given element */
  private getBreadcrumb(el: Element): string {
    const parts: string[] = [];
    let curr: Element | null = el;
    const boundary = this.scopeElement || document.body;
    let depth = 0;

    while (curr && curr !== boundary && depth < 4) {
      const tag = curr.tagName.toLowerCase();
      let seg = tag;
      if (curr.id) seg += `#${curr.id}`;
      else {
        const cls = this.getFirstSemanticClass(curr);
        if (cls) seg += `.${cls}`;
      }
      parts.unshift(seg);
      curr = curr.parentElement;
      depth++;
    }
    if (curr && curr !== el && curr !== boundary) {
      parts.unshift('...');
    }
    return parts.join(' > ');
  }

  private getFirstSemanticClass(el: Element): string | null {
    if (!el.className || typeof el.className !== 'string') return null;
    const classes = el.className.split(/\s+/).filter(c => c);
    for (const cls of classes) {
      if (!this.isUtilityClass(cls)) return cls;
    }
    return classes[0] || null;
  }

  finish(success: boolean) {
    console.log('[OctoGrab] SelectorEngine finish called, success:', success);
    // Save callback before stop() clears state
    const callback = this.onFinishCallback;
    this.stop();
    if (callback) {
      console.log('[OctoGrab] Calling onFinishCallback');
      callback(success);
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.maskOverlay && document.body.contains(this.maskOverlay)) document.body.removeChild(this.maskOverlay);
    if (this.hoverOverlay && document.body.contains(this.hoverOverlay)) document.body.removeChild(this.hoverOverlay);
    if (this.controlPanel && document.body.contains(this.controlPanel)) document.body.removeChild(this.controlPanel);

    this.clearMatchOverlays();
    this.clearSelectionOverlays();
    this.scopeElement = null;

    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    window.removeEventListener('scroll', this.handleScroll, true);
  }

  createOverlayElement(border: string, bg: string): HTMLElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', pointerEvents: 'none', zIndex: '999990', border, backgroundColor: bg,
      borderRadius: '3px', display: 'none', boxSizing: 'border-box',
      transition: 'top 0.08s ease, left 0.08s ease, width 0.08s ease, height 0.08s ease'
    });
    return el;
  }

  clearOverlays() {
    if (this.maskOverlay && document.body.contains(this.maskOverlay)) {
      document.body.removeChild(this.maskOverlay);
      this.maskOverlay = null;
    }
    this.clearMatchOverlays();
    this.clearSelectionOverlays();
  }

  clearMatchOverlays() {
    this.matchOverlays.forEach(el => {
      if (document.body.contains(el)) document.body.removeChild(el);
    });
    this.matchOverlays = [];
  }

  clearSelectionOverlays() {
    this.selectionOverlays.forEach(el => {
      if (document.body.contains(el)) document.body.removeChild(el);
    });
    this.selectionOverlays = [];
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

  drawOverlay(rect: DOMRect, type: 'hover' | 'selected' | 'match' = 'hover') {
    if (rect.width === 0 || rect.height === 0) return null;
    let el: HTMLElement;
    if (type === 'hover') {
      if (!this.hoverOverlay) return null;
      el = this.hoverOverlay;
    } else {
      const style = type === 'selected'
        ? { border: `2px solid ${COLORS.selected}`, bg: COLORS.selectedBg }
        : { border: `2px dashed ${COLORS.match}`, bg: COLORS.matchBg };
      el = this.createOverlayElement(style.border, style.bg);
      document.body.appendChild(el);
      if (type === 'selected') this.selectionOverlays.push(el); else this.matchOverlays.push(el);
    }
    this.positionOverlay(el, rect);
    return el;
  }

  updateSelectionVisuals() {
    this.clearSelectionOverlays();
    this.selectedElements.forEach(el => { this.drawOverlay(el.getBoundingClientRect(), 'selected'); });
  }

  updateMatchVisuals(selector: string) {
    this.clearMatchOverlays();
    if (!selector) return;
    try {
      const root = this.scopeElement || document;
      const matches = root.querySelectorAll(selector);
      matches.forEach(el => {
        if (!this.selectedElements.includes(el)) {
          this.drawOverlay(el.getBoundingClientRect(), 'match');
        }
      });
      this.updateControlPanel();
      if (this.infoSpan) {
        this.infoSpan.textContent = `${matches.length} element${matches.length === 1 ? '' : 's'} matched`;
        this.infoSpan.style.color = COLORS.primaryDark;
      }
    } catch (e) { }
  }

  handleMouseMove(e: MouseEvent) {
    // When keyboard navigating, require significant mouse movement to re-engage mouse mode
    if (this.isKeyboardNavigating) {
      if (Math.abs(e.clientX - this.lastMouseX) < 10 && Math.abs(e.clientY - this.lastMouseY) < 10) return;
      this.isKeyboardNavigating = false;
    }

    if (Math.abs(e.clientX - this.lastMouseX) < 2 && Math.abs(e.clientY - this.lastMouseY) < 2) return;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === this.hoverOverlay || el === this.maskOverlay || el === this.label || this.matchOverlays.includes(el as HTMLElement) || this.selectionOverlays.includes(el as HTMLElement)) return;
    if (this.controlPanel && this.controlPanel.contains(el)) return;
    if (this.hoverOverlay && this.hoverOverlay.contains(el)) return;
    if (this.maskOverlay && this.maskOverlay.contains(el)) return;

    if (this.scopeElement && !this.scopeElement.contains(el)) {
      if (this.hoverOverlay) this.hoverOverlay.style.display = 'none';
      return;
    }

    this.hoveredEl = el;
    const rect = el.getBoundingClientRect();
    this.drawOverlay(rect, 'hover');
    this.updateHoverLabel(el);
    this.updateBreadcrumb(el);
  }

  /** Toggle selection of the currently hovered element and emit the computed selector */
  private toggleSelection() {
    if (!this.hoveredEl) return;
    if (this.scopeElement && !this.scopeElement.contains(this.hoveredEl)) return;

    const index = this.selectedElements.indexOf(this.hoveredEl);
    if (index > -1) this.selectedElements.splice(index, 1);
    else this.selectedElements.push(this.hoveredEl);

    this.updateSelectionVisuals();
    this.emitSelector();
    this.updateControlPanel();
    // Refresh hover label to show select/deselect state
    if (this.hoveredEl) this.updateHoverLabel(this.hoveredEl);
  }

  /**
   * Extract detailed element information for AI selector generation
   */
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

    // Get text content (truncated)
    const text = el.textContent?.trim().substring(0, 100) || undefined;

    // Get relevant attributes
    const attributes: Record<string, string> = {};
    const relevantAttrs = ['data-testid', 'data-cy', 'data-type', 'role', 'name', 'aria-label', 'placeholder', 'type', 'href', 'src', 'alt'];
    for (const attr of relevantAttrs) {
      if (el.hasAttribute(attr)) {
        attributes[attr] = el.getAttribute(attr)!;
      }
    }

    return { tag, id, classes, text, attributes };
  }

  /** Compute and emit the selector/xpath for the current selection */
  private emitSelector() {
    let effectiveScope = this.scopeElement;
    if (!effectiveScope && this.parentSelector && this.selectedElements.length > 0) {
      effectiveScope = this.selectedElements[0].closest(this.parentSelector!);
    }

    // When inside a loop scope, use relative selectors (avoid unique identifiers like text content)
    const useRelativeMode = effectiveScope !== null;

    let finalSelector = '', finalXPath = '';
    if (this.selectedElements.length > 1) {
      const common = this.getCommonSelector(this.selectedElements[0], this.selectedElements[1]);
      if (common) {
        finalSelector = common;
        this.updateMatchVisuals(finalSelector);
        finalXPath = this.cssToXPath(finalSelector);
        if (!finalXPath) finalXPath = this.getXPath(this.selectedElements[0]);
      } else {
        // Use relative selector if in loop context
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
      // Use relative selector if in loop context (avoids text-based XPath)
      if (useRelativeMode) {
        finalSelector = this.getRelativeSelector(el, effectiveScope);
        finalXPath = this.getRelativeXPath(el, effectiveScope);
      } else {
        finalSelector = this.getOptimalSelector(el, effectiveScope);
        // Only use text-based XPath in non-loop contexts
        const smartXPath = this.getSmartXPath(el);
        finalXPath = smartXPath || this.getXPath(el);
        if (!finalXPath) finalXPath = this.getXPath(el);
      }
      this.clearMatchOverlays();
    } else {
      this.clearMatchOverlays();
      this.lastComputedSelector = '';
      return;
    }

    // Safety: if scoped selector is empty, fall back to global selector
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
      this.onSelectCallback(finalSelector, finalXPath, elementInfo);
    }
  }

  handleClick(e: MouseEvent) {
    if (this.controlPanel && this.controlPanel.contains(e.target as Node)) return;
    if (!this.hoveredEl) return;
    if (this.scopeElement && !this.scopeElement.contains(this.hoveredEl)) return;
    e.preventDefault();
    e.stopPropagation();
    this.toggleSelection();
  }

  getSmartXPath(el: Element): string | null {
    const text = el.textContent?.trim();
    if (!text || text.length > 50) return null;

    // Handle quotes in text
    let textPart = '';
    if (text.includes("'") && text.includes('"')) {
      return null;
    } else if (text.includes("'")) {
      textPart = `"${text}"`;
    } else {
      textPart = `'${text}'`;
    }

    const tag = el.tagName.toLowerCase();
    return `//${tag}[normalize-space()=${textPart}]`;
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.finish(false);
      return;
    }

    if (!this.hoveredEl) return;

    // Enter / Space — select or deselect current element
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSelection();
      return;
    }

    // Arrow keys — navigate DOM tree (works REGARDLESS of selection state)
    const isArrow = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
    if (!isArrow) return;

    e.preventDefault();
    this.isKeyboardNavigating = true;
    let target: Element | null = null;

    if (e.key === 'ArrowUp') {
      // Navigate to parent
      const parent = this.hoveredEl.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) {
        if (!this.scopeElement || this.scopeElement.contains(parent)) {
          target = parent;
        }
      }
    } else if (e.key === 'ArrowDown') {
      // Navigate to first child
      const child = this.hoveredEl.firstElementChild;
      if (child) {
        if (!this.scopeElement || this.scopeElement.contains(child)) {
          target = child;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      // Navigate to previous sibling
      const prev = this.hoveredEl.previousElementSibling;
      if (prev) {
        if (!this.scopeElement || this.scopeElement.contains(prev)) {
          target = prev;
        }
      }
    } else if (e.key === 'ArrowRight') {
      // Navigate to next sibling
      const next = this.hoveredEl.nextElementSibling;
      if (next) {
        if (!this.scopeElement || this.scopeElement.contains(next)) {
          target = next;
        }
      }
    }

    if (target) {
      this.hoveredEl = target;
      this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
      this.updateHoverLabel(this.hoveredEl);
      this.updateBreadcrumb(this.hoveredEl);

      // Scroll the element into view if it's off-screen
      const rect = this.hoveredEl.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
        this.hoveredEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
  }

  handleScroll() {
    // Update all overlay positions on scroll
    this.updateSelectionVisuals();
    if (this.hoveredEl && this.hoverOverlay) {
      this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
    }
    // Also update match overlays on scroll
    if (this.lastComputedSelector && this.matchOverlays.length > 0) {
      this.updateMatchVisuals(this.lastComputedSelector);
    }
    if (this.scopeElement && this.maskOverlay) {
      const rect = this.scopeElement.getBoundingClientRect();
      Object.assign(this.maskOverlay.style, {
        top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
    }
  }

  /** Update the floating hover label above the current element */
  updateHoverLabel(el: Element) {
    if (!this.label) return;
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
      this.label.textContent = isSelected ? `✕ ${displayText}` : `+ ${displayText}`;
      this.label.style.backgroundColor = isSelected ? COLORS.deselect : COLORS.primary;
    } else {
      this.label.textContent = displayText;
      this.label.style.backgroundColor = COLORS.primary;
    }
  }

  /** Update the breadcrumb path in the control panel */
  private updateBreadcrumb(el: Element) {
    if (!this.breadcrumbSpan) return;
    this.breadcrumbSpan.textContent = this.getBreadcrumb(el);
  }

  /**
   * Find a common CSS selector that matches all selected elements.
   * Supports 2+ elements with structural pattern matching — finds common tag,
   * classes, attributes, and parent structure across all selections.
   */
  getCommonSelector(el1: Element, el2: Element): string | null {
    const elements = this.selectedElements.length >= 2 ? this.selectedElements : [el1, el2];
    return this.getCommonSelectorForElements(elements);
  }

  private getCommonSelectorForElements(elements: Element[]): string | null {
    if (elements.length < 2) return null;

    // All must share the same tag
    const tag = elements[0].tagName.toLowerCase();
    if (!elements.every(el => el.tagName === elements[0].tagName)) return null;

    // Find classes common to ALL elements
    let commonClasses = Array.from(elements[0].classList);
    for (let i = 1; i < elements.length; i++) {
      const elClasses = Array.from(elements[i].classList);
      commonClasses = commonClasses.filter(c => elClasses.includes(c));
    }

    // Strategy 1: Common class selector — prefer the most specific (longest) class
    if (commonClasses.length > 0) {
      const bestClass = commonClasses.sort((a, b) => b.length - a.length)[0];
      const sel = `${tag}.${CSS.escape(bestClass)}`;
      // Verify the selector actually matches all selected elements
      const root = this.scopeElement || document;
      const matches = root.querySelectorAll(sel);
      const matchesAll = elements.every(el => Array.from(matches).includes(el));
      if (matchesAll) return sel;
    }

    // Strategy 2: Common attribute selector (data-*, role, etc.)
    const testAttrs = ['data-testid', 'data-type', 'role', 'itemprop', 'itemtype'];
    for (const attr of testAttrs) {
      if (elements.every(el => el.hasAttribute(attr))) {
        const values = elements.map(el => el.getAttribute(attr));
        // If all share the same attribute value, use exact match
        if (values.every(v => v === values[0])) {
          const sel = `${tag}[${attr}="${CSS.escape(values[0]!)}"]`;
          return sel;
        }
        // If they all have the attribute but different values, use attribute presence
        const sel = `${tag}[${attr}]`;
        const root = this.scopeElement || document;
        const matches = root.querySelectorAll(sel);
        if (elements.every(el => Array.from(matches).includes(el))) return sel;
      }
    }

    // Strategy 3: Structural pattern — same parent tag + nth-child pattern
    const parents = elements.map(el => el.parentElement);
    if (parents.every(p => p !== null)) {
      // Check if all parents are the same element (siblings)
      if (parents.every(p => p === parents[0])) {
        const parentTag = parents[0]!.tagName.toLowerCase();
        const sel = `${parentTag} > ${tag}`;
        const root = this.scopeElement || document;
        const matches = root.querySelectorAll(sel);
        if (elements.every(el => Array.from(matches).includes(el))) return sel;
      }

      // Check if parents share a common class (cousin elements)
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

          // Also try without direct child
          const sel2 = `.${CSS.escape(bestParentClass)} ${tag}`;
          const matches2 = root.querySelectorAll(sel2);
          if (elements.every(el => Array.from(matches2).includes(el))) return sel2;
        }
      }
    }

    // Strategy 4: Multiple common classes combined
    if (commonClasses.length >= 2) {
      const sel = tag + commonClasses.slice(0, 3).map(c => `.${CSS.escape(c)}`).join('');
      const root = this.scopeElement || document;
      const matches = root.querySelectorAll(sel);
      if (elements.every(el => Array.from(matches).includes(el))) return sel;
    }

    return null;
  }

  /**
   * Detect whether a CSS class name is likely a utility/Tailwind class rather than
   * a semantic class. Utility classes describe appearance (font-medium, p-4, flex)
   * while semantic classes describe purpose (product-card, nav-link, sidebar).
   */
  private isUtilityClass(cls: string): boolean {
    // State/responsive prefixes (hover:xxx, sm:xxx, dark:xxx, group-hover:xxx)
    if (/^[\w-]*[a-z]:/.test(cls)) return true;

    // Common single-word utilities
    const singles = new Set([
      'flex', 'grid', 'block', 'inline', 'hidden', 'visible', 'invisible',
      'relative', 'absolute', 'fixed', 'sticky', 'static', 'isolate',
      'uppercase', 'lowercase', 'capitalize', 'truncate', 'italic',
      'underline', 'overline', 'antialiased', 'subpixel-antialiased',
      'container', 'sr-only', 'not-sr-only', 'contents', 'flow-root',
      'inline-block', 'inline-flex', 'inline-grid', 'table',
    ]);
    if (singles.has(cls)) return true;

    // Prefix-value patterns (p-4, text-xl, bg-red-500, -mt-2, etc.)
    if (/^-?(?:m|p|mx|my|mt|mb|ml|mr|ms|me|px|py|pt|pb|pl|pr|ps|pe|w|h|min-w|min-h|max-w|max-h|size|gap|space-x|space-y|inset|top|right|bottom|left|z|order|col|row|basis|grow|shrink|grid-cols|grid-rows|auto-cols|auto-rows|justify|items|self|place|content|font|text|leading|tracking|decoration|indent|align|whitespace|break|hyphens|bg|from|via|to|border|rounded|outline|ring|divide|shadow|opacity|mix-blend|blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|backdrop|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|cursor|caret|pointer-events|resize|scroll|snap|touch|select|will-change|fill|stroke|float|clear|object|overflow|overscroll|aspect|line-clamp|columns|list|accent)-/.test(cls)) return true;

    return false;
  }

  /**
   * Get a RELATIVE selector suitable for use within a loop scope.
   * This avoids unique identifiers (IDs, exact text) and prefers
   * class-based and structural selectors that work across all loop items.
   */
  getRelativeSelector(el: Element, scope: Element | null = null): string {
    if (!el || el.nodeType !== 1) return '';
    if (scope && el === scope) return ':scope';

    const root: Element | Document = scope || document;
    const tag = el.tagName.toLowerCase();

    // Gather classes
    const allClasses = (el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/).filter(c => c)
      : [];
    const semanticClasses = allClasses.filter(c => !this.isUtilityClass(c));
    const utilityClasses = allClasses.filter(c => this.isUtilityClass(c));

    // Helper: count matches within root
    const countMatches = (sel: string): number => {
      try { return root.querySelectorAll(sel).length; } catch { return 0; }
    };

    // ── Strategy 1: Semantic class (prefer most specific/longest) ──
    // Sort by length descending to get most specific class
    const sortedSemantic = [...semanticClasses].sort((a, b) => b.length - a.length);
    for (const cls of sortedSemantic) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      const count = countMatches(sel);
      // Good if it matches reasonably (not too many, not just 1 which might be unique)
      if (count >= 1 && count <= 20) return sel;
    }

    // ── Strategy 2: Tag + semantic class (any combo) ──
    for (const cls of sortedSemantic.slice(0, 3)) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (countMatches(sel) >= 1) return sel;
    }

    // ── Strategy 3: Multiple semantic classes ──
    if (sortedSemantic.length >= 2) {
      const sel = `${tag}.${CSS.escape(sortedSemantic[0])}.${CSS.escape(sortedSemantic[1])}`;
      if (countMatches(sel) >= 1) return sel;
    }

    // ── Strategy 4: Semantic class alone ──
    for (const cls of sortedSemantic.slice(0, 2)) {
      const sel = `.${CSS.escape(cls)}`;
      if (countMatches(sel) >= 1 && countMatches(sel) <= 30) return sel;
    }

    // ── Strategy 5: Role attribute (generic) ──
    if (el.hasAttribute('role')) {
      const role = el.getAttribute('role')!;
      const sel = `${tag}[role="${CSS.escape(role)}"]`;
      if (countMatches(sel) >= 1) return sel;
    }

    // ── Strategy 6: Generic data attributes (avoid data-testid which is usually unique) ──
    const genericAttrs = ['data-type', 'data-category', 'data-variant'];
    for (const attr of genericAttrs) {
      if (el.hasAttribute(attr)) {
        const sel = `${tag}[${attr}]`;
        if (countMatches(sel) >= 1) return sel;
      }
    }

    // ── Strategy 7: Tag alone (if it's a common interactive element) ──
    const commonInteractiveTags = ['a', 'button', 'input', 'select', 'textarea', 'img'];
    if (commonInteractiveTags.includes(tag)) {
      const count = countMatches(tag);
      if (count >= 1 && count <= 50) return tag;
    }

    // ── Strategy 8: Structural path from scope ──
    const boundary = scope || document.body;
    let path: string[] = [];
    let curr: Element | null = el;

    while (curr && curr !== boundary && curr !== document.body) {
      let seg = curr.tagName.toLowerCase();
      const currClasses = (curr.className && typeof curr.className === 'string')
        ? curr.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
        : [];

      if (currClasses.length > 0) {
        // Prefer the most semantic class
        const bestClass = currClasses.sort((a, b) => b.length - a.length)[0];
        seg += `.${CSS.escape(bestClass)}`;
      }

      path.unshift(seg);
      curr = curr.parentElement;

      // Stop if we have a good relative path (2-3 segments usually enough)
      if (path.length >= 3) break;
    }

    if (path.length > 0) {
      return path.join(' '); // Use descendant combinator for flexibility
    }

    // ── Strategy 9: Fallback to tag with utility class (last resort) ──
    for (const cls of utilityClasses.slice(0, 2)) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (countMatches(sel) >= 1) return sel;
    }

    // Ultimate fallback
    return tag;
  }

  /**
   * Get XPath that is RELATIVE to a scope (for use in loops).
   * Avoids unique identifiers and text-based matching.
   */
  getRelativeXPath(el: Element, scope: Element | null = null): string {
    if (!el || el.nodeType !== 1) return '';
    if (scope && el === scope) return './/self::*';

    const tag = el.tagName.toLowerCase();

    // Gather semantic classes
    const allClasses = (el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
      : [];

    // Prefer class-based XPath over position-based
    if (allClasses.length > 0) {
      const bestClass = allClasses.sort((a, b) => b.length - a.length)[0];
      return `.//${tag}[contains(concat(" ", @class, " "), " ${bestClass} ")]`;
    }

    // Role-based (generic)
    if (el.hasAttribute('role')) {
      const role = el.getAttribute('role')!;
      return `.//${tag}[@role="${role}"]`;
    }

    // Tag-only for common elements
    const commonTags = ['a', 'button', 'h1', 'h2', 'h3', 'h4', 'img', 'input'];
    if (commonTags.includes(tag)) {
      return `.//${tag}`;
    }

    // Structural: path from scope using positions (less ideal but functional)
    const boundary = scope || document.body;
    let path: string[] = [];
    let curr: Element | null = el;

    while (curr && curr !== boundary && curr !== document.body) {
      const currTag = curr.tagName.toLowerCase();

      // Try to use class if available
      const currClasses = (curr.className && typeof curr.className === 'string')
        ? curr.className.split(/\s+/).filter(c => c && !this.isUtilityClass(c))
        : [];

      if (currClasses.length > 0) {
        const bestClass = currClasses.sort((a, b) => b.length - a.length)[0];
        path.unshift(`${currTag}[contains(concat(" ", @class, " "), " ${bestClass} ")]`);
      } else {
        // Use position among siblings of same tag
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

    // Self-reference when element IS the scope
    if (scope && el === scope) return ':scope';

    const root: Element | Document = scope || document;
    const tag = el.tagName.toLowerCase();

    // Helper: test uniqueness within root
    const isUnique = (sel: string): boolean => {
      try { return root.querySelectorAll(sel).length === 1; } catch { return false; }
    };

    // Gather classes split into semantic vs utility
    const allClasses = (el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/).filter(c => c)
      : [];
    const semanticClasses = allClasses.filter(c => !this.isUtilityClass(c));
    const utilityClasses = allClasses.filter(c => this.isUtilityClass(c));

    // ── Strategy 1: Unique ID ──
    if (el.id) {
      const sel = `#${CSS.escape(el.id)}`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 2: Semantic data/aria attributes ──
    const semanticAttrs = ['data-testid', 'data-cy', 'data-test', 'name', 'aria-label'];
    for (const attr of semanticAttrs) {
      if (el.hasAttribute(attr)) {
        const val = el.getAttribute(attr)!;
        // Try tag[attr="val"] first (more specific)
        const sel1 = `${tag}[${attr}="${CSS.escape(val)}"]`;
        if (isUnique(sel1)) return sel1;
        const sel2 = `[${attr}="${CSS.escape(val)}"]`;
        if (isUnique(sel2)) return sel2;
      }
    }

    // ── Strategy 3: Tag alone (great for a, button, input, h1, etc.) ──
    if (isUnique(tag)) return tag;

    // ── Strategy 4: Tag + semantic class ──
    for (const cls of semanticClasses) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 5: Semantic class alone ──
    for (const cls of semanticClasses) {
      const sel = `.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 6: Role attribute ──
    if (el.hasAttribute('role')) {
      const role = el.getAttribute('role')!;
      const sel = `${tag}[role="${CSS.escape(role)}"]`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 7: Tag + utility class (less ideal but still usable) ──
    for (const cls of utilityClasses) {
      const sel = `${tag}.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 8: Utility class alone (last resort before structural) ──
    for (const cls of utilityClasses) {
      const sel = `.${CSS.escape(cls)}`;
      if (isUnique(sel)) return sel;
    }

    // ── Strategy 9: Multi-class combos ──
    if (allClasses.length >= 2) {
      const candidates = [...semanticClasses, ...utilityClasses].slice(0, 6);
      for (let i = 0; i < candidates.length; i++) {
        for (let j = i + 1; j < candidates.length; j++) {
          const sel = `${tag}.${CSS.escape(candidates[i])}.${CSS.escape(candidates[j])}`;
          if (isUnique(sel)) return sel;
        }
      }
    }

    // ── Strategy 10: Structural path ──
    const boundary = scope || document.body;
    let path: string[] = [], curr: Element | null = el;
    while (curr && curr !== boundary) {
      let seg = curr.tagName.toLowerCase();

      // Anchor to a unique ID if found along the path
      if (!scope && curr.id && isUnique(`#${CSS.escape(curr.id)}`)) {
        path.unshift(`#${CSS.escape(curr.id)}`);
        break;
      }

      // Prefer semantic class for path segments
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

  /**
   * Convert a simple CSS selector to an equivalent XPath expression.
   * Handles: tag, .class, tag.class, parent > child, .parent .descendant, tag[attr], tag[attr="val"]
   */
  cssToXPath(css: string): string {
    if (!css) return '';
    try {
      // Split by descendant combinator (space) and child combinator (>)
      const parts = css.split(/\s+/).map(s => s.trim()).filter(Boolean);
      const xpathParts: string[] = [];

      for (const part of parts) {
        if (part === '>') {
          // Replace descendant with child axis
          const last = xpathParts.pop();
          if (last) xpathParts.push(last.replace('//', './'));
          continue;
        }

        let xp = '';
        // Check for child combinator attached to part (e.g. from split on >)
        const subParts = part.split('>').map(s => s.trim()).filter(Boolean);
        if (subParts.length > 1) {
          // e.g. ".parent > div"
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
    // Parse tag.class1.class2[attr="val"] patterns
    const tagMatch = part.match(/^([a-z][a-z0-9]*)?/i);
    const tag = tagMatch && tagMatch[1] ? tagMatch[1].toLowerCase() : '*';
    const conditions: string[] = [];

    // Extract classes
    const classMatches = part.matchAll(/\.([a-zA-Z0-9_-]+)/g);
    for (const m of classMatches) {
      conditions.push(`contains(concat(" ", @class, " "), " ${m[1]} ")`);
    }

    // Extract attribute selectors [attr="val"] or [attr]
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
      // Basic protection check, although obscure IDs are rare
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
}
