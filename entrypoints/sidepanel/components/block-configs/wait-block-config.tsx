import { observer } from 'mobx-react-lite';
import { WaitBlock } from '@/entrypoints/models/wait-block';
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
                    onValueChange={(value: any) => block.config.type = value}
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
                        onChange={(e) => block.config.timeout = parseInt(e.target.value) || undefined}
                    />
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

            {showIdleTime && (
                <div className="flex flex-col gap-2">
                    <Label htmlFor="idleTime">Idle Time (ms)</Label>
                    <Input
                        id="idleTime"
                        type="number"
                        placeholder="500"
                        value={block.config.idleTime || ''}
                        onChange={(e) => block.config.idleTime = parseInt(e.target.value) || undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                        Time to wait with no network activity
                    </p>
                </div>
            )}
        </div>
    );
});
