import { observer } from 'mobx-react-lite';
import { GoBackBlock } from '@/entrypoints/models/go-back-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GoBackBlockConfigProps {
    block: GoBackBlock;
}

export const GoBackBlockConfig = observer(({ block }: GoBackBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="steps">Number of Steps</Label>
                <Input
                    id="steps"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={block.config.steps || 1}
                    onChange={(e) => block.config.steps = parseInt(e.target.value) || 1}
                />
                <p className="text-xs text-muted-foreground">
                    Number of pages to go back in browser history
                </p>
            </div>
        </div>
    );
});
