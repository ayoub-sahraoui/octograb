import { observer } from 'mobx-react-lite';
import { ClickBlock } from '@/entrypoints/models/click-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SelectorInput } from '../selector-input';
import { getBlockSelectorDescriptor } from '@/entrypoints/models/block-registry';

interface ClickBlockConfigProps {
    block: ClickBlock;
}

export const ClickBlockConfig = observer(({ block }: ClickBlockConfigProps) => {
    const selectorDescriptor = getBlockSelectorDescriptor(block.type, 'selector', block);

    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Click Target"
                id="click-selector"
                placeholder="button.submit, a.nav-link"
                helpText="Select a clickable element (button, link, or interactive element)"
                selector={block.config.selector}
                onSelectorChange={(sel) => block.setSelector(sel)}
                block={block}
                expectedElement={selectorDescriptor?.expectedElement}
                selectorCardinality={selectorDescriptor?.selectorCardinality}
                selectorRole={selectorDescriptor?.selectorRole}
            />

            <div className="flex items-center space-x-2">
                <Checkbox 
                    id="openInNewTab" 
                    checked={block.config.openInNewTab || false}
                    onCheckedChange={(checked) => block.setOpenInNewTab(checked === true)}
                />
                <Label htmlFor="openInNewTab" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Open in New Tab
                </Label>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="waitAfterClick">Wait After Click (ms)</Label>
                <Input
                    id="waitAfterClick"
                    type="number"
                    placeholder="Auto-detect"
                    value={block.config.waitAfterClick || ''}
                    onChange={(e) => block.setWaitAfterClick(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Leave empty to auto-detect navigation.</p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayBefore">Delay Before (ms)</Label>
                <Input
                    id="delayBefore"
                    type="number"
                    placeholder="0"
                    value={block.config.delayBefore || ''}
                    onChange={(e) => block.setDelayBefore(parseInt(e.target.value) || undefined)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayAfter">Delay After (ms)</Label>
                <Input
                    id="delayAfter"
                    type="number"
                    placeholder="0"
                    value={block.config.delayAfter || ''}
                    onChange={(e) => block.setDelayAfter(parseInt(e.target.value) || undefined)}
                />
            </div>
        </div>
    );
});
