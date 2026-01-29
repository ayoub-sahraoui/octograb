import React, { useEffect, useRef } from 'react';
import { Terminal, Database, X } from 'lucide-react';
import { Log, ExecutionResult } from '../../core/types';

interface ExecutionPanelProps {
  logs: Log[];
  results: ExecutionResult[];
  onClose: () => void;
  isRunning: boolean;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ logs, results, onClose, isRunning }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  
  return (
    <div className="fixed bottom-0 left-0 right-0 h-96 max-h-[50vh] bg-slate-900 text-slate-200 shadow-2xl z-[60] flex flex-col font-mono border-t border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-400" /> <span className="text-sm font-semibold">Dry Run Simulator</span>
          {isRunning && <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full animate-pulse">Running...</span>}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 border-r border-slate-700">
          <div className="space-y-1">
            {(logs || []).map((log, i) => (
              <div key={i} className={`text-xs flex ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                <span className="w-20 text-slate-500 opacity-50 shrink-0">{log.timestamp}</span> <span>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        <div className="w-1/3 bg-slate-800/50 p-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><Database className="w-3 h-3 mr-2" /> Data ({(results || []).length})</h3>
          <div className="space-y-2">
            {(results || []).map((res, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700 text-xs">
                {Object.entries(res).map(([k, v]) => <div key={k} className="flex gap-2"><span className="text-blue-400">{k}:</span><span className="text-slate-300 truncate">{String(v)}</span></div>)}
              </div>
            ))}
             {(results || []).length === 0 && <span className="text-slate-600 text-xs italic">No data...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
