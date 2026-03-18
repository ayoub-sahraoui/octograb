import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Selector, SelectorType } from '@/entrypoints/models/selector';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Block } from '@/entrypoints/models/types';
import { sendToContentScript } from '@/core/messaging';

/** Expected element type for context-aware validation */
export type ExpectedElementType = 'clickable' | 'input' | 'any';

interface TestResult {
    count: number;
    elements: { tag: string; isClickable: boolean; isInput: boolean; isVisible: boolean }[];
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
    required = true,
}: SelectorInputProps) => {
    const store = useBlueprintBuilderStore();

    // Auto-compute parent scope from block hierarchy, falling back to explicit prop
    const computedParentSelector = block ? getParentScopeSelector(block) : parentSelector;

    const currentType = selector?.type || SelectorType.CSS;
    const currentValue = selector?.value || '';

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
    }, [expectedElement, required]);

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
        runInAction(() => {
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
        });
    };

    const handleValueChange = (value: string) => {
        runInAction(() => {
            const newSelector: Selector = {
                ...(selector || { type: SelectorType.CSS, value: '' }),
                value,
            };
            onSelectorChange(newSelector);
        });
    };

    const handlePickElement = async () => {
        if (store.isPicking) {
            await store.stopPicking();
            return;
        }

        const success = await store.startPicking((css, xpath) => {
            // Update pending preview — don't commit to block config yet
            runInAction(() => {
                store.pendingCss = css;
                store.pendingXpath = xpath;
            });
        }, computedParentSelector, (doneSuccess) => {
            // Called when user clicks "Done Selecting" or "Cancel" in the page overlay
            if (doneSuccess && store.pendingCss) {
                runInAction(() => {
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
                    store.pendingCss = '';
                    store.pendingXpath = '';
                });
            }
            // If cancelled, pendingCss/pendingXpath are already cleared by the store
        });

        if (!success) {
            alert('Failed to start element picker. Make sure you have a web page open and the content script is loaded.');
        }
    };

    const handleTestNow = () => {
        if (currentValue.trim()) {
            testSelector(currentValue, currentType);
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
                    variant={store.isPicking ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 gap-1.5 shrink-0 transition-all ${store.isPicking
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-pulse'
                        : 'hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                    onClick={handlePickElement}
                >
                    {store.isPicking ? (
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

                {/* ── Validation + match info (single consolidated line) ── */}
                {validationMessage && !store.isPicking && (
                    <div className={`flex items-start gap-1.5 text-[11px] leading-snug ${messageColorClass}`}>
                        <span className="mt-px shrink-0"><StatusIcon /></span>
                        <span className="flex-1">
                            {validationMessage}
                            {/* Inline badges for match details */}
                            {testResult && testResult.count > 0 && (validationState === 'valid' || validationState === 'warning') && (
                                <span className="inline-flex items-center gap-1 ml-1.5">
                                    <span className={`inline-flex items-center px-1 py-px rounded text-[9px] font-semibold ${validationState === 'valid'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {testResult.count}
                                    </span>
                                    {testResult.elements.some(el => !el.isVisible) && (
                                        <span className="inline-flex items-center px-1 py-px bg-amber-100 text-amber-600 rounded text-[9px] font-semibold">
                                            {testResult.elements.filter(el => !el.isVisible).length} hidden
                                        </span>
                                    )}
                                </span>
                            )}
                        </span>
                    </div>
                )}

                {/* ── Help text ── */}
                {helpText && (
                    <p className="text-[11px] text-muted-foreground leading-snug">{helpText}</p>
                )}

                {/* ── Metadata row: scope + detected alternatives ── */}
                {(computedParentSelector || selector?.detected) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {computedParentSelector && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-mono border border-emerald-100 max-w-[200px] truncate" title={computedParentSelector}>
                                <span className="opacity-60">↳</span> {computedParentSelector}
                            </span>
                        )}
                        {selector?.detected?.css && currentType !== SelectorType.CSS && (
                            <button
                                type="button"
                                onClick={() => handleTypeChange(SelectorType.CSS)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 rounded text-[10px] border border-gray-200 hover:border-emerald-200 transition-colors cursor-pointer font-mono truncate max-w-[180px]"
                                title={`Switch to CSS: ${selector.detected.css}`}
                            >
                                <span className="font-semibold not-italic">CSS</span> {selector.detected.css}
                            </button>
                        )}
                        {selector?.detected?.xpath && currentType !== SelectorType.XPath && (
                            <button
                                type="button"
                                onClick={() => handleTypeChange(SelectorType.XPath)}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 hover:bg-emerald-50 text-gray-500 hover:text-emerald-600 rounded text-[10px] border border-gray-200 hover:border-emerald-200 transition-colors cursor-pointer font-mono truncate max-w-[180px]"
                                title={`Switch to XPath: ${selector.detected.xpath}`}
                            >
                                <span className="font-semibold not-italic">XPath</span> {selector.detected.xpath}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
