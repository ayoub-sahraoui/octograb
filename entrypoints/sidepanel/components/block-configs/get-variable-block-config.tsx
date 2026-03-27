import { observer } from 'mobx-react-lite';
import { GetVariableBlock } from '@/entrypoints/models/get-variable-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface GetVariableBlockConfigProps {
    block: GetVariableBlock;
}

export const GetVariableBlockConfig = observer(({ block }: GetVariableBlockConfigProps) => {
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
                <p className="text-xs text-muted-foreground">
                    Name of the variable to retrieve
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="defaultValue">Default Value (optional)</Label>
                <Input
                    id="defaultValue"
                    placeholder="Default if variable not found"
                    value={block.config.defaultValue || ''}
                    onChange={(e) => block.setDefaultValue(e.target.value)}
                />
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
