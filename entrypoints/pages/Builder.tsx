
import React from 'react';
import { X, Layout, ArrowRight, Plus } from 'lucide-react';
import { BlockNode } from '../components/BlockNode';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { BLOCK_TYPES } from '../../core/constants';
import { Plan, Block } from '../../core/types';
import { Button } from '../components/Button';
import { findParentBlock } from '../../core/utils';

interface BuilderProps {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  selectedBlockId: string | null;
  selectedBlock: Block | null;
  handleBlockSelect: (e: React.MouseEvent, id: string) => void;
  handleAddBlock: (type: string, parentId?: string) => void;
  handleDeleteBlock: (id: string) => void;
  handleUpdateBlock: (id: string, updates: Partial<Block>) => void;
  startPicking: (callback: (selector: string, xpath: string) => void, scoped: boolean, parentSelector?: string | null) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isPropertiesOpen: boolean;
  setIsPropertiesOpen: (open: boolean) => void;
}

export const Builder: React.FC<BuilderProps> = ({
  plan, setPlan, selectedBlockId, selectedBlock,
  handleBlockSelect, handleAddBlock, handleDeleteBlock, handleUpdateBlock,
  startPicking, isSidebarOpen, setIsSidebarOpen, isPropertiesOpen, setIsPropertiesOpen
}) => {
  return (
    <>
      {(isSidebarOpen || isPropertiesOpen) && (
        <div 
            className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm" 
            onClick={() => { setIsSidebarOpen(false); setIsPropertiesOpen(false); }}
        ></div>
      )}

      {/* Toolbox Sidebar */}
      <div className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col shadow-lg lg:shadow-none transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} top-[60px] lg:top-0 h-[calc(100%-60px)] lg:h-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden"> 
            <h2 className="font-bold text-slate-700">Toolbox</h2> 
            <button onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5 text-slate-500" /></button> 
        </div>
        <div className="p-4 border-b border-slate-100"> 
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 hidden lg:block">Toolbox</h2> 
            <div className="grid grid-cols-2 gap-2"> 
                {Object.entries(BLOCK_TYPES).map(([key, def]) => ( 
                    <button 
                        key={key} 
                        onClick={() => handleAddBlock(key)} 
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all text-center group cursor-pointer"
                    > 
                        <def.icon className={`w-6 h-6 mb-2 ${def.color.replace('bg-', 'text-').split(' ')[1]}`} /> 
                        <span className="text-xs font-medium text-slate-600 group-hover:text-blue-700">{def.label}</span> 
                    </button> 
                ))} 
            </div> 
        </div>
        <div className="flex-1 p-4 overflow-y-auto"> 
            <div className="text-xs text-slate-400 mb-2">Variables</div> 
            <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs text-slate-600">baseUrl: "{plan.variables?.baseUrl}"</div> 
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-slate-50/50 flex flex-col overflow-hidden relative w-full">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto pb-20">
            <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase">Plan Name</label>
                <input 
                    className="w-full mt-1 bg-transparent text-2xl font-bold text-slate-700 focus:outline-none border-b border-transparent focus:border-blue-500 transition-colors placeholder-slate-300" 
                    placeholder="Untitled Plan" 
                    value={plan.meta?.name || ''} 
                    onChange={(e) => setPlan({...plan, meta: {...plan.meta, name: e.target.value}})} 
                />
            </div>
            
            {/* Render Blocks */}
            {(plan.pipeline || []).map(block => (
                <BlockNode 
                    key={block.id} 
                    block={block} 
                    selectedBlockId={selectedBlockId}
                    onSelect={handleBlockSelect}
                    onDelete={handleDeleteBlock}
                    onAdd={handleAddBlock}
                />
            ))}
            
            {/* Empty State */}
            {(plan.pipeline || []).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-slate-300 rounded-xl bg-white/50">
                    <div className="bg-blue-50 p-4 rounded-full mb-4">
                        <Layout className="w-12 h-12 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Start Building Your Scraper</h3>
                    <p className="text-slate-500 mb-6 text-center max-w-sm">Select blocks from the toolbox on the left to create your scraping pipeline.</p>
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="lg:hidden flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        Open Toolbox <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                    <div className="hidden lg:flex gap-2 text-sm text-slate-400">
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Navigate</span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Click</span>
                        <span className="px-2 py-1 bg-white border border-slate-200 rounded">Loop</span>
                    </div>
                </div>
            )}
            
            {/* Add Next Step Button (Visible when pipeline has items) */}
            {(plan.pipeline || []).length > 0 && (
                <div className="mt-2 flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="h-6 w-px bg-slate-300"></div>
                    <button 
                        onClick={() => setIsSidebarOpen(true)} 
                        className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-dashed border-slate-300 text-slate-600 rounded-full hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                        <div className="p-1 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Add Next Step</span>
                    </button>
                    <p className="mt-2 text-xs text-slate-400 lg:hidden">Tap to open toolbox</p>
                </div>
            )}

            <div className="mt-12 flex justify-center"><div className="h-px bg-slate-200 w-full absolute left-0 right-0 z-0"></div></div>
          </div>
        </div>
      </div>

      {/* Properties Sidebar */}
      <div className={`fixed lg:relative inset-y-0 right-0 z-50 w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${isPropertiesOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} top-[60px] lg:top-0 h-[calc(100%-60px)] lg:h-auto`}>
        <div className="flex-1 overflow-y-auto">
            <PropertiesPanel 
                selectedBlock={selectedBlock} 
                onUpdate={handleUpdateBlock} 
                onClose={() => setIsPropertiesOpen(false)}
                onPick={(callback, scoped) => {
                    let parentSelector = null;
                    if (selectedBlockId) {
                        const parent = findParentBlock(plan.pipeline, selectedBlockId);
                        if (parent && parent.type === 'loop_elements' && parent.selector) {
                            parentSelector = parent.selector;
                        }
                    }
                    startPicking(callback, scoped, parentSelector);
                }}
            />
        </div>
      </div>
    </>
  );
};
