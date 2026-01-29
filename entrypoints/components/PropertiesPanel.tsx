
import React from 'react';
import { Settings, X, Trash2, Scan } from 'lucide-react';
import { Block, ExtractionField } from '../../core/types';
import { BLOCK_TYPES } from '../../core/constants';
import { InputField } from './InputField';

interface PropertiesPanelProps {
  selectedBlock: Block | null;
  onUpdate: (id: string, updates: Partial<Block>) => void;
  onClose: () => void;
  onPick: (callback: (selector: string, xpath: string) => void, scoped: boolean) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  selectedBlock, 
  onUpdate, 
  onClose,
  onPick 
}) => {
  if (!selectedBlock) return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center"> 
        <div className="flex justify-between w-full lg:hidden mb-4"> 
            <h3 className="font-bold text-slate-700">Properties</h3> 
            <button onClick={onClose}><X className="w-5 h-5" /></button> 
        </div> 
        <Settings className="w-12 h-12 mb-4 opacity-20" /> 
        <p className="text-sm font-medium">Select a block to configure properties</p> 
    </div>
  );

  const typeDef = Object.values(BLOCK_TYPES).find(t => t.type === selectedBlock.type);
  const Icon = typeDef?.icon;

  return (
    <div className="flex flex-col h-full">
       <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100"> 
          <h3 className="font-bold text-slate-800">Edit Block</h3> 
          <button onClick={onClose} className="text-slate-500"><X className="w-5 h-5" /></button> 
       </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4"> 
            <div className="flex items-center space-x-3"> 
                <div className={`p-2 rounded-md ${typeDef?.color}`}>{Icon && <Icon className="w-5 h-5" />}</div> 
                <div>
                    <h3 className="font-semibold text-slate-800">{typeDef?.label}</h3>
                    <p className="text-xs text-slate-500">ID: {selectedBlock.id}</p>
                </div> 
            </div> 
        </div>
        <div className="space-y-4">
          {selectedBlock.type === 'navigate' && (
            <InputField 
                label="Target URL" 
                value={selectedBlock.url} 
                onChange={(v) => onUpdate(selectedBlock.id, { url: v })} 
                placeholder="https://example.com" 
            />
          )}

          {(selectedBlock.type === 'click' || selectedBlock.type === 'loop_elements' || selectedBlock.type === 'input') && (
            <InputField 
                label="CSS Selector" 
                value={selectedBlock.selector} 
                onChange={(v) => onUpdate(selectedBlock.id, { selector: v })} 
                placeholder=".class-name" 
                onPick={() => onPick((sel) => onUpdate(selectedBlock.id, { selector: sel }), false)} 
            />
          )}

          {selectedBlock.type === 'input' && (
            <InputField 
                label="Input Value" 
                value={selectedBlock.value} 
                onChange={(v) => onUpdate(selectedBlock.id, { value: v })} 
                placeholder="Text to type..." 
            />
          )}

          {selectedBlock.type === 'loop_pagination' && (
            <div className="space-y-4"> 
                <InputField 
                    label="Next Button Selector" 
                    value={selectedBlock.config?.nextButtonSelector} 
                    onChange={(v) => onUpdate(selectedBlock.id, { config: { ...selectedBlock.config, nextButtonSelector: v } })} 
                    placeholder="a.next-page" 
                    onPick={() => onPick((sel) => onUpdate(selectedBlock.id, { config: { ...selectedBlock.config!, nextButtonSelector: sel } }), false)} 
                /> 
                <InputField 
                    label="Max Pages" 
                    type="number" 
                    value={selectedBlock.config?.maxPages} 
                    onChange={(v) => onUpdate(selectedBlock.id, { config: { ...selectedBlock.config!, maxPages: parseInt(v) } })} 
                    placeholder="5" 
                /> 
            </div>
          )}

          {selectedBlock.type === 'extract_scope' && (
            <div className="space-y-3"> 
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Extraction Fields</label> 
                <div className="bg-slate-50 rounded-lg p-2 space-y-2 border border-slate-200"> 
                    {(selectedBlock.fields || []).map((field, idx) => ( 
                        <div key={idx} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-200 shadow-sm"> 
                            <div className="flex-1 space-y-2"> 
                                <input 
                                    className="w-full text-xs p-1 border rounded" 
                                    placeholder="Field Name" 
                                    value={field.key} 
                                    onChange={(e) => { 
                                        const newFields = [...(selectedBlock.fields || [])]; 
                                        newFields[idx].key = e.target.value; 
                                        onUpdate(selectedBlock.id, { fields: newFields }); 
                                    }} 
                                /> 
                                <div className="flex gap-1"> 
                                    <div className="flex-1 flex group"> 
                                        <input 
                                            className="w-full text-xs p-1 border rounded-l font-mono bg-slate-50" 
                                            placeholder="Selector" 
                                            value={field.selector} 
                                            onChange={(e) => { 
                                                const newFields = [...(selectedBlock.fields || [])]; 
                                                newFields[idx].selector = e.target.value; 
                                                onUpdate(selectedBlock.id, { fields: newFields }); 
                                            }} 
                                        /> 
                                        <button 
                                            onClick={() => onPick((sel) => { 
                                                const newFields = [...(selectedBlock.fields || [])]; 
                                                newFields[idx].selector = sel; 
                                                onUpdate(selectedBlock.id, { fields: newFields }); 
                                            }, true)} 
                                            className="px-2 bg-amber-50 border border-amber-200 border-l-0 rounded-r hover:bg-amber-100 text-amber-600 relative cursor-pointer" 
                                            title="Pick (Scoped)"
                                        > 
                                            <Scan className="w-3 h-3" /> 
                                        </button> 
                                    </div> 
                                    <select 
                                        className="w-1/3 text-xs p-1 border rounded bg-slate-50" 
                                        value={field.attribute} 
                                        onChange={(e) => { 
                                            const newFields = [...(selectedBlock.fields || [])]; 
                                            newFields[idx].attribute = e.target.value; 
                                            onUpdate(selectedBlock.id, { fields: newFields }); 
                                        }}
                                    > 
                                        <option value="text">Text</option>
                                        <option value="href">Href</option>
                                        <option value="src">Src</option>
                                        <option value="value">Value</option> 
                                    </select> 
                                </div> 
                            </div> 
                            <button 
                                onClick={() => { 
                                    const newFields = selectedBlock.fields?.filter((_, i) => i !== idx); 
                                    onUpdate(selectedBlock.id, { fields: newFields }); 
                                }} 
                                className="text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button> 
                        </div> 
                    ))} 
                    <button 
                        onClick={() => { 
                            const newFields = [...(selectedBlock.fields || []), { key: '', selector: '', attribute: 'text' }]; 
                            onUpdate(selectedBlock.id, { fields: newFields }); 
                        }} 
                        className="w-full py-1 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded dashed border border-blue-200 cursor-pointer"
                    >
                        + Add Field
                    </button> 
                </div> 
            </div>
          )}

          {selectedBlock.type === 'click' && (
            <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="rounded text-blue-600 focus:ring-blue-500" 
                        checked={selectedBlock.navigationBehavior === 'new_tab'} 
                        onChange={(e) => onUpdate(selectedBlock.id, { navigationBehavior: e.target.checked ? 'new_tab' : 'default' })} 
                    />
                    <span>Opens in new tab</span>
                </label>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
