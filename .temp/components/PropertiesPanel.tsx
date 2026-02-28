
import React from 'react';
import { Settings, X, Trash2, Scan, Save } from 'lucide-react';
import { Block, ExtractionField } from '../../core/types';
import { BLOCK_TYPES } from '../../core/constants';
import { InputField } from './InputField';
import { Button } from './Button';

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
                label="Selector" 
                value={selectedBlock.selector} 
                onChange={(v) => onUpdate(selectedBlock.id, { selector: v })} 
                placeholder={selectedBlock.selectorType === 'xpath' ? "//div[@id='item']" : ".class-name"} 
                selectorType={selectedBlock.selectorType}
                onSelectorTypeChange={(type) => {
                    const targetSelector = type === 'xpath' ? (selectedBlock.detectedXpathSelector || selectedBlock.selector) : (selectedBlock.detectedCssSelector || selectedBlock.selector);
                    onUpdate(selectedBlock.id, { 
                        selectorType: type,
                        selector: targetSelector
                    });
                }}
                onPick={() => onPick((css, xpath) => {
                    const currentType = selectedBlock.selectorType || 'css';
                    onUpdate(selectedBlock.id, { 
                        selector: currentType === 'xpath' ? xpath : css,
                        selectorType: currentType,
                        detectedCssSelector: css,
                        detectedXpathSelector: xpath
                    });
                }, false)} 
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
                    placeholder={selectedBlock.config?.nextButtonSelectorType === 'xpath' ? "//a[text()='Next']" : "a.next-page"}
                    selectorType={selectedBlock.config?.nextButtonSelectorType}
                    onSelectorTypeChange={(type) => {
                         const config = selectedBlock.config || { nextButtonSelector: '' };
                         const targetSelector = type === 'xpath' ? config.detectedXpathSelector : config.detectedCssSelector;
                         onUpdate(selectedBlock.id, { config: { 
                             ...config, 
                             nextButtonSelectorType: type,
                             nextButtonSelector: targetSelector || config.nextButtonSelector 
                         }});
                    }}
                    onPick={() => onPick((css, xpath) => onUpdate(selectedBlock.id, { config: { 
                        ...selectedBlock.config, 
                        nextButtonSelector: selectedBlock.config?.nextButtonSelectorType === 'xpath' ? xpath : css,
                        detectedCssSelector: css,
                        detectedXpathSelector: xpath
                    } }), false)} 
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
                                    <div className="flex-1 flex group relative"> 
                                        <button
                                            type="button"
                                            className={`absolute right-9 top-1.5 z-10 text-[9px] font-bold tracking-tight px-1.5 py-0.5 rounded shadow-sm border border-slate-200 uppercase cursor-pointer transition-colors ${field.selectorType === 'xpath' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-400 hover:text-slate-600'}`}
                                            onClick={() => {
                                                const newFields = [...(selectedBlock.fields || [])]; 
                                                const currentField = newFields[idx];
                                                const newType = currentField.selectorType === 'xpath' ? 'css' : 'xpath';
                                                currentField.selectorType = newType;
                                                
                                                if (newType === 'xpath' && currentField.detectedXpathSelector) {
                                                    currentField.selector = currentField.detectedXpathSelector;
                                                } else if (newType === 'css' && currentField.detectedCssSelector) {
                                                    currentField.selector = currentField.detectedCssSelector;
                                                }
                                                onUpdate(selectedBlock.id, { fields: newFields });
                                            }}
                                            title="Toggle CSS / XPath"
                                        >
                                            {field.selectorType === 'xpath' ? 'XP' : 'CSS'}
                                        </button>
                                        <input 
                                            className="w-full text-xs p-1 pl-2 pr-16 border rounded-l font-mono bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none" 
                                            placeholder={field.selectorType === 'xpath' ? "//div" : ".class"} 
                                            value={field.selector} 
                                            onChange={(e) => { 
                                                const newFields = [...(selectedBlock.fields || [])]; 
                                                newFields[idx].selector = e.target.value; 
                                                onUpdate(selectedBlock.id, { fields: newFields }); 
                                            }} 
                                        /> 
                                        <button 
                                            onClick={() => onPick((css, xpath) => { 
                                                const newFields = [...(selectedBlock.fields || [])]; 
                                                const f = newFields[idx];
                                                f.detectedCssSelector = css;
                                                f.detectedXpathSelector = xpath;
                                                f.selector = f.selectorType === 'xpath' ? xpath : css;
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
                                <div className="space-y-1">
                                    {(field.transformers || []).map((t, tIdx) => (
                                        <div key={tIdx} className="flex gap-1 items-center bg-slate-50 p-1 rounded border border-slate-200">
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1 rounded uppercase font-bold">{t.type}</span>
                                            {t.type === 'replace' && (
                                                <>
                                                    <input className="w-16 text-[10px] p-0.5 border rounded" placeholder="Find" value={t.config?.searchValue || ''} onChange={(e) => {
                                                        const newFields = [...(selectedBlock.fields || [])];
                                                        newFields[idx].transformers![tIdx].config = { ...t.config, searchValue: e.target.value };
                                                        onUpdate(selectedBlock.id, { fields: newFields });
                                                    }} />
                                                    <input className="w-16 text-[10px] p-0.5 border rounded" placeholder="Replace" value={t.config?.replaceValue || ''} onChange={(e) => {
                                                        const newFields = [...(selectedBlock.fields || [])];
                                                        newFields[idx].transformers![tIdx].config = { ...t.config, replaceValue: e.target.value };
                                                        onUpdate(selectedBlock.id, { fields: newFields });
                                                    }} />
                                                </>
                                            )}
                                            {t.type === 'regex' && (
                                                <input className="flex-1 text-[10px] p-0.5 border rounded" placeholder="Regex Pattern" value={t.config?.regexPattern || ''} onChange={(e) => {
                                                     const newFields = [...(selectedBlock.fields || [])];
                                                     newFields[idx].transformers![tIdx].config = { ...t.config, regexPattern: e.target.value };
                                                     onUpdate(selectedBlock.id, { fields: newFields });
                                                }} />
                                            )}
                                            <button 
                                                onClick={() => {
                                                    const newFields = [...(selectedBlock.fields || [])];
                                                    newFields[idx].transformers = field.transformers?.filter((_, i) => i !== tIdx);
                                                    onUpdate(selectedBlock.id, { fields: newFields });
                                                }}
                                                className="ml-auto text-slate-400 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex gap-1">
                                         <select 
                                            className="text-[10px] p-1 border rounded bg-white text-slate-600 w-full"
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                const newFields = [...(selectedBlock.fields || [])];
                                                if (!newFields[idx].transformers) newFields[idx].transformers = [];
                                                newFields[idx].transformers!.push({ type: e.target.value as any });
                                                e.target.value = ''; // Reset
                                                onUpdate(selectedBlock.id, { fields: newFields });
                                            }}
                                         >
                                             <option value="">+ Transform</option>
                                             <option value="trim">Trim</option>
                                             <option value="uppercase">Uppercase</option>
                                             <option value="lowercase">Lowercase</option>
                                             <option value="replace">Replace</option>
                                             <option value="regex">Regex Match</option>
                                         </select>
                                    </div>
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

          {selectedBlock.type === 'scroll' && (
              <div className="space-y-4">
                  <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase">Target</label>
                      <select 
                          className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500"
                          value={selectedBlock.scrollConfig?.target || 'window'}
                          onChange={(e) => onUpdate(selectedBlock.id, { 
                              scrollConfig: { 
                                  ...(selectedBlock.scrollConfig || { target: 'window', behavior: 'bottom' }), 
                                  target: e.target.value as any 
                              } 
                          })}
                      >
                          <option value="window">Window (Global)</option>
                          <option value="element">Specific Element</option>
                      </select>
                  </div>

                  {selectedBlock.scrollConfig?.target === 'element' && (
                       <InputField 
                        label="Element Selector" 
                        value={selectedBlock.scrollConfig?.selector} 
                        onChange={(v) => onUpdate(selectedBlock.id, { scrollConfig: { ...selectedBlock.scrollConfig!, selector: v } })} 
                        placeholder=".scroll-container" 
                        selectorType={selectedBlock.scrollConfig?.selectorType}
                        onSelectorTypeChange={(type) => {
                             const config = selectedBlock.scrollConfig!;
                             onUpdate(selectedBlock.id, { scrollConfig: { 
                                 ...config, 
                                 selectorType: type,
                                 selector: type === 'xpath' ? config.detectedXpathSelector : config.detectedCssSelector || config.selector
                             }});
                        }}
                        onPick={() => onPick((css, xpath) => onUpdate(selectedBlock.id, { scrollConfig: { 
                            ...selectedBlock.scrollConfig!, 
                            selector: selectedBlock.scrollConfig!.selectorType === 'xpath' ? xpath : css,
                            detectedCssSelector: css,
                            detectedXpathSelector: xpath
                        } }), false)} 
                    /> 
                  )}

                  <div className="space-y-2">
                       <label className="block text-xs font-semibold text-slate-500 uppercase">Behavior</label>
                       <select 
                          className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500"
                          value={selectedBlock.scrollConfig?.behavior || 'bottom'}
                          onChange={(e) => onUpdate(selectedBlock.id, { 
                              scrollConfig: { 
                                  ...(selectedBlock.scrollConfig || { target: 'window', behavior: 'bottom' }), 
                                  behavior: e.target.value as any 
                              } 
                          })}
                      >
                          <option value="bottom">Scroll to Bottom</option>
                          <option value="top">Scroll to Top</option>
                          <option value="pixels">Scroll by Pixels</option>
                      </select>
                  </div>

                  {selectedBlock.scrollConfig?.behavior === 'pixels' && (
                       <InputField 
                            label="Pixels Amount" 
                            type="number"
                            value={selectedBlock.scrollConfig?.pixels} 
                            onChange={(v) => onUpdate(selectedBlock.id, { scrollConfig: { ...selectedBlock.scrollConfig!, pixels: parseInt(v) } })} 
                            placeholder="500" 
                        />
                  )}
              </div>
          )}

          {selectedBlock.type === 'wait' && (
              <div className="space-y-4">
                  <div className="space-y-2">
                       <label className="block text-xs font-semibold text-slate-500 uppercase">Wait Type</label>
                       <select 
                          className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500"
                          value={selectedBlock.waitConfig?.type || 'timeout'}
                          onChange={(e) => onUpdate(selectedBlock.id, { 
                              waitConfig: { 
                                  ...(selectedBlock.waitConfig || { type: 'timeout', timeout: 2000 }), 
                                  type: e.target.value as any 
                              } 
                          })}
                      >
                          <option value="timeout">Fixed Timeout</option>
                          <option value="selector_visible">Element Visible</option>
                          <option value="selector_hidden">Element Hidden</option>
                      </select>
                  </div>
                  
                  {selectedBlock.waitConfig?.type === 'timeout' && (
                       <InputField 
                            label="Timeout (ms)" 
                            type="number"
                            value={selectedBlock.waitConfig?.timeout} 
                            onChange={(v) => onUpdate(selectedBlock.id, { waitConfig: { ...selectedBlock.waitConfig!, timeout: parseInt(v) } })} 
                            placeholder="2000" 
                        />
                  )}

                  {(selectedBlock.waitConfig?.type === 'selector_visible' || selectedBlock.waitConfig?.type === 'selector_hidden') && (
                       <InputField 
                        label="Element Selector" 
                        value={selectedBlock.waitConfig?.selector} 
                        onChange={(v) => onUpdate(selectedBlock.id, { waitConfig: { ...selectedBlock.waitConfig!, selector: v } })} 
                        placeholder=".loading-spinner" 
                        selectorType={selectedBlock.waitConfig?.selectorType}
                        onSelectorTypeChange={(type) => {
                             const config = selectedBlock.waitConfig!;
                             onUpdate(selectedBlock.id, { waitConfig: { 
                                 ...config, 
                                 selectorType: type,
                                 selector: type === 'xpath' ? config.detectedXpathSelector : config.detectedCssSelector || config.selector
                             }});
                        }}
                        onPick={() => onPick((css, xpath) => onUpdate(selectedBlock.id, { waitConfig: { 
                            ...selectedBlock.waitConfig!, 
                            selector: selectedBlock.waitConfig!.selectorType === 'xpath' ? xpath : css,
                            detectedCssSelector: css,
                            detectedXpathSelector: xpath
                        } }), false)} 
                    /> 
                  )}
              </div>
          )}

          {selectedBlock.type === 'condition' && (
              <div className="space-y-4">
                  <div className="space-y-2">
                       <label className="block text-xs font-semibold text-slate-500 uppercase">Check Type</label>
                       <select 
                          className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-500"
                          value={selectedBlock.conditionConfig?.check || 'exists'}
                          onChange={(e) => onUpdate(selectedBlock.id, { 
                              conditionConfig: { 
                                  ...(selectedBlock.conditionConfig || { check: 'exists', selector: '' }), 
                                  check: e.target.value as any 
                              } 
                          })}
                      >
                          <option value="exists">Element Exists</option>
                          <option value="not_exists">Element Does Not Exist</option>
                          <option value="visible">Element Visible</option>
                          <option value="text_contains">Text Contains</option>
                          <option value="text_equals">Text Equals</option>
                      </select>
                  </div>

                  <InputField 
                        label="Element Selector" 
                        value={selectedBlock.conditionConfig?.selector} 
                        onChange={(v) => onUpdate(selectedBlock.id, { conditionConfig: { ...selectedBlock.conditionConfig!, selector: v } })} 
                        placeholder=".error-message" 
                        selectorType={selectedBlock.conditionConfig?.selectorType}
                        onSelectorTypeChange={(type) => {
                             const config = selectedBlock.conditionConfig!;
                             const targetSelector = type === 'xpath' ? config.detectedXpathSelector : config.detectedCssSelector;
                             onUpdate(selectedBlock.id, { conditionConfig: { 
                                 ...config, 
                                 selectorType: type,
                                 selector: targetSelector || config.selector 
                             }});
                        }}
                        onPick={() => onPick((css, xpath) => onUpdate(selectedBlock.id, { conditionConfig: { 
                            ...selectedBlock.conditionConfig!, 
                            selector: selectedBlock.conditionConfig!.selectorType === 'xpath' ? xpath : css,
                            detectedCssSelector: css,
                            detectedXpathSelector: xpath
                        } }), false)} 
                    />

                  {(selectedBlock.conditionConfig?.check === 'text_contains' || selectedBlock.conditionConfig?.check === 'text_equals') && (
                       <InputField 
                            label="Value to match" 
                            value={selectedBlock.conditionConfig?.value || ''} 
                            onChange={(v) => onUpdate(selectedBlock.id, { conditionConfig: { ...selectedBlock.conditionConfig!, value: v } })} 
                            placeholder="Error" 
                        />
                  )}
                  
                  <div className="p-3 bg-blue-50 rounded text-xs text-blue-700">
                      <strong>Logic:</strong> If TRUE, executes "Then" blocks. If FALSE, executes "Else" blocks.
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
      
      {/* Save Button */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <Button 
          variant="primary" 
          size="sm" 
          icon={Save} 
          onClick={onClose}
          className="w-full"
        >
          Save & Close
        </Button>
      </div>
    </div>
  );
};
