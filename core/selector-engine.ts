
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
  }

  parentSelector: string | null = null;
  controlPanel: HTMLElement | null = null;

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

    if (this.scopeElement) {
      const rect = this.scopeElement.getBoundingClientRect();
      this.maskOverlay = document.createElement('div');
      Object.assign(this.maskOverlay.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '999980',
        top: `${rect.top}px`, left: `${rect.left}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', border: '2px dashed #f59e0b',
        borderRadius: '2px', transition: 'all 0.2s ease'
      });
      const scopeLabel = document.createElement('span');
      scopeLabel.textContent = "Extraction Scope";
      Object.assign(scopeLabel.style, {
        position: 'absolute', top: '-24px', left: '0', backgroundColor: '#f59e0b', color: 'black',
        padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', borderRadius: '2px'
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
  }

  createControlPanel() {
    this.controlPanel = document.createElement('div');
    Object.assign(this.controlPanel.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: 'white', padding: '12px 20px', borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: '1000001',
      display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'sans-serif'
    });

    const info = document.createElement('span');
    info.textContent = 'Select elements';
    info.style.fontWeight = '600';
    info.style.color = '#334155';
    info.style.fontSize = '14px';

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

    this.controlPanel.appendChild(info);
    this.controlPanel.appendChild(doneBtn);
    this.controlPanel.appendChild(cancelBtn);
    document.body.appendChild(this.controlPanel);
  }

  finish(success: boolean) {
    console.log('[OctoGrab] SelectorEngine finish called, success:', success);
    this.stop();
    if (this.onFinishCallback) {
        console.log('[OctoGrab] Calling onFinishCallback');
        this.onFinishCallback(success);
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
  }

  createOverlayElement(border: string, bg: string): HTMLElement {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '999990', border: border, backgroundColor: bg,
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
        if(document.body.contains(el)) document.body.removeChild(el);
    });
    this.matchOverlays = [];
  }

  clearSelectionOverlays() {
    this.selectionOverlays.forEach(el => {
        if(document.body.contains(el)) document.body.removeChild(el);
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
    Object.assign(el.style, { display: 'block', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
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
    } catch (e) {}
  }

  handleMouseMove(e: MouseEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === this.hoverOverlay || el === this.maskOverlay || this.matchOverlays.includes(el as HTMLElement) || this.selectionOverlays.includes(el as HTMLElement)) return;
    if (this.controlPanel && this.controlPanel.contains(el)) return;
    
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
      } else {
          finalSelector = this.getOptimalSelector(this.selectedElements[this.selectedElements.length - 1], effectiveScope);
          this.clearMatchOverlays();
      }
    } else if (this.selectedElements.length === 1) {
      finalSelector = this.getOptimalSelector(this.selectedElements[0], effectiveScope);
      finalXPath = this.getXPath(this.selectedElements[0]);
      this.clearMatchOverlays();
    } else {
      this.clearMatchOverlays();
    }
    
    if (this.onSelectCallback) this.onSelectCallback(finalSelector, finalXPath);
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') this.stop();
  }

  getCommonSelector(el1: Element, el2: Element): string | null {
    if (!el1 || !el2 || el1.tagName !== el2.tagName) return null;
    const tag = el1.tagName.toLowerCase();
    const classes1 = Array.from(el1.classList);
    const classes2 = Array.from(el2.classList);
    const commonClasses = classes1.filter(c => classes2.includes(c));
    if (commonClasses.length > 0) {
        const bestClass = commonClasses.sort((a, b) => b.length - a.length)[0];
        return `${tag}.${CSS.escape(bestClass)}`;
    }
    if (el1.parentElement && el2.parentElement && el1.parentElement.tagName === el2.parentElement.tagName) {
        return `${el1.parentElement.tagName.toLowerCase()} > ${tag}`;
    }
    return null;
  }

  getOptimalSelector(el: Element, scope: Element | null = null): string {
    if (!el || el.nodeType !== 1) return '';
    if (scope) {
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(/\s+/).filter(c => c);
            for (const cls of classes) {
                const sel = `.${CSS.escape(cls)}`;
                if (scope.querySelectorAll(sel).length === 1) return sel;
            }
        }
        const tag = el.tagName.toLowerCase();
        if (scope.querySelectorAll(tag).length === 1) return tag;
        
        let path: string[] = [], curr: Element | null = el;
        while (curr && curr !== scope) {
            let sel = curr.tagName.toLowerCase();
            if (curr.className && typeof curr.className === 'string' && curr.className.trim()) {
                sel += `.${CSS.escape(curr.className.split(' ')[0])}`;
            } else {
                let sib = curr, nth = 1;
                while (sib = sib.previousElementSibling as Element) if (sib.tagName === curr.tagName) nth++;
                if (nth > 1) sel += `:nth-of-type(${nth})`;
            }
            path.unshift(sel);
            curr = curr.parentElement;
        }
        return path.join(' > ');
    }
    
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const uniqueAttrs = ['data-testid', 'data-cy', 'name', 'role', 'aria-label'];
    for (const attr of uniqueAttrs) {
      if (el.hasAttribute(attr)) {
          const sel = `[${attr}="${CSS.escape(el.getAttribute(attr)!)}"]`;
          if (document.querySelectorAll(sel).length === 1) return sel;
      }
    }
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\s+/).filter(c => c);
      for (const cls of classes) {
          if (document.querySelectorAll(`.${CSS.escape(cls)}`).length === 1) return `.${CSS.escape(cls)}`;
      }
    }
    
    let path: string[] = [], curr: Element | null = el;
    while (curr && curr !== document.body) {
      let sel = curr.tagName.toLowerCase();
      if (curr.id && document.querySelectorAll(`#${CSS.escape(curr.id)}`).length === 1) {
          path.unshift(`#${CSS.escape(curr.id)}`);
          break;
      } else {
          let sib = curr, nth = 1;
          while (sib = sib.previousElementSibling as Element) if (sib.tagName === curr.tagName) nth++;
          if (nth > 1) sel += `:nth-of-type(${nth})`;
      }
      path.unshift(sel);
      curr = curr.parentElement;
    }
    return path.join(' > ');
  }

  getXPath(el: Element): string {
    if (el.id) return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';
    let ix = 0;
    const siblings = el.parentNode ? el.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i] as Element;
      if (sibling === el) return `${this.getXPath(el.parentNode as Element)}/${el.tagName.toLowerCase()}[${ix + 1}]`;
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) ix++;
    }
    return '';
  }
}
