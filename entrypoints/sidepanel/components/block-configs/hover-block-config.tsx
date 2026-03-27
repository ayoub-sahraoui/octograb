import { observer } from 'mobx-react-lite';
import { HoverBlock } from '@/entrypoints/models/hover-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorInput } from '../selector-input';

interface HoverBlockConfigProps {
    block: HoverBlock;
}

export const HoverBlockConfig = observer(({ block }: HoverBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Hover Target"
                id="hover-selector"
                placeholder=".dropdown, .tooltip-trigger"
                helpText="Element to hover over"
                selector={block.config.selector}
                onSelectorChange={(sel) => block.setSelector(sel)}
                block={block}
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="hoverDelay">Hover Delay (ms)</Label>
                <Input
                    id="hoverDelay"
                    type="number"
                    placeholder="0"
                    value={block.config.hoverDelay || ''}
                    onChange={(e) => block.setHoverDelay(parseInt(e.target.value) || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                    Time to wait after hover (for menus/tooltips to appear)
                </p>
            </div>
        </div>
    );
});
