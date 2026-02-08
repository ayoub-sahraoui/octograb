import React, { useRef, useEffect } from 'react';
import { PlayCircle, Database, X, Download } from 'lucide-react';
import { Log, ExecutionResult } from '../../core/types';
import { downloadJSON, downloadCSV } from '../../core/utils';

interface ExecutionPanelProps {
  logs: Log[];
  results: ExecutionResult[];
  onClose: () => void;
  isRunning: boolean;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ logs, results, onClose, isRunning }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  
  const handleExport = (type: 'json' | 'csv') => {
      const filename = `octograb_export_${new Date().toISOString().slice(0,10)}`;
      if (type === 'json') downloadJSON(results, filename);
      if (type === 'csv') downloadCSV(results, filename);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 md:h-96 max-h-[50vh] bg-white text-slate-800 shadow-2xl z-60 flex flex-col border-t-2 border-blue-500">
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600" /> 
          <span className="text-sm md:text-base font-bold text-slate-800">Execution Preview</span>
          {isRunning && <span className="text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1 bg-blue-600 text-white rounded-full animate-pulse font-medium">Running...</span>}
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
            <button 
                onClick={() => handleExport('json')} 
                disabled={results.length === 0}
                className="flex items-center text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 hover:bg-white rounded-md text-blue-600 font-medium border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Export as JSON"
            >
                <Download className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1" /> <span className="hidden md:inline">JSON</span>
            </button>
            <button 
                onClick={() => handleExport('csv')} 
                disabled={results.length === 0}
                className="flex items-center text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 hover:bg-white rounded-md text-blue-600 font-medium border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Export as CSV"
            >
                <Download className="w-3 h-3 md:w-3.5 md:h-3.5 md:mr-1" /> <span className="hidden md:inline">CSV</span>
            </button>
            <div className="h-4 md:h-5 w-px bg-slate-300 mx-0.5 md:mx-1"></div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"><X className="w-4 h-4 md:w-5 md:h-5" /></button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 md:p-4 border-r border-slate-200 bg-slate-50">
          <div className="space-y-0.5 md:space-y-1">
            {(logs || []).map((log, i) => (
              <div key={i} className={`text-[10px] md:text-xs flex font-mono ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-slate-700'}`}>
                <span className="w-16 md:w-20 text-slate-400 shrink-0 text-[9px] md:text-xs">{log.timestamp}</span> <span className="flex-1">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        <div className="w-1/3 md:w-1/3 bg-white p-3 md:p-4 overflow-y-auto border-l border-slate-200">
          <h3 className="text-[10px] md:text-xs font-bold text-slate-600 uppercase mb-2 md:mb-3 flex items-center"><Database className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-blue-600" /> Data ({(results || []).length})</h3>
          <div className="space-y-1.5 md:space-y-2">
            {(results || []).map((res, i) => (
              <div key={i} className="bg-slate-50 p-2 md:p-3 rounded-lg border border-slate-200 text-[10px] md:text-xs hover:border-blue-300 transition-colors">
                {Object.entries(res).map(([k, v]) => <div key={k} className="flex gap-1.5 md:gap-2 mb-0.5 md:mb-1"><span className="text-blue-600 font-semibold text-[9px] md:text-xs">{k}:</span><span className="text-slate-700 truncate flex-1 text-[9px] md:text-xs">{String(v)}</span></div>)}
              </div>
            ))}
             {(results || []).length === 0 && <span className="text-slate-400 text-[10px] md:text-xs italic">No data collected yet...</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
