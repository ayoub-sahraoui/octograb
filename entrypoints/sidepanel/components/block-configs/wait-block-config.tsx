import { observer } from 'mobx-react-lite';
import { WaitBlock } from '@/entrypoints/models/wait-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SelectorInput } from '../selector-input';

interface WaitBlockConfigProps {
    block: WaitBlock;
}

export const WaitBlockConfig = observer(({ block }: WaitBlockConfigProps) => {
    const showTimeout = block.config.type === 'timeout';
    const showSelector = block.config.type === 'selector_visible' || block.config.type === 'selector_hidden';
    const showIdleTime = block.config.type === 'network_idle';

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="type">Wait Type</Label>
                <Select
                    value={block.config.type}
                    onValueChange={(value: any) => block.setWaitType(value)}
                >
                    <SelectTrigger id="type">
                        <SelectValue placeholder="Select wait type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="timeout">Timeout</SelectItem>
                        <SelectItem value="selector_visible">Selector Visible</SelectItem>
                        <SelectItem value="selector_hidden">Selector Hidden</SelectItem>
                        <SelectItem value="network_idle">Network Idle</SelectItem>
                        <SelectItem value="dom_content_loaded">DOM Content Loaded</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {showTimeout && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="timeout">Timeout (ms)</Label>
                    <Input
                        id="timeout"
                        type="number"
                        placeholder="5000"
                        value={block.config.timeout || ''}
                        onChange={(e) => block.setTimeout(parseInt(e.target.value) || undefined)}
                    />
                </div>
            )}

            {showSelector && (
                <SelectorInput
                    label="Wait For Element"
                    id="wait-selector"
                    placeholder=".my-element"
                    helpText={`Wait until this element is ${block.config.type === 'selector_visible' ? 'visible' : 'hidden'}`}
                    selector={block.config.selector}
                    onSelectorChange={(sel) => block.setSelector(sel)}
                    block={block}
                />
            )}

            {showIdleTime && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="idleTime">Idle Time (ms)</Label>
                    <Input
                        id="idleTime"
                        type="number"
                        placeholder="500"
                        value={block.config.idleTime || ''}
                        onChange={(e) => block.setIdleTime(parseInt(e.target.value) || undefined)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Time to wait with no network activity
                    </p>
                </div>
            )}
        </div>
    );
});
