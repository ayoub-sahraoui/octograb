import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { ScrollBlock } from '@/entrypoints/models/scroll-block';
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

interface ScrollBlockConfigProps {
    block: ScrollBlock;
}

export const ScrollBlockConfig = observer(({ block }: ScrollBlockConfigProps) => {
    const showPixels = block.config.behavior === 'pixels';
    const showSelector = block.config.behavior === 'element_into_view' || block.config.target === 'element';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="target">Scroll Target</Label>
                <Select
                    value={block.config.target}
                    onValueChange={(value: any) => runInAction(() => { block.config.target = value; })}
                >
                    <SelectTrigger id="target">
                        <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="window">Window</SelectItem>
                        <SelectItem value="element">Element</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="behavior">Scroll Behavior</Label>
                <Select
                    value={block.config.behavior}
                    onValueChange={(value: any) => runInAction(() => { block.config.behavior = value; })}
                >
                    <SelectTrigger id="behavior">
                        <SelectValue placeholder="Select behavior" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="pixels">Pixels</SelectItem>
                        <SelectItem value="element_into_view">Element Into View</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {showPixels && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="pixels">Pixels</Label>
                    <Input
                        id="pixels"
                        type="number"
                        placeholder="500"
                        value={block.config.pixels || ''}
                        onChange={(e) => runInAction(() => { block.config.pixels = parseInt(e.target.value) || undefined; })}
                    />
                    <p className="text-xs text-muted-foreground">
                        Positive values scroll down, negative values scroll up
                    </p>
                </div>
            )}

            {showSelector && (
                <SelectorInput
                    label="Scroll Element"
                    id="scroll-selector"
                    placeholder=".my-element"
                    helpText="The element to scroll or scroll into view"
                    selector={block.config.selector}
                    onSelectorChange={(sel) => runInAction(() => { block.config.selector = sel; })}
                    block={block}
                />
            )}

            <div className="flex items-center gap-2">
                <Checkbox
                    id="smooth"
                    checked={block.config.smooth || false}
                    onCheckedChange={(checked) => runInAction(() => { block.config.smooth = checked as boolean; })}
                />
                <Label htmlFor="smooth" className="cursor-pointer">
                    Smooth scrolling
                </Label>
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
