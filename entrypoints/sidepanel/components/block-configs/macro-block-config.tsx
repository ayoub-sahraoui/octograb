import { observer } from 'mobx-react-lite';
import { MacroBlock } from '@/entrypoints/models/macro-block';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface MacroBlockConfigProps {
    block: MacroBlock;
}

export const MacroBlockConfig = observer(({ block }: MacroBlockConfigProps) => {
    const parameters = block.config.parameters || {};

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="macroId">Macro ID</Label>
                <Input
                    id="macroId"
                    placeholder="macro-uuid-or-name"
                    value={block.config.macroId}
                    onChange={(e) => block.setMacroId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Reference to the macro blueprint to execute
                </p>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Parameters</Label>
                <div className="flex flex-col gap-2">
                    {Object.entries(parameters).map(([name, value]) => (
                        <div key={name} className="flex gap-2 items-center">
                            <Input
                                placeholder="Name"
                                value={name}
                                disabled
                                className="flex-1"
                            />
                            <Input
                                placeholder="Value"
                                value={value}
                                onChange={(e) => block.setParameter(name, e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    const newParams = { ...parameters };
                                    delete newParams[name];
                                    block.setParameters(newParams);
                                }}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Input
                            id="newParamName"
                            placeholder="New parameter name"
                            className="flex-1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.currentTarget;
                                    const name = input.value.trim();
                                    if (name) {
                                        block.setParameter(name, '');
                                        input.value = '';
                                    }
                                }
                            }}
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                const input = document.getElementById('newParamName') as HTMLInputElement;
                                const name = input?.value.trim();
                                if (name) {
                                    block.setParameter(name, '');
                                    input.value = '';
                                }
                            }}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Parameters passed to the macro (press Enter to add)
                </p>
            </div>
        </div>
    );
});
