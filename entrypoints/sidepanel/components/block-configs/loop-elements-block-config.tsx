import { observer } from 'mobx-react-lite';
import { LoopElementsBlock } from '@/entrypoints/models/loop-elements-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectorInput } from '../selector-input';
import { getBlockSelectorDescriptor } from '@/entrypoints/models/block-registry';

interface LoopElementsBlockConfigProps {
    block: LoopElementsBlock;
}

export const LoopElementsBlockConfig = observer(({ block }: LoopElementsBlockConfigProps) => {
    const selectorDescriptor = getBlockSelectorDescriptor(block.type, 'selector', block);

    return (
        <div className="flex flex-col gap-4">
            <SelectorInput
                label="Loop Elements Selector"
                id="loop-elements-selector"
                placeholder=".item"
                helpText="Selector for elements to loop through"
                selector={block.config.selector}
                onSelectorChange={(sel) => block.setSelector(sel)}
                block={block}
                selectorCardinality={selectorDescriptor?.selectorCardinality}
                selectorRole={selectorDescriptor?.selectorRole}
            />

            <div className="flex flex-col gap-2">
                <Label htmlFor="maxIterations">Max Iterations</Label>
                <Input
                    id="maxIterations"
                    type="number"
                    placeholder="Unlimited"
                    value={block.config.maxIterations || ''}
                    onChange={(e) => block.setMaxIterations(parseInt(e.target.value) || undefined)}
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
                    onChange={(e) => block.setIndexVariable(e.target.value || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                    Variable name to store the current iteration index
                </p>
            </div>
        </div>
    );
});
