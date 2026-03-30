import { observer } from 'mobx-react-lite';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Selector, SelectorType } from '@/entrypoints/models/selector';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2, CheckCircle2, AlertTriangle, XCircle, Search, ChevronDown, ChevronUp, Sparkles, Wand2, Bot } from 'lucide-react';
import { useConfirm } from './confirm-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Block } from '@/entrypoints/models/types';
import { sendToContentScript } from '@/core/messaging';
import { useAiAgentStore } from '@/entrypoints/stores/ai-agent-store';
import { optimizeSelector, isOverlySpecificSelector, type SelectorOptimization } from '@/core/ai/selector-optimizer';
import { generateSelectorFromElement } from '@/core/ai/selector-generator';
import {
    getSelectorCardinalityDescription,
    getSelectorCardinalityLabel,
    getSelectorCardinalityWarning,
    type SelectorCardinality,
} from './selector-cardinality';
import {
    getSelectorRoleGuidance,
    type SelectorRole,
} from './selector-guidance';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

/** Expected element type for context-aware validation */
export type ExpectedElementType = 'clickable' | 'input' | 'any';

interface TestResult {
    count: number;
    elements: { tag: string; elId?: string; classes?: string; textPreview?: string; isClickable: boolean; isInput: boolean; isVisible: boolean }[];
    error?: string;
}

type ValidationState = 'idle' | 'testing' | 'valid' | 'warning' | 'error';

/**
 * Walks up the block parent chain and returns the CSS selector of the nearest
 * scope-providing ancestor (loop_elements, loop_pagination, or extract_scope).
 * This is used to scope the element picker so it highlights elements within
 * the correct parent context.
 */
export function getParentScopeSelector(block?: Block | null): string | null {
    if (!block) return null;

    let current = block.parent;
    // console.log('[OctoGrab] getParentScopeSelector: starting from block', block.type, block.label, '→ walking parents...');
    while (current) {
        // console.log('[OctoGrab]   → checking parent:', current.type, current.label);
        if (current.type === 'loop_elements') {
            const sel = (current.config as any)?.selector;
            if (sel?.value) {
                // console.log('[OctoGrab]   ✓ Found scope:', sel.value);
                return sel.value;
            }
        }
        if (current.type === 'extract_scope') {
            const sel = (current.config as any)?.scopeSelector;
            if (sel?.value) {
                // console.log('[OctoGrab]   ✓ Found scope:', sel.value);
                return sel.value;
            }
        }
        if (current.type === 'loop_pagination') {
            // Pagination doesn't create element scope
        }
        current = current.parent;
    }
    // console.log('[OctoGrab]   ✗ No scope-providing parent found');
    return null;
}

interface SelectorInputProps {
    /** Label displayed above the selector */
    label: string;
    /** Unique id prefix for the inputs */
    id: string;
    /** Placeholder for the selector value input */
    placeholder?: string;
    /** Help text shown below the selector input */
    helpText?: string;
    /** The selector object to read/write. Must be MobX observable. */
    selector: Selector | undefined;
    /** Called to initialize or update the selector object on the parent config */
    onSelectorChange: (selector: Selector) => void;
    /**
     * The block this selector belongs to. Used to auto-compute parent scope.
     * If provided, `parentSelector` prop is ignored and computed from the block hierarchy.
     */
    block?: Block | null;
    /** Explicit parent CSS selector for scoped picking (used if block is not provided) */
    parentSelector?: string | null;
    /** Expected element type for validation hints */
    expectedElement?: ExpectedElementType;
    /** Whether runtime expects one element, many elements, or either */
    selectorCardinality?: SelectorCardinality;
    /** Semantic role of this selector for block-specific guidance */
    selectorRole?: SelectorRole;
    /** Whether the selector is required (shows warning when empty) */
    required?: boolean;
}

export const SelectorInput = observer(({
    label,
    id,
    placeholder = '.my-element',
    helpText,
    selector,
    onSelectorChange,
    block = null,
    parentSelector = null,
    expectedElement = 'any',
    selectorCardinality = 'any',
    selectorRole,
    required = true,
}: SelectorInputProps) => {
    const store = useBlueprintBuilderStore();
    const { alert: showAlert } = useConfirm();
    const aiStore = useAiAgentStore();

    // ─── Collapsible details state ─────────────────────────────────────
    const [detailsExpanded, setDetailsExpanded] = useState(true);

    // ─── AI Optimization state ─────────────────────────────────────────
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<SelectorOptimization | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // ─── AI Extract state ───────────────────────────────────────────────
    const [aiExtractDialogOpen, setAiExtractDialogOpen] = useState(false);
    const [aiExtractLoading, setAiExtractLoading] = useState(false);
    const [aiExtractResult, setAiExtractResult] = useState<{ css: string; xpath: string; description: string; confidence: 'high' | 'medium' | 'low' } | null>(null);
    const [aiExtractError, setAiExtractError] = useState<string | null>(null);
    const pendingElementInfoRef = useRef<{ tag: string; id?: string; classes?: string; text?: string; attributes: Record<string, string> } | null>(null);
    const [pickingMode, setPickingMode] = useState<'normal' | 'ai' | null>(null);

    const handleAiOptimize = async () => {
        if (!aiStore.hasApiKey) {
            setAiError('Set an API key in Settings first.');
            setAiDialogOpen(true);
            return;
        }
        if (!currentValue.trim()) return;

        setAiLoading(true);
        setAiError(null);
        setAiResult(null);
        setAiDialogOpen(true);

        try {
            const result = await optimizeSelector(
                aiStore.provider,
                aiStore.apiKey,
                aiStore.model,
                currentValue,
                currentType === SelectorType.XPath ? 'xpath' : 'css',
            );

            if (result.error) {
                setAiError(result.error);
            } else if (result.optimization) {
                setAiResult(result.optimization);
            }
        } catch (e: any) {
            setAiError(e.message || 'Failed to optimize selector.');
        } finally {
            setAiLoading(false);
        }
    };

    const applyOptimizedSelector = (format: 'css' | 'xpath') => {
        if (!aiResult) return;
        const newSelector: Selector = {
            ...(selector || { type: SelectorType.CSS, value: '' }),
            type: format === 'xpath' ? SelectorType.XPath : SelectorType.CSS,
            value: format === 'xpath' ? aiResult.suggestedXPath : aiResult.suggestedSelector,
        };
        onSelectorChange(newSelector);
        setAiDialogOpen(false);
    };

    // Auto-compute parent scope from block hierarchy, falling back to explicit prop
    const computedParentSelector = block ? getParentScopeSelector(block) : parentSelector;

    const currentType = selector?.type || SelectorType.CSS;
    const currentValue = selector?.value || '';

    // Check if current selector looks overly specific (for warning)
    const showSpecificityWarning = currentValue && isOverlySpecificSelector(currentValue, currentType === SelectorType.XPath ? 'xpath' : 'css');

    // ─── Live testing state ───────────────────────────────────────────
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [validationMessage, setValidationMessage] = useState<string>('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced selector testing against the live page
    const testSelector = useCallback(async (value: string, type: string) => {
        if (!value.trim()) {
            setTestResult(null);
            if (required) {
                setValidationState('warning');
                setValidationMessage('Selector is required');
            } else {
                setValidationState('idle');
                setValidationMessage('');
            }
            return;
        }

        // Basic client-side CSS syntax check
        if (type === SelectorType.CSS) {
            try {
                document.querySelector(value);
            } catch {
                setValidationState('error');
                setValidationMessage('Invalid CSS selector syntax');
                setTestResult(null);
                return;
            }
        }

        setValidationState('testing');
        setValidationMessage('');

        try {
            const response = await sendToContentScript({
                type: 'TEST_SELECTOR',
                data: { selector: value, selectorType: type },
            });

            if (!response.success) {
                setValidationState('warning');
                setValidationMessage('Could not test — no active page');
                return;
            }

            const data = response.data as TestResult;
            setTestResult(data);

            if (data.error) {
                setValidationState('error');
                setValidationMessage(`Selector error: ${data.error}`);
                return;
            }

            if (data.count === 0) {
                setValidationState('warning');
                setValidationMessage('No elements found on current page');
                return;
            }

            const cardinalityWarning = getSelectorCardinalityWarning(selectorCardinality, data.count);
            if (cardinalityWarning) {
                setValidationState('warning');
                setValidationMessage(cardinalityWarning);
                return;
            }

            // Context-aware validation
            if (expectedElement === 'clickable' && data.elements.length > 0) {
                const allClickable = data.elements.every(el => el.isClickable);
                if (!allClickable) {
                    const nonClickable = data.elements.filter(el => !el.isClickable);
                    setValidationState('warning');
                    setValidationMessage(
                        `Found ${data.count} element${data.count > 1 ? 's' : ''}, but <${nonClickable[0]?.tag}> may not be clickable. Use a button, link, or interactive element.`
                    );
                    return;
                }
            }

            if (expectedElement === 'input' && data.elements.length > 0) {
                const allInput = data.elements.every(el => el.isInput);
                if (!allInput) {
                    const nonInput = data.elements.filter(el => !el.isInput);
                    setValidationState('warning');
                    setValidationMessage(
                        `Found ${data.count} element${data.count > 1 ? 's' : ''}, but <${nonInput[0]?.tag}> is not an input element. Use input, textarea, or select.`
                    );
                    return;
                }
            }

            // Check visibility
            if (data.elements.length > 0 && data.elements.every(el => !el.isVisible)) {
                setValidationState('warning');
                setValidationMessage(`Found ${data.count} element${data.count > 1 ? 's' : ''} but none are visible`);
                return;
            }

            setValidationState('valid');
            const tags = [...new Set(data.elements.map(el => `<${el.tag}>`))].join(', ');
            setValidationMessage(
                data.count === 1
                    ? `Matched 1 element: ${tags}`
                    : `Matched ${data.count} elements: ${tags}`
            );
        } catch {
            setValidationState('idle');
            setValidationMessage('');
        }
    }, [expectedElement, required, selectorCardinality]);

    // Trigger test when selector changes (debounced)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!currentValue.trim()) {
            if (required) {
                setValidationState('warning');
                setValidationMessage('Selector is required');
            } else {
                setValidationState('idle');
                setValidationMessage('');
            }
            setTestResult(null);
            return;
        }

        debounceRef.current = setTimeout(() => {
            testSelector(currentValue, currentType);
        }, 600);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [currentValue, currentType, testSelector]);

    // ─── Handlers ─────────────────────────────────────────────────────
    const handleTypeChange = (value: string) => {
        const newSelector: Selector = {
            ...(selector || { type: SelectorType.CSS, value: '' }),
            type: value as SelectorType,
        };

        // If we have detected values, swap in the appropriate one
        if (newSelector.detected) {
            if (value === SelectorType.CSS && newSelector.detected.css) {
                newSelector.value = newSelector.detected.css;
            } else if (value === SelectorType.XPath && newSelector.detected.xpath) {
                newSelector.value = newSelector.detected.xpath;
            }
        }

        onSelectorChange(newSelector);
    };

    const handleValueChange = (value: string) => {
        const newSelector: Selector = {
            ...(selector || { type: SelectorType.CSS, value: '' }),
            value,
        };
        onSelectorChange(newSelector);
    };

    const handlePickElement = async () => {
        if (store.isPicking) {
            await store.stopPicking();
            setPickingMode(null);
            return;
        }

        setPickingMode('normal');
        const success = await store.startPicking((css, xpath, elementInfo) => {
            // Update pending preview — don't commit to block config yet
            store.setPendingSelectors(css, xpath, elementInfo);
        }, computedParentSelector, (doneSuccess) => {
            // Called when user clicks "Done Selecting" or "Cancel" in the page overlay
            if (doneSuccess && store.pendingCss) {
                const updatedSelector: Selector = {
                    ...(selector || { type: SelectorType.CSS, value: '' }),
                    detected: {
                        css: store.pendingCss,
                        xpath: store.pendingXpath,
                    },
                };

                // Set the value based on the currently selected type
                if (updatedSelector.type === SelectorType.XPath) {
                    updatedSelector.value = store.pendingXpath || store.pendingCss;
                } else {
                    updatedSelector.value = store.pendingCss;
                }

                onSelectorChange(updatedSelector);
                store.setPendingSelectors('', '');
            }
            setPickingMode(null);
        });

        if (!success) {
            setPickingMode(null);
            showAlert('Picker Failed', 'Failed to start element picker. Make sure you have a web page open and the content script is loaded.');
        }
    };

    const handleTestNow = () => {
        if (currentValue.trim()) {
            testSelector(currentValue, currentType);
        }
    };

    // ─── AI Extract handlers ──────────────────────────────────────────
    const handleAiExtract = async () => {
        if (!aiStore.hasApiKey) {
            setAiExtractError('Set an API key in Settings first.');
            setAiExtractDialogOpen(true);
            return;
        }

        if (store.isPicking) {
            await store.stopPicking();
            setPickingMode(null);
            return;
        }

        setPickingMode('ai');
        setAiExtractLoading(true);
        setAiExtractError(null);
        setAiExtractResult(null);
        pendingElementInfoRef.current = null;

        const success = await store.startPicking((css, xpath, elementInfo) => {
            // Called when element is hovered/selected - store info in ref for immediate access
            if (elementInfo) {
                pendingElementInfoRef.current = elementInfo;
            }
        }, computedParentSelector, async (doneSuccess) => {
            // Called when user clicks "Done Selecting"
            if (doneSuccess && pendingElementInfoRef.current) {
                // Generate selector from picked element
                setAiExtractDialogOpen(true);
                try {
                    const result = await generateSelectorFromElement(
                        aiStore.provider,
                        aiStore.apiKey,
                        aiStore.model,
                        pendingElementInfoRef.current,
                        expectedElement,
                    );

                    if (result.error) {
                        setAiExtractError(result.error);
                    } else if (result.selector) {
                        setAiExtractResult(result.selector);
                    }
                } catch (e: any) {
                    setAiExtractError(e.message || 'Failed to generate selector.');
                } finally {
                    setAiExtractLoading(false);
                    setPickingMode(null);
                    pendingElementInfoRef.current = null;
                    store.setPendingSelectors('', '');
                }
            } else {
                // Cancelled or no element selected
                setAiExtractLoading(false);
                setPickingMode(null);
                pendingElementInfoRef.current = null;
            }
        });

        if (!success) {
            setAiExtractLoading(false);
            setPickingMode(null);
            showAlert('Picker Failed', 'Failed to start element picker. Make sure you have a web page open and the content script is loaded.');
        }
    };

    const applyAiExtractedSelector = (format: 'css' | 'xpath') => {
        if (!aiExtractResult) return;
        const newSelector: Selector = {
            ...(selector || { type: SelectorType.CSS, value: '' }),
            type: format === 'xpath' ? SelectorType.XPath : SelectorType.CSS,
            value: format === 'xpath' ? aiExtractResult.xpath : aiExtractResult.css,
            detected: {
                css: aiExtractResult.css,
                xpath: aiExtractResult.xpath,
            },
        };
        onSelectorChange(newSelector);
        setAiExtractDialogOpen(false);
        setAiExtractResult(null);
    };

    // ─── Validation visual helpers ────────────────────────────────────
    const inputBorderClass = (() => {
        switch (validationState) {
            case 'valid': return 'border-emerald-300 focus-visible:ring-emerald-400';
            case 'warning': return 'border-amber-300 focus-visible:ring-amber-400';
            case 'error': return 'border-red-300 focus-visible:ring-red-400';
            default: return '';
        }
    })();

    const StatusIcon = () => {
        switch (validationState) {
            case 'testing':
                return <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />;
            case 'valid':
                return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
            case 'warning':
                return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
            case 'error':
                return <XCircle className="w-3.5 h-3.5 text-red-500" />;
            default:
                return null;
        }
    };

    const messageColorClass = (() => {
        switch (validationState) {
            case 'valid': return 'text-emerald-600';
            case 'warning': return 'text-amber-600';
            case 'error': return 'text-red-600';
            default: return 'text-muted-foreground';
        }
    })();

    const selectorModeLabel = selectorCardinality === 'any'
        ? null
        : getSelectorCardinalityLabel(selectorCardinality);
    const selectorModeDescription = selectorCardinality === 'any'
        ? null
        : getSelectorCardinalityDescription(selectorCardinality);
    const selectorRoleGuidance = getSelectorRoleGuidance(selectorRole);
    const diagnosticsToneClass = (() => {
        switch (validationState) {
            case 'valid':
                return 'border-emerald-200 bg-emerald-50/50';
            case 'warning':
                return 'border-amber-200 bg-amber-50/60';
            case 'error':
                return 'border-red-200 bg-red-50/60';
            default:
                return 'border-slate-200 bg-slate-50/70';
        }
    })();

    useEffect(() => {
        if (!testResult || store.isPicking) return;
        setDetailsExpanded(testResult.count <= 4);
    }, [testResult?.count, store.isPicking]);

    return (
        <div className="flex flex-col gap-3">
            {/* Selector Type + Pick Button + Test Button Row */}
            <div className="flex gap-2 items-end">
                <div className="flex flex-col gap-1.5 flex-1">
                    <Label htmlFor={`${id}-type`} className="text-xs font-medium text-muted-foreground">
                        {label}
                    </Label>
                    <Select
                        value={currentType}
                        onValueChange={handleTypeChange}
                    >
                        <SelectTrigger id={`${id}-type`} className="h-9">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SelectorType.CSS}>CSS</SelectItem>
                            <SelectItem value={SelectorType.XPath}>XPath</SelectItem>
                            <SelectItem value={SelectorType.Text}>Text</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 shrink-0 hover:border-emerald-400 hover:text-emerald-600"
                    onClick={handleTestNow}
                    disabled={!currentValue.trim() || store.isPicking}
                    title="Test selector on current page"
                >
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-xs">Test</span>
                </Button>
                <Button
                    type="button"
                    variant={pickingMode === 'normal' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 gap-1.5 shrink-0 transition-all ${pickingMode === 'normal'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-pulse'
                        : 'hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                    onClick={handlePickElement}
                >
                    {pickingMode === 'normal' ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs">Picking...</span>
                        </>
                    ) : (
                        <>
                            <Crosshair className="w-3.5 h-3.5" />
                            <span className="text-xs">Pick</span>
                        </>
                    )}
                </Button>
                <Button
                    type="button"
                    variant={pickingMode === 'ai' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 gap-1 shrink-0 transition-all ${pickingMode === 'ai'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-pulse'
                        : 'hover:border-emerald-400 hover:text-emerald-600 border-emerald-200'
                        }`}
                    onClick={handleAiExtract}
                    disabled={store.isPicking && pickingMode !== 'ai'}
                    title={pickingMode === 'ai' ? 'Picking element for AI...' : 'Pick element with AI'}
                >
                    {pickingMode === 'ai' ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="text-xs">Picking...</span>
                        </>
                    ) : (
                        <>
                            <Bot className="w-3.5 h-3.5" />
                            <span className="text-xs">AI</span>
                        </>
                    )}
                </Button>
            </div>

            {/* Selector Value Input */}
            <div className="flex flex-col gap-1.5">
                {store.isPicking && store.pendingCss ? (
                    <div className="relative">
                        <Input
                            id={`${id}-value`}
                            type="text"
                            value={currentType === SelectorType.XPath ? (store.pendingXpath || store.pendingCss) : store.pendingCss}
                            readOnly
                            className="font-mono text-sm h-9 border-emerald-300 bg-emerald-50/50 text-emerald-700"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-medium">
                            preview
                        </span>
                    </div>
                ) : (
                    <div className="relative">
                        <Input
                            id={`${id}-value`}
                            type="text"
                            placeholder={placeholder}
                            value={currentValue}
                            onChange={(e) => handleValueChange(e.target.value)}
                            disabled={store.isPicking}
                            className={`font-mono text-sm h-9 pr-8 ${inputBorderClass}`}
                        />
                        {/* Status icon inside input */}
                        {currentValue.trim() && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2">
                                <StatusIcon />
                            </span>
                        )}
                    </div>
                )}

                {/* ── Selector diagnostics ── */}
                {!store.isPicking && (validationMessage || selectorModeLabel || selectorRoleGuidance || (showSpecificityWarning && computedParentSelector) || (testResult && testResult.count > 0 && testResult.elements.length > 0)) && (
                    <div className={`rounded-lg border p-3 space-y-2 ${diagnosticsToneClass}`}>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {selectorModeLabel && (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                    {selectorModeLabel}
                                </span>
                            )}
                            {testResult && testResult.count > 0 && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${validationState === 'valid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : validationState === 'error'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {testResult.count} match{testResult.count === 1 ? '' : 'es'}
                                </span>
                            )}
                            {selectorCardinality === 'single' && testResult && testResult.count > 1 && (
                                <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-white">
                                    Uses first match
                                </span>
                            )}
                        </div>

                        {validationMessage && (
                            <div className={`flex items-start gap-1.5 text-[11px] leading-snug ${messageColorClass}`}>
                                <span className="mt-px shrink-0"><StatusIcon /></span>
                                <span className="flex-1">{validationMessage}</span>
                            </div>
                        )}

                        {selectorModeDescription && (
                            <div className="text-[11px] leading-snug text-slate-600">
                                {selectorModeDescription}
                            </div>
                        )}

                        {selectorRoleGuidance && (
                            <div className="rounded-md border border-slate-200 bg-white/80 px-2 py-2 text-[11px] leading-snug text-slate-700">
                                <span className="font-medium">{selectorRoleGuidance.label}:</span> {selectorRoleGuidance.description}
                            </div>
                        )}

                        {showSpecificityWarning && computedParentSelector && (
                            <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-white/80 px-2 py-2 text-[11px] leading-snug text-amber-700">
                                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                                <div className="flex-1">
                                    <span className="font-medium">Overly specific selector.</span> This may not work for all items in the loop.
                                    <button
                                        onClick={handleAiOptimize}
                                        className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-emerald-600 hover:text-emerald-700"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Optimize with AI
                                    </button>
                                </div>
                            </div>
                        )}

                        {testResult && testResult.count > 0 && testResult.elements.length > 0 && (
                            <div className="overflow-hidden rounded-md border border-slate-200 bg-white/90">
                                <button
                                    onClick={() => setDetailsExpanded(!detailsExpanded)}
                                    className="flex w-full items-center justify-between px-2.5 py-2 text-[11px] text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    <span className="font-medium">
                                        Preview matched elements
                                        {selectorCardinality === 'single' ? ' (first item is used)' : ''}
                                    </span>
                                    {detailsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>
                                {detailsExpanded && (
                                    <div className="flex flex-col gap-1.5 border-t border-slate-200 p-2">
                                        {testResult.elements.map((el, i) => (
                                            <div key={i} className="flex items-center gap-1.5 overflow-hidden rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-mono leading-tight">
                                                <span className="font-bold text-purple-600">&lt;{el.tag}</span>
                                                {el.elId && <span className="text-amber-600">#{el.elId}</span>}
                                                {el.classes && <span className="max-w-[120px] truncate text-sky-600">.{el.classes.split(' ').join('.')}</span>}
                                                <span className="font-bold text-purple-600">&gt;</span>
                                                {el.textPreview && (
                                                    <span className="ml-1 max-w-[100px] truncate text-gray-400">"{el.textPreview}{el.textPreview.length >= 30 ? '...' : ''}"</span>
                                                )}
                                                {selectorCardinality === 'single' && i === 0 && (
                                                    <span className="ml-auto rounded bg-emerald-100 px-1.5 py-px text-[9px] font-sans font-semibold text-emerald-700">
                                                        used at runtime
                                                    </span>
                                                )}
                                                {!el.isVisible && (
                                                    <span className="rounded bg-amber-100 px-1 py-px text-[9px] font-sans text-amber-600">
                                                        hidden
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {testResult.count > testResult.elements.length && (
                                            <span className="pl-1 text-[10px] text-gray-400">+{testResult.count - testResult.elements.length} more elements</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Help text ── */}
                {helpText && (
                    <p className="text-[11px] text-muted-foreground leading-snug">{helpText}</p>
                )}

                {/* ── Enhanced Detected Alternatives Row ── */}
                {(computedParentSelector || selector?.detected) && (
                    <div className="flex flex-col gap-2">
                        {computedParentSelector && (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-mono border border-emerald-100">
                                    <span className="opacity-60">↳</span>
                                    <span className="truncate max-w-[180px]" title={computedParentSelector}>{computedParentSelector}</span>
                                </span>
                                <span className="text-[10px] text-muted-foreground">scope</span>
                            </div>
                        )}

                        {selector?.detected && (selector.detected.css || selector.detected.xpath) && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium">Detected alternatives:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {selector.detected.css && currentType !== SelectorType.CSS && (
                                        <button
                                            type="button"
                                            onClick={() => handleTypeChange(SelectorType.CSS)}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded text-[10px] border border-gray-200 hover:border-emerald-200 transition-colors cursor-pointer font-mono"
                                            title={`Switch to CSS: ${selector.detected.css}`}
                                        >
                                            <span className="font-semibold text-emerald-600">CSS</span>
                                            <span className="truncate max-w-[140px]">{selector.detected.css}</span>
                                        </button>
                                    )}
                                    {selector.detected.xpath && currentType !== SelectorType.XPath && (
                                        <button
                                            type="button"
                                            onClick={() => handleTypeChange(SelectorType.XPath)}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-50 text-gray-600 hover:text-emerald-600 rounded text-[10px] border border-gray-200 hover:border-emerald-200 transition-colors cursor-pointer font-mono"
                                            title={`Switch to XPath: ${selector.detected.xpath}`}
                                        >
                                            <span className="font-semibold text-purple-600">XPath</span>
                                            <span className="truncate max-w-[140px]">{selector.detected.xpath}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* AI Optimize button (always available) */}
                        {currentValue && aiStore.hasApiKey && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAiOptimize}
                                className="h-8 gap-1.5 text-[10px] text-emerald-600 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                                <Sparkles className="w-3 h-3" />
                                AI Optimize
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* ─── AI Optimization Dialog ─────────────────────────────── */}
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>AI Selector Optimizer</DialogTitle>
                        <DialogDescription>
                            Get a more generic selector suitable for looping through multiple items.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {aiLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                Analyzing selector...
                            </div>
                        )}

                        {aiError && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                {aiError}
                            </div>
                        )}

                        {aiResult && (
                            <div className="space-y-3">
                                {/* Current selector */}
                                <div className="border rounded-md p-3 bg-gray-50">
                                    <Label className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                                        Current
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-gray-200 text-gray-600">
                                            {aiResult.selectorType.toUpperCase()}
                                        </span>
                                    </Label>
                                    <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap break-all max-h-[60px] overflow-y-auto leading-relaxed">{aiResult.originalSelector}</pre>
                                </div>

                                {/* CSS suggestion */}
                                <div className="border rounded-md p-3 bg-emerald-50/50 border-emerald-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-[10px] text-emerald-700 flex items-center gap-1">
                                            Suggested
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">CSS</span>
                                            <span className={`text-[9px] px-1 py-0.5 rounded ${aiResult.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                                aiResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {aiResult.confidence}
                                            </span>
                                        </Label>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100" onClick={() => applyOptimizedSelector('css')}>
                                            Apply CSS
                                        </Button>
                                    </div>
                                    <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-all max-h-[80px] overflow-y-auto leading-relaxed">{aiResult.suggestedSelector}</pre>
                                </div>

                                {/* XPath suggestion */}
                                <div className="border rounded-md p-3 bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                                            Suggested
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-gray-200 text-gray-600">XPath</span>
                                        </Label>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100" onClick={() => applyOptimizedSelector('xpath')}>
                                            Apply XPath
                                        </Button>
                                    </div>
                                    <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap break-all max-h-[80px] overflow-y-auto leading-relaxed">{aiResult.suggestedXPath}</pre>
                                </div>

                                <p className="text-xs text-gray-600">{aiResult.explanation}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(false)}>Close</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ─── AI Extract Dialog ─────────────────────────────────────── */}
            <Dialog open={aiExtractDialogOpen} onOpenChange={setAiExtractDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>AI Selector Generator</DialogTitle>
                        <DialogDescription>
                            AI-generated selector based on the element you picked.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {aiExtractLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                                Analyzing element and generating selector...
                            </div>
                        )}

                        {aiExtractError && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                {aiExtractError}
                            </div>
                        )}

                        {aiExtractResult && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-600">{aiExtractResult.description}</p>

                                {/* CSS suggestion */}
                                <div className="border rounded-md p-3 bg-emerald-50/50 border-emerald-200">
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-[10px] text-emerald-700 flex items-center gap-1">
                                            Generated
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">CSS</span>
                                            <span className={`text-[9px] px-1 py-0.5 rounded ${aiExtractResult.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                                aiExtractResult.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                {aiExtractResult.confidence}
                                            </span>
                                        </Label>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100" onClick={() => applyAiExtractedSelector('css')}>
                                            Apply CSS
                                        </Button>
                                    </div>
                                    <pre className="font-mono text-xs text-gray-800 whitespace-pre-wrap break-all max-h-[80px] overflow-y-auto leading-relaxed">{aiExtractResult.css}</pre>
                                </div>

                                {/* XPath suggestion */}
                                <div className="border rounded-md p-3 bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-[10px] text-gray-500 flex items-center gap-1">
                                            Generated
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-gray-200 text-gray-600">XPath</span>
                                        </Label>
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-gray-500 hover:text-gray-700 hover:bg-gray-100" onClick={() => applyAiExtractedSelector('xpath')}>
                                            Apply XPath
                                        </Button>
                                    </div>
                                    <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap break-all max-h-[80px] overflow-y-auto leading-relaxed">{aiExtractResult.xpath}</pre>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setAiExtractDialogOpen(false)}>Close</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});
