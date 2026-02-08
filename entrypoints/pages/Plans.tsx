
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
  <div className="flex-1 bg-slate-50 p-4 md:p-6 lg:p-8 overflow-y-auto">
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 md:gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Saved Plans</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Manage your scraping plans</p>
        </div>
        <Button variant="secondary" icon={Plus} onClick={() => onLoad(null)} size="sm" className="self-start sm:self-auto">New Plan</Button>
      </div>
      
      {plans.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-slate-200 p-8 md:p-12 text-center">
          <div className="bg-blue-50 p-3 md:p-4 rounded-full inline-flex mb-3 md:mb-4">
            <FileJson className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-slate-700 mb-2">No plans saved yet</h3>
          <p className="text-sm md:text-base text-slate-500 mb-4 md:mb-6 max-w-md mx-auto">
            Create your first scraping plan in the Builder and save it to see it here.
          </p>
          <Button variant="primary" icon={Plus} onClick={() => onLoad(null)} size="sm">
            Create Your First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {(plans || []).map(plan => (
            <div key={plan.id} className="bg-white p-4 md:p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="bg-blue-100 p-2 md:p-2.5 rounded-lg text-blue-600"><FileJson className="w-5 h-5 md:w-6 md:h-6" /></div>
                <div className="flex gap-1">
                   <button 
                     onClick={() => onRun(plan)} 
                     className="p-1.5 md:p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors cursor-pointer" 
                     title="Run Job"
                   >
                     <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />
                   </button>
                   <button 
                     onClick={() => onDelete(plan.id)} 
                     className="p-1.5 md:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" 
                     title="Delete"
                   >
                     <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                   </button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 mb-2 text-sm md:text-base truncate" title={plan.name}>{plan.name}</h3>
              <div className="text-xs text-slate-500 mb-3 md:mb-4 space-y-1">
                 <div className="flex items-center justify-between">
                   <span>Updated:</span>
                   <span className="font-medium">{new Date(plan.updatedAt).toLocaleDateString()}</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span>Steps:</span>
                   <span className="font-semibold text-blue-600">{(plan.plan.pipeline || []).length}</span>
                 </div>
              </div>
              <Button variant="secondary" size="sm" className="w-full text-xs md:text-sm" onClick={() => onLoad(plan)}>
                Open in Builder
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
