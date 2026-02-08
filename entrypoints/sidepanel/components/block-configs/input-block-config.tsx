import { observer } from 'mobx-react-lite';
import { InputBlock } from '@/entrypoints/models/input-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface InputBlockConfigProps {
    block: InputBlock;
}

export const InputBlockConfig = observer(({ block }: InputBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="selectorType">Selector Type</Label>
                <Select
                    value={block.config.selector?.type || 'css'}
                    onValueChange={(value: any) => {
                        if (!block.config.selector) {
                            block.config.selector = { type: value, value: '' };
                        } else {
                            block.config.selector.type = value;
                        }
                    }}
                >
                    <SelectTrigger id="selectorType">
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="xpath">XPath</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="selector">Selector</Label>
                <Input
                    id="selector"
                    type="text"
                    placeholder="input[name='email']"
                    value={block.config.selector?.value || ''}
                    onChange={(e) => {
                        if (!block.config.selector) {
                            block.config.selector = { type: SelectorType.CSS, value: e.target.value };
                        } else {
                            block.config.selector.value = e.target.value;
                        }
                    }}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="value">Value</Label>
                <Textarea
                    id="value"
                    placeholder="Enter the text to input"
                    value={block.config.value}
                    onChange={(e) => block.config.value = e.target.value}
                    rows={3}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayBefore">Delay Before (ms)</Label>
                <Input
                    id="delayBefore"
                    type="number"
                    placeholder="0"
                    value={block.config.delayBefore || ''}
                    onChange={(e) => block.config.delayBefore = parseInt(e.target.value) || undefined}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayAfter">Delay After (ms)</Label>
                <Input
                    id="delayAfter"
                    type="number"
                    placeholder="0"
                    value={block.config.delayAfter || ''}
                    onChange={(e) => block.config.delayAfter = parseInt(e.target.value) || undefined}
                />
            </div>
        </div>
    );
});
