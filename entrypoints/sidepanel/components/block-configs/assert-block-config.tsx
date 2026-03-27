import { observer } from 'mobx-react-lite';
import { AssertBlock, AssertCheckType } from '@/entrypoints/models/assert-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SelectorInput } from '../selector-input';

interface AssertBlockConfigProps {
    block: AssertBlock;
}

const checkTypeLabels: Record<AssertCheckType, string> = {
    'exists': 'Element Exists',
    'not_exists': 'Element Does Not Exist',
    'visible': 'Element is Visible',
    'hidden': 'Element is Hidden',
    'text_equals': 'Text Equals',
    'text_contains': 'Text Contains',
    'text_regex': 'Text Matches Regex',
};

export const AssertBlockConfig = observer(({ block }: AssertBlockConfigProps) => {
    const needsValue = block.config.check === 'text_equals' ||
        block.config.check === 'text_contains' ||
        block.config.check === 'text_regex';

    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Target Element"
                id="assert-selector"
                placeholder=".my-element"
                helpText="Element to assert against"
                selector={block.config.selector}
                onSelectorChange={(sel) => block.setSelector(sel)}
                block={block}
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="check">Assertion Type</Label>
                <Select
                    value={block.config.check}
                    onValueChange={(value: AssertCheckType) => block.setCheck(value)}
                >
                    <SelectTrigger id="check">
                        <SelectValue placeholder="Select assertion type" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(checkTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {needsValue && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="value">Expected Value</Label>
                    <Input
                        id="value"
                        placeholder="Expected text..."
                        value={block.config.value || ''}
                        onChange={(e) => block.setValue(e.target.value)}
                    />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                    id="timeout"
                    type="number"
                    placeholder="5000"
                    value={block.config.timeout || ''}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        block.setTimeout(isNaN(val) ? undefined : val);
                    }}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="failMessage">Custom Error Message (optional)</Label>
                <Input
                    id="failMessage"
                    placeholder="Assertion failed..."
                    value={block.config.failMessage || ''}
                    onChange={(e) => block.setFailMessage(e.target.value)}
                />
            </div>
        </div>
    );
});
