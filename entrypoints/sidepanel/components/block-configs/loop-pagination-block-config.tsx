import { observer } from 'mobx-react-lite';
import { LoopPaginationBlock } from '@/entrypoints/models/loop-pagination-block';
import { SelectorType } from '@/entrypoints/models/selector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface LoopPaginationBlockConfigProps {
    block: LoopPaginationBlock;
}

export const LoopPaginationBlockConfig = observer(({ block }: LoopPaginationBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="selectorType">Next Button Selector Type</Label>
                <Select
                    value={block.config.nextButtonSelector?.type || 'css'}
                    onValueChange={(value: any) => {
                        if (!block.config.nextButtonSelector) {
                            block.config.nextButtonSelector = { type: value, value: '' };
                        } else {
                            block.config.nextButtonSelector.type = value;
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
                <Label htmlFor="nextButtonSelector">Next Button Selector</Label>
                <Input
                    id="nextButtonSelector"
                    type="text"
                    placeholder=".next-page"
                    value={block.config.nextButtonSelector?.value || ''}
                    onChange={(e) => {
                        if (!block.config.nextButtonSelector) {
                            block.config.nextButtonSelector = { type: SelectorType.CSS, value: e.target.value };
                        } else {
                            block.config.nextButtonSelector.value = e.target.value;
                        }
                    }}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="maxPages">Max Pages</Label>
                <Input
                    id="maxPages"
                    type="number"
                    placeholder="Unlimited"
                    value={block.config.maxPages || ''}
                    onChange={(e) => block.config.maxPages = parseInt(e.target.value) || undefined}
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty for unlimited pages
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="delayBetweenPages">Delay Between Pages (ms)</Label>
                <Input
                    id="delayBetweenPages"
                    type="number"
                    placeholder="1000"
                    value={block.config.delayBetweenPages || ''}
                    onChange={(e) => block.config.delayBetweenPages = parseInt(e.target.value) || undefined}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="onNoNextButton">On No Next Button</Label>
                <Select
                    value={block.config.onNoNextButton || 'stop'}
                    onValueChange={(value: any) => block.config.onNoNextButton = value}
                >
                    <SelectTrigger id="onNoNextButton">
                        <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="stop">Stop</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Action to take when next button is not found
                </p>
            </div>
        </div>
    );
});
