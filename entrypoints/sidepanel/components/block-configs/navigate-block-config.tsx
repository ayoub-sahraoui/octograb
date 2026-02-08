import { observer } from 'mobx-react-lite';
import { NavigateBlock, WaitUntilStrategy, NavigateBehavior } from '@/entrypoints/models/navigate-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface NavigateBlockConfigProps {
    block: NavigateBlock;
}

export const NavigateBlockConfig = observer(({ block }: NavigateBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="url">URL</Label>
                <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={block.config.url}
                    onChange={(e) => block.config.url = e.target.value}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="waitUntil">Wait Until</Label>
                <Select
                    value={block.config.waitUntil || WaitUntilStrategy.LOAD}
                    onValueChange={(value) => block.config.waitUntil = value as WaitUntilStrategy}
                >
                    <SelectTrigger id="waitUntil">
                        <SelectValue placeholder="Select wait strategy" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={WaitUntilStrategy.LOAD}>Load</SelectItem>
                        <SelectItem value={WaitUntilStrategy.DOM_CONTENT_LOADED}>DOM Content Loaded</SelectItem>
                        <SelectItem value={WaitUntilStrategy.NETWORK_IDLE}>Network Idle</SelectItem>
                        <SelectItem value={WaitUntilStrategy.TIMEOUT}>Timeout</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="behavior">Behavior</Label>
                <Select
                    value={block.config.behavior || NavigateBehavior.SAME_TAB}
                    onValueChange={(value) => block.config.behavior = value as NavigateBehavior}
                >
                    <SelectTrigger id="behavior">
                        <SelectValue placeholder="Select behavior" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NavigateBehavior.SAME_TAB}>Same Tab</SelectItem>
                        <SelectItem value={NavigateBehavior.NEW_TAB}>New Tab</SelectItem>
                        <SelectItem value={NavigateBehavior.REPLACE}>Replace</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                    id="timeout"
                    type="number"
                    placeholder="30000"
                    value={block.config.timeout || ''}
                    onChange={(e) => block.config.timeout = parseInt(e.target.value) || undefined}
                />
            </div>
        </div>
    );
});
