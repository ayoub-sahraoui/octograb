import { observer } from 'mobx-react-lite';
import { ScrollBlock } from '@/entrypoints/models/scroll-block';
import { SelectorType } from '@/entrypoints/models/selector';
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
                    onValueChange={(value: any) => block.config.target = value}
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
                    onValueChange={(value: any) => block.config.behavior = value}
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
                        onChange={(e) => block.config.pixels = parseInt(e.target.value) || undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                        Positive values scroll down, negative values scroll up
                    </p>
                </div>
            )}

            {showSelector && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="selector">Selector</Label>
                    <Input
                        id="selector"
                        type="text"
                        placeholder=".my-element"
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
            )}

            <div className="flex items-center gap-2">
                <Checkbox
                    id="smooth"
                    checked={block.config.smooth || false}
                    onCheckedChange={(checked) => block.config.smooth = checked as boolean}
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
                    onChange={(e) => block.config.delayAfter = parseInt(e.target.value) || undefined}
                />
            </div>
        </div>
    );
});
