import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { InputBlock } from '@/entrypoints/models/input-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectorInput } from '../selector-input';

interface InputBlockConfigProps {
    block: InputBlock;
}

export const InputBlockConfig = observer(({ block }: InputBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Input Target"
                id="input-selector"
                placeholder="input[name='email']"
                helpText="Select an input, textarea, or select element to type into"
                selector={block.config.selector}
                onSelectorChange={(sel) => runInAction(() => { block.config.selector = sel; })}
                block={block}
                expectedElement="input"
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="value">Value</Label>
                <Textarea
                    id="value"
                    placeholder="Enter the text to input"
                    value={block.config.value}
                    onChange={(e) => runInAction(() => { block.config.value = e.target.value; })}
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
                    onChange={(e) => runInAction(() => { block.config.delayBefore = parseInt(e.target.value) || undefined; })}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayAfter">Delay After (ms)</Label>
                <Input
                    id="delayAfter"
                    type="number"
                    placeholder="0"
                    value={block.config.delayAfter || ''}
                    onChange={(e) => runInAction(() => { block.config.delayAfter = parseInt(e.target.value) || undefined; })}
                />
            </div>
        </div>
    );
});
