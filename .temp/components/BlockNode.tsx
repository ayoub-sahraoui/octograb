
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Block } from '../../core/types';
import { BLOCK_TYPES } from '../../core/constants';

interface BlockNodeProps {
  block: Block;
  depth?: number;
  selectedBlockId: string | null;
  onSelect: (e: React.MouseEvent, id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (type: string, parentId: string) => void;
}

export const BlockNode: React.FC<BlockNodeProps> = ({ 
  block, 
  depth = 0, 
  selectedBlockId, 
  onSelect, 
  onDelete, 
  onAdd 
}) => {
  const typeDef = Object.values(BLOCK_TYPES).find(t => t.type === block.type) || BLOCK_TYPES.CLICK; 
  const Icon = typeDef.icon; 
  const isSelected = selectedBlockId === block.id;
  
  return (
    <div className={`relative flex flex-col ${depth > 0 ? 'ml-6' : ''}`}>
      {depth > 0 && <div className="absolute -left-6 top-5 w-6 h-px bg-slate-300" />} 
      {depth > 0 && <div className="absolute -left-6 -top-2 bottom-0 w-px bg-slate-300" />}
      
      <div 
        onClick={(e) => onSelect(e, block.id)}
        className={`
          group flex items-center p-3 mb-2 rounded-lg border cursor-pointer transition-all relative z-10
          ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'}
        `}
      >
        <div className={`p-2 rounded-md mr-3 ${typeDef.color}`}><Icon className="w-4 h-4" /></div>
        <div className="flex-1 min-w-0"> 
          <div className="flex items-center justify-between"> 
              <span className="font-medium text-slate-800 text-sm">{typeDef.label}</span> 
              <span className="text-[10px] text-slate-400 font-mono ml-2 truncate opacity-50">{block.id.split('_').pop()}</span> 
          </div> 
          <div className="text-xs text-slate-500 truncate mt-0.5 opacity-80"> 
              {block.url && <span className="text-blue-600">{block.url}</span>} 
              {block.selector && <span className="font-mono bg-slate-100 px-1 rounded text-[10px]">{block.selector}</span>} 
              {block.fields && <span>{block.fields.length} fields</span>} 
          </div> 
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(block.id); }} className="ml-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
      </div>

      {typeDef.hasChildren && block.type !== 'condition' && (
        <div className="pl-0 flex flex-col relative"> 
           {/* Vertical line extension for children */}
           <div className="absolute left-6 top-0 bottom-4 w-px bg-slate-200 -z-10"></div>
           
           <div className="pl-0">
              {(block.children || []).map(child => (
                <BlockNode 
                  key={child.id} 
                  block={child} 
                  depth={depth + 1} 
                  selectedBlockId={selectedBlockId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onAdd={onAdd}
                />
              ))}
           </div> 
           
           {/* Add Button */}
           <div className="ml-6 mt-1 mb-3 relative">
              {/* Connector for the add button */}
              <div className="absolute -left-6 top-3 w-6 h-px bg-slate-200"></div>
              <div className="absolute -left-6 -top-2 bottom-1/2 w-px bg-slate-200"></div>
              
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex justify-center hover:border-blue-400 hover:bg-slate-50 transition-colors bg-slate-50/50"> 
                  <div className="flex gap-2 items-center"> 
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mr-2">Nest:</span> 
                      {Object.entries(BLOCK_TYPES).map(([key, def]) => ( 
                          <button 
                              key={key} 
                              onClick={() => {
                                const typeKey = Object.keys(BLOCK_TYPES).find(k => BLOCK_TYPES[k as keyof typeof BLOCK_TYPES].type === def.type);
                                if (typeKey) onAdd(typeKey, block.id); // Default add adds to 'children'
                              }} 
                              className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-slate-200 transition-all text-slate-500 hover:text-blue-600 cursor-pointer" 
                              title={`Add ${def.label}`}
                          > 
                              <def.icon className="w-3.5 h-3.5" /> 
                          </button> 
                      ))} 
                  </div> 
              </div> 
           </div>
        </div>
      )}

      {block.type === 'condition' && (
          <div className="ml-6 mt-2 relative">
               {/* Vertical line connection */}
               <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200 -z-10"></div>

               {/* THEN Branch */}
               <div className="relative mb-6">
                   <div className="absolute left-0 top-3 w-4 h-px bg-green-200"></div>
                   <span className="absolute -left-2 top-1 text-[9px] font-bold bg-green-100 text-green-700 px-1 rounded z-10">THEN</span>
                   
                   <div className="pl-4 mt-6">
                       {(block.children || []).map(child => (
                            <BlockNode 
                              key={child.id} 
                              block={child} 
                              depth={depth + 1} 
                              selectedBlockId={selectedBlockId}
                              onSelect={onSelect}
                              onDelete={onDelete}
                              onAdd={onAdd}
                            />
                       ))}
                        
                       {/* Add to THEN */}
                       <div className="mt-2 border-2 border-dashed border-green-100 rounded-lg p-1.5 flex justify-center hover:border-green-300 hover:bg-green-50/50 bg-green-50/30">
                            <div className="flex gap-1 items-center overflow-x-auto no-scrollbar">
                                <span className="text-[9px] text-green-600/50 font-bold uppercase mr-1">Add:</span>
                                {Object.entries(BLOCK_TYPES).map(([key, def]) => (
                                    <button 
                                        key={key} 
                                        onClick={() => onAdd(key, `${block.id}:then`)} // Custom ID format to parse in handler
                                        className="p-1 rounded hover:bg-white hover:shadow-sm text-slate-400 hover:text-green-600 transition-all"
                                    >
                                        <def.icon className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                       </div>
                   </div>
               </div>

               {/* ELSE Branch */}
               <div className="relative">
                   <div className="absolute left-0 top-3 w-4 h-px bg-amber-200"></div>
                   <span className="absolute -left-2 top-1 text-[9px] font-bold bg-amber-100 text-amber-700 px-1 rounded z-10">ELSE</span>

                   <div className="pl-4 mt-6">
                       {(block.elseChildren || []).map(child => (
                            <BlockNode 
                              key={child.id} 
                              block={child} 
                              depth={depth + 1} 
                              selectedBlockId={selectedBlockId}
                              onSelect={onSelect}
                              onDelete={onDelete}
                              onAdd={onAdd}
                            />
                       ))}

                       {/* Add to ELSE */}
                       <div className="mt-2 border-2 border-dashed border-amber-100 rounded-lg p-1.5 flex justify-center hover:border-amber-300 hover:bg-amber-50/50 bg-amber-50/30">
                            <div className="flex gap-1 items-center overflow-x-auto no-scrollbar">
                                <span className="text-[9px] text-amber-600/50 font-bold uppercase mr-1">Add:</span>
                                {Object.entries(BLOCK_TYPES).map(([key, def]) => (
                                    <button 
                                        key={key} 
                                        onClick={() => onAdd(key, `${block.id}:else`)} 
                                        className="p-1 rounded hover:bg-white hover:shadow-sm text-slate-400 hover:text-amber-600 transition-all"
                                    >
                                        <def.icon className="w-3 h-3" />
                                    </button>
                                ))}
                            </div>
                       </div>
                   </div>
               </div>
          </div>
      )}
    </div>
  );
};
