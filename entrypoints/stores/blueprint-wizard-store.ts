import { makeAutoObservable, runInAction } from 'mobx';
import { Blueprint } from '../models/blueprint';
import { NavigateBlock } from '../models/navigate-block';
import { LoopElementsBlock } from '../models/loop-elements-block';
import { LoopPaginationBlock } from '../models/loop-pagination-block';
import { ExtractScopeBlock } from '../models/extract-scope-block';
import { WaitBlock } from '../models/wait-block';
import { ClickBlock } from '../models/click-block';
import { Selector, SelectorType } from '../models/selector';
import { AttributeType } from '../models/enums';
import { sendToContentScript, onMessageFromContentScript } from '@/core/messaging';

export type WizardMode = 'single' | 'paginated' | 'detail';
export type WizardStep = 'url' | 'mode' | 'container' | 'fields' | 'pagination' | 'detail_link' | 'preview' | 'create';
export type PaginationType = 'button' | 'scroll';
export type FieldType = 'text' | 'image' | 'link' | 'html';
export type FieldScope = 'list' | 'detail' | 'both';

export interface WizardField {
  id: string;
  name: string;
  selector: string;
  type: FieldType;
  scope: FieldScope;
  sampleData?: string;
}

export interface WizardState {
  step: WizardStep;
  url: string;
  mode: WizardMode;
  blueprintName?: string;

  container: {
    selector: string;
    xpath: string;
    matchCount?: number;
    elementInfo?: {
      tag: string;
      id?: string;
      classes?: string;
      text?: string;
      attributes: Record<string, string>;
    };
  };

  fields: WizardField[];

  pagination?: {
    enabled: boolean;
    type: PaginationType;
    nextButtonSelector?: string;
    scrollAmount?: number;
    delayBetweenPages: number;
    maxPages: number;
  };

  detailLink?: {
    selector: string;
  };

  preview: {
    data: Record<string, string>[];
    loading: boolean;
    error?: string;
  };
}

const STORAGE_KEY = 'octograb_wizard_draft';

function generateId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function mapFieldTypeToAttribute(type: FieldType): AttributeType {
  switch (type) {
    case 'image': return AttributeType.Src;
    case 'link': return AttributeType.Href;
    case 'html': return AttributeType.InnerHTML;
    default: return AttributeType.Text;
  }
}

function makeUniqueFieldName(existingNames: Set<string>, base: string): string {
  if (!existingNames.has(base)) return base;
  let i = 2;
  while (existingNames.has(`${base}_${i}`)) {
    i++;
  }
  return `${base}_${i}`;
}

class BlueprintWizardStore {
  state: WizardState;

  isPicking = false;
  pickingFor: 'container' | 'field' | 'pagination' | 'detail_link' | null = null;
  pickingFieldScope: FieldScope | null = null;
  isAnalyzing = false;
  isGenerating = false;

  private messageCleanup: (() => void) | null = null;

  constructor() {
    makeAutoObservable(this);
    const draft = this.loadDraft();
    this.state = draft ? this.mergeDraftWithDefaults(draft) : this.getDefaultState();
    this.initMessageListener();
  }

  private mergeDraftWithDefaults(draft: WizardState): WizardState {
    const defaults = this.getDefaultState();
    return {
      ...defaults,
      ...draft,
      container: {
        ...defaults.container,
        ...(draft.container || {}),
      },
      fields: draft.fields || [],
      pagination: draft.pagination ? {
        ...defaults.pagination!,
        ...draft.pagination,
      } : defaults.pagination,
      detailLink: draft.detailLink ? {
        ...defaults.detailLink!,
        ...draft.detailLink,
      } : defaults.detailLink,
      preview: {
        ...defaults.preview,
        ...(draft.preview || {}),
      },
    };
  }

  // ─── Default State ───────────────────────────────────────────────────────

  private getDefaultState(): WizardState {
    return {
      step: 'url',
      url: '',
      mode: 'single',
      blueprintName: '',
      container: { selector: '', xpath: '' },
      fields: [],
      pagination: {
        enabled: false,
        type: 'button',
        scrollAmount: 1000,
        delayBetweenPages: 1500,
        maxPages: 10,
      },
      preview: { data: [], loading: false },
    };
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private loadDraft(): WizardState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Basic validation
      if (!parsed.step || !parsed.url) return null;
      return parsed as WizardState;
    } catch {
      return null;
    }
  }

  persistDraft(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage full or private mode */
    }
  }

  clearDraft(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  hasRecoverableDraft(): boolean {
    return !!this.loadDraft();
  }

  recoverDraft(): void {
    const draft = this.loadDraft();
    if (draft) {
      this.state = draft;
    }
  }

  // ─── State Patch Helper ──────────────────────────────────────────────────
  // MobX only tracks top-level property assignments. Since `state` is a plain
  // object, we must replace it entirely on every nested change.

  private patchState(patch: Partial<WizardState>): void {
    this.state = { ...this.state, ...patch };
    this.persistDraft();
  }

  // ─── State Updates ───────────────────────────────────────────────────────

  setStep(step: WizardStep): void {
    this.patchState({ step });
  }

  setUrl(url: string): void {
    const updates: Partial<WizardState> = { url };
    if (!this.state.blueprintName) {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        updates.blueprintName = `Scraper — ${hostname}`;
      } catch {
        updates.blueprintName = 'Scraper';
      }
    }
    this.patchState(updates);
  }

  setBlueprintName(name: string): void {
    this.patchState({ blueprintName: name });
  }

  setMode(mode: WizardMode): void {
    const updates: Partial<WizardState> = { mode };
    if (mode !== 'paginated') {
      updates.pagination = { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    }
    if (mode !== 'detail') {
      updates.detailLink = undefined;
    }
    this.patchState(updates);
  }

  setContainer(selector: string, xpath: string, elementInfo?: WizardState['container']['elementInfo'], matchCount?: number): void {
    this.patchState({ container: { selector, xpath, elementInfo, matchCount: matchCount !== undefined ? matchCount : this.state.container.matchCount } });
  }

  setPaginationEnabled(enabled: boolean): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, enabled } });
  }

  setPaginationType(type: PaginationType): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, type } });
  }

  setPaginationNextButton(selector: string): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, nextButtonSelector: selector } });
  }

  setPaginationScrollAmount(scrollAmount: number): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, scrollAmount } });
  }

  setPaginationMaxPages(maxPages: number): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, maxPages } });
  }

  setPaginationDelay(delayBetweenPages: number): void {
    const current = this.state.pagination ?? { enabled: false, type: 'button', scrollAmount: 1000, delayBetweenPages: 1500, maxPages: 10 };
    this.patchState({ pagination: { ...current, delayBetweenPages } });
  }

  setDetailLink(selector: string): void {
    this.patchState({ detailLink: { selector } });
  }

  // ─── Field Management ────────────────────────────────────────────────────

  addField(name: string, selector: string, type: FieldType = 'text', scope: FieldScope = 'list', sampleData?: string): void {
    const existingNames = new Set(this.state.fields.map(f => f.name));
    const uniqueName = makeUniqueFieldName(existingNames, name);
    const field: WizardField = {
      id: generateId(),
      name: uniqueName,
      selector,
      type,
      scope,
      sampleData,
    };
    this.patchState({ fields: [...this.state.fields, field] });
  }

  removeField(id: string): void {
    this.patchState({ fields: this.state.fields.filter(f => f.id !== id) });
  }

  updateField(id: string, updates: Partial<Omit<WizardField, 'id'>>): void {
    const fields = this.state.fields.map(f =>
      f.id === id ? { ...f, ...updates } : f
    );
    this.patchState({ fields });
  }

  setFields(fields: WizardField[]): void {
    this.patchState({ fields });
  }

  // ─── Message Listener ────────────────────────────────────────────────────

  private initMessageListener(): void {
    this.cleanup();
    this.messageCleanup = onMessageFromContentScript((message) => {
      console.log('[WizardStore] Message received:', message.type, 'pickingFor:', this.pickingFor, 'isPicking:', this.isPicking);
      if (message.type === 'ELEMENT_SELECTED') {
        console.log('[WizardStore] ELEMENT_SELECTED handler, pickingFor:', this.pickingFor);
        if (!this.pickingFor) return;
        runInAction(() => {
          const { selector, xpath, elementInfo } = message.data || {};
          console.log('[WizardStore] Processing ELEMENT_SELECTED, selector:', selector);

          switch (this.pickingFor) {
            case 'container':
              this.setContainer(selector, xpath, elementInfo);
              this.analyzePageStructure();
              break;
            case 'field':
              this.addField(
                `field_${this.state.fields.length + 1}`,
                selector,
                'text',
                this.pickingFieldScope || 'list',
                elementInfo?.text?.substring(0, 100),
              );
              break;
            case 'pagination':
              this.setPaginationNextButton(selector);
              break;
            case 'detail_link':
              this.setDetailLink(selector);
              break;
          }
          console.log('[WizardStore] After ELEMENT_SELECTED processing, isPicking:', this.isPicking, 'pickingFor:', this.pickingFor);
        });
      } else if (message.type === 'PICKING_DONE') {
        console.log('[WizardStore] PICKING_DONE handler');
        runInAction(() => {
          this.isPicking = false;
          this.pickingFor = null;
          this.pickingFieldScope = null;
          console.log('[WizardStore] After PICKING_DONE, isPicking:', this.isPicking, 'pickingFor:', this.pickingFor);
        });
        this.cleanup();
      }
    });
  }

  cleanup(): void {
    if (this.messageCleanup) {
      this.messageCleanup();
      this.messageCleanup = null;
    }
  }

  // ─── Element Picker ──────────────────────────────────────────────────────

  async startPicking(
    forType: 'container' | 'field' | 'pagination' | 'detail_link',
    fieldScope?: FieldScope
  ): Promise<void> {
    this.isPicking = true;
    this.pickingFor = forType;
    this.pickingFieldScope = fieldScope || null;

    this.initMessageListener();

    let parentSelector: string | undefined = undefined;
    if (forType === 'field' && fieldScope === 'list' && this.state.container.selector) {
      parentSelector = this.state.container.selector;
    }

    const response = await sendToContentScript({
      type: 'START_PICKING',
      data: {
        mode: forType === 'container' ? 'list' : 'single',
        parentSelector,
      },
    });

    if (!response.success) {
      runInAction(() => {
        this.isPicking = false;
        this.pickingFor = null;
        this.pickingFieldScope = null;
      });
      this.cleanup();
      throw new Error(response.error || 'Failed to start element picker');
    }
  }

  async stopPicking(): Promise<void> {
    if (!this.isPicking) return;

    const response = await sendToContentScript({ type: 'STOP_PICKING' });
    if (!response.success) {
      runInAction(() => {
        this.isPicking = false;
        this.pickingFor = null;
        this.pickingFieldScope = null;
      });
      this.cleanup();
    }
  }

  // ─── Page Analysis ───────────────────────────────────────────────────────

  async analyzePageStructure(): Promise<void> {
    if (!this.state.container.selector) return;

    this.isAnalyzing = true;
    try {
      const response = await sendToContentScript({
        type: 'ANALYZE_PAGE_STRUCTURE',
        data: { wrapperSelector: this.state.container.selector, sampleSize: 5 },
      });

      if (response.success && response.data?.fields) {
        const existingFields = this.state.fields;
        const mergedFields: WizardField[] = [];

        response.data.fields.forEach((f: any, i: number) => {
          const existing = existingFields.find(ef => ef.selector === f.selector);
          if (existing) {
            mergedFields.push(existing);
          } else {
            const baseName = f.suggestedName || `field_${i + 1}`;
            const uniqueName = makeUniqueFieldName(new Set(mergedFields.map(mf => mf.name)), baseName);
            mergedFields.push({
              id: `auto_${i}_${Date.now()}`,
              name: uniqueName,
              selector: f.selector,
              type: f.type || 'text',
              scope: 'list',
              sampleData: f.sampleValue,
            });
          }
        });

        // Retain manual or non-overlapping fields
        existingFields.forEach(ef => {
          const isSelectorDetected = response.data.fields.some((f: any) => f.selector === ef.selector);
          const isAlreadyMerged = mergedFields.some(mf => mf.id === ef.id);
          if (!isSelectorDetected && !isAlreadyMerged) {
            mergedFields.push(ef);
          }
        });

        runInAction(() => {
          this.patchState({
            container: {
              ...this.state.container,
              matchCount: response.data.totalMatches
            },
            fields: mergedFields
          });
        });
      }
    } finally {
      runInAction(() => {
        this.isAnalyzing = false;
      });
    }
  }

  // ─── Preview ─────────────────────────────────────────────────────────────

  async loadPreview(): Promise<void> {
    const previewFields = this.state.fields.filter(
      f => f.scope === 'list' || f.scope === 'both',
    );
    if (!this.state.container.selector || previewFields.length === 0) return;

    this.patchState({ preview: { ...this.state.preview, loading: true, error: undefined } });

    try {
      const response = await sendToContentScript({
        type: 'EXTRACT_PREVIEW',
        data: {
          wrapperSelector: this.state.container.selector,
          fields: previewFields.map(f => ({
            name: f.name,
            selector: f.selector,
            type: f.type,
          })),
          limit: 20,
        },
      });

      if (response.success && response.data?.items) {
        runInAction(() => {
          this.patchState({ preview: { ...this.state.preview, data: response.data.items, loading: false } });
        });
      } else {
        runInAction(() => {
          this.patchState({ preview: { ...this.state.preview, error: response.error || 'Preview failed', loading: false } });
        });
      }
    } catch (e: any) {
      runInAction(() => {
        this.patchState({ preview: { ...this.state.preview, error: e.message, loading: false } });
      });
    }
  }

  // ─── Blueprint Generation ────────────────────────────────────────────────

  generateBlueprint(): Blueprint {
    this.isGenerating = true;
    try {
      const hostname = this.getHostname();
      const name = this.state.blueprintName?.trim() || `Scraper — ${hostname}`;
      const blueprint = new Blueprint(
        name,
        `Extract data from ${hostname}`,
      );

      // Navigate block
      blueprint.addBlock(new NavigateBlock('Navigate to page', {
        url: this.state.url,
      }));

      // Wait for page load
      const waitBlock = new WaitBlock('Wait for page load', {
        type: this.state.container.selector ? 'selector_visible' : 'timeout',
        timeout: this.state.container.selector ? 5000 : 2000,
        selector: this.state.container.selector ? {
          type: SelectorType.CSS,
          value: this.state.container.selector,
        } : undefined,
      });
      blueprint.addBlock(waitBlock);

      if (this.state.mode === 'paginated' && this.state.pagination?.enabled) {
        // Paginated list
        const paginationConfig: any = {
          maxPages: this.state.pagination.maxPages,
          delayBetweenPages: this.state.pagination.delayBetweenPages,
        };

        if (this.state.pagination.type === 'button') {
          paginationConfig.paginationType = 'button';
          paginationConfig.nextButtonSelector = {
            type: SelectorType.CSS,
            value: this.state.pagination.nextButtonSelector || '',
          };
          paginationConfig.onNoNextButton = 'stop';
        } else {
          paginationConfig.paginationType = 'scroll';
          paginationConfig.scrollTarget = 'window';
          paginationConfig.scrollStrategy = 'scroll_to_bottom';
          paginationConfig.scrollAmount = this.state.pagination.scrollAmount || 1000;
        }

        const paginationBlock = new LoopPaginationBlock('Loop through pages', paginationConfig);
        const listLoop = this.createListLoopBlock();
        paginationBlock.addChild(listLoop);
        blueprint.addBlock(paginationBlock);
      } else {
        // Single page list
        const listLoop = this.createListLoopBlock();
        blueprint.addBlock(listLoop);
      }

      return blueprint;
    } finally {
      this.isGenerating = false;
    }
  }

  private createListLoopBlock(): LoopElementsBlock {
    const loopBlock = new LoopElementsBlock('Loop through items', {
      selector: {
        type: SelectorType.CSS,
        value: this.state.container.selector,
      },
    });

    // Listing fields extraction
    const listFields = this.state.fields.filter(f => f.scope === 'list');
    if (listFields.length > 0) {
      const extractBlock = new ExtractScopeBlock('Extract item data', {
        fields: listFields.map(field => ({
          key: field.name,
          selector: { type: SelectorType.CSS, value: field.selector },
          attribute: mapFieldTypeToAttribute(field.type),
        })),
      });
      loopBlock.addChild(extractBlock);
    }

    // Detail page click + extraction
    if (this.state.mode === 'detail' && this.state.detailLink?.selector) {
      const clickBlock = new ClickBlock('Open detail page', {
        selector: { type: SelectorType.CSS, value: this.state.detailLink.selector },
        openInNewTab: true,
      });

      const detailFields = this.state.fields.filter(f => f.scope === 'detail');
      if (detailFields.length > 0) {
        const detailExtract = new ExtractScopeBlock('Extract detail data', {
          fields: detailFields.map(field => ({
            key: field.name,
            selector: { type: SelectorType.CSS, value: field.selector },
            attribute: mapFieldTypeToAttribute(field.type),
          })),
        });
        clickBlock.addChild(detailExtract);
      }

      loopBlock.addChild(clickBlock);
    }

    return loopBlock;
  }

  private getHostname(): string {
    try {
      return new URL(this.state.url).hostname.replace(/^www\./, '');
    } catch {
      return 'site';
    }
  }

  // ─── Validation ──────────────────────────────────────────────────────────

  canProceed(): boolean {
    switch (this.state.step) {
      case 'url':
        return this.isValidUrl(this.state.url);
      case 'mode':
        return true;
      case 'container':
        return !!this.state.container.selector;
      case 'fields': {
        if (this.state.fields.length === 0) return false;
        if (this.hasDuplicateFieldNames()) return false;
        if (this.state.mode === 'detail') {
          const hasList = this.state.fields.some(f => f.scope === 'list');
          const hasDetail = this.state.fields.some(f => f.scope === 'detail');
          return hasList && hasDetail;
        }
        return true;
      }
      case 'pagination':
        if (this.state.mode !== 'paginated') return true;
        if (!this.state.pagination?.enabled) return true;
        if (this.state.pagination.type === 'button') {
          return !!this.state.pagination.nextButtonSelector;
        }
        return true;
      case 'detail_link':
        if (this.state.mode !== 'detail') return true;
        return !!this.state.detailLink?.selector;
      case 'preview':
        return true;
      case 'create':
        return true;
      default:
        return false;
    }
  }

  hasDuplicateFieldNames(): boolean {
    const seen = new Set<string>();
    for (const field of this.state.fields) {
      if (seen.has(field.name)) return true;
      seen.add(field.name);
    }
    return false;
  }

  getDuplicateFieldNames(): string[] {
    const counts = new Map<string, number>();
    for (const field of this.state.fields) {
      counts.set(field.name, (counts.get(field.name) || 0) + 1);
    }
    return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([name]) => name);
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ─── Step Navigation ─────────────────────────────────────────────────────

  getStepFlow(): WizardStep[] {
    const flow: WizardStep[] = ['url', 'mode', 'container', 'fields'];
    if (this.state.mode === 'paginated') {
      flow.push('pagination');
    }
    if (this.state.mode === 'detail') {
      flow.push('detail_link');
    }
    flow.push('preview', 'create');
    return flow;
  }

  getStepIndex(): number {
    return this.getStepFlow().indexOf(this.state.step);
  }

  getTotalSteps(): number {
    return this.getStepFlow().length;
  }

  nextStep(): void {
    const flow = this.getStepFlow();
    const idx = flow.indexOf(this.state.step);
    if (idx >= 0 && idx < flow.length - 1) {
      this.setStep(flow[idx + 1]);
    }
  }

  previousStep(): void {
    const flow = this.getStepFlow();
    const idx = flow.indexOf(this.state.step);
    if (idx > 0) {
      this.setStep(flow[idx - 1]);
    }
  }

  reset(): void {
    this.state = this.getDefaultState();
    this.clearDraft();
    this.isPicking = false;
    this.pickingFor = null;
    this.pickingFieldScope = null;
    this.isAnalyzing = false;
    this.isGenerating = false;
  }
}

const blueprintWizardStore = new BlueprintWizardStore();
export default blueprintWizardStore;

export function useBlueprintWizardStore(): BlueprintWizardStore {
  return blueprintWizardStore;
}
