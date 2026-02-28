
import React, { useState, useEffect } from 'react';
import { PlayCircle, CheckCircle2, AlertCircle, XCircle, Clock, Database, Download, Eye, Trash2 } from 'lucide-react';
import { db, ExecutionHistory as ExecutionHistoryType } from '../../core/database';
import { downloadJSON, downloadCSV } from '../../core/utils';
import { Button } from '../components/Button';

export const ExecutionHistory: React.FC = () => {
  const [executions, setExecutions] = useState<ExecutionHistoryType[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistoryType | null>(null);

  useEffect(() => {
    loadExecutions();
  }, []);

  const loadExecutions = async () => {
    const data = await db.getAllExecutions();
    setExecutions(data);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this execution record?')) {
      await db.deleteExecution(id);
      await loadExecutions();
      if (selectedExecution?.id === id) {
        setSelectedExecution(null);
      }
    }
  };

  const handleExport = (execution: ExecutionHistoryType, type: 'json' | 'csv') => {
    const filename = `${execution.planName}_${execution.startedAt.slice(0, 10)}`;
    if (type === 'json') downloadJSON(execution.results, filename);
    if (type === 'csv') downloadCSV(execution.results, filename);
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'running': return 'bg-blue-100 text-blue-700 animate-pulse';
      case 'stopped': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusIcon = (s: string) => {
    switch(s) {
      case 'completed': return CheckCircle2;
      case 'failed': return AlertCircle;
      case 'running': return PlayCircle;
      case 'stopped': return XCircle;
      default: return Clock;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50">
      {/* List View */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 md:gap-4 mb-4 md:mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800">Execution History</h2>
              <p className="text-xs md:text-sm text-slate-500 mt-1">View past scraping runs and results</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadExecutions}
            >
              Refresh
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Status</th>
                    <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Plan Name</th>
                    <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Started</th>
                    <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Duration</th>
                    <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Items</th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs lg:text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-8 md:py-12 text-center text-slate-400">
                        No execution history yet. Run a plan to see results here.
                      </td>
                    </tr>
                  )}
                  {executions.map(exec => {
                    const StatusIcon = getStatusIcon(exec.status);
                    return (
                      <tr 
                        key={exec.id} 
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedExecution?.id === exec.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedExecution(exec)}
                      >
                        <td className="px-4 lg:px-6 py-3 md:py-4">
                          <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(exec.status)}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${exec.status === 'running' ? 'animate-spin' : ''}`} />
                            {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 md:py-4 font-medium text-slate-800 text-xs md:text-sm">{exec.planName}</td>
                        <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 text-[10px] md:text-xs">{formatDate(exec.startedAt)}</td>
                        <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 font-mono text-xs md:text-sm">{exec.duration ? `${exec.duration}s` : '-'}</td>
                        <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 text-xs md:text-sm">{exec.itemsScraped}</td>
                        <td className="px-4 lg:px-6 py-3 md:py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedExecution(exec); }}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {exec.status === 'completed' && exec.results.length > 0 && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleExport(exec, 'json'); }}
                                  className="text-green-600 hover:text-green-700 cursor-pointer transition-colors"
                                  title="Download JSON"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleExport(exec, 'csv'); }}
                                  className="text-green-600 hover:text-green-700 cursor-pointer transition-colors"
                                  title="Download CSV"
                                >
                                  <Database className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(exec.id!); }}
                              className="text-red-600 hover:text-red-700 cursor-pointer transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {executions.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No execution history yet. Run a plan to see results here.
                </div>
              )}
              {executions.map(exec => {
                const StatusIcon = getStatusIcon(exec.status);
                return (
                  <div 
                    key={exec.id} 
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${selectedExecution?.id === exec.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedExecution(exec)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm mb-1">{exec.planName}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(exec.status)}`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${exec.status === 'running' ? 'animate-spin' : ''}`} />
                          {exec.status.charAt(0).toUpperCase() + exec.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {exec.status === 'completed' && exec.results.length > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleExport(exec, 'json'); }}
                            className="text-green-600 hover:text-green-700 cursor-pointer"
                            title="Download JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(exec.id!); }}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Started</div>
                        <div className="font-medium text-[10px]">{formatDate(exec.startedAt)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Duration</div>
                        <div className="font-mono font-medium">{exec.duration ? `${exec.duration}s` : '-'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 mb-0.5">Items</div>
                        <div className="font-medium">{exec.itemsScraped}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {selectedExecution && (
        <div className="fixed lg:relative inset-0 lg:inset-auto lg:w-96 xl:w-md bg-white border-l border-slate-200 flex flex-col overflow-hidden z-50 lg:z-auto">
          <div className="p-4 md:p-6 border-b border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-bold text-slate-800 truncate">{selectedExecution.planName}</h3>
                <p className="text-xs text-slate-500 mt-1">Execution #{selectedExecution.id}</p>
              </div>
              <button 
                onClick={() => setSelectedExecution(null)}
                className="text-slate-400 hover:text-slate-600 ml-2 shrink-0 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
              <div>
                <span className="text-slate-500 block mb-1.5 text-[10px] md:text-xs">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 md:py-1 rounded-md text-[10px] md:text-xs font-medium ${getStatusColor(selectedExecution.status)}`}>
                  {selectedExecution.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1.5 text-[10px] md:text-xs">Duration</span>
                <span className="text-slate-800 font-mono text-xs md:text-sm">{selectedExecution.duration ? `${selectedExecution.duration}s` : 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1.5 text-[10px] md:text-xs">Started</span>
                <span className="text-slate-800 text-[10px] md:text-xs">{formatDate(selectedExecution.startedAt)}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1.5 text-[10px] md:text-xs">Items Scraped</span>
                <span className="text-slate-800 font-semibold text-xs md:text-sm">{selectedExecution.itemsScraped}</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <h4 className="text-xs md:text-sm font-bold text-slate-700 mb-3 flex items-center">
              <Database className="w-4 h-4 mr-2" /> Scraped Data ({selectedExecution.results.length})
            </h4>
            <div className="space-y-2 md:space-y-3">
              {selectedExecution.results.map((result, i) => (
                <div key={i} className="bg-slate-50 p-2.5 md:p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] md:text-xs text-slate-400 mb-2">Item #{i + 1}</div>
                  {Object.entries(result).map(([key, value]) => (
                    <div key={key} className="flex gap-2 mb-1 text-[10px] md:text-xs">
                      <span className="text-blue-600 font-semibold min-w-17.5 md:min-w-20">{key}:</span>
                      <span className="text-slate-700 flex-1 wrap-break-word">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ))}
              {selectedExecution.results.length === 0 && (
                <p className="text-slate-400 text-xs md:text-sm italic">No data was scraped in this execution.</p>
              )}
            </div>

            {/* Logs */}
            <h4 className="text-xs md:text-sm font-bold text-slate-700 mt-6 mb-3">Execution Logs</h4>
            <div className="bg-slate-900 p-3 md:p-4 rounded-lg font-mono text-[10px] md:text-xs text-slate-300 space-y-1 max-h-60 overflow-y-auto">
              {selectedExecution.logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              {selectedExecution.logs.length === 0 && (
                <div className="text-slate-500 italic">No logs available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
