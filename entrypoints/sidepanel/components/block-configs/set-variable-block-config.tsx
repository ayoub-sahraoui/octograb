import { observer } from 'mobx-react-lite';
import { SetVariableBlock } from '@/entrypoints/models/set-variable-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SetVariableBlockConfigProps {
    block: SetVariableBlock;
}

export const SetVariableBlockConfig = observer(({ block }: SetVariableBlockConfigProps) => {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="name">Variable Name</Label>
                <Input
                    id="name"
                    placeholder="myVariable"
                    value={block.config.name}
                    onChange={(e) => block.setVariableName(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="value">Variable Value</Label>
                <Textarea
                    id="value"
                    placeholder="Value or {{otherVariable}}"
                    value={block.config.value}
                    onChange={(e) => block.setVariableValue(e.target.value)}
                    rows={3}
                />
                <p className="text-xs text-muted-foreground">
                    Use {'{{variableName}}'} to reference other variables
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="scope">Variable Scope</Label>
                <Select
                    value={block.config.scope || 'local'}
                    onValueChange={(value: 'local' | 'global' | 'blueprint') => block.setVariableScope(value)}
                >
                    <SelectTrigger id="scope">
                        <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="local">Local (loop iteration)</SelectItem>
                        <SelectItem value="global">Global (entire execution)</SelectItem>
                        <SelectItem value="blueprint">Blueprint (shared across executions)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
});
