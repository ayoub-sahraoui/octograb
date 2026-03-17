import { observer, Observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ExtractScopeBlock, ExtractionField, StaticFieldType } from '@/entrypoints/models/extract-scope-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronDown, ChevronRight, Wand2, ChevronsDownUp, ChevronsUpDown, Database, Calculator, Play, Loader2, Info, FileText, Code, Link, Image, FormInput, Type, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AttributeType } from '@/entrypoints/models/enums';
import { SelectorInput } from '../selector-input';
import { TransformerType, TransformerConfig, CurrencyConvertTransformerConfig, ReplaceTransformerConfig, RegexTransformerConfig, SplitTransformerConfig } from '@/entrypoints/models/transformer';
import { sendToContentScript } from '@/core/messaging';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Sortable wrapper for each field item
function SortableFieldItem({ id, children }: { id: string; children: (attributes: Record<string, any>, listeners: Record<string, any>) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 50 : undefined,
    };
    return (
        <div ref={setNodeRef} style={style}>
            {children(attributes, listeners ?? {})}
        </div>
    );
}

interface ExtractScopeBlockConfigProps {
    block: ExtractScopeBlock;
}

export const ExtractScopeBlockConfig = observer(({ block }: ExtractScopeBlockConfigProps) => {
    // Track expanded fields by stable ID (not index) so reordering doesn't break expand state
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

    // Ensure every field has a stable ID (backfill for existing blueprints)
    useMemo(() => {
        runInAction(() => {
            for (const field of block.config.fields) {
                if (!field.id) {
                    field.id = uuidv4();
                }
            }
        });
    }, [block.config.fields.length]);

    const getFieldId = (field: ExtractionField) => field.id || '';

    const toggleField = (field: ExtractionField) => {
        const id = getFieldId(field);
        const newExpanded = new Set(expandedFields);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedFields(newExpanded);
    };

    const collapseAll = () => setExpandedFields(new Set());
    const expandAll = () => setExpandedFields(new Set(block.config.fields.map(f => getFieldId(f))));
    const allExpanded = expandedFields.size === block.config.fields.length && block.config.fields.length > 0;

    // Drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fieldIds = useMemo(() => block.config.fields.map(f => getFieldId(f)), [block.config.fields, block.config.fields.length]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = block.config.fields.findIndex(f => getFieldId(f) === active.id);
        const newIndex = block.config.fields.findIndex(f => getFieldId(f) === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        runInAction(() => {
            // Use splice-based move to preserve MobX observable proxies
            const [item] = block.config.fields.splice(oldIndex, 1);
            block.config.fields.splice(newIndex, 0, item);
        });
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= block.config.fields.length) return;
        runInAction(() => {
            const [item] = block.config.fields.splice(index, 1);
            block.config.fields.splice(newIndex, 0, item);
        });
    };

    const addField = () => {
        const fieldId = uuidv4();
        const newField: ExtractionField = {
            id: fieldId,
            key: '',
            selector: { type: SelectorType.CSS, value: '' },
            attribute: AttributeType.Text,
            required: false,
            multiple: false,
            transformers: [],
            mode: 'extracted',
        };
        runInAction(() => {
            block.config.fields.push(newField);
        });
        // Auto-expand newly added field
        setExpandedFields(new Set([...expandedFields, fieldId]));
    };

    const addStaticField = () => {
        const fieldId = uuidv4();
        const newField: ExtractionField = {
            id: fieldId,
            key: '',
            selector: { type: SelectorType.CSS, value: '' },
            attribute: AttributeType.Text,
            mode: 'static',
            staticType: 'constant',
            staticValue: '',
        };
        runInAction(() => {
            block.config.fields.push(newField);
        });
        setExpandedFields(new Set([...expandedFields, fieldId]));
    };

    const addTransformer = (fieldIndex: number, type: TransformerType) => {
        const field = block.config.fields[fieldIndex];
        if (!field.transformers) {
            field.transformers = [];
        }

        let newTransformer: TransformerConfig;
        switch (type) {
            case TransformerType.CurrencyConvert:
                newTransformer = { type, fromCurrency: 'USD', toCurrency: 'EUR' } as CurrencyConvertTransformerConfig;
                break;
            case TransformerType.Replace:
                newTransformer = { type, searchValue: '', replaceValue: '', global: true } as ReplaceTransformerConfig;
                break;
            case TransformerType.Regex:
                newTransformer = { type, pattern: '', flags: '', extractGroup: 0 } as RegexTransformerConfig;
                break;
            case TransformerType.Split:
                newTransformer = { type, delimiter: ',' } as SplitTransformerConfig;
                break;
            default:
                newTransformer = { type };
        }

        runInAction(() => {
            field.transformers!.push(newTransformer);
        });
    };

    const removeTransformer = (fieldIndex: number, transformerIndex: number) => {
        const field = block.config.fields[fieldIndex];
        if (field.transformers) {
            runInAction(() => {
                field.transformers!.splice(transformerIndex, 1);
            });
        }
    };

    const removeField = (index: number) => {
        runInAction(() => {
            block.config.fields.splice(index, 1);
        });
    };

    const updateField = <K extends keyof ExtractionField>(index: number, key: K, value: ExtractionField[K]) => {
        runInAction(() => {
            block.config.fields[index][key] = value;
        });
    };

    const updateTransformer = <T extends TransformerConfig, K extends keyof T>(transformer: T, key: K, value: T[K]) => {
        runInAction(() => {
            transformer[key] = value;
        });
    };

    const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const attributeDescriptions: Record<string, string> = {
        [AttributeType.Text]: 'Returns the full visible text of the element and all its children (uses innerText)',
        [AttributeType.InnerHTML]: 'Returns the raw HTML markup inside the element',
        [AttributeType.Href]: 'Returns the resolved URL from a link element',
        [AttributeType.Src]: 'Returns the source URL from an image, video, or script element',
        [AttributeType.Value]: 'Returns the current value of a form input element',
    };

    const formatPreviewDate = (date: Date, format: string) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return format
            .replace('YYYY', String(date.getFullYear()))
            .replace('MM', pad(date.getMonth() + 1))
            .replace('DD', pad(date.getDate()))
            .replace('HH', pad(date.getHours()))
            .replace('mm', pad(date.getMinutes()))
            .replace('ss', pad(date.getSeconds()));
    };

    const evaluatePreviewFormula = (formula: string, record: Record<string, any>) => {
        let hasNullReference = false;
        const expression = formula.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const val = record[key];
            if (val === null || val === undefined || val === '') {
                hasNullReference = true;
                return '0';
            }
            const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
            if (Number.isNaN(num)) {
                hasNullReference = true;
                return '0';
            }
            return String(num);
        }).trim();

        if (hasNullReference) return null;

        let pos = 0;

        const skipWhitespace = () => {
            while (pos < expression.length && expression[pos] === ' ') pos++;
        };

        const parseNumber = (): number => {
            skipWhitespace();
            let numStr = '';
            if (expression[pos] === '-') {
                numStr += '-';
                pos++;
            }
            while (pos < expression.length && ((expression[pos] >= '0' && expression[pos] <= '9') || expression[pos] === '.')) {
                numStr += expression[pos++];
            }
            if (numStr === '' || numStr === '-') throw new Error(`Expected number at position ${pos}`);
            return parseFloat(numStr);
        };

        const parseMathFunction = (): number | null => {
            skipWhitespace();
            const mathFns: Record<string, (...args: number[]) => number> = {
                'Math.round': Math.round,
                'Math.floor': Math.floor,
                'Math.ceil': Math.ceil,
                'Math.abs': Math.abs,
                'Math.sqrt': Math.sqrt,
                'Math.min': Math.min,
                'Math.max': Math.max,
                'Math.pow': Math.pow,
            };
            for (const [name, fn] of Object.entries(mathFns)) {
                if (expression.substring(pos, pos + name.length) === name) {
                    pos += name.length;
                    skipWhitespace();
                    if (expression[pos] !== '(') throw new Error(`Expected '(' after ${name}`);
                    pos++;
                    const args: number[] = [parseAddSub()];
                    skipWhitespace();
                    while (expression[pos] === ',') {
                        pos++;
                        args.push(parseAddSub());
                        skipWhitespace();
                    }
                    if (expression[pos] !== ')') throw new Error(`Expected ')' after ${name} args`);
                    pos++;
                    return fn(...args);
                }
            }
            return null;
        };

        const parsePrimary = (): number => {
            skipWhitespace();
            const fnResult = parseMathFunction();
            if (fnResult !== null) return fnResult;
            if (expression[pos] === '(') {
                pos++;
                const val = parseAddSub();
                skipWhitespace();
                if (expression[pos] !== ')') throw new Error(`Expected ')' at position ${pos}`);
                pos++;
                return val;
            }
            return parseNumber();
        };

        const parseMulDiv = (): number => {
            let left = parsePrimary();
            skipWhitespace();
            while (pos < expression.length && (expression[pos] === '*' || expression[pos] === '/')) {
                const op = expression[pos++];
                const right = parsePrimary();
                left = op === '*' ? left * right : left / right;
                skipWhitespace();
            }
            return left;
        };

        const parseAddSub = (): number => {
            let left = parseMulDiv();
            skipWhitespace();
            while (pos < expression.length && (expression[pos] === '+' || expression[pos] === '-')) {
                const op = expression[pos++];
                const right = parseMulDiv();
                left = op === '+' ? left + right : left - right;
                skipWhitespace();
            }
            return left;
        };

        const result = parseAddSub();
        return typeof result === 'number' && !Number.isNaN(result) ? result : 0;
    };

    const getStaticPreviewValue = (field: ExtractionField) => {
        const staticType = field.staticType || 'constant';
        switch (staticType) {
            case 'constant':
                return field.staticValue ?? '';
            case 'uuid':
                return crypto.randomUUID();
            case 'random_number': {
                const min = field.staticMin ?? 0;
                const max = field.staticMax ?? 1000;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            case 'date':
                return formatPreviewDate(new Date(), field.staticDateFormat || 'YYYY-MM-DD HH:mm:ss');
            case 'auto_increment':
                return field.staticStartFrom ?? 1;
            default:
                return '';
        }
    };

    const runPreview = async () => {
        const extractedFields = block.config.fields.filter(f => f.mode !== 'static' && f.key);
        const staticFields = block.config.fields.filter(f => f.mode === 'static' && f.key);

        if (extractedFields.length === 0 && staticFields.length === 0) {
            setPreviewError('Add at least one field with a key to preview');
            setPreviewOpen(true);
            return;
        }

        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewData(null);
        setPreviewOpen(true);

        try {
            let extractScope: any = undefined;

            if (!block.config.resetScope && block.config.scopeSelector?.value) {
                extractScope = {
                    selector: block.config.scopeSelector.value,
                    selectorType: block.config.scopeSelector.type || 'css',
                    index: 0,
                };
            }

            const envFields = extractedFields.map((f) => ({
                key: f.key,
                selector: f.selector?.value || '',
                selectorType: (f.selector?.type || 'css') as string,
                attribute: f.attribute === AttributeType.InnerHTML ? 'html' : (f.attribute || 'text'),
                transformers: f.transformers ? JSON.parse(JSON.stringify(f.transformers)) : [],
                required: f.required || false,
                multiple: f.multiple || false,
            }));

            const record: Record<string, any> = {};

            for (const field of staticFields) {
                record[field.key] = getStaticPreviewValue(field);
            }

            if (envFields.length > 0) {
                const response = await sendToContentScript({
                    type: 'ENV_EXTRACT_RECORD',
                    data: {
                        fields: envFields,
                        scope: extractScope || undefined,
                    }
                });

                if (!response.success) {
                    setPreviewError(response.error || 'Extraction failed');
                    return;
                }

                const extractedRecord = response.data as Record<string, any>;
                for (const [key, value] of Object.entries(extractedRecord)) {
                    record[key] = value;
                }
            }

            for (const field of block.config.fields) {
                if (!field.key || !field.formula) continue;
                try {
                    record[field.key] = evaluatePreviewFormula(field.formula, record);
                } catch {
                }
            }

            for (const field of block.config.fields) {
                if (!field.key) continue;
                if (field.defaultValue !== undefined && field.defaultValue !== '' &&
                    (record[field.key] === null || record[field.key] === undefined || record[field.key] === '')) {
                    record[field.key] = field.defaultValue;
                }
            }

            setPreviewData(record);
        } catch (err: any) {
            setPreviewError(err.message || 'Failed to connect to page');
        } finally {
            setPreviewLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border p-3 rounded-md bg-muted/20">
                <Checkbox
                    id="reset-scope"
                    checked={block.config.resetScope || false}
                    onCheckedChange={(checked) => {
                        runInAction(() => {
                            block.config.resetScope = checked as boolean;
                        });
                    }}
                />
                <div className="flex flex-col">
                    <Label htmlFor="reset-scope" className="cursor-pointer font-medium">
                        Reset to Global Scope
                    </Label>
                    <span className="text-xs text-muted-foreground">
                        Ignore parent scope and extract from document root (use when navigating to new pages)
                    </span>
                </div>
            </div>
            <SelectorInput
                label="Scope Selector (Optional)"
                id="extract-scope-selector"
                placeholder=".container"
                helpText="Limit extraction to within this element"
                selector={block.config.scopeSelector}
                onSelectorChange={(sel) => {
                    runInAction(() => {
                        block.config.scopeSelector = sel;
                    });
                }}
                block={block.config.resetScope ? undefined : block}
            />

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <Label>Extraction Fields</Label>
                    <div className="flex items-center gap-1">
                        {block.config.fields.length > 0 && (
                            <Button onClick={runPreview} size="sm" variant="secondary" className="h-8" disabled={previewLoading}>
                                {previewLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                                Preview
                            </Button>
                        )}
                        <Button onClick={addStaticField} size="sm" variant="outline">
                            <Database className="w-4 h-4 mr-1" />
                            Static
                        </Button>
                        <Button onClick={addField} size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" />
                            Field
                        </Button>
                        {block.config.fields.length > 0 && (
                            <Button onClick={allExpanded ? collapseAll : expandAll} size="sm" variant="ghost" className="h-8 px-2 ml-auto" title={allExpanded ? 'Collapse All' : 'Expand All'}>
                                {allExpanded ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
                            </Button>
                        )}
                    </div>
                </div>

                {block.config.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fields added yet. Click "Add Field" or "Static" to start.
                    </p>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                        {block.config.fields.map((field, index) => {
                            const fieldId = getFieldId(field);
                            const isExpanded = expandedFields.has(fieldId);
                            const isStatic = field.mode === 'static';
                            return (
                                <SortableFieldItem key={fieldId} id={fieldId}>
                                    {(dragAttributes, dragListeners) => (<Observer>{() => {
                                        const field = block.config.fields[index];
                                        if (!field) return null;
                                        const isStatic = field.mode === 'static';
                                        const isExpanded = expandedFields.has(getFieldId(field));
                                        return (
                                            <div className={`border rounded-lg overflow-hidden ${isStatic ? 'border-primary/30' : ''}`}>
                                                <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => toggleField(field)}>
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <button
                                                            type="button"
                                                            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground hover:text-foreground touch-none shrink-0"
                                                            {...dragAttributes}
                                                            {...dragListeners}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <GripVertical className="w-4 h-4" />
                                                        </button>
                                                        <div className="shrink-0">
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                                        </div>
                                                        <div className="shrink-0">
                                                            {isStatic ? <Database className="w-3.5 h-3.5 text-primary" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                                                        </div>
                                                        <h4 className="font-medium text-sm truncate min-w-0">
                                                            {isStatic ? 'Static' : 'Field'} {index + 1}
                                                            {field.key && <span className="text-muted-foreground ml-1">({field.key})</span>}
                                                        </h4>
                                                        {!isExpanded && (
                                                            <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                                                                {isStatic
                                                                    ? (field.staticType || 'constant')
                                                                    : (field.attribute || 'text')}
                                                                {field.formula && <span className="ml-1 text-amber-500">fx</span>}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <Button
                                                            onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                                                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                                                            disabled={index === 0}
                                                            title="Move up"
                                                        >
                                                            <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                                                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                                                            disabled={index === block.config.fields.length - 1}
                                                            title="Move down"
                                                        >
                                                            <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </Button>
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeField(index);
                                                            }}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="p-4 space-y-3">

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="flex flex-col gap-2">
                                                                <Label htmlFor={`key-${index}`}>Key</Label>
                                                                <Input
                                                                    id={`key-${index}`}
                                                                    type="text"
                                                                    placeholder={isStatic ? "ref_id" : "title"}
                                                                    value={field.key}
                                                                    onChange={(e) => updateField(index, 'key', e.target.value)}
                                                                />
                                                            </div>

                                                            <div className="flex flex-col gap-2">
                                                                <Label htmlFor={`label-${index}`}>Label (Optional)</Label>
                                                                <Input
                                                                    id={`label-${index}`}
                                                                    type="text"
                                                                    placeholder={isStatic ? "Reference ID" : "Product Title"}
                                                                    value={field.label || ''}
                                                                    onChange={(e) => updateField(index, 'label', e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* === STATIC FIELD CONFIG === */}
                                                        {isStatic && (
                                                            <div className="flex flex-col gap-3 border rounded-md p-3 bg-primary/5">
                                                                <div className="flex flex-col gap-2">
                                                                    <Label htmlFor={`static-type-${index}`}>Value Type</Label>
                                                                    <Select
                                                                        value={field.staticType || 'constant'}
                                                                        onValueChange={(value) => updateField(index, 'staticType', value as StaticFieldType)}
                                                                    >
                                                                        <SelectTrigger id={`static-type-${index}`}>
                                                                            <SelectValue placeholder="Select type" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="constant">Constant Value</SelectItem>
                                                                            <SelectItem value="uuid">Random UUID</SelectItem>
                                                                            <SelectItem value="random_number">Random Number</SelectItem>
                                                                            <SelectItem value="date">Date / Time</SelectItem>
                                                                            <SelectItem value="auto_increment">Auto Increment</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {field.staticType === 'constant' && (
                                                                    <div className="flex flex-col gap-2">
                                                                        <Label htmlFor={`static-value-${index}`}>Value</Label>
                                                                        <Input
                                                                            id={`static-value-${index}`}
                                                                            type="text"
                                                                            placeholder="e.g. 30, in stock, etc."
                                                                            value={field.staticValue || ''}
                                                                            onChange={(e) => updateField(index, 'staticValue', e.target.value)}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {field.staticType === 'random_number' && (
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="flex flex-col gap-2">
                                                                            <Label htmlFor={`static-min-${index}`}>Min</Label>
                                                                            <Input
                                                                                id={`static-min-${index}`}
                                                                                type="number"
                                                                                placeholder="0"
                                                                                value={field.staticMin ?? ''}
                                                                                onChange={(e) => updateField(index, 'staticMin', e.target.value ? parseInt(e.target.value) : undefined)}
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2">
                                                                            <Label htmlFor={`static-max-${index}`}>Max</Label>
                                                                            <Input
                                                                                id={`static-max-${index}`}
                                                                                type="number"
                                                                                placeholder="1000"
                                                                                value={field.staticMax ?? ''}
                                                                                onChange={(e) => updateField(index, 'staticMax', e.target.value ? parseInt(e.target.value) : undefined)}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {field.staticType === 'date' && (
                                                                    <div className="flex flex-col gap-2">
                                                                        <Label htmlFor={`static-date-format-${index}`}>Format</Label>
                                                                        <Input
                                                                            id={`static-date-format-${index}`}
                                                                            type="text"
                                                                            placeholder="YYYY-MM-DD HH:mm:ss"
                                                                            value={field.staticDateFormat || ''}
                                                                            onChange={(e) => updateField(index, 'staticDateFormat', e.target.value)}
                                                                        />
                                                                        <p className="text-xs text-muted-foreground">
                                                                            YYYY=year, MM=month, DD=day, HH=hours, mm=minutes, ss=seconds
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {field.staticType === 'auto_increment' && (
                                                                    <div className="flex flex-col gap-2">
                                                                        <Label htmlFor={`static-start-${index}`}>Start From</Label>
                                                                        <Input
                                                                            id={`static-start-${index}`}
                                                                            type="number"
                                                                            placeholder="1"
                                                                            value={field.staticStartFrom ?? ''}
                                                                            onChange={(e) => updateField(index, 'staticStartFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {field.staticType === 'uuid' && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        A unique UUID (v4) will be generated for each extracted record.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* === EXTRACTED FIELD CONFIG === */}
                                                        {!isStatic && (
                                                            <>
                                                                <SelectorInput
                                                                    label="Field Selector"
                                                                    id={`field-selector-${index}`}
                                                                    placeholder="h1.title"
                                                                    selector={field.selector}
                                                                    onSelectorChange={(sel) => { updateField(index, 'selector', sel); }}
                                                                    parentSelector={block.config.scopeSelector?.value || null}
                                                                    block={block.config.resetScope ? undefined : (block.config.scopeSelector?.value ? undefined : block)}
                                                                />

                                                                <div className="flex flex-col gap-2">
                                                                    <Label htmlFor={`attribute-${index}`}>Attribute</Label>
                                                                    <Select
                                                                        value={field.attribute}
                                                                        onValueChange={(value) => updateField(index, 'attribute', value as AttributeType)}
                                                                    >
                                                                        <SelectTrigger id={`attribute-${index}`}>
                                                                            <SelectValue placeholder="Select attribute" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value={AttributeType.Text}>
                                                                                <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5 text-muted-foreground" /> Text</span>
                                                                            </SelectItem>
                                                                            <SelectItem value={AttributeType.InnerHTML}>
                                                                                <span className="flex items-center gap-2"><Code className="w-3.5 h-3.5 text-muted-foreground" /> Inner HTML</span>
                                                                            </SelectItem>
                                                                            <SelectItem value={AttributeType.Href}>
                                                                                <span className="flex items-center gap-2"><Link className="w-3.5 h-3.5 text-muted-foreground" /> Href</span>
                                                                            </SelectItem>
                                                                            <SelectItem value={AttributeType.Src}>
                                                                                <span className="flex items-center gap-2"><Image className="w-3.5 h-3.5 text-muted-foreground" /> Src</span>
                                                                            </SelectItem>
                                                                            <SelectItem value={AttributeType.Value}>
                                                                                <span className="flex items-center gap-2"><FormInput className="w-3.5 h-3.5 text-muted-foreground" /> Value</span>
                                                                            </SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {attributeDescriptions[field.attribute] && (
                                                                        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                                            <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                                                            {attributeDescriptions[field.attribute]}
                                                                        </p>
                                                                    )}
                                                                </div>

                                                                <div className="flex flex-col gap-2">
                                                                    <Label htmlFor={`defaultValue-${index}`}>Default Value (Optional)</Label>
                                                                    <Input
                                                                        id={`defaultValue-${index}`}
                                                                        type="text"
                                                                        placeholder="N/A"
                                                                        value={field.defaultValue || ''}
                                                                        onChange={(e) => updateField(index, 'defaultValue', e.target.value)}
                                                                    />
                                                                </div>

                                                                <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/10">
                                                                    <div className="flex items-start gap-2">
                                                                        <Checkbox
                                                                            id={`required-${index}`}
                                                                            checked={field.required || false}
                                                                            onCheckedChange={(checked) => updateField(index, 'required', checked as boolean)}
                                                                            className="mt-0.5"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <Label htmlFor={`required-${index}`} className="cursor-pointer text-sm font-medium">
                                                                                Required
                                                                            </Label>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Skip the entire record if this field is empty or not found
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-start gap-2">
                                                                        <Checkbox
                                                                            id={`multiple-${index}`}
                                                                            checked={field.multiple || false}
                                                                            onCheckedChange={(checked) => updateField(index, 'multiple', checked as boolean)}
                                                                            className="mt-0.5"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <Label htmlFor={`multiple-${index}`} className="cursor-pointer text-sm font-medium">
                                                                                Multiple
                                                                            </Label>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Extract from all matching elements and join values with commas
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-3 border-t pt-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="flex items-center gap-2">
                                                                            <Wand2 className="w-4 h-4" />
                                                                            Transformers
                                                                        </Label>
                                                                        <Select onValueChange={(value) => addTransformer(index, value as TransformerType)}>
                                                                            <SelectTrigger className="w-[180px] h-8">
                                                                                <SelectValue placeholder="Add transformer" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value={TransformerType.Uppercase}>Uppercase</SelectItem>
                                                                                <SelectItem value={TransformerType.Lowercase}>Lowercase</SelectItem>
                                                                                <SelectItem value={TransformerType.Capitalize}>Capitalize</SelectItem>
                                                                                <SelectItem value={TransformerType.TitleCase}>Title Case</SelectItem>
                                                                                <SelectItem value={TransformerType.Trim}>Trim</SelectItem>
                                                                                <SelectItem value={TransformerType.Replace}>Replace</SelectItem>
                                                                                <SelectItem value={TransformerType.Regex}>Regex</SelectItem>
                                                                                <SelectItem value={TransformerType.Split}>Split</SelectItem>
                                                                                <SelectItem value={TransformerType.ParseNumber}>Parse Number</SelectItem>
                                                                                <SelectItem value={TransformerType.CurrencyConvert}>Currency Convert</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>

                                                                    {field.transformers && field.transformers.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            {field.transformers.map((transformer, tIndex) => (
                                                                                <div key={tIndex} className="border rounded-md p-3 bg-muted/20">
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <span className="text-sm font-medium capitalize">
                                                                                            {transformer.type.replace('_', ' ')}
                                                                                        </span>
                                                                                        <Button
                                                                                            onClick={() => removeTransformer(index, tIndex)}
                                                                                            size="sm"
                                                                                            variant="ghost"
                                                                                            className="h-6 w-6 p-0"
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3 text-destructive" />
                                                                                        </Button>
                                                                                    </div>

                                                                                    {transformer.type === TransformerType.CurrencyConvert && (
                                                                                        <div className="grid grid-cols-2 gap-2">
                                                                                            <div>
                                                                                                <Label className="text-xs">From</Label>
                                                                                                <Select
                                                                                                    value={(transformer as CurrencyConvertTransformerConfig).fromCurrency}
                                                                                                    onValueChange={(value) => {
                                                                                                        updateTransformer(transformer as CurrencyConvertTransformerConfig, 'fromCurrency', value as any);
                                                                                                    }}
                                                                                                >
                                                                                                    <SelectTrigger className="h-8">
                                                                                                        <SelectValue />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent>
                                                                                                        <SelectItem value="MAD">MAD</SelectItem>
                                                                                                        <SelectItem value="USD">USD</SelectItem>
                                                                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                                                                        <SelectItem value="GBP">GBP</SelectItem>
                                                                                                        <SelectItem value="JPY">JPY</SelectItem>
                                                                                                        <SelectItem value="CNY">CNY</SelectItem>
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </div>
                                                                                            <div>
                                                                                                <Label className="text-xs">To</Label>
                                                                                                <Select
                                                                                                    value={(transformer as CurrencyConvertTransformerConfig).toCurrency}
                                                                                                    onValueChange={(value) => {
                                                                                                        updateTransformer(transformer as CurrencyConvertTransformerConfig, 'toCurrency', value as any);
                                                                                                    }}
                                                                                                >
                                                                                                    <SelectTrigger className="h-8">
                                                                                                        <SelectValue />
                                                                                                    </SelectTrigger>
                                                                                                    <SelectContent>
                                                                                                        <SelectItem value="MAD">MAD</SelectItem>
                                                                                                        <SelectItem value="USD">USD</SelectItem>
                                                                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                                                                        <SelectItem value="GBP">GBP</SelectItem>
                                                                                                        <SelectItem value="JPY">JPY</SelectItem>
                                                                                                        <SelectItem value="CNY">CNY</SelectItem>
                                                                                                    </SelectContent>
                                                                                                </Select>
                                                                                            </div>
                                                                                            <div className="col-span-2">
                                                                                                <Label className="text-xs">Fixed Rate (Optional)</Label>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    step="0.01"
                                                                                                    placeholder="Auto"
                                                                                                    className="h-8"
                                                                                                    value={(transformer as CurrencyConvertTransformerConfig).fixedRate || ''}
                                                                                                    onChange={(e) => {
                                                                                                        updateTransformer(transformer as CurrencyConvertTransformerConfig, 'fixedRate', e.target.value ? parseFloat(e.target.value) : undefined);
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {transformer.type === TransformerType.Replace && (
                                                                                        <div className="space-y-2">
                                                                                            <div>
                                                                                                <Label className="text-xs">Search</Label>
                                                                                                <Input
                                                                                                    className="h-8"
                                                                                                    value={(transformer as ReplaceTransformerConfig).searchValue}
                                                                                                    onChange={(e) => {
                                                                                                        updateTransformer(transformer as ReplaceTransformerConfig, 'searchValue', e.target.value);
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <Label className="text-xs">Replace With</Label>
                                                                                                <Input
                                                                                                    className="h-8"
                                                                                                    value={(transformer as ReplaceTransformerConfig).replaceValue}
                                                                                                    onChange={(e) => {
                                                                                                        updateTransformer(transformer as ReplaceTransformerConfig, 'replaceValue', e.target.value);
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Checkbox
                                                                                                    id={`global-${index}-${tIndex}`}
                                                                                                    checked={(transformer as ReplaceTransformerConfig).global || false}
                                                                                                    onCheckedChange={(checked) => {
                                                                                                        updateTransformer(transformer as ReplaceTransformerConfig, 'global', checked as boolean);
                                                                                                    }}
                                                                                                />
                                                                                                <Label htmlFor={`global-${index}-${tIndex}`} className="text-xs cursor-pointer">
                                                                                                    Global (replace all)
                                                                                                </Label>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {transformer.type === TransformerType.Regex && (() => {
                                                                                        const regexConfig = transformer as RegexTransformerConfig;
                                                                                        const isReplaceMode = regexConfig.replacement !== undefined && regexConfig.replacement !== '';
                                                                                        return (
                                                                                            <div className="space-y-2">
                                                                                                <div>
                                                                                                    <Label className="text-xs">Mode</Label>
                                                                                                    <Select
                                                                                                        value={isReplaceMode ? 'replace' : 'extract'}
                                                                                                        onValueChange={(value) => {
                                                                                                            if (value === 'replace') {
                                                                                                                updateTransformer(regexConfig, 'replacement', '');
                                                                                                                updateTransformer(regexConfig, 'extractGroup', undefined);
                                                                                                            } else {
                                                                                                                updateTransformer(regexConfig, 'replacement', undefined as any);
                                                                                                                updateTransformer(regexConfig, 'extractGroup', 0);
                                                                                                            }
                                                                                                        }}
                                                                                                    >
                                                                                                        <SelectTrigger className="h-8">
                                                                                                            <SelectValue />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                            <SelectItem value="extract">Extract Match</SelectItem>
                                                                                                            <SelectItem value="replace">Replace</SelectItem>
                                                                                                        </SelectContent>
                                                                                                    </Select>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <Label className="text-xs">Pattern</Label>
                                                                                                    <Input
                                                                                                        className="h-8 font-mono"
                                                                                                        placeholder={isReplaceMode ? "\\d+" : "(\\d+\\.?\\d*)"}
                                                                                                        value={regexConfig.pattern}
                                                                                                        onChange={(e) => {
                                                                                                            updateTransformer(regexConfig, 'pattern', e.target.value);
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <Label className="text-xs">Flags</Label>
                                                                                                    <Input
                                                                                                        className="h-8"
                                                                                                        placeholder="g, i, m"
                                                                                                        value={regexConfig.flags || ''}
                                                                                                        onChange={(e) => {
                                                                                                            updateTransformer(regexConfig, 'flags', e.target.value);
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                {isReplaceMode ? (
                                                                                                    <div>
                                                                                                        <Label className="text-xs">Replacement</Label>
                                                                                                        <Input
                                                                                                            className="h-8"
                                                                                                            placeholder="$1"
                                                                                                            value={regexConfig.replacement || ''}
                                                                                                            onChange={(e) => {
                                                                                                                updateTransformer(regexConfig, 'replacement', e.target.value);
                                                                                                            }}
                                                                                                        />
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div>
                                                                                                        <Label className="text-xs">Capture Group</Label>
                                                                                                        <Input
                                                                                                            type="number"
                                                                                                            className="h-8"
                                                                                                            placeholder="0"
                                                                                                            min={0}
                                                                                                            value={regexConfig.extractGroup ?? 0}
                                                                                                            onChange={(e) => {
                                                                                                                updateTransformer(regexConfig, 'extractGroup', e.target.value ? parseInt(e.target.value) : 0);
                                                                                                            }}
                                                                                                        />
                                                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                                                            0 = full match, 1 = first group, 2 = second group, etc.
                                                                                                        </p>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}

                                                                                    {transformer.type === TransformerType.Split && (
                                                                                        <div className="space-y-2">
                                                                                            <div>
                                                                                                <Label className="text-xs">Delimiter</Label>
                                                                                                <Input
                                                                                                    className="h-8"
                                                                                                    value={(transformer as SplitTransformerConfig).delimiter}
                                                                                                    onChange={(e) => {
                                                                                                        updateTransformer(transformer as SplitTransformerConfig, 'delimiter', e.target.value);
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <Label className="text-xs">Index (Optional)</Label>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    className="h-8"
                                                                                                    placeholder="All parts"
                                                                                                    value={(transformer as SplitTransformerConfig).index ?? ''}
                                                                                                    onChange={(e) => {
                                                                                                        updateTransformer(transformer as SplitTransformerConfig, 'index', e.target.value ? parseInt(e.target.value) : undefined);
                                                                                                    }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {(!field.transformers || field.transformers.length === 0) && (
                                                                        <p className="text-xs text-muted-foreground text-center py-2">
                                                                            No transformers added. Select from dropdown to add.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* === FORMULA (available for both modes) === */}
                                                        <div className="flex flex-col gap-2 border-t pt-3">
                                                            <Label htmlFor={`formula-${index}`} className="flex items-center gap-2">
                                                                <Calculator className="w-4 h-4" />
                                                                Formula (Optional)
                                                            </Label>
                                                            <Input
                                                                id={`formula-${index}`}
                                                                type="text"
                                                                placeholder="e.g. {{price}} + (0.2 * {{shipping}})"
                                                                value={field.formula || ''}
                                                                onChange={(e) => updateField(index, 'formula', e.target.value)}
                                                                className="font-mono text-sm"
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Use {'{{fieldKey}}'} to reference other fields. Supports +, -, *, /, (), Math.round(), Math.floor(), Math.ceil()
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}</Observer>)}
                                </SortableFieldItem>
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            <Dialog
                open={previewOpen}
                onOpenChange={(open) => {
                    setPreviewOpen(open);
                    if (!open) {
                        setPreviewData(null);
                        setPreviewError(null);
                    }
                }}
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center">
                            Extraction Preview
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            Test the current extract scope fields against the active page.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        {previewLoading && (
                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Extracting from page...
                            </div>
                        )}

                        {previewError && (
                            <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                                {previewError}
                            </div>
                        )}

                        {previewData && (
                            <div className="space-y-2">
                                {Object.entries(previewData).map(([key, value]) => (
                                    <div key={key} className="rounded-md border bg-muted/20 p-3">
                                        <div className="text-xs font-medium uppercase tracking-wide text-primary">
                                            {key}
                                        </div>
                                        <div className="mt-1 break-all rounded bg-muted/40 px-2 py-1.5 font-mono text-xs text-foreground">
                                            {value === null || value === undefined ? <span className="text-muted-foreground italic">empty</span> : String(value).substring(0, 500)}
                                            {String(value || '').length > 500 && '...'}
                                        </div>
                                    </div>
                                ))}

                                {Object.keys(previewData).length === 0 && (
                                    <p className="py-4 text-center text-sm text-muted-foreground">No data extracted</p>
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});
