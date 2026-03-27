import { observer } from 'mobx-react-lite';
import { SwitchFrameBlock, FrameTarget } from '@/entrypoints/models/switch-frame-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface SwitchFrameBlockConfigProps {
    block: SwitchFrameBlock;
}

export const SwitchFrameBlockConfig = observer(({ block }: SwitchFrameBlockConfigProps) => {
    const target = block.config.target;
    const isMain = target === 'main';
    const isIndex = typeof target === 'number';
    const isName = typeof target === 'string' && target !== 'main';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label>Frame Target</Label>
                <RadioGroup
                    value={isMain ? 'main' : isIndex ? 'index' : 'name'}
                    onValueChange={(value) => {
                        if (value === 'main') block.setTarget('main');
                        else if (value === 'index') block.setTarget(0);
                        else block.setTarget('');
                    }}
                    className="flex flex-col gap-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="main" id="main" />
                        <Label htmlFor="main" className="cursor-pointer">Main Page (default)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="index" id="index" />
                        <Label htmlFor="index" className="cursor-pointer">Frame Index</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="name" id="name" />
                        <Label htmlFor="name" className="cursor-pointer">Frame Name or ID</Label>
                    </div>
                </RadioGroup>
            </div>

            {isIndex && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="frameIndex">Frame Index</Label>
                    <Input
                        id="frameIndex"
                        type="number"
                        placeholder="0"
                        min={0}
                        value={target as number}
                        onChange={(e) => block.setTarget(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                        0 = first iframe, 1 = second iframe, etc.
                    </p>
                </div>
            )}

            {isName && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="frameName">Frame Name or ID</Label>
                    <Input
                        id="frameName"
                        placeholder="my-frame-id"
                        value={target as string}
                        onChange={(e) => block.setTarget(e.target.value)}
                    />
                </div>
            )}

            <div className="flex flex-col gap-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                    id="timeout"
                    type="number"
                    placeholder="5000"
                    value={block.config.timeout || ''}
                    onChange={(e) => block.setTimeout(parseInt(e.target.value) || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                    Time to wait for frame to be available
                </p>
            </div>
        </div>
    );
});
