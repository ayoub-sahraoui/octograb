
export class SelectorEngine {
  active: boolean = false;
  hoveredEl: Element | null = null;
  scopeElement: Element | null = null;
  maskOverlay: HTMLElement | null = null;
  hoverOverlay: HTMLElement | null = null;
  selectionOverlays: HTMLElement[] = [];
  matchOverlays: HTMLElement[] = [];
  onSelectCallback: ((selector: string, xpath: string) => void) | null = null;
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
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  isKeyboardNavigating: boolean = false;

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
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', border: '2px dashed #f59e0b',
        borderRadius: '2px', transition: 'all 0.2s ease'
      });
      const scopeLabel = document.createElement('span');
      scopeLabel.textContent = this.parentSelector
        ? `Scope: ${this.parentSelector}`
        : "Extraction Scope";
      Object.assign(scopeLabel.style, {
        position: 'absolute', top: '-24px', left: '0', backgroundColor: '#f59e0b', color: 'black',
        padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', borderRadius: '2px',
        fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      });
      this.maskOverlay.appendChild(scopeLabel);
      document.body.appendChild(this.maskOverlay);
    }

    this.hoverOverlay = this.createOverlayElement('2px solid #3b82f6', 'rgba(59, 130, 246, 0.05)');
    this.label = document.createElement('span');
    Object.assign(this.label.style, {
      position: 'absolute', top: '-24px', left: '0', backgroundColor: '#3b82f6', color: 'white',
      padding: '2px 6px', fontSize: '10px', borderRadius: '4px', fontFamily: 'monospace',
      whiteSpace: 'nowrap', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      zIndex: '1000000', pointerEvents: 'none'
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
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: 'white', padding: '12px 20px', borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: '1000001',
      display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'sans-serif'
    });

    this.infoSpan = document.createElement('span');
    this.infoSpan.textContent = 'Select elements (Arrow keys to navigate)';
    this.infoSpan.style.fontWeight = '600';
    this.infoSpan.style.color = '#334155';
    this.infoSpan.style.fontSize = '14px';

    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'Done Selecting';
    Object.assign(doneBtn.style, {
      backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '8px 16px',
      borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
      transition: 'background 0.2s'
    });
    doneBtn.onmouseover = () => doneBtn.style.backgroundColor = '#1d4ed8';
    doneBtn.onmouseout = () => doneBtn.style.backgroundColor = '#2563eb';
    doneBtn.onclick = (e) => {
      e.stopPropagation();
      this.finish(true);
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
      backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 16px',
      borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
      transition: 'background 0.2s'
    });
    cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#e2e8f0';
    cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#f1f5f9';
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.finish(false);
    };

    this.controlPanel.appendChild(this.infoSpan);
    this.controlPanel.appendChild(doneBtn);
    this.controlPanel.appendChild(cancelBtn);
    document.body.appendChild(this.controlPanel);
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
      position: 'absolute', pointerEvents: 'none', zIndex: '999990', border: border, backgroundColor: bg,
      borderRadius: '2px', display: 'none', boxSizing: 'border-box', transition: 'all 0.1s ease'
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

  drawOverlay(rect: DOMRect, type: 'hover' | 'selected' | 'match' = 'hover') {
    if (rect.width === 0 || rect.height === 0) return null;
    let el: HTMLElement;
    if (type === 'hover') {
      if (!this.hoverOverlay) return null;
      el = this.hoverOverlay;
    } else {
      const style = type === 'selected' ? { border: '2px solid #2563eb', bg: 'rgba(37, 99, 235, 0.2)' } : { border: '2px dashed #10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      el = this.createOverlayElement(style.border, style.bg);
      document.body.appendChild(el);
      if (type === 'selected') this.selectionOverlays.push(el); else this.matchOverlays.push(el);
    }
    Object.assign(el.style, { display: 'block', top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`, width: `${rect.width}px`, height: `${rect.height}px` });
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
      if (this.infoSpan) {
        this.infoSpan.textContent = `${matches.length} element${matches.length === 1 ? '' : 's'} selected`;
        this.infoSpan.style.color = '#2563eb';
      }
    } catch (e) { }
  }

  handleMouseMove(e: MouseEvent) {
    if (Math.abs(e.clientX - this.lastMouseX) < 2 && Math.abs(e.clientY - this.lastMouseY) < 2) return;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.isKeyboardNavigating = false;

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

    const tagName = el.tagName.toLowerCase();
    let displayText = tagName;
    if (this.scopeElement) {
      if (el.className && typeof el.className === 'string' && el.className.trim()) {
        displayText += `.${el.className.split(' ')[0]}`;
      }
    } else {
      if (el.id) displayText += `#${el.id}`;
      else if (el.className && typeof el.className === 'string' && el.className.trim()) displayText += `.${el.className.split(' ')[0]}`;
    }

    if (this.label) {
      if (this.selectedElements.length > 0) {
        this.label.textContent = this.selectedElements.includes(el) ? "Click to Deselect" : "Click to Select";
        this.label.style.backgroundColor = this.selectedElements.includes(el) ? '#ef4444' : '#10b981';
      } else {
        this.label.textContent = displayText;
        this.label.style.backgroundColor = '#3b82f6';
      }
    }
  }

  handleClick(e: MouseEvent) {
    if (this.controlPanel && this.controlPanel.contains(e.target as Node)) return;
    if (!this.hoveredEl) return;
    if (this.scopeElement && !this.scopeElement.contains(this.hoveredEl)) return;
    e.preventDefault();
    e.stopPropagation();

    const index = this.selectedElements.indexOf(this.hoveredEl);
    if (index > -1) this.selectedElements.splice(index, 1);
    else this.selectedElements.push(this.hoveredEl);

    this.updateSelectionVisuals();

    let effectiveScope = this.scopeElement;
    if (!effectiveScope && this.parentSelector) {
      // Try to find the closest ancestor matching parentSelector
      effectiveScope = this.hoveredEl.closest(this.parentSelector);
    }

    let finalSelector = '', finalXPath = '';
    if (this.selectedElements.length > 1) {
      const common = this.getCommonSelector(this.selectedElements[0], this.selectedElements[1]);
      if (common) {
        finalSelector = common;
        this.updateMatchVisuals(finalSelector);

        // Generate XPath from the common CSS selector
        finalXPath = this.cssToXPath(finalSelector);
        if (!finalXPath) {
          // Fallback: use first element's xpath
          finalXPath = this.getXPath(this.selectedElements[0]);
        }
      } else {
        finalSelector = this.getOptimalSelector(this.selectedElements[this.selectedElements.length - 1], effectiveScope);
        this.clearMatchOverlays();
        // Fallback to last element's xpath
        const el = this.selectedElements[this.selectedElements.length - 1];
        finalXPath = this.getXPath(el);
      }
    } else if (this.selectedElements.length === 1) {
      const el = this.selectedElements[0];
      finalSelector = this.getOptimalSelector(el, effectiveScope);

      // Calculate XPath (prefer smart text-based if available, always fallback to structural)
      const smartXPath = this.getSmartXPath(el);
      finalXPath = smartXPath || this.getXPath(el);

      // Final safety check - ensure xpath is never empty
      if (!finalXPath) {
        finalXPath = this.getXPath(el);
      }

      this.clearMatchOverlays();
      if (this.infoSpan) {
        this.infoSpan.textContent = '1 element selected';
        this.infoSpan.style.color = '#334155';
      }
    } else {
      // All elements deselected — clear visuals and reset info, don't send empty selector
      this.clearMatchOverlays();
      if (this.infoSpan) {
        this.infoSpan.textContent = 'Select elements (Arrow keys to navigate)';
        this.infoSpan.style.color = '#334155';
      }
      return;
    }

    // Safety: if scoped selector is empty, fall back to global selector
    if (!finalSelector && this.selectedElements.length > 0) {
      const el = this.selectedElements[this.selectedElements.length - 1];
      finalSelector = this.getOptimalSelector(el, null);
      if (!finalXPath) finalXPath = this.getXPath(el);
    }

    if (this.onSelectCallback && finalSelector) this.onSelectCallback(finalSelector, finalXPath);
  }

  getSmartXPath(el: Element): string | null {
    const text = el.textContent?.trim();
    if (!text || text.length > 50) return null;

    // Handle quotes in text
    let textPart = '';
    if (text.includes("'") && text.includes('"')) {
      // complex case, skip or use concat
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

    if (this.hoveredEl && !this.selectedElements.includes(this.hoveredEl)) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.isKeyboardNavigating = true;
        const parent = this.hoveredEl.parentElement;
        if (parent && parent !== document.body) {
          if (!this.scopeElement || this.scopeElement.contains(parent)) {
            this.hoveredEl = parent;
            this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
            this.updateLabel(this.hoveredEl);
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.isKeyboardNavigating = true;
        const child = this.hoveredEl.firstElementChild;
        if (child) {
          if (!this.scopeElement || this.scopeElement.contains(child)) {
            this.hoveredEl = child;
            this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
            this.updateLabel(this.hoveredEl);
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.isKeyboardNavigating = true;
        const prev = this.hoveredEl.previousElementSibling;
        if (prev) {
          if (!this.scopeElement || this.scopeElement.contains(prev)) {
            this.hoveredEl = prev;
            this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
            this.updateLabel(this.hoveredEl);
          }
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.isKeyboardNavigating = true;
        const next = this.hoveredEl.nextElementSibling;
        if (next) {
          if (!this.scopeElement || this.scopeElement.contains(next)) {
            this.hoveredEl = next;
            this.drawOverlay(this.hoveredEl.getBoundingClientRect(), 'hover');
            this.updateLabel(this.hoveredEl);
          }
        }
      }
    }
  }

  handleScroll() {
    // Update all overlay positions on scroll
    this.updateSelectionVisuals();
    if (this.hoveredEl && this.hoverOverlay) {
      const rect = this.hoveredEl.getBoundingClientRect();
      this.drawOverlay(rect, 'hover');
    }
    if (this.scopeElement && this.maskOverlay) {
      const rect = this.scopeElement.getBoundingClientRect();
      Object.assign(this.maskOverlay.style, {
        top: `${rect.top + window.scrollY}px`, left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
    }
  }

  updateLabel(el: Element) {
    if (!this.label) return;
    const tagName = el.tagName.toLowerCase();
    let displayText = tagName;
    if (this.scopeElement) {
      if (el.className && typeof el.className === 'string' && el.className.trim()) {
        displayText += `.${el.className.split(' ')[0]}`;
      }
    } else {
      if (el.id) displayText += `#${el.id}`;
      else if (el.className && typeof el.className === 'string' && el.className.trim()) displayText += `.${el.className.split(' ')[0]}`;
    }
    this.label.textContent = displayText;
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
