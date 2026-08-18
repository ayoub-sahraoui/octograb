import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { useBlueprintWizardStore } from '@/entrypoints/stores/blueprint-wizard-store';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Trash2, Sparkles, Target,
  Loader2, Eye, Plus, ListChecks, Link as LinkIcon, MousePointer,
  ChevronDown, ChevronUp, FileText, Image as ImageIcon, ExternalLink,
  Globe, LayoutList, ScrollText, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState, useCallback } from 'react';
import type { WizardMode, WizardStep, WizardField, FieldType, FieldScope } from '@/entrypoints/stores/blueprint-wizard-store';

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStep, string> = {
  url: 'URL',
  mode: 'Mode',
  container: 'Container',
  fields: 'Fields',
  pagination: 'Pagination',
  detail_link: 'Detail Link',
  preview: 'Preview',
  create: 'Create',
};

function WizardStepIndicator({ currentStep, stepFlow }: { currentStep: WizardStep; stepFlow: WizardStep[] }) {
  const currentIndex = stepFlow.indexOf(currentStep);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
      {stepFlow.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isPast = idx < currentIndex;
        return (
          <div key={step} className="flex items-center gap-1 shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              isActive
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isPast
                  ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : 'bg-white border-gray-200 text-gray-400'
            }`}>
              <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                isActive
                  ? 'bg-emerald-500 text-white'
                  : isPast
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
              }`}>
                {isPast ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
              </span>
              {STEP_LABELS[step]}
            </div>
            {idx < stepFlow.length - 1 && (
              <div className={`w-4 h-px ${isPast ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Mode Cards ──────────────────────────────────────────────────────────────

const MODES: { id: WizardMode; title: string; description: string; example: string; icon: typeof ListChecks }[] = [
  {
    id: 'single',
    title: 'Single Page List',
    description: 'Extract data from a list on one page',
    example: 'Search results, product listings, blog posts',
    icon: ListChecks,
  },
  {
    id: 'paginated',
    title: 'Paginated List',
    description: 'Extract data that spans multiple pages',
    example: 'E-commerce catalogs, directory listings',
    icon: ScrollText,
  },
  {
    id: 'detail',
    title: 'List + Detail Pages',
    description: 'Extract list items and follow links for more data',
    example: 'Product cards → Product detail pages',
    icon: LinkIcon,
  },
];

// ─── Field Type Icon ─────────────────────────────────────────────────────────

function FieldTypeIcon({ type }: { type: FieldType }) {
  switch (type) {
    case 'image': return <ImageIcon className="w-3.5 h-3.5 text-purple-500" />;
    case 'link': return <ExternalLink className="w-3.5 h-3.5 text-blue-500" />;
    case 'html': return <FileText className="w-3.5 h-3.5 text-orange-500" />;
    default: return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function FieldScopeBadge({ scope }: { scope: FieldScope }) {
  const styles: Record<FieldScope, string> = {
    list: 'bg-blue-50 text-blue-700 border-blue-200',
    detail: 'bg-purple-50 text-purple-700 border-purple-200',
    both: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const labels: Record<FieldScope, string> = {
    list: 'List',
    detail: 'Detail',
    both: 'Both',
  };
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${styles[scope]}`}>
      {labels[scope]}
    </span>
  );
}

// ─── Main Wizard Component ───────────────────────────────────────────────────

export default observer(function BlueprintWizard() {
  const wizard = useBlueprintWizardStore();
  const builder = useBlueprintBuilderStore();
  const navigate = useNavigate();
  const [showRecover, setShowRecover] = useState(false);

  // Check for recoverable draft on mount
  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      const tabUrl = tabs[0]?.url;
      if (tabUrl) {
        if (!wizard.state.url) {
          wizard.setUrl(tabUrl);
        }

        // Only show recovery banner if the domains match
        if (wizard.hasRecoverableDraft()) {
          try {
            const draftDomain = new URL(wizard.state.url).hostname;
            const currentDomain = new URL(tabUrl).hostname;
            if (draftDomain === currentDomain && wizard.state.step !== 'url') {
              setShowRecover(true);
            }
          } catch {
            // URL parse failure, do nothing
          }
        }
      }
    });

    return () => wizard.cleanup();
  }, []);

  const handleNext = useCallback(() => {
    if (!wizard.canProceed()) {
      if (wizard.state.step === 'url') {
        toast.error('Please enter a valid HTTP/HTTPS URL');
        return;
      }
      if (wizard.state.step === 'container') {
        toast.error('Please select the list item container');
        return;
      }
      if (wizard.state.step === 'fields') {
        if (wizard.state.fields.length === 0) {
          toast.error('Please configure at least one field');
          return;
        }
        if (wizard.hasDuplicateFieldNames()) {
          const dupes = wizard.getDuplicateFieldNames();
          toast.error(`Duplicate field name${dupes.length > 1 ? 's' : ''}: ${dupes.join(', ')}`);
          return;
        }
        if (wizard.state.mode === 'detail') {
          const listCount = wizard.state.fields.filter(f => f.scope === 'list').length;
          const detailCount = wizard.state.fields.filter(f => f.scope === 'detail').length;
          if (listCount === 0) {
            toast.error('At least one field must be scoped to List page');
            return;
          } else if (detailCount === 0) {
            toast.error('At least one field must be scoped to Detail page');
            return;
          }
        }
      }
      if (wizard.state.step === 'pagination') {
        if (wizard.state.pagination?.enabled && wizard.state.pagination.type === 'button' && !wizard.state.pagination.nextButtonSelector) {
          toast.error('Please select the Next Page button or disable pagination');
          return;
        }
      }
      if (wizard.state.step === 'detail_link') {
        if (!wizard.state.detailLink?.selector) {
          toast.error('Please select the detail page link');
          return;
        }
      }
      toast.error('Please complete the required fields for this step');
      return;
    }
    // Auto-load preview when entering preview step
    if (wizard.state.step === 'fields' || wizard.state.step === 'detail_link' || wizard.state.step === 'pagination') {
      const nextFlow = wizard.getStepFlow();
      const nextIdx = nextFlow.indexOf(wizard.state.step) + 1;
      if (nextFlow[nextIdx] === 'preview') {
        wizard.loadPreview();
      }
    }
    wizard.nextStep();
  }, [wizard]);

  const handleCreate = useCallback(() => {
    try {
      const blueprint = wizard.generateBlueprint();
      builder.addBlueprintToList(blueprint);
      builder.selectBlueprint(blueprint);
      wizard.clearDraft();
      toast.success('Blueprint created successfully!');
      navigate('/blueprint-builder');
    } catch (error: any) {
      toast.error('Failed to create blueprint', { description: error.message });
    }
  }, [wizard, builder, navigate]);

  const stepFlow = wizard.getStepFlow();
  const currentIndex = wizard.getStepIndex();
  const progress = ((currentIndex + 1) / stepFlow.length) * 100;

  return (
    <div className="h-full flex-1 flex flex-col gap-3 p-4 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Blueprint Wizard
          </h1>
          <span className="text-xs text-gray-500">
            Step {currentIndex + 1} of {stepFlow.length}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
        <WizardStepIndicator currentStep={wizard.state.step} stepFlow={stepFlow} />
      </div>

      {/* Recovery Banner */}
      {showRecover && (
        <div className="shrink-0 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-800">
            You have an unfinished wizard session ({STEP_LABELS[wizard.state.step]} step).
          </p>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { wizard.reset(); setShowRecover(false); }}>
              Start New
            </Button>
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => setShowRecover(false)}>
              Resume
            </Button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <Card className="p-5">
          <StepContent />
        </Card>
      </div>

      {/* Navigation */}
      <div className="shrink-0 flex justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (wizard.state.step === 'url') {
              wizard.reset();
              navigate('/');
            } else {
              wizard.previousStep();
            }
          }}
        >
          {wizard.state.step === 'url' ? 'Cancel' : <><ArrowLeft className="w-4 h-4 mr-1" /> Back</>}
        </Button>
        <div className="flex gap-2">
          {wizard.state.step !== 'create' ? (
            <Button size="sm" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Create Blueprint
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Step Content Switcher ───────────────────────────────────────────────────

function StepContent() {
  const wizard = useBlueprintWizardStore();

  switch (wizard.state.step) {
    case 'url': return <UrlStep />;
    case 'mode': return <ModeStep />;
    case 'container': return <ContainerStep />;
    case 'fields': return <FieldsStep />;
    case 'pagination': return <PaginationStep />;
    case 'detail_link': return <DetailLinkStep />;
    case 'preview': return <PreviewStep />;
    case 'create': return <CreateStep />;
    default: return null;
  }
}

// ─── URL Step ────────────────────────────────────────────────────────────────

const UrlStep = observer(function UrlStep() {
  const wizard = useBlueprintWizardStore();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Target URL</h2>
        <p className="text-sm text-gray-600">Enter the page you want to scrape</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">Page URL *</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            type="url"
            placeholder="https://example.com/products"
            value={wizard.state.url}
            onChange={e => wizard.setUrl(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                if (tabs[0]?.url) wizard.setUrl(tabs[0].url);
              });
            }}
            title="Use current page"
          >
            <Globe className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500">Make sure you&apos;re on the target page before proceeding</p>
      </div>
    </div>
  );
});

// ─── Mode Step ───────────────────────────────────────────────────────────────

const ModeStep = observer(function ModeStep() {
  const wizard = useBlueprintWizardStore();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Scraping Mode</h2>
        <p className="text-sm text-gray-600">Choose how you want to extract data</p>
      </div>
      <div className="space-y-3">
        {MODES.map((mode) => {
          const isSelected = wizard.state.mode === mode.id;
          const Icon = mode.icon;
          return (
            <Card
              key={mode.id}
              className={`p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50'
                  : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
              }`}
              onClick={() => wizard.setMode(mode.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{mode.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{mode.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{mode.example}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

// ─── Container Step ──────────────────────────────────────────────────────────

const ContainerStep = observer(function ContainerStep() {
  const wizard = useBlueprintWizardStore();
  const hasContainer = !!wizard.state.container.selector;
  const [showRepickWarning, setShowRepickWarning] = useState(false);
  const [manualSelector, setManualSelector] = useState(wizard.state.container.selector || '');

  // Keep manualSelector in sync with store
  useEffect(() => {
    setManualSelector(wizard.state.container.selector || '');
  }, [wizard.state.container.selector]);

  const handleStartPicking = () => {
    if (hasContainer && wizard.state.fields.length > 0) {
      setShowRepickWarning(true);
      return;
    }
    wizard.startPicking('container');
  };

  const handleConfirmRepick = () => {
    setShowRepickWarning(false);
    wizard.startPicking('container');
  };

  const handleValidateManualSelector = async () => {
    if (!manualSelector.trim()) {
      toast.error('Please enter a selector first');
      return;
    }
    try {
      const response = await browser.runtime.sendMessage({
        type: 'TEST_SELECTOR',
        data: { selector: manualSelector, selectorType: 'css', maxResults: 1 },
      });
      if (response?.success) {
        wizard.setContainer(manualSelector, '', wizard.state.container.elementInfo, response.data.count);
        toast.success(`Selector matches ${response.data.count} elements on the page`);
        wizard.analyzePageStructure();
      } else {
        toast.error(response?.error || 'Selector validation failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Select Container</h2>
        <p className="text-sm text-gray-600">Pick or enter one repeating item selector on the page (e.g. a product card)</p>
      </div>

      {showRepickWarning ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Replace existing fields?</p>
              <p className="text-xs text-amber-700 mt-0.5">
                You already have {wizard.state.fields.length} field{wizard.state.fields.length !== 1 ? 's' : ''} configured.
                Re-selecting the container will detect new fields and replace your current ones.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowRepickWarning(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleConfirmRepick}>
              Yes, Replace Fields
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={handleStartPicking}
              disabled={wizard.isPicking || wizard.isAnalyzing}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs h-8"
            >
              {wizard.isPicking ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Selecting...</>
              ) : wizard.isAnalyzing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Analyzing...</>
              ) : hasContainer ? (
                <><Target className="w-3.5 h-3.5 mr-1.5" /> Re-select on Page</>
              ) : (
                <><Target className="w-3.5 h-3.5 mr-1.5" /> Select on Page</>
              )}
            </Button>

            {wizard.isPicking && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-gray-500 hover:text-gray-700"
                onClick={() => wizard.stopPicking()}
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="containerSelector" className="text-xs font-medium text-gray-700">Container CSS Selector</Label>
            <div className="flex gap-2">
              <Input
                id="containerSelector"
                value={manualSelector}
                onChange={e => setManualSelector(e.target.value)}
                placeholder="e.g. .product-card"
                className="font-mono text-xs h-8"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleValidateManualSelector}
              >
                Validate
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasContainer && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-medium text-sm text-emerald-900">Container selected</p>
          </div>
          <code className="text-xs bg-white px-2 py-1 rounded block overflow-x-auto">
            {wizard.state.container.selector}
          </code>
          <div className="flex justify-between items-center text-xs text-emerald-700 font-medium">
            {wizard.state.container.matchCount !== undefined && (
              <span>Found {wizard.state.container.matchCount} matching item{wizard.state.container.matchCount !== 1 ? 's' : ''} on the page</span>
            )}
            {wizard.state.fields.length > 0 && (
              <span>{wizard.state.fields.length} field{wizard.state.fields.length !== 1 ? 's' : ''} configured</span>
            )}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Click on one item from the list — the wizard will detect the repeating pattern and all fields inside it.
        </p>
      </div>
    </div>
  );
});

// ─── Fields Step ─────────────────────────────────────────────────────────────

const FieldsStep = observer(function FieldsStep() {
  const wizard = useBlueprintWizardStore();
  const fields = wizard.state.fields;
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const isDetailMode = wizard.state.mode === 'detail';
  const hasDuplicates = wizard.hasDuplicateFieldNames();
  const duplicateNames = wizard.getDuplicateFieldNames();

  const handleTestSelector = useCallback(async (field: WizardField) => {
    try {
      const containerSelector = wizard.state.container.selector;
      const scope = field.scope === 'list' && containerSelector ? {
        selector: containerSelector,
        selectorType: 'css' as const,
        index: 0
      } : undefined;

      const response = await browser.runtime.sendMessage({
        type: 'TEST_SELECTOR',
        data: { selector: field.selector, selectorType: 'css', maxResults: 3, scope },
      });
      if (response?.success) {
        toast.success(`Selector matches ${response.data.count} elements`);
      } else {
        toast.error(response?.error || 'Selector test failed');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  }, []);

  const listCount = fields.filter(f => f.scope === 'list').length;
  const detailCount = fields.filter(f => f.scope === 'detail').length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Review Fields</h2>
        <p className="text-sm text-gray-600">
          {fields.length > 0
            ? `${fields.length} field${fields.length !== 1 ? 's' : ''} detected. Rename, change type, or remove as needed.`
            : 'No fields detected yet. Select a container first, or add fields manually.'}
        </p>
        {isDetailMode && fields.length > 0 && (
          <div className="flex gap-3 mt-2">
            <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
              List Fields: {listCount}
            </span>
            <span className="text-[11px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded font-medium">
              Detail Fields: {detailCount}
            </span>
          </div>
        )}
      </div>

      {hasDuplicates && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700 font-medium">
            Duplicate field name{duplicateNames.length > 1 ? 's' : ''}: {duplicateNames.join(', ')}
          </p>
          <p className="text-[11px] text-red-600 mt-0.5">
            Each field must have a unique name. Please rename the duplicates.
          </p>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field) => {
            const isExpanded = expandedField === field.id;
            return (
              <div
                key={field.id}
                className={`border rounded-lg transition-colors ${isExpanded ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}
              >
                <div
                  className="flex items-center gap-2 p-2.5 cursor-pointer"
                  onClick={() => setExpandedField(isExpanded ? null : field.id)}
                >
                  <FieldTypeIcon type={field.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${duplicateNames.includes(field.name) ? 'text-red-600' : ''}`}>{field.name}</p>
                      {isDetailMode && <FieldScopeBadge scope={field.scope} />}
                      {duplicateNames.includes(field.name) && (
                        <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 font-medium">Duplicate</span>
                      )}
                    </div>
                    <code className="text-[10px] text-gray-500 truncate block">{field.selector}</code>
                  </div>
                  {field.sampleData && (
                    <span className="text-[10px] text-gray-400 truncate max-w-[100px]">
                      {field.sampleData}
                    </span>
                  )}
                  <button className="p-1 hover:bg-gray-100 rounded">
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px]">Name</Label>
                        <Input
                          value={field.name}
                          onChange={e => wizard.updateField(field.id, { name: e.target.value })}
                          className={`h-8 text-sm ${duplicateNames.includes(field.name) ? 'border-red-300 focus-visible:ring-red-200' : ''}`}
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">Type</Label>
                        <select
                          value={field.type}
                          onChange={e => wizard.updateField(field.id, { type: e.target.value as FieldType })}
                          className="w-full h-8 text-sm border rounded-md px-2 bg-white"
                        >
                          <option value="text">Text</option>
                          <option value="image">Image (src)</option>
                          <option value="link">Link (href)</option>
                          <option value="html">HTML</option>
                        </select>
                      </div>
                    </div>
                    {isDetailMode && (
                      <div>
                        <Label className="text-[11px]">Scope</Label>
                        <div className="flex gap-2 mt-1">
                          {(['list', 'detail'] as FieldScope[]).map((scope) => (
                            <button
                              key={scope}
                              type="button"
                              onClick={() => wizard.updateField(field.id, { scope })}
                              className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                                field.scope === scope
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {scope === 'list' ? 'List page' : 'Detail page'}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Choose where this field is extracted from
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-[11px]">Selector</Label>
                      <Input
                        value={field.selector}
                        onChange={e => wizard.updateField(field.id, { selector: e.target.value })}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleTestSelector(field)}>
                        <Eye className="w-3 h-3 mr-1" /> Test Selector
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => wizard.removeField(field.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isDetailMode ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => wizard.startPicking('field', 'list')}
            disabled={wizard.isPicking}
            className="w-full text-xs"
          >
            {wizard.isPicking && wizard.pickingFieldScope === 'list' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Selecting...</>
            ) : (
              <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add List Field</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => wizard.startPicking('field', 'detail')}
            disabled={wizard.isPicking}
            className="w-full text-xs"
          >
            {wizard.isPicking && wizard.pickingFieldScope === 'detail' ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Selecting...</>
            ) : (
              <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add Detail Field</>
            )}
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => wizard.startPicking('field', 'list')}
          disabled={wizard.isPicking}
          className="w-full"
        >
          {wizard.isPicking ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Selecting...</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" /> Add Field from Page</>
          )}
        </Button>
      )}
    </div>
  );
});

// ─── Pagination Step ─────────────────────────────────────────────────────────

const PaginationStep = observer(function PaginationStep() {
  const wizard = useBlueprintWizardStore();
  const pg = wizard.state.pagination!;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Pagination</h2>
        <p className="text-sm text-gray-600">Configure how the wizard navigates through multiple pages</p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="pagination"
          checked={pg.enabled}
          onCheckedChange={(checked) => wizard.setPaginationEnabled(!!checked)}
        />
        <Label htmlFor="pagination" className="text-sm font-medium">This data has pagination</Label>
      </div>

      {pg.enabled && (
        <div className="space-y-4 pl-6 border-l-2 border-emerald-200">
          <div className="space-y-2">
            <Label className="text-sm">Pagination Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Card
                className={`p-3 cursor-pointer text-center ${pg.type === 'button' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
                onClick={() => wizard.setPaginationType('button')}
              >
                <MousePointer className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                <p className="text-xs font-medium">Next Button</p>
              </Card>
              <Card
                className={`p-3 cursor-pointer text-center ${pg.type === 'scroll' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}
                onClick={() => wizard.setPaginationType('scroll')}
              >
                <ScrollText className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                <p className="text-xs font-medium">Infinite Scroll</p>
              </Card>
            </div>
          </div>

          {pg.type === 'button' && (
            <div className="space-y-2">
              <Label className="text-sm">Next Page Button</Label>
              <Button
                onClick={() => wizard.startPicking('pagination')}
                disabled={wizard.isPicking}
                variant="outline"
                className="w-full"
              >
                {wizard.isPicking ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Selecting...</>
                ) : pg.nextButtonSelector ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> {pg.nextButtonSelector}</>
                ) : (
                  <><Target className="w-4 h-4 mr-2" /> Select Next Button</>
                )}
              </Button>
            </div>
          )}

          {pg.type === 'scroll' && (
            <div className="space-y-2">
              <Label htmlFor="scrollAmount" className="text-sm">Scroll Amount (pixels)</Label>
              <Input
                id="scrollAmount"
                type="number"
                min={100}
                step={50}
                value={pg.scrollAmount || 1000}
                onChange={e => wizard.setPaginationScrollAmount(parseInt(e.target.value) || 1000)}
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-gray-500">
                Number of pixels to scroll down on each pagination step.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="maxPages" className="text-xs">Max Pages</Label>
              <Input
                id="maxPages"
                type="number"
                min={1}
                max={100}
                value={pg.maxPages}
                onChange={e => wizard.setPaginationMaxPages(parseInt(e.target.value) || 10)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delay" className="text-xs">Delay (ms)</Label>
              <Input
                id="delay"
                type="number"
                min={500}
                step={100}
                value={pg.delayBetweenPages}
                onChange={e => wizard.setPaginationDelay(parseInt(e.target.value) || 1500)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Detail Link Step ────────────────────────────────────────────────────────

const DetailLinkStep = observer(function DetailLinkStep() {
  const wizard = useBlueprintWizardStore();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Detail Page Link</h2>
        <p className="text-sm text-gray-600">Select the link inside each item that opens the detail page</p>
      </div>

      <Button
        onClick={() => wizard.startPicking('detail_link')}
        disabled={wizard.isPicking}
        className="w-full"
      >
        {wizard.isPicking ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Selecting...</>
        ) : wizard.state.detailLink?.selector ? (
          <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> {wizard.state.detailLink.selector}</>
        ) : (
          <><LinkIcon className="w-4 h-4 mr-2" /> Select Link on Page</>
        )}
      </Button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Click the link element inside one of the items (e.g. the product title link or "View details" button).
        </p>
      </div>
    </div>
  );
});

// ─── Preview Step ────────────────────────────────────────────────────────────

const PreviewStep = observer(function PreviewStep() {
  const wizard = useBlueprintWizardStore();
  const { data, loading, error } = wizard.state.preview;
  const previewFields = wizard.state.fields.filter(
    f => f.scope === 'list' || f.scope === 'both',
  );
  const hasPreviewData = data.length > 0;

  useEffect(() => {
    if (!hasPreviewData && !loading && !error) {
      wizard.loadPreview();
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Preview Data</h2>
        <p className="text-sm text-gray-600">
          {hasPreviewData
            ? `Review extracted sample — ${data.length} row${data.length !== 1 ? 's' : ''}`
            : 'Preview what your blueprint will extract from the page'}
        </p>
        {wizard.state.mode === 'detail' && (
          <p className="text-[11px] text-gray-400 mt-1">
            List-scoped fields only. Detail fields are extracted at execution time.
          </p>
        )}
      </div>

      <Button
        onClick={() => wizard.loadPreview()}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading preview...</>
        ) : hasPreviewData ? (
          <><Eye className="w-4 h-4 mr-2" /> Refresh Preview</>
        ) : (
          <><Eye className="w-4 h-4 mr-2" /> Load Preview</>
        )}
      </Button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {wizard.state.mode === 'detail' && previewFields.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            <strong>No list-scoped fields.</strong> In detail mode, at least one field must be scoped to List page to generate a preview.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 h-6 text-[10px] text-amber-600 p-0"
            onClick={() => wizard.setStep('fields')}
          >
            Go back to Fields step
          </Button>
        </div>
      )}

      {wizard.state.mode === 'detail' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
          <p className="font-medium text-purple-900">How detail extraction works:</p>
          <ul className="mt-1 space-y-0.5 text-purple-700">
            <li>• <strong>List fields</strong> are extracted from the current page.</li>
            <li>• <strong>Detail fields</strong> are extracted when the blueprint runs — the app clicks the detail link (in the same tab or new tab) and extracts from that page.</li>
            <li>• The preview above only shows list-scoped fields.</li>
          </ul>
        </div>
      )}

      {!hasPreviewData && !loading && previewFields.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs">Click "Load Preview" to see extracted data</p>
          {previewFields.length === 0 && (
            <p className="text-[10px] mt-1 text-amber-600">No list-scoped fields found. Add fields in the Fields step.</p>
          )}
        </div>
      )}

      {hasPreviewData && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 px-3 py-2 flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-800">
              {data.length} row{data.length !== 1 ? 's' : ''} extracted
            </p>
            <span className="text-[10px] text-emerald-600">
              {previewFields.length} field{previewFields.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white">
                <TableRow>
                  {previewFields.map(field => (
                    <TableHead key={field.id} className="text-xs whitespace-nowrap">
                      {field.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    {previewFields.map(field => (
                      <TableCell key={field.id} className="text-[11px] py-1.5">
                        {field.type === 'image' && row[field.name] ? (
                          <img src={row[field.name]} alt="" className="w-8 h-8 object-cover rounded" />
                        ) : (
                          <span className="truncate block max-w-[120px]" title={String(row[field.name] ?? '')}>
                            {String(row[field.name] ?? '-')}
                          </span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Create Step ─────────────────────────────────────────────────────────────

const CreateStep = observer(function CreateStep() {
  const wizard = useBlueprintWizardStore();
  const fields = wizard.state.fields;
  const listFields = fields.filter(f => f.scope === 'list');
  const detailFields = fields.filter(f => f.scope === 'detail');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Ready to Create</h2>
        <p className="text-sm text-gray-600">Review your blueprint configuration</p>
      </div>

      <div className="space-y-2 mb-4">
        <Label htmlFor="blueprintName" className="text-xs font-medium text-gray-700">Blueprint Name</Label>
        <Input
          id="blueprintName"
          value={wizard.state.blueprintName || ''}
          onChange={e => wizard.setBlueprintName(e.target.value)}
          placeholder="e.g. My Scraper"
          className="text-sm h-8"
        />
      </div>

      <div className="space-y-3">
        <SummaryRow icon={Globe} label="URL" value={wizard.state.url} />
        <SummaryRow icon={LayoutList} label="Mode" value={wizard.state.mode.replace('_', ' ')} />
        <SummaryRow icon={Target} label="Container" value={wizard.state.container.selector} />

        {wizard.state.mode === 'detail' ? (
          <>
            <SummaryRow icon={FileText} label="List Fields" value={`${listFields.length} field${listFields.length !== 1 ? 's' : ''}`} />
            <SummaryRow icon={FileText} label="Detail Fields" value={`${detailFields.length} field${detailFields.length !== 1 ? 's' : ''}`} />
          </>
        ) : (
          <SummaryRow icon={FileText} label="Fields" value={`${fields.length} field${fields.length !== 1 ? 's' : ''}`} />
        )}

        {wizard.state.mode === 'paginated' && wizard.state.pagination?.enabled && (
          <SummaryRow
            icon={ScrollText}
            label="Pagination"
            value={`${wizard.state.pagination.type === 'button' ? 'Next button' : 'Infinite scroll'} · ${wizard.state.pagination.maxPages} pages max`}
          />
        )}

        {wizard.state.mode === 'detail' && wizard.state.detailLink && (
          <SummaryRow icon={LinkIcon} label="Detail Link" value={wizard.state.detailLink.selector} />
        )}

        {wizard.state.preview.data.length > 0 && (
          <SummaryRow icon={Eye} label="Preview" value={`${wizard.state.preview.data.length} rows tested`} />
        )}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
        <p className="text-xs text-emerald-800">
          Click <strong>Create Blueprint</strong> to save and open it in the builder.
        </p>
      </div>
    </div>
  );
});

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}
