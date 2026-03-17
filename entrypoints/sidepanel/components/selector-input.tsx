import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { Selector, SelectorType } from '@/entrypoints/models/selector';
import { useBlueprintBuilderStore } from '@/entrypoints/stores/blueprint-builder-store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Crosshair, Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Block } from '@/entrypoints/models/types';

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
}: SelectorInputProps) => {
    const store = useBlueprintBuilderStore();

    // Auto-compute parent scope from block hierarchy, falling back to explicit prop
    const computedParentSelector = block ? getParentScopeSelector(block) : parentSelector;

    const currentType = selector?.type || SelectorType.CSS;
    const currentValue = selector?.value || '';

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

    return (
        <div className="flex flex-col gap-3">
            {/* Selector Type + Pick Button Row */}
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
                    <Input
                        id={`${id}-value`}
                        type="text"
                        placeholder={placeholder}
                        value={currentValue}
                        onChange={(e) => handleValueChange(e.target.value)}
                        disabled={store.isPicking}
                        className="font-mono text-sm h-9"
                    />
                )}
                {helpText && (
                    <p className="text-xs text-muted-foreground">{helpText}</p>
                )}
                {/* Scope indicator */}
                {computedParentSelector && (
                    <p className="text-[10px] text-emerald-500 font-mono">
                        ↳ scoped to: {computedParentSelector}
                    </p>
                )}
                {/* Show detected alternatives */}
                {selector?.detected && (
                    <div className="flex gap-1 flex-wrap">
                        {selector.detected.css && currentType !== SelectorType.CSS && (
                            <button
                                type="button"
                                onClick={() => handleTypeChange(SelectorType.CSS)}
                                className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 rounded border border-gray-200 transition-colors cursor-pointer font-mono truncate max-w-[200px]"
                                title={`Switch to CSS: ${selector.detected.css}`}
                            >
                                CSS: {selector.detected.css}
                            </button>
                        )}
                        {selector.detected.xpath && currentType !== SelectorType.XPath && (
                            <button
                                type="button"
                                onClick={() => handleTypeChange(SelectorType.XPath)}
                                className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 rounded border border-gray-200 transition-colors cursor-pointer font-mono truncate max-w-[200px]"
                                title={`Switch to XPath: ${selector.detected.xpath}`}
                            >
                                XPath: {selector.detected.xpath}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});
