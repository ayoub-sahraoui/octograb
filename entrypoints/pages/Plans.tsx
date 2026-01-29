
import React from 'react';
import { FileJson, Play, Trash2, Plus } from 'lucide-react';
import { SavedPlan } from '../../core/types';
import { Button } from '../components/Button';

interface PlansProps {
  plans: SavedPlan[];
  onLoad: (plan: SavedPlan | null) => void;
  onDelete: (id: string) => void;
  onRun: (plan: SavedPlan) => void;
}

export const Plans: React.FC<PlansProps> = ({ plans, onLoad, onDelete, onRun }) => (
  <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Saved Plans</h2>
        <Button variant="secondary" icon={Plus} onClick={() => onLoad(null)}>New Plan</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(plans || []).map(plan => (
          <div key={plan.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-blue-100 p-2 rounded text-blue-600"><FileJson className="w-5 h-5" /></div>
              <div className="flex space-x-1">
                 <button onClick={() => onRun(plan)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded cursor-pointer" title="Run Job"><Play className="w-4 h-4" /></button>
                 <button onClick={() => onDelete(plan.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">{plan.name}</h3>
            <div className="text-xs text-slate-500 mb-4 flex flex-col gap-1">
               <span>Updated: {new Date(plan.updatedAt).toLocaleDateString()}</span>
               <span>Steps: {(plan.plan.pipeline || []).length}</span>
            </div>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onLoad(plan)}>Open in Builder</Button>
          </div>
        ))}
      </div>
    </div>
  </div>
);
