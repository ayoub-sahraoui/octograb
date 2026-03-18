import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ConditionBlock } from '@/entrypoints/models/condition-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SelectorInput } from '../selector-input';

interface ConditionBlockConfigProps {
    block: ConditionBlock;
}

export const ConditionBlockConfig = observer(({ block }: ConditionBlockConfigProps) => {
    const needsValue = [
        'text_contains',
        'text_equals',
        'text_regex',
        'count_equals',
        'count_greater_than'
    ].includes(block.config.check);

    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Condition Selector"
                id="condition-selector"
                placeholder=".my-element"
                helpText="The element to check the condition against"
                selector={block.config.selector}
                onSelectorChange={(sel) => runInAction(() => { block.config.selector = sel; })}
                block={block}
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="check">Condition Check</Label>
                <Select
                    value={block.config.check}
                    onValueChange={(value: any) => runInAction(() => { block.config.check = value; })}
                >
                    <SelectTrigger id="check">
                        <SelectValue placeholder="Select check type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="exists">Exists</SelectItem>
                        <SelectItem value="not_exists">Not Exists</SelectItem>
                        <SelectItem value="visible">Visible</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                        <SelectItem value="text_contains">Text Contains</SelectItem>
                        <SelectItem value="text_equals">Text Equals</SelectItem>
                        <SelectItem value="text_regex">Text Regex</SelectItem>
                        <SelectItem value="count_equals">Count Equals</SelectItem>
                        <SelectItem value="count_greater_than">Count Greater Than</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {needsValue && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="value">Value</Label>
                    <Input
                        id="value"
                        type={block.config.check.startsWith('count_') ? 'number' : 'text'}
                        placeholder={block.config.check.startsWith('count_') ? '5' : 'Enter value'}
                        value={block.config.value || ''}
                        onChange={(e) => runInAction(() => {
                            if (block.config.check.startsWith('count_')) {
                                block.config.value = parseInt(e.target.value) || undefined;
                            } else {
                                block.config.value = e.target.value;
                            }
                        })}
                    />
                </div>
            )}

            <div className="flex items-center gap-2">
                <Checkbox
                    id="negate"
                    checked={block.config.negate || false}
                    onCheckedChange={(checked) => runInAction(() => { block.config.negate = checked as boolean; })}
                />
                <Label htmlFor="negate" className="cursor-pointer">
                    Negate condition
                </Label>
            </div>
        </div>
    );
});
