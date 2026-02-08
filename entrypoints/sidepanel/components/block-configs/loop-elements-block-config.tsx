import { observer } from 'mobx-react-lite';
import { LoopElementsBlock } from '@/entrypoints/models/loop-elements-block';
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

interface LoopElementsBlockConfigProps {
    block: LoopElementsBlock;
}

export const LoopElementsBlockConfig = observer(({ block }: LoopElementsBlockConfigProps) => {
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
                    placeholder=".item"
                    value={block.config.selector?.value || ''}
                    onChange={(e) => {
                        if (!block.config.selector) {
                            block.config.selector = { type: SelectorType.CSS, value: e.target.value };
                        } else {
                            block.config.selector.value = e.target.value;
                        }
                    }}
                />
                <p className="text-xs text-muted-foreground">
                    Selector for elements to loop through
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="maxIterations">Max Iterations</Label>
                <Input
                    id="maxIterations"
                    type="number"
                    placeholder="Unlimited"
                    value={block.config.maxIterations || ''}
                    onChange={(e) => block.config.maxIterations = parseInt(e.target.value) || undefined}
                />
                <p className="text-xs text-muted-foreground">
                    Leave empty for unlimited iterations
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="indexVariable">Index Variable Name</Label>
                <Input
                    id="indexVariable"
                    type="text"
                    placeholder="index"
                    value={block.config.indexVariable || ''}
                    onChange={(e) => block.config.indexVariable = e.target.value || undefined}
                />
                <p className="text-xs text-muted-foreground">
                    Variable name to store the current iteration index
                </p>
            </div>
        </div>
    );
});
