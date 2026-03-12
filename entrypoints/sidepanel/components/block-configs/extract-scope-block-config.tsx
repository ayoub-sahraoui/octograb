import { observer } from 'mobx-react-lite';
import { ExtractScopeBlock, ExtractionField, StaticFieldType } from '@/entrypoints/models/extract-scope-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronDown, ChevronRight, Wand2, ChevronsDownUp, ChevronsUpDown, Database, Calculator } from 'lucide-react';
import { useState } from 'react';
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

interface ExtractScopeBlockConfigProps {
    block: ExtractScopeBlock;
}

export const ExtractScopeBlockConfig = observer(({ block }: ExtractScopeBlockConfigProps) => {
    const [expandedFields, setExpandedFields] = useState<Set<number>>(new Set());

    const toggleField = (index: number) => {
        const newExpanded = new Set(expandedFields);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedFields(newExpanded);
    };

    const collapseAll = () => setExpandedFields(new Set());
    const expandAll = () => setExpandedFields(new Set(block.config.fields.map((_, i) => i)));
    const allExpanded = expandedFields.size === block.config.fields.length && block.config.fields.length > 0;

    const addField = () => {
        const newField: ExtractionField = {
            key: '',
            selector: { type: SelectorType.CSS, value: '' },
            attribute: AttributeType.Text,
            required: false,
            multiple: false,
            transformers: [],
            mode: 'extracted',
        };
        block.config.fields.push(newField);
        // Auto-expand newly added field
        setExpandedFields(new Set([...expandedFields, block.config.fields.length - 1]));
    };

    const addStaticField = () => {
        const newField: ExtractionField = {
            key: '',
            selector: { type: SelectorType.CSS, value: '' },
            attribute: AttributeType.Text,
            mode: 'static',
            staticType: 'constant',
            staticValue: '',
        };
        block.config.fields.push(newField);
        setExpandedFields(new Set([...expandedFields, block.config.fields.length - 1]));
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

        field.transformers.push(newTransformer);
    };

    const removeTransformer = (fieldIndex: number, transformerIndex: number) => {
        const field = block.config.fields[fieldIndex];
        if (field.transformers) {
            field.transformers.splice(transformerIndex, 1);
        }
    };

    const removeField = (index: number) => {
        block.config.fields.splice(index, 1);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border p-3 rounded-md bg-muted/20">
                <Checkbox
                    id="reset-scope"
                    checked={block.config.resetScope || false}
                    onCheckedChange={(checked) => block.config.resetScope = checked as boolean}
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
                onSelectorChange={(sel) => { block.config.scopeSelector = sel; }}
                block={block.config.resetScope ? undefined : block}
            />

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label>Extraction Fields</Label>
                    <div className="flex items-center gap-1">
                        {block.config.fields.length > 0 && (
                            <Button onClick={allExpanded ? collapseAll : expandAll} size="sm" variant="ghost" className="h-8 px-2" title={allExpanded ? 'Collapse All' : 'Expand All'}>
                                {allExpanded ? <ChevronsDownUp className="w-4 h-4" /> : <ChevronsUpDown className="w-4 h-4" />}
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
                    </div>
                </div>

                {block.config.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fields added yet. Click "Add Field" or "Static" to start.
                    </p>
                )}

                {block.config.fields.map((field, index) => {
                    const isExpanded = expandedFields.has(index);
                    const isStatic = field.mode === 'static';
                    return (
                        <div key={index} className={`border rounded-lg overflow-hidden ${isStatic ? 'border-blue-500/30' : ''}`}>
                            <div className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50" onClick={() => toggleField(index)}>
                                <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {isStatic ? <Database className="w-3.5 h-3.5 text-blue-500" /> : null}
                                    <h4 className="font-medium text-sm">
                                        {isStatic ? 'Static' : 'Field'} {index + 1}
                                        {field.key && <span className="text-muted-foreground ml-2">({field.key})</span>}
                                    </h4>
                                    {!isExpanded && (
                                        <span className="text-xs text-muted-foreground">
                                            {isStatic
                                                ? (field.staticType || 'constant')
                                                : (field.attribute || 'text')}
                                            {field.formula && <span className="ml-1 text-amber-500">fx</span>}
                                        </span>
                                    )}
                                </div>
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
                                                onChange={(e) => field.key = e.target.value}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Label htmlFor={`label-${index}`}>Label (Optional)</Label>
                                            <Input
                                                id={`label-${index}`}
                                                type="text"
                                                placeholder={isStatic ? "Reference ID" : "Product Title"}
                                                value={field.label || ''}
                                                onChange={(e) => field.label = e.target.value}
                                            />
                                        </div>
                                    </div>

                                    {/* === STATIC FIELD CONFIG === */}
                                    {isStatic && (
                                        <div className="flex flex-col gap-3 border rounded-md p-3 bg-blue-500/5">
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor={`static-type-${index}`}>Value Type</Label>
                                                <Select
                                                    value={field.staticType || 'constant'}
                                                    onValueChange={(value) => field.staticType = value as StaticFieldType}
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
                                                        onChange={(e) => field.staticValue = e.target.value}
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
                                                            onChange={(e) => field.staticMin = e.target.value ? parseInt(e.target.value) : undefined}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <Label htmlFor={`static-max-${index}`}>Max</Label>
                                                        <Input
                                                            id={`static-max-${index}`}
                                                            type="number"
                                                            placeholder="1000"
                                                            value={field.staticMax ?? ''}
                                                            onChange={(e) => field.staticMax = e.target.value ? parseInt(e.target.value) : undefined}
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
                                                        onChange={(e) => field.staticDateFormat = e.target.value}
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
                                                        onChange={(e) => field.staticStartFrom = e.target.value ? parseInt(e.target.value) : undefined}
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
                                                onSelectorChange={(sel) => { field.selector = sel; }}
                                                parentSelector={block.config.scopeSelector?.value || null}
                                                block={block.config.resetScope ? undefined : (block.config.scopeSelector?.value ? undefined : block)}
                                            />

                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor={`attribute-${index}`}>Attribute</Label>
                                                <Select
                                                    value={field.attribute}
                                                    onValueChange={(value) => field.attribute = value as AttributeType}
                                                >
                                                    <SelectTrigger id={`attribute-${index}`}>
                                                        <SelectValue placeholder="Select attribute" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value={AttributeType.Text}>Text</SelectItem>
                                                        <SelectItem value={AttributeType.InnerHTML}>Inner HTML</SelectItem>
                                                        <SelectItem value={AttributeType.Href}>Href</SelectItem>
                                                        <SelectItem value={AttributeType.Src}>Src</SelectItem>
                                                        <SelectItem value={AttributeType.Value}>Value</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor={`defaultValue-${index}`}>Default Value (Optional)</Label>
                                                <Input
                                                    id={`defaultValue-${index}`}
                                                    type="text"
                                                    placeholder="N/A"
                                                    value={field.defaultValue || ''}
                                                    onChange={(e) => field.defaultValue = e.target.value}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/10">
                                                <div className="flex items-start gap-2">
                                                    <Checkbox
                                                        id={`required-${index}`}
                                                        checked={field.required || false}
                                                        onCheckedChange={(checked) => field.required = checked as boolean}
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
                                                        onCheckedChange={(checked) => field.multiple = checked as boolean}
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
                                                                                    (transformer as CurrencyConvertTransformerConfig).fromCurrency = value as any;
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
                                                                                    (transformer as CurrencyConvertTransformerConfig).toCurrency = value as any;
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
                                                                                    (transformer as CurrencyConvertTransformerConfig).fixedRate = e.target.value ? parseFloat(e.target.value) : undefined;
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
                                                                                    (transformer as ReplaceTransformerConfig).searchValue = e.target.value;
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <Label className="text-xs">Replace With</Label>
                                                                            <Input
                                                                                className="h-8"
                                                                                value={(transformer as ReplaceTransformerConfig).replaceValue}
                                                                                onChange={(e) => {
                                                                                    (transformer as ReplaceTransformerConfig).replaceValue = e.target.value;
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Checkbox
                                                                                id={`global-${index}-${tIndex}`}
                                                                                checked={(transformer as ReplaceTransformerConfig).global || false}
                                                                                onCheckedChange={(checked) => {
                                                                                    (transformer as ReplaceTransformerConfig).global = checked as boolean;
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
                                                                                            regexConfig.replacement = '';
                                                                                            regexConfig.extractGroup = undefined;
                                                                                        } else {
                                                                                            regexConfig.replacement = undefined as any;
                                                                                            regexConfig.extractGroup = 0;
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
                                                                                        regexConfig.pattern = e.target.value;
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
                                                                                        regexConfig.flags = e.target.value;
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
                                                                                            regexConfig.replacement = e.target.value;
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
                                                                                            regexConfig.extractGroup = e.target.value ? parseInt(e.target.value) : 0;
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
                                                                                    (transformer as SplitTransformerConfig).delimiter = e.target.value;
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
                                                                                    (transformer as SplitTransformerConfig).index = e.target.value ? parseInt(e.target.value) : undefined;
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
                                            onChange={(e) => field.formula = e.target.value}
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
                })}
            </div>
        </div>
    );
});
