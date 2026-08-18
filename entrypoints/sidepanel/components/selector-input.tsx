import { observer } from 'mobx-react-lite';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Selector, SelectorType } from '@/entrypoints/models/selector';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2, CheckCircle2, AlertTriangle, XCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Scope } from '@/core/env';
import { isOverlySpecificSelector } from '@/core/css-selector-sanitizer';
import {
    getSelectorCardinalityDescription,
    getSelectorCardinalityLabel,
} from './selector-cardinality';
import {
    getSelectorRoleGuidance,
} from './selector-guidance';
import { evaluateSelectorPolicy } from './selector-policy';
import { getSelectorFeedbackSummary } from './selector-feedback';
import type { ExpectedElementType, SelectorCardinality, SelectorRole, SelectorContext } from '@/entrypoints/models/selector-semantics';
import { getSelectorContext } from '@/entrypoints/models/selector-semantics';

function getSelectorRoleName(role?: SelectorRole): string {
    switch (role) {
        case 'click-target':
            return 'click target';
        case 'input-target':
            return 'input target';
        case 'loop-root':
            return 'repeating item selector';
        case 'pagination-next':
            return 'next-page selector';
        case 'scroll-target':
            return 'scroll target';
        case 'condition-target':
            return 'condition target';
        case 'assert-target':
            return 'assertion target';
        case 'wait-target':
            return 'wait target';
        case 'extract-scope':
            return 'scope selector';
        case 'extract-field':
            return 'field selector';
        default:
            return 'selector';
    }
}

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
export function getParentScopeSelector(block?: Block | null, isScopeSelector?: boolean): string | null {
    if (!block) return null;

    if (isScopeSelector) {
        if (block.type === 'extract_scope' && (block.config as any)?.resetScope) {
            return null;
        }
        let current: Block | null | undefined = block.parent;
        while (current) {
            if (current.type === 'extract_scope') {
                const sel = (current.config as any)?.scopeSelector;
                if (sel?.value) {
                    return sel.value;
                }
                if ((current.config as any)?.resetScope) {
                    return null;
                }
            } else if (current.type === 'loop_elements') {
                const sel = (current.config as any)?.selector;
                if (sel?.value) {
                    return sel.value;
                }
            }
            current = current.parent;
        }
        return null;
    }

    let current: Block | null | undefined = block; // Start from the block itself to check its own resetScope/scopeSelector when configuring fields
    while (current) {
        if (current.type === 'extract_scope') {
            const sel = (current.config as any)?.scopeSelector;
            if (sel?.value) {
                return sel.value;
            }
            if ((current.config as any)?.resetScope) {
                return null;
            }
        } else if (current.type === 'loop_elements') {
            const sel = (current.config as any)?.selector;
            if (sel?.value) {
                return sel.value;
            }
        }
        current = current.parent;
    }
    return null;
}

function refineToSingleTarget(value: string, type: SelectorType): string {
    if (!value) return value;
    const trimmed = value.trim();
    if (type === SelectorType.XPath) {
        if (trimmed.startsWith('(') && trimmed.endsWith(']')) {
            return trimmed;
        }
        return `(${trimmed})[1]`;
    } else if (type === SelectorType.CSS) {
        if (trimmed === ':scope') {
            return ':scope';
        }
        if (trimmed.endsWith(':first-of-type') || trimmed.endsWith(':nth-of-type(1)')) {
            return trimmed;
        }
        return `${trimmed}:first-of-type`;
    }
    return value;
}

export function getParentScope(
    block?: Block | null,
    fallbackParentSelector?: string | null,
    isScopeSelector?: boolean
): Scope | undefined {
    if (!block) {
        if (fallbackParentSelector) {
            return {
                selector: fallbackParentSelector,
                selectorType: 'css',
                index: 0
            };
        }
        return undefined;
    }

    let current: Block | null | undefined = isScopeSelector ? block.parent : block; // Start from the block itself when resolving scope for fields

    if (isScopeSelector && block.type === 'extract_scope' && (block.config as any)?.resetScope) {
        return undefined;
    }

    let innermostScope: Scope | undefined = undefined;
    let currentScope: Scope | undefined = undefined;

    while (current) {
        let sel: any = null;
        let isReset = false;

        if (current.type === 'extract_scope') {
            sel = (current.config as any)?.scopeSelector;
            isReset = (current.config as any)?.resetScope;
        } else if (current.type === 'loop_elements') {
            sel = (current.config as any)?.selector;
        }

        if (sel?.value) {
            const scopeNode: Scope = {
                selector: sel.value,
                selectorType: sel.type || 'css',
                index: 0
            };

            if (!innermostScope) {
                innermostScope = scopeNode;
            }

            if (currentScope) {
                currentScope.parent = scopeNode;
            }
            currentScope = scopeNode;
        }

        if (isReset) {
            break;
        }

        current = current.parent;
    }

    return innermostScope || (fallbackParentSelector ? {
        selector: fallbackParentSelector,
        selectorType: 'css',
        index: 0
    } : undefined);
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

    // ─── Collapsible details state ─────────────────────────────────────
    const [detailsExpanded, setDetailsExpanded] = useState(true);
    // Auto-compute parent scope from block hierarchy, falling back to explicit prop
    const computedParentSelector = block ? getParentScopeSelector(block, selectorRole === 'extract-scope') : parentSelector;

    const currentType = selector?.type || SelectorType.Auto;
    const currentValue = selector?.value || '';

    // Check if current selector looks overly specific (for warning)
    const showSpecificityWarning = currentValue && isOverlySpecificSelector(currentValue, currentType === SelectorType.XPath ? 'xpath' : 'css');

    // ─── Live testing state ───────────────────────────────────────────
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [validationState, setValidationState] = useState<ValidationState>('idle');
    const [validationMessage, setValidationMessage] = useState<string>('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pickingMode, setPickingMode] = useState<'normal' | null>(null);
    const [highlightActive, setHighlightActive] = useState(false);

    // Debounced selector testing against the live page
    const testSelector = useCallback(async (value: string, type: string, highlight: boolean = false) => {
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
                data: {
                    selector: value,
                    selectorType: type,
                    scope: getParentScope(block, computedParentSelector, selectorRole === 'extract-scope'),
                    highlight
                },
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

            const context = getSelectorContext(block, selectorRole);
            const policyResult = evaluateSelectorPolicy({
                count: data.count,
                elements: data.elements,
                selectorCardinality,
                selectorRole,
                expectedElement,
                selectorContext: context,
            });

            setValidationState(policyResult.state);
            setValidationMessage(policyResult.message);
        } catch {
            setValidationState('idle');
            setValidationMessage('');
        }
    }, [block, computedParentSelector, expectedElement, required, selectorCardinality, selectorRole]);

    // Trigger test when selector changes (debounced)
    useEffect(() => {
        setHighlightActive(false);

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

    // Cleanup picker and highlights on unmount
    useEffect(() => {
        return () => {
            if (store.isPicking) {
                void store.stopPicking();
            }
            if (currentValue.trim()) {
                sendToContentScript({
                    type: 'TEST_SELECTOR',
                    data: {
                        selector: currentValue,
                        selectorType: currentType,
                        scope: getParentScope(block, computedParentSelector, selectorRole === 'extract-scope'),
                        highlight: false
                    }
                }).catch(() => {});
            }
        };
    }, [store, currentValue, currentType, block, computedParentSelector, selectorRole]);

    // ─── Handlers ─────────────────────────────────────────────────────
    const handleTypeChange = (value: string) => {
        const newSelector: Selector = {
            ...(selector || { type: SelectorType.Auto, value: '' }),
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
            ...(selector || { type: SelectorType.Auto, value: '' }),
            value,
        };
        onSelectorChange(newSelector);
    };

    const handlePickElement = async () => {
        if (store.isPicking) {
            await store.stopPicking();
            return;
        }

        setPickingMode('normal');
        const pickingModeParam = selectorCardinality === 'multiple' ? 'multiple' : 'single';
        const success = await store.startPicking((css, xpath, elementInfo) => {
            // Update pending preview — don't commit to block config yet
            store.setPendingSelectors(css, xpath, elementInfo);
        }, computedParentSelector, (doneSuccess) => {
            // Called when user clicks "Done Selecting" or "Cancel" in the page overlay
            if (doneSuccess && store.pendingCss) {
                const updatedSelector: Selector = {
                    ...(selector || { type: SelectorType.Auto, value: '' }),
                    detected: {
                        css: store.pendingCss,
                        xpath: store.pendingXpath,
                    },
                };

                // Set the value based on the currently selected type
                if (updatedSelector.type === SelectorType.XPath) {
                    updatedSelector.value = selectorCardinality === 'single' ? refineToSingleTarget(store.pendingXpath || store.pendingCss, SelectorType.XPath) : (store.pendingXpath || store.pendingCss);
                } else if (updatedSelector.type === SelectorType.Auto) {
                    const best = (store.pendingElementInfo as any)?.bestSelector || store.pendingCss;
                    if (best.startsWith('/') || best.startsWith('./') || best.startsWith('(')) {
                        updatedSelector.value = selectorCardinality === 'single' ? refineToSingleTarget(best, SelectorType.XPath) : best;
                    } else {
                        updatedSelector.value = selectorCardinality === 'single' ? refineToSingleTarget(best, SelectorType.CSS) : best;
                    }
                } else {
                    updatedSelector.value = selectorCardinality === 'single' ? refineToSingleTarget(store.pendingCss, SelectorType.CSS) : store.pendingCss;
                }

                onSelectorChange(updatedSelector);
                store.setPendingSelectors('', '');
            }
            setPickingMode(null);
        }, pickingModeParam);

        if (!success) {
            setPickingMode(null);
            showAlert('Picker Failed', 'Failed to start element picker. Make sure you have a web page open and the content script is loaded.');
        }
    };

    const handleTestNow = () => {
        if (currentValue.trim()) {
            const nextHighlightState = !highlightActive;
            setHighlightActive(nextHighlightState);
            testSelector(currentValue, currentType, nextHighlightState);
        }
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

    return (
        <div className="flex flex-col gap-2">
            {/* Top row: Label and match count badge */}
            <div className="flex justify-between items-center px-0.5">
                <Label htmlFor={`${id}-value`} className="text-xs font-semibold text-slate-700">
                    {label}
                </Label>
                {testResult && testResult.count !== undefined && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        validationState === 'valid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : validationState === 'error'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                        {testResult.count} {testResult.count === 1 ? 'match' : 'matches'}
                    </span>
                )}
            </div>

            {/* Input & Buttons Group */}
            <div className="flex gap-2 items-center">
                {/* Type selector */}
                <div className="w-[80px] shrink-0">
                    <Select
                        value={currentType}
                        onValueChange={handleTypeChange}
                        disabled={store.isPicking}
                    >
                        <SelectTrigger id={`${id}-type`} className="h-9 font-medium text-xs">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SelectorType.Auto}>Auto</SelectItem>
                            <SelectItem value={SelectorType.CSS}>CSS</SelectItem>
                            <SelectItem value={SelectorType.XPath}>XPath</SelectItem>
                            <SelectItem value={SelectorType.Text}>Text</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Input element */}
                <div className="relative flex-1 min-w-0">
                    {store.isPicking && store.pendingCss ? (
                        <div className="relative">
                            <Input
                                id={`${id}-value`}
                                type="text"
                                value={currentType === SelectorType.XPath ? (store.pendingXpath || store.pendingCss) : store.pendingCss}
                                readOnly
                                className="font-mono text-xs h-9 border-emerald-300 bg-emerald-50/50 text-emerald-700 pr-14 truncate"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-emerald-500 font-semibold bg-emerald-100/50 px-1 py-0.5 rounded">
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
                                className={`font-mono text-xs h-9 pr-7 truncate ${inputBorderClass}`}
                            />
                            {currentValue.trim() && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <StatusIcon />
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Pick button */}
                <Button
                    type="button"
                    variant={pickingMode ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 px-3 shrink-0 ${
                        pickingMode
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-1 ring-emerald-300 animate-pulse'
                            : 'hover:border-emerald-400 hover:text-emerald-600'
                    }`}
                    onClick={handlePickElement}
                    title={pickingMode ? "Click 'Confirm' or 'Cancel' on the page to finish" : "Pick element on the page"}
                >
                    {pickingMode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Crosshair className="w-3.5 h-3.5" />
                    )}
                </Button>

                {/* Test button */}
                <Button
                    type="button"
                    variant={highlightActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 px-3 shrink-0 ${
                        highlightActive
                            ? 'bg-violet-600 hover:bg-violet-700 text-white ring-1 ring-violet-300'
                            : 'hover:border-emerald-400 hover:text-emerald-600'
                    }`}
                    onClick={handleTestNow}
                    disabled={!currentValue.trim() || store.isPicking}
                    title={highlightActive ? "Clear highlights" : "Test and highlight selector on current page"}
                >
                    <Search className={`w-3.5 h-3.5 ${highlightActive ? 'animate-pulse' : ''}`} />
                </Button>
            </div>

            {/* Scope / Validation message block */}
            {validationMessage && (
                <div className="flex flex-col gap-1.5 px-0.5">
                    <span className={`text-[10px] font-medium leading-normal ${messageColorClass}`}>
                        {validationMessage}
                    </span>
                    {selectorCardinality === 'single' && testResult && testResult.count > 1 && (
                        <div className="flex">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-6 text-[10px] px-2 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 text-amber-700 font-semibold"
                                onClick={() => {
                                    const refined = refineToSingleTarget(currentValue, currentType as SelectorType);
                                    if (refined !== currentValue) {
                                        handleValueChange(refined);
                                    }
                                }}
                            >
                                Use First Match
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});
