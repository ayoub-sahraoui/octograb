import React from 'react';
import { MousePointer } from 'lucide-react';

interface InputFieldProps {
  label: string;
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  onPick?: () => void;
  scopeHint?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = "text", 
  onPick, 
  scopeHint 
}) => (
  <div className="mb-4">
    <div className="flex justify-between items-end mb-1">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        {scopeHint && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{scopeHint}</span>}
    </div>
    <div className="flex gap-2">
      <input 
        type={type} 
        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder} 
      />
      {onPick && (
        <button 
          onClick={onPick} 
          className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors relative cursor-pointer" 
          title="Pick from page"
        >
          <MousePointer className="w-4 h-4" /> 
          {scopeHint && <div className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full -mt-1 -mr-1"></div>}
        </button>
      )}
    </div>
  </div>
);
