import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Trash2, 
  Settings, 
  MousePointer, 
  Globe, 
  Repeat, 
  Database, 
  Type,
  List,
  X,
  Terminal,
  Loader2,
  FileJson,
  Layout,
  Scan,
  Menu,
  MoreHorizontal,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  Briefcase,
  Plus,
  Sparkles,
  Upload,
  FileSpreadsheet,
  Bot,
  FileText,
  ArrowRight,
  Check
} from 'lucide-react';

/**
 * --- INTEGRATED SELECTOR ENGINE v3 (Scoped & Masked) ---
 * Identical to previous version.
 */
class SelectorEngine {
  constructor() {
    this.active = false;
    this.hoveredEl = null;
    this.scopeElement = null; 
    this.maskOverlay = null; this.hoverOverlay = null;     
    this.selectionOverlays = []; this.matchOverlays = [];      
    this.onSelectCallback = null; this.selectedElements = [];   
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  start(onSelect, scopeElement = null) {
    if (this.active) return;
    this.active = true;
    this.onSelectCallback = onSelect;
    this.scopeElement = scopeElement;
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
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }
  stop() {
    if (!this.active) return;
    this.active = false;
    if (this.maskOverlay) document.body.removeChild(this.maskOverlay);
    if (this.hoverOverlay) document.body.removeChild(this.hoverOverlay);
    this.clearMatchOverlays(); this.clearSelectionOverlays(); this.scopeElement = null;
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }
  createOverlayElement(border, bg) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', pointerEvents: 'none', zIndex: '999990', border: border, backgroundColor: bg,
      borderRadius: '2px', display: 'none', boxSizing: 'border-box', transition: 'all 0.1s ease'
    });
    return el;
  }
  clearOverlays() {
    if (this.maskOverlay) { document.body.removeChild(this.maskOverlay); this.maskOverlay = null; }
    this.clearMatchOverlays(); this.clearSelectionOverlays();
  }
  clearMatchOverlays() { this.matchOverlays.forEach(el => document.body.removeChild(el)); this.matchOverlays = []; }
  clearSelectionOverlays() { this.selectionOverlays.forEach(el => document.body.removeChild(el)); this.selectionOverlays = []; }
  drawOverlay(rect, type = 'hover') {
    if (rect.width === 0 || rect.height === 0) return null;
    let el;
    if (type === 'hover') { el = this.hoverOverlay; } 
    else {
      const style = type === 'selected' ? { border: '2px solid #2563eb', bg: 'rgba(37, 99, 235, 0.2)' } : { border: '2px dashed #10b981', bg: 'rgba(16, 185, 129, 0.1)' }; 
      el = this.createOverlayElement(style.border, style.bg);
      document.body.appendChild(el);
      if (type === 'selected') this.selectionOverlays.push(el); else this.matchOverlays.push(el);
    }
    Object.assign(el.style, { display: 'block', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    return el;
  }
  updateSelectionVisuals() { this.clearSelectionOverlays(); this.selectedElements.forEach(el => { this.drawOverlay(el.getBoundingClientRect(), 'selected'); }); }
  updateMatchVisuals(selector) {
    this.clearMatchOverlays(); if (!selector) return;
    try {
      const root = this.scopeElement || document; const matches = root.querySelectorAll(selector);
      matches.forEach(el => { if (!this.selectedElements.includes(el)) { this.drawOverlay(el.getBoundingClientRect(), 'match'); } });
    } catch(e) {}
  }
  handleMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === this.hoverOverlay || el === this.maskOverlay || this.matchOverlays.includes(el) || this.selectionOverlays.includes(el)) return;
    if (this.scopeElement && !this.scopeElement.contains(el)) { this.hoverOverlay.style.display = 'none'; return; }
    this.hoveredEl = el;
    const rect = el.getBoundingClientRect();
    this.drawOverlay(rect, 'hover');
    const tagName = el.tagName.toLowerCase();
    let displayText = tagName;
    if (this.scopeElement) { if (el.className && typeof el.className === 'string' && el.className.trim()) { displayText += `.${el.className.split(' ')[0]}`; } } 
    else { if (el.id) displayText += `#${el.id}`; else if (el.className && typeof el.className === 'string') displayText += `.${el.className.split(' ')[0]}`; }
    if (this.selectedElements.length > 0) {
      this.label.textContent = this.selectedElements.includes(el) ? "Click to Deselect" : "Click to Select";
      this.label.style.backgroundColor = this.selectedElements.includes(el) ? '#ef4444' : '#10b981';
    } else { this.label.textContent = displayText; this.label.style.backgroundColor = '#3b82f6'; }
  }
  handleClick(e) {
    if (!this.hoveredEl) return;
    if (this.scopeElement && !this.scopeElement.contains(this.hoveredEl)) return;
    e.preventDefault(); e.stopPropagation();
    const index = this.selectedElements.indexOf(this.hoveredEl);
    if (index > -1) this.selectedElements.splice(index, 1); else this.selectedElements.push(this.hoveredEl);
    this.updateSelectionVisuals();
    let finalSelector = '', finalXPath = '';
    if (this.selectedElements.length > 1) {
      const common = this.getCommonSelector(this.selectedElements[0], this.selectedElements[1]);
      if (common) { finalSelector = common; this.updateMatchVisuals(finalSelector); } 
      else { finalSelector = this.getOptimalSelector(this.selectedElements[this.selectedElements.length - 1], this.scopeElement); this.clearMatchOverlays(); }
    } else if (this.selectedElements.length === 1) {
      finalSelector = this.getOptimalSelector(this.selectedElements[0], this.scopeElement);
      finalXPath = this.getXPath(this.selectedElements[0]);
      this.clearMatchOverlays();
    } else { this.clearMatchOverlays(); }
    if (this.onSelectCallback) this.onSelectCallback(finalSelector, finalXPath);
  }
  handleKeyDown(e) { if (e.key === 'Escape') this.stop(); }
  getCommonSelector(el1, el2) {
    if (!el1 || !el2 || el1.tagName !== el2.tagName) return null;
    const tag = el1.tagName.toLowerCase();
    const classes1 = Array.from(el1.classList); const classes2 = Array.from(el2.classList); const commonClasses = classes1.filter(c => classes2.includes(c));
    if (commonClasses.length > 0) { const bestClass = commonClasses.sort((a, b) => b.length - a.length)[0]; return `${tag}.${CSS.escape(bestClass)}`; }
    if (el1.parentElement && el2.parentElement && el1.parentElement.tagName === el2.parentElement.tagName) { return `${el1.parentElement.tagName.toLowerCase()} > ${tag}`; }
    return null;
  }
  getOptimalSelector(el, scope = null) {
    if (!el || el.nodeType !== 1) return '';
    if (scope) {
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split(/\s+/).filter(c => c);
            for (const cls of classes) { const sel = `.${CSS.escape(cls)}`; if (scope.querySelectorAll(sel).length === 1) return sel; }
        }
        const tag = el.tagName.toLowerCase(); if (scope.querySelectorAll(tag).length === 1) return tag;
        let path = [], curr = el;
        while (curr && curr !== scope) {
            let sel = curr.tagName.toLowerCase();
            if (curr.className && typeof curr.className === 'string' && curr.className.trim()) { sel += `.${CSS.escape(curr.className.split(' ')[0])}`; } 
            else { let sib = curr, nth = 1; while(sib = sib.previousElementSibling) if(sib.tagName === curr.tagName) nth++; if(nth > 1) sel += `:nth-of-type(${nth})`; }
            path.unshift(sel); curr = curr.parentElement;
        }
        return path.join(' > ');
    }
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const uniqueAttrs = ['data-testid', 'data-cy', 'name', 'role', 'aria-label'];
    for (const attr of uniqueAttrs) {
      if (el.hasAttribute(attr)) { const sel = `[${attr}="${CSS.escape(el.getAttribute(attr))}"]`; if (document.querySelectorAll(sel).length === 1) return sel; }
    }
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\s+/).filter(c => c);
      for (const cls of classes) { if (document.querySelectorAll(`.${CSS.escape(cls)}`).length === 1) return `.${CSS.escape(cls)}`; }
    }
    let path = [], curr = el;
    while(curr && curr !== document.body) {
      let sel = curr.tagName.toLowerCase();
      if(curr.id && document.querySelectorAll(`#${CSS.escape(curr.id)}`).length === 1) { path.unshift(`#${CSS.escape(curr.id)}`); break; } 
      else { let sib = curr, nth = 1; while(sib = sib.previousElementSibling) if(sib.tagName === curr.tagName) nth++; if(nth > 1) sel += `:nth-of-type(${nth})`; }
      path.unshift(sel); curr = curr.parentElement;
    }
    return path.join(' > ');
  }
  getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`; if (el === document.body) return '/html/body';
    let ix = 0, siblings = el.parentNode ? el.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === el) return `${this.getXPath(el.parentNode)}/${el.tagName.toLowerCase()}[${ix + 1}]`;
      if (siblings[i].nodeType === 1 && siblings[i].tagName === el.tagName) ix++;
    }
    return '';
  }
}

/**
 * CONSTANTS & TYPES
 */
const BLOCK_TYPES = {
  NAVIGATE: { type: 'navigate', label: 'Navigate', icon: Globe, color: 'bg-blue-100 text-blue-600' },
  CLICK: { type: 'click', label: 'Click Element', icon: MousePointer, color: 'bg-orange-100 text-orange-600' },
  INPUT: { type: 'input', label: 'Input Text', icon: Type, color: 'bg-purple-100 text-purple-600' },
  LOOP: { type: 'loop_elements', label: 'Loop Elements', icon: Repeat, color: 'bg-green-100 text-green-600', hasChildren: true },
  PAGINATION: { type: 'loop_pagination', label: 'Pagination Loop', icon: List, color: 'bg-teal-100 text-teal-600', hasChildren: true },
  EXTRACT: { type: 'extract_scope', label: 'Extract Data', icon: Database, color: 'bg-pink-100 text-pink-600' },
};

const INITIAL_PLAN = {
  meta: { name: "New Scraper Plan", version: "1.0", userAgent: "Desktop" },
  variables: { baseUrl: "https://example.com" },
  pipeline: []
};

// --- MOCK STORAGE & JOBS ---
const MOCK_SAVED_PLANS = [
  { 
    id: 'plan_1', 
    name: 'Amazon Products', 
    updatedAt: '2023-10-24T10:30:00Z', 
    plan: { ...INITIAL_PLAN, meta: { ...INITIAL_PLAN.meta, name: 'Amazon Products' }, pipeline: [{ id: 'nav1', type: 'navigate', url: 'https://amazon.com' }] } 
  },
  { 
    id: 'plan_2', 
    name: 'LinkedIn Jobs', 
    updatedAt: '2023-10-22T14:15:00Z', 
    plan: { ...INITIAL_PLAN, meta: { ...INITIAL_PLAN.meta, name: 'LinkedIn Jobs' }, pipeline: [] } 
  },
  {
    id: 'plan_3',
    name: 'Deep Nesting Demo',
    updatedAt: '2023-10-25T09:00:00Z',
    plan: {
      meta: { name: 'Deep Nesting Demo', version: "1.0", userAgent: "Desktop" },
      variables: { baseUrl: "https://example.com" },
      pipeline: [
        {
          id: 'root_nav',
          type: 'navigate',
          url: 'https://example.com/categories',
          children: []
        },
        {
          id: 'cat_pagination',
          type: 'loop_pagination',
          config: { nextButtonSelector: '.next-cat', maxPages: 3 },
          children: [
            {
              id: 'category_loop',
              type: 'loop_elements',
              selector: '.category-link',
              children: [
                { id: 'click_cat', type: 'click', selector: 'a', navigationBehavior: 'new_tab' },
                { 
                  id: 'product_loop', 
                  type: 'loop_elements', 
                  selector: '.product-item', 
                  children: [
                    { 
                      id: 'extract_prod', 
                      type: 'extract_scope', 
                      fields: [{ key: 'name', selector: '.name', attribute: 'text' }] 
                    },
                    {
                        id: 'comments_loop',
                        type: 'loop_elements',
                        selector: '.comment',
                        children: [
                            { id: 'extract_comment', type: 'extract_scope', fields: [{ key: 'text', selector: 'p', attribute: 'text' }] }
                        ]
                    }
                  ] 
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

const MOCK_JOBS = [
  { id: 'job_101', planName: 'Amazon Products', status: 'completed', submittedAt: '10:30 AM', duration: '45s', items: 150 },
  { id: 'job_102', planName: 'LinkedIn Jobs', status: 'failed', submittedAt: '09:15 AM', duration: '12s', items: 0 },
  { id: 'job_103', planName: 'Amazon Products', status: 'completed', submittedAt: 'Yesterday', duration: '1m 20s', items: 340 },
];

// --- Components ---

const Button = ({ children, onClick, variant = "primary", size = "md", className = "", icon: Icon, disabled = false, title = "" }) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-200",
  };
  const sizes = { sm: "text-xs px-2 py-1", md: "text-sm px-3 py-2", icon: "p-2" };
  return (
    <button onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}>
      {Icon && <Icon className={`w-4 h-4 ${children ? "mr-2" : ""}`} />} {children}
    </button>
  );
};

const InputField = ({ label, value, onChange, placeholder, type = "text", onPick, scopeHint }) => (
  <div className="mb-4">
    <div className="flex justify-between items-end mb-1">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        {scopeHint && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{scopeHint}</span>}
    </div>
    <div className="flex gap-2">
      <input type={type} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {onPick && (
        <button onClick={onPick} className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors relative" title="Pick from page">
          <MousePointer className="w-4 h-4" /> {scopeHint && <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full -mt-1 -mr-1"></div>}
        </button>
      )}
    </div>
  </div>
);

// --- Recursion Helpers ---
const findBlock = (blocks, id) => {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) { const found = findBlock(block.children, id); if (found) return found; }
  }
  return null;
};
const updateBlockInTree = (blocks, id, updates) => {
  if (!blocks) return [];
  return blocks.map(block => {
    if (block.id === id) return { ...block, ...updates };
    if (block.children) return { ...block, children: updateBlockInTree(block.children, id, updates) };
    return block;
  });
};
const addBlockToTree = (blocks, parentId, newBlock) => {
  if (!blocks) return [newBlock];
  if (!parentId) return [...blocks, newBlock];
  return blocks.map(block => {
    if (block.id === parentId) return { ...block, children: [...(block.children || []), newBlock] };
    if (block.children) return { ...block, children: addBlockToTree(block.children, parentId, newBlock) };
    return block;
  });
};
const deleteBlockFromTree = (blocks, id) => {
  if (!blocks) return [];
  return blocks.filter(block => block.id !== id).map(block => {
    if (block.children) return { ...block, children: deleteBlockFromTree(block.children, id) };
    return block;
  });
};

// --- Execution Simulator ---
const ExecutionPanel = ({ logs, results, onClose, isRunning }) => {
  const logsEndRef = useRef(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 max-h-[50vh] bg-slate-900 text-slate-200 shadow-2xl z-[60] flex flex-col font-mono border-t border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-400" /> <span className="text-sm font-semibold">Dry Run Simulator</span>
          {isRunning && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full animate-pulse">Running...</span>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 border-r border-slate-700">
          <div className="space-y-1">
            {(logs || []).map((log, i) => (
              <div key={i} className={`text-xs flex ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                <span className="w-20 text-slate-500 opacity-50 shrink-0">{log.timestamp}</span> <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        <div className="w-1/3 bg-slate-800/50 p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><Database className="w-3 h-3 mr-2" /> Data ({(results || []).length})</h3>
          <div className="space-y-2">
            {(results || []).map((res, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                {Object.entries(res).map(([k, v]) => <div key={k} className="flex gap-2"><span className="text-blue-400">{k}:</span><span className="text-slate-300 truncate">{v}</span></div>)}
              </div>
            ))}
             {(results || []).length === 0 && <span className="text-slate-600 text-xs italic">No data...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- NEW MODULES: Plans & Jobs ---

const NavItem = ({ id, icon: Icon, label, currentView, setView }) => (
  <button 
    onClick={() => setView(id)}
    className={`w-full p-3 flex flex-col items-center justify-center gap-1 transition-colors ${currentView === id ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const NavRail = ({ view, setView }) => {
  return (
    <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 z-50">
      <NavItem id="builder" icon={Layout} label="Builder" currentView={view} setView={setView} />
      <NavItem id="plans" icon={Archive} label="Plans" currentView={view} setView={setView} />
      <NavItem id="jobs" icon={Briefcase} label="Jobs" currentView={view} setView={setView} />
      <div className="w-full px-2 my-2"><div className="h-px bg-slate-200"></div></div>
      <NavItem id="ai-wizard" icon={Sparkles} label="AI Gen" currentView={view} setView={setView} />
    </div>
  );
};

const PlansView = ({ plans, onLoad, onDelete, onRun }) => (
  <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Saved Plans</h2>
        <Button variant="secondary" icon={Plus} onClick={() => onLoad(null)}>New Plan</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(plans || []).map(plan => (
          <div key={plan.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-blue-100 p-2 rounded text-blue-600"><FileJson className="w-5 h-5" /></div>
              <div className="flex space-x-1">
                 <button onClick={() => onRun(plan)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="Run Job"><Play className="w-4 h-4" /></button>
                 <button onClick={() => onDelete(plan.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{plan.name}</h3>
            <div className="text-xs text-slate-500 mb-4 flex flex-col gap-1">
               <span>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>
               <span>Steps: {(plan.plan.pipeline || []).length}</span>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onLoad(plan)}>Open in Builder</Button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const JobsView = ({ jobs }) => {
  const getStatusColor = (s) => {
    switch(s) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'running': return 'bg-blue-100 text-blue-700 animate-pulse';
      default: return 'bg-slate-100 text-slate-600';
    }
  };
  const getStatusIcon = (s) => {
    switch(s) {
      case 'completed': return CheckCircle2;
      case 'failed': return AlertCircle;
      case 'running': return Loader2;
      default: return Clock;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Job Queue</h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Plan Name</th>
                <th className="px-6 py-3">Submitted</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(jobs || []).map(job => {
                const StatusIcon = getStatusIcon(job.status);
                return (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{job.planName}</td>
                    <td className="px-6 py-4 text-slate-500">{job.submittedAt}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{job.duration || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{job.items || '-'}</td>
                    <td className="px-6 py-4 text-right">
                       {job.status === 'completed' && <button className="text-blue-600 hover:underline">Download</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AiWizardView = ({ onCreatePlan }) => {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [schema, setSchema] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    
    // Client-side header extraction logic
    if (uploadedFile.name.endsWith('.csv') || uploadedFile.type === 'text/csv') {
       const reader = new FileReader();
       reader.onload = (event) => {
          const text = event.target.result;
          const headers = text.split('\n')[0].split(',').map(h => h.trim());
          setSchema(headers);
       };
       reader.readAsText(uploadedFile);
    } else {
       // Mock for Excel since we can't parse binary in this environment
       setSchema(['Product Name', 'Price', 'Stock Status', 'SKU', 'Image URL']); 
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000)); // Mock AI Delay
    
    // Determine template based on prompt or file
    const isEcommerce = prompt.toLowerCase().includes('product') || prompt.toLowerCase().includes('amazon') || schema.includes('Price');
    
    const newPlan = {
       meta: { name: prompt.split(' ').slice(0, 4).join(' ') || "AI Generated Plan", version: "1.0", userAgent: "Desktop" },
       variables: { baseUrl: "https://target-site.com" },
       pipeline: [
         { id: 'nav_ai', type: 'navigate', url: 'https://target-site.com/search' },
         { 
           id: 'loop_ai', type: 'loop_elements', selector: isEcommerce ? '.product-card' : '.list-item', 
           children: [
             {
               id: 'extract_ai', type: 'extract_scope',
               // Map schema to fields, or default fields
               fields: schema.length > 0 
                 ? schema.map(h => ({ key: h.toLowerCase().replace(/ /g, '_'), selector: `.css-${h.substring(0,3)}`, attribute: 'text' }))
                 : [ { key: 'title', selector: 'h2', attribute: 'text' }, { key: 'price', selector: '.price', attribute: 'text' }, { key: 'link', selector: 'a', attribute: 'href' } ]
             }
           ]
         },
         {
            id: 'pagination_ai', type: 'loop_pagination', config: { nextButtonSelector: '.next-page', maxPages: 5 }, children: []
         }
       ]
    };
    
    onCreatePlan(newPlan);
  };

  return (
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">AI Plan Generator</h2>
            <p className="text-indigo-100">Describe what you want to scrape, or upload a file to match a specific format.</p>
         </div>
         
         <div className="p-8 space-y-6">
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">What are we scraping?</label>
               <textarea 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none h-24 resize-none"
                  placeholder="e.g. Scrape product titles and prices from Amazon search results for 'gaming laptop'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
               />
            </div>

            <div className="border-t border-slate-100 pt-6">
               <label className="block text-sm font-semibold text-slate-700 mb-2">Output Schema (Optional)</label>
               <p className="text-xs text-slate-500 mb-3">Upload a CSV or Excel file to automatically configure extraction fields.</p>
               
               <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors relative">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" />
                  {file ? (
                     <div className="flex flex-col items-center text-violet-600">
                        <FileSpreadsheet className="w-8 h-8 mb-2" />
                        <span className="font-medium text-sm">{file.name}</span>
                        <span className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                     </div>
                  ) : (
                     <div className="flex flex-col items-center text-slate-400">
                        <Upload className="w-8 h-8 mb-2" />
                        <span className="text-sm">Drop CSV/Excel here or click to upload</span>
                     </div>
                  )}
               </div>

               {schema.length > 0 && (
                  <div className="mt-4 bg-slate-50 p-3 rounded border border-slate-200">
                     <div className="text-xs font-bold text-slate-500 uppercase mb-2">Detected Fields</div>
                     <div className="flex flex-wrap gap-2">
                        {schema.map((field, i) => (
                           <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-medium shadow-sm">
                              {field}
                           </span>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <button 
               onClick={handleGenerate}
               disabled={!prompt && !file || isGenerating}
               className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
               {isGenerating ? (
                  <>
                     <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Plan...
                  </>
               ) : (
                  <>
                     <Sparkles className="w-5 h-5 mr-2" /> Generate Magic Plan
                  </>
               )}
            </button>
         </div>
      </div>
    </div>
  );
};


// --- Main Application ---

export default function ScraperBuilder() {
  const [view, setView] = useState('builder'); // 'builder', 'plans', 'jobs', 'ai-wizard'
  const [plan, setPlan] = useState(INITIAL_PLAN);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  
  // Storage State
  const [savedPlans, setSavedPlans] = useState(MOCK_SAVED_PLANS);
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [currentPlanId, setCurrentPlanId] = useState(null); // Track if we are editing an existing plan
  const [lastSaved, setLastSaved] = useState(null); // Feedback for save

  // Execution & UI State
  const [showExecution, setShowExecution] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [results, setResults] = useState([]);
  const [isPicking, setIsPicking] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);

  const selectedBlock = selectedBlockId ? findBlock(plan.pipeline, selectedBlockId) : null;
  const pickerRef = useRef(new SelectorEngine());

  // --- Job Queue Simulation Worker ---
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(currentJobs => {
        const queuedJob = currentJobs.find(j => j.status === 'queued');
        if (queuedJob) {
          // Start the job
          return currentJobs.map(j => j.id === queuedJob.id ? { ...j, status: 'running' } : j);
        }
        
        const runningJob = currentJobs.find(j => j.status === 'running');
        if (runningJob) {
          // Finish the job (simulate)
          if (Math.random() > 0.3) { // 30% chance to keep running next tick
             return currentJobs.map(j => j.id === runningJob.id ? { 
                 ...j, 
                 status: 'completed', 
                 duration: `${Math.floor(Math.random() * 60) + 10}s`, 
                 items: Math.floor(Math.random() * 500) 
             } : j);
          }
        }
        return currentJobs;
      });
    }, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // --- Handlers ---

  const handleSavePlan = () => {
    const now = new Date().toISOString();
    const planName = plan.meta?.name || 'Untitled Plan';
    
    if (currentPlanId) {
        // Update existing
        setSavedPlans(prev => prev.map(p => 
            p.id === currentPlanId 
            ? { ...p, name: planName, updatedAt: now, plan: JSON.parse(JSON.stringify(plan)) }
            : p
        ));
    } else {
        // Create new
        const newId = `plan_${Date.now()}`;
        const newSaved = {
            id: newId,
            name: planName,
            updatedAt: now,
            plan: JSON.parse(JSON.stringify(plan))
        };
        setSavedPlans(prev => [newSaved, ...prev]);
        setCurrentPlanId(newId);
    }
    setLastSaved(new Date());
    setTimeout(() => setLastSaved(null), 2000);
  };

  const handleLoadPlan = (wrapperOrNull) => {
    if (!wrapperOrNull) {
        setPlan(JSON.parse(JSON.stringify(INITIAL_PLAN)));
        setCurrentPlanId(null);
    } else {
        setPlan(JSON.parse(JSON.stringify(wrapperOrNull.plan)));
        setCurrentPlanId(wrapperOrNull.id);
    }
    setView('builder');
    setIsPropertiesOpen(false); // Clean slate
  };

  const handleDeletePlan = (id) => {
    if (confirm("Are you sure?")) setSavedPlans(savedPlans.filter(p => p.id !== id));
  };

  const handleQueueJob = (targetPlan) => {
    const newJob = {
      id: `job_${Date.now()}`,
      planName: targetPlan.name || targetPlan.meta?.name,
      status: 'queued',
      submittedAt: 'Just now',
      duration: null,
      items: null
    };
    setJobs([newJob, ...jobs]);
    setView('jobs');
  };
  
  const handleAiPlanCreated = (newPlan) => {
      setPlan(newPlan);
      setView('builder');
      setIsPropertiesOpen(false);
      setCurrentPlanId(null); // Treated as a new unsaved plan
  };

  // --- Builder Block Actions (Same as before) ---
  const handleAddBlock = (typeKey, parentId = null) => {
    const typeDef = BLOCK_TYPES[typeKey];
    const newId = `${typeDef.type}_${Date.now()}`;
    const newBlock = { id: newId, type: typeDef.type, ...(typeDef.type === 'navigate' && { url: 'https://' }), ...(typeDef.type === 'click' && { selector: '' }), ...(typeDef.type === 'loop_elements' && { selector: '', children: [] }), ...(typeDef.type === 'loop_pagination' && { config: { nextButtonSelector: '' }, children: [] }), ...(typeDef.type === 'extract_scope' && { fields: [] }) };
    const newPipeline = addBlockToTree(plan.pipeline, parentId, newBlock);
    setPlan({ ...plan, pipeline: newPipeline }); setSelectedBlockId(newId); setIsPropertiesOpen(true); if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };
  const handleUpdateBlock = (id, updates) => { const newPipeline = updateBlockInTree(plan.pipeline, id, updates); setPlan({ ...plan, pipeline: newPipeline }); };
  const handleDeleteBlock = (id) => { const newPipeline = deleteBlockFromTree(plan.pipeline, id); setPlan({ ...plan, pipeline: newPipeline }); if (selectedBlockId === id) setSelectedBlockId(null); };
  const handleBlockSelect = (e, blockId) => { e.stopPropagation(); setSelectedBlockId(blockId); setIsPropertiesOpen(true); };
  
  // --- Picker & Simulation Logic (Same as before) ---
  const startPicking = (callback, scoped = false) => {
    setIsPicking(true); setIsPropertiesOpen(false); setIsSidebarOpen(false);
    const scopeEl = scoped ? document.body : null; 
    pickerRef.current.start((selector) => { callback(selector); setIsPicking(false); setIsPropertiesOpen(true); }, scopeEl);
  };
  const addLog = (message, type = 'info') => { setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString().split(' ')[0], message, type }]); };
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const runSimulation = async () => {
    if (isSimulating) return;
    setShowExecution(true); setIsSimulating(true); setLogs([]); setResults([]); setIsPropertiesOpen(false); setIsSidebarOpen(false);
    addLog("Initializing execution environment...", "system"); await wait(800);
    try { addLog(`Loaded plan: ${plan.meta?.name} (v${plan.meta?.version})`); for (const block of (plan.pipeline || [])) await executeBlock(block, { depth: 0, iteration: null }); addLog("Execution finished successfully.", "success"); } catch (error) { addLog(`Execution failed: ${error.message}`, "error"); } 
    finally { setIsSimulating(false); }
  };
  const executeBlock = async (block, ctx) => {
    const indent = "  ".repeat(ctx.depth);
    switch (block.type) {
      case 'navigate': addLog(`${indent}🌐 Navigating to: ${block.url}`); await wait(1000); addLog(`${indent}✅ Page loaded (200 OK)`); break;
      case 'click': addLog(`${indent}🖱️ Clicking element: ${block.selector}`); await wait(500); if (block.navigationBehavior === 'new_tab') addLog(`${indent}📑 New tab opened, switching context...`); break;
      case 'input': addLog(`${indent}⌨️ Typing "${block.value}" into ${block.selector}`); await wait(400); break;
      case 'loop_elements': const mockCount = Math.floor(Math.random() * 3) + 2; addLog(`${indent}🔄 Found ${mockCount} elements matching "${block.selector}"`); for (let i = 0; i < mockCount; i++) { addLog(`${indent}  ▶ Iteration ${i + 1}/${mockCount}`); await wait(300); if (block.children) for (const child of block.children) await executeBlock(child, { depth: ctx.depth + 1, iteration: i + 1 }); } break;
      case 'loop_pagination': const maxPages = block.config?.maxPages || 3; addLog(`${indent}📄 Starting pagination (Max: ${maxPages})`); for (let p = 1; p <= 2; p++) { addLog(`${indent}  ▶ Page ${p}`); if (block.children) for (const child of block.children) await executeBlock(child, { depth: ctx.depth + 1, iteration: p }); if (p < 2) { addLog(`${indent}  ➡️ Clicking Next Page button: ${block.config?.nextButtonSelector}`); await wait(1000); } } addLog(`${indent}⏹️ Pagination stopped (Simulated limit)`); break;
      case 'extract_scope': addLog(`${indent}📥 Extracting data...`); await wait(200); const mockData = {}; (block.fields || []).forEach(f => { let val = `Sample ${f.key}`; if (f.key.includes('price')) val = `$${(Math.random() * 100).toFixed(2)}`; if (f.key.includes('title')) val = `Product Item #${ctx.iteration || Math.floor(Math.random() * 100)}`; mockData[f.key] = val; }); setResults(prev => [...prev, mockData]); addLog(`${indent}✅ Extracted: ${JSON.stringify(mockData)}`, "success"); break;
      default: addLog(`${indent}❓ Unknown block type: ${block.type}`);
    }
  };

  // --- RENDERERS ---
  const BlockNode = ({ block, depth = 0 }) => {
    const typeDef = Object.values(BLOCK_TYPES).find(t => t.type === block.type) || BLOCK_TYPES.CLICK; 
    const Icon = typeDef.icon; 
    const isSelected = selectedBlockId === block.id;
    
    // Connector styles
    // The row height is roughly 40px (p-3 + h-4). Center is 20px. 
    // top-5 is 20px (1.25rem).
    
    return (
      <div className={`relative flex flex-col ${depth > 0 ? 'ml-6' : ''}`}>
        {depth > 0 && <div className="absolute -left-6 top-5 w-6 h-px bg-slate-300" />} 
        {depth > 0 && <div className="absolute -left-6 -top-2 bottom-0 w-px bg-slate-300" />}
        
        <div 
          onClick={(e) => handleBlockSelect(e, block.id)}
          className={`
            group flex items-center p-3 mb-2 rounded-lg border cursor-pointer transition-all relative z-10
            ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'}
          `}
        >
          <div className={`p-2 rounded-md mr-3 ${typeDef.color}`}><Icon className="w-4 h-4" /></div>
          <div className="flex-1 min-w-0"> 
            <div className="flex items-center justify-between"> 
                <span className="font-medium text-slate-800 text-sm">{typeDef.label}</span> 
                <span className="text-[10px] text-slate-400 font-mono ml-2 truncate opacity-50">{block.id.split('_').pop()}</span> 
            </div> 
            <div className="text-xs text-slate-500 truncate mt-0.5 opacity-80"> 
                {block.url && <span className="text-blue-600">{block.url}</span>} 
                {block.selector && <span className="font-mono bg-slate-100 px-1 rounded text-[10px]">{block.selector}</span>} 
                {block.fields && <span>{block.fields.length} fields</span>} 
            </div> 
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }} className="ml-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 className="w-4 h-4" /></button>
        </div>

        {typeDef.hasChildren && (
          <div className="pl-0 flex flex-col relative"> 
             {/* Vertical line extension for children */}
             <div className="absolute left-6 top-0 bottom-4 w-px bg-slate-200 -z-10"></div>
             
             <div className="pl-0">
                {(block.children || []).map(child => <BlockNode key={child.id} block={child} depth={depth + 1} />)}
             </div> 
             
             {/* Add Button */}
             <div className="ml-6 mt-1 mb-3 relative">
                {/* Connector for the add button */}
                <div className="absolute -left-6 top-3 w-6 h-px bg-slate-200"></div>
                <div className="absolute -left-6 -top-2 bottom-1/2 w-px bg-slate-200"></div>
                
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex justify-center hover:border-blue-400 hover:bg-slate-50 transition-colors bg-slate-50/50"> 
                    <div className="flex gap-2 items-center"> 
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mr-2">Nest:</span> 
                        {Object.entries(BLOCK_TYPES).map(([key, def]) => ( 
                            <button 
                                key={key} 
                                onClick={() => handleAddBlock(key, block.id)} 
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200 transition-all text-slate-500 hover:text-blue-600" 
                                title={`Add ${def.label}`}
                            > 
                                <def.icon className="w-3.5 h-3.5" /> 
                            </button> 
                        ))} 
                    </div> 
                </div> 
             </div>
          </div>
        )}
      </div>
    );
  };

  const PropertiesPanel = () => {
    if (!selectedBlock) return <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center"> <div className="flex justify-between w-full lg:hidden mb-4"> <h3 className="font-bold text-slate-700">Properties</h3> <button onClick={() => setIsPropertiesOpen(false)}><X className="w-5 h-5" /></button> </div> <Settings className="w-12 h-12 mb-4 opacity-20" /> <p className="text-sm font-medium">Select a block to configure properties</p> </div>;
    const typeDef = Object.values(BLOCK_TYPES).find(t => t.type === selectedBlock.type);
    return (
      <div className="flex flex-col h-full">
         <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100"> <h3 className="font-bold text-slate-800">Edit Block</h3> <button onClick={() => setIsPropertiesOpen(false)} className="text-slate-500"><X className="w-5 h-5" /></button> </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4"> <div className="flex items-center space-x-3"> <div className={`p-2 rounded-md ${typeDef?.color}`}>{typeDef?.icon && <typeDef.icon className="w-5 h-5" />}</div> <div><h3 className="font-semibold text-slate-800">{typeDef?.label}</h3><p className="text-xs text-slate-500">ID: {selectedBlock.id}</p></div> </div> </div>
          <div className="space-y-4">
            {selectedBlock.type === 'navigate' && <InputField label="Target URL" value={selectedBlock.url} onChange={(v) => handleUpdateBlock(selectedBlock.id, { url: v })} placeholder="https://example.com" />}
            {(selectedBlock.type === 'click' || selectedBlock.type === 'loop_elements' || selectedBlock.type === 'input') && <InputField label="CSS Selector" value={selectedBlock.selector} onChange={(v) => handleUpdateBlock(selectedBlock.id, { selector: v })} placeholder=".class-name" onPick={() => startPicking((sel) => handleUpdateBlock(selectedBlock.id, { selector: sel }), false)} />}
            {selectedBlock.type === 'input' && <InputField label="Input Value" value={selectedBlock.value} onChange={(v) => handleUpdateBlock(selectedBlock.id, { value: v })} placeholder="Text to type..." />}
            {selectedBlock.type === 'loop_pagination' && <div className="space-y-4"> <InputField label="Next Button Selector" value={selectedBlock.config?.nextButtonSelector} onChange={(v) => handleUpdateBlock(selectedBlock.id, { config: { ...selectedBlock.config, nextButtonSelector: v } })} placeholder="a.next-page" onPick={() => startPicking((sel) => handleUpdateBlock(selectedBlock.id, { config: { ...selectedBlock.config, nextButtonSelector: sel } }))} /> <InputField label="Max Pages" type="number" value={selectedBlock.config?.maxPages} onChange={(v) => handleUpdateBlock(selectedBlock.id, { config: { ...selectedBlock.config, maxPages: parseInt(v) } })} placeholder="5" /> </div>}
            {selectedBlock.type === 'extract_scope' && <div className="space-y-3"> <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Extraction Fields</label> <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-200"> {(selectedBlock.fields || []).map((field, idx) => ( <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200 shadow-sm"> <div className="flex-1 space-y-2"> <input className="w-full text-xs p-1 border rounded" placeholder="Field Name" value={field.key} onChange={(e) => { const newFields = [...selectedBlock.fields]; newFields[idx].key = e.target.value; handleUpdateBlock(selectedBlock.id, { fields: newFields }); }} /> <div className="flex gap-1"> <div className="flex-1 flex group"> <input className="w-full text-xs p-1 border rounded-l font-mono bg-slate-50" placeholder="Selector" value={field.selector} onChange={(e) => { const newFields = [...selectedBlock.fields]; newFields[idx].selector = e.target.value; handleUpdateBlock(selectedBlock.id, { fields: newFields }); }} /> <button onClick={() => startPicking((sel) => { const newFields = [...selectedBlock.fields]; newFields[idx].selector = sel; handleUpdateBlock(selectedBlock.id, { fields: newFields }); }, true)} className="px-2 bg-amber-50 border border-amber-200 border-l-0 rounded-r hover:bg-amber-100 text-amber-600 relative" title="Pick (Scoped)"> <Scan className="w-3 h-3" /> </button> </div> <select className="w-1/3 text-xs p-1 border rounded bg-slate-50" value={field.attribute} onChange={(e) => { const newFields = [...selectedBlock.fields]; newFields[idx].attribute = e.target.value; handleUpdateBlock(selectedBlock.id, { fields: newFields }); }}> <option value="text">Text</option><option value="href">Href</option><option value="src">Src</option><option value="value">Value</option> </select> </div> </div> <button onClick={() => { const newFields = selectedBlock.fields.filter((_, i) => i !== idx); handleUpdateBlock(selectedBlock.id, { fields: newFields }); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button> </div> ))} <button onClick={() => { const newFields = [...(selectedBlock.fields || []), { key: '', selector: '', attribute: 'text' }]; handleUpdateBlock(selectedBlock.id, { fields: newFields }); }} className="w-full py-1 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded dashed border border-blue-200">+ Add Field</button> </div> </div>}
            {selectedBlock.type === 'click' && <div className="pt-4 border-t border-slate-100"><label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={selectedBlock.navigationBehavior === 'new_tab'} onChange={(e) => handleUpdateBlock(selectedBlock.id, { navigationBehavior: e.target.checked ? 'new_tab' : 'default' })} /><span>Opens in new tab</span></label></div>}
          </div>
        </div>
        <div className="h-1/3 min-h-[150px] border-t border-slate-200 flex flex-col bg-slate-50"> <div className="px-4 py-2 border-b border-slate-200 bg-white flex justify-between items-center"> <span className="text-xs font-bold text-slate-500 uppercase">JSON Output</span> <button onClick={() => navigator.clipboard.writeText(JSON.stringify(plan, null, 2))} className="text-xs text-blue-600 hover:underline">Copy</button> </div> <div className="flex-1 overflow-auto p-4"><pre className="text-[10px] leading-relaxed font-mono text-slate-600 whitespace-pre-wrap">{JSON.stringify(plan, null, 2)}</pre></div> </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden">
      {/* 1. Left Navigation Rail (New) */}
      <NavRail view={view} setView={setView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-30 shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-1 text-slate-600 hover:bg-slate-100 rounded"> <Menu className="w-6 h-6" /> </button>
            <h1 className="text-lg font-bold text-slate-800 truncate hidden sm:block">
               {view === 'builder' ? 'Plan Builder' : view === 'plans' ? 'Plan Library' : view === 'jobs' ? 'Job Queue' : 'AI Wizard'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
             {view === 'builder' && (
                 <>
                   <Button variant="ghost" size="sm" icon={Save} onClick={handleSavePlan}>Save</Button>
                   {lastSaved && (
                      <span className="hidden sm:flex items-center text-xs text-green-600 font-medium animate-in fade-in slide-in-from-right-4 duration-300">
                          <Check className="w-3 h-3 mr-1" /> Saved
                      </span>
                   )}
                   <Button variant="primary" size="sm" icon={isSimulating ? Loader2 : Play} onClick={runSimulation} disabled={isSimulating} className={isSimulating ? "animate-pulse" : ""}>{isSimulating ? "Running..." : "Dry Run"}</Button>
                   <button onClick={() => setIsPropertiesOpen(!isPropertiesOpen)} className={`lg:hidden p-2 rounded ml-1 ${isPropertiesOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}><MoreHorizontal className="w-6 h-6" /></button>
                 </>
             )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* VIEW: BUILDER */}
          {view === 'builder' && (
            <>
              {(isSidebarOpen || isPropertiesOpen) && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" onClick={() => { setIsSidebarOpen(false); setIsPropertiesOpen(false); }}></div>}

              {/* Toolbox Sidebar */}
              <div className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} top-[60px] lg:top-0 h-[calc(100%-60px)] lg:h-auto`}>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden"> <h2 className="font-bold text-slate-700">Toolbox</h2> <button onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5 text-slate-500" /></button> </div>
                <div className="p-4 border-b border-slate-100"> <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 hidden lg:block">Toolbox</h2> <div className="grid grid-cols-2 gap-2"> {Object.entries(BLOCK_TYPES).map(([key, def]) => ( <button key={key} onClick={() => handleAddBlock(key)} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all text-center group"> <def.icon className={`w-6 h-6 mb-2 ${def.color.replace('bg-', 'text-').split(' ')[1]}`} /> <span className="text-xs font-medium text-slate-600 group-hover:text-blue-700">{def.label}</span> </button> ))} </div> </div>
                <div className="flex-1 p-4 overflow-y-auto"> <div className="text-xs text-slate-400 mb-2">Variables</div> <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs text-slate-600">baseUrl: "{plan.variables?.baseUrl}"</div> </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 bg-slate-50/50 flex flex-col overflow-hidden relative w-full">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                  <div className="max-w-3xl mx-auto pb-20">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-400 uppercase">Plan Name</label>
                        <input className="w-full mt-1 bg-transparent text-2xl font-bold text-slate-700 focus:outline-none border-b border-transparent focus:border-blue-500 transition-colors placeholder-slate-300" placeholder="Untitled Plan" value={plan.meta?.name || ''} onChange={(e) => setPlan({...plan, meta: {...plan.meta, name: e.target.value}})} />
                    </div>
                    
                    {/* Render Blocks */}
                    {(plan.pipeline || []).map(block => <BlockNode key={block.id} block={block} />)}
                    
                    {/* Empty State */}
                    {(plan.pipeline || []).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-white/50">
                            <div className="bg-blue-50 p-4 rounded-full mb-4">
                                <Layout className="w-12 h-12 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Start Building Your Scraper</h3>
                            <p className="text-slate-500 mb-6 text-center max-w-sm">Select blocks from the toolbox on the left to create your scraping pipeline.</p>
                            <button 
                                onClick={() => setIsSidebarOpen(true)} 
                                className="lg:hidden flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors"
                            >
                                Open Toolbox <ArrowRight className="w-4 h-4 ml-2" />
                            </button>
                            <div className="hidden lg:flex gap-2 text-sm text-slate-400">
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded">Navigate</span>
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded">Click</span>
                                <span className="px-2 py-1 bg-white border border-slate-200 rounded">Loop</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Add Next Step Button (Visible when pipeline has items) */}
                    {(plan.pipeline || []).length > 0 && (
                        <div className="mt-2 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="h-6 w-px bg-slate-300"></div>
                            <button 
                                onClick={() => setIsSidebarOpen(true)} 
                                className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-dashed border-slate-300 text-slate-600 rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="p-1 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <Plus className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium">Add Next Step</span>
                            </button>
                            <p className="mt-2 text-xs text-slate-400 lg:hidden">Tap to open toolbox</p>
                        </div>
                    )}

                    <div className="mt-12 flex justify-center"><div className="h-px bg-slate-200 w-full absolute left-0 right-0 z-0"></div></div>
                  </div>
                </div>
              </div>

              {/* Properties Sidebar */}
              <div className={`fixed lg:relative inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${isPropertiesOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} top-[60px] lg:top-0 h-[calc(100%-60px)] lg:h-auto`}>
                <div className="flex-1 overflow-y-auto"><PropertiesPanel /></div>
              </div>
            </>
          )}

          {/* VIEW: SAVED PLANS */}
          {view === 'plans' && <PlansView plans={savedPlans} onLoad={handleLoadPlan} onDelete={handleDeletePlan} onRun={handleQueueJob} />}

          {/* VIEW: JOB QUEUE */}
          {view === 'jobs' && <JobsView jobs={jobs} />}

          {/* VIEW: AI WIZARD */}
          {view === 'ai-wizard' && <AiWizardView onCreatePlan={handleAiPlanCreated} />}

        </div>
        
        {/* Overlays */}
        {showExecution && <ExecutionPanel logs={logs} results={results} onClose={() => setShowExecution(false)} isRunning={isSimulating} />}
        {isPicking && <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-[1000000] flex items-center animate-bounce"> <MousePointer className="w-4 h-4 mr-2" /> <span className="text-sm font-bold">Picking Mode</span> <span className="ml-2 text-xs opacity-80">(ESC to cancel)</span> </div>}
      </div>
    </div>
  );
}