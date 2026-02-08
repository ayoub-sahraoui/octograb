import { observer } from 'mobx-react-lite';
import { ExtractScopeBlock, ExtractionField } from '@/entrypoints/models/extract-scope-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AttributeType } from '@/entrypoints/models/enums';

interface ExtractScopeBlockConfigProps {
    block: ExtractScopeBlock;
}

export const ExtractScopeBlockConfig = observer(({ block }: ExtractScopeBlockConfigProps) => {
    const addField = () => {
        const newField: ExtractionField = {
            key: '',
            selector: { type: SelectorType.CSS, value: '' },
            attribute: AttributeType.Text,
            required: false,
            multiple: false,
        };
        block.config.fields.push(newField);
    };

    const removeField = (index: number) => {
        block.config.fields.splice(index, 1);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="scopeSelector">Scope Selector (Optional)</Label>
                <Input
                    id="scopeSelector"
                    type="text"
                    placeholder=".container"
                    value={block.config.scopeSelector?.value || ''}
                    onChange={(e) => {
                        if (!block.config.scopeSelector) {
                            block.config.scopeSelector = { type: SelectorType.CSS, value: e.target.value };
                        } else {
                            block.config.scopeSelector.value = e.target.value;
                        }
                    }}
                />
                <p className="text-xs text-muted-foreground">
                    Limit extraction to within this element
                </p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Label>Extraction Fields</Label>
                    <Button onClick={addField} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        Add Field
                    </Button>
                </div>

                {block.config.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No fields added yet. Click "Add Field" to start.
                    </p>
                )}

                {block.config.fields.map((field, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Field {index + 1}</h4>
                            <Button
                                onClick={() => removeField(index)}
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                            >
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor={`key-${index}`}>Key</Label>
                                <Input
                                    id={`key-${index}`}
                                    type="text"
                                    placeholder="title"
                                    value={field.key}
                                    onChange={(e) => field.key = e.target.value}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <Label htmlFor={`label-${index}`}>Label (Optional)</Label>
                                <Input
                                    id={`label-${index}`}
                                    type="text"
                                    placeholder="Product Title"
                                    value={field.label || ''}
                                    onChange={(e) => field.label = e.target.value}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor={`selector-${index}`}>Selector</Label>
                            <Input
                                id={`selector-${index}`}
                                type="text"
                                placeholder="h1.title"
                                value={field.selector.value}
                                onChange={(e) => field.selector.value = e.target.value}
                            />
                        </div>

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

                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`required-${index}`}
                                    checked={field.required || false}
                                    onCheckedChange={(checked) => field.required = checked as boolean}
                                />
                                <Label htmlFor={`required-${index}`} className="cursor-pointer text-sm">
                                    Required
                                </Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`multiple-${index}`}
                                    checked={field.multiple || false}
                                    onCheckedChange={(checked) => field.multiple = checked as boolean}
                                />
                                <Label htmlFor={`multiple-${index}`} className="cursor-pointer text-sm">
                                    Multiple
                                </Label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
