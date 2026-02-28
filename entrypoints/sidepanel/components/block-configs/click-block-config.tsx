import { observer } from 'mobx-react-lite';
import { ClickBlock } from '@/entrypoints/models/click-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorInput } from '../selector-input';

interface ClickBlockConfigProps {
    block: ClickBlock;
}

export const ClickBlockConfig = observer(({ block }: ClickBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Click Target"
                id="click-selector"
                placeholder="button.submit"
                helpText="The element to click on"
                selector={block.config.selector}
                onSelectorChange={(sel) => { block.config.selector = sel; }}
                block={block}
            />

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
