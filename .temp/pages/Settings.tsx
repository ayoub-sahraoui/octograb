/**
 * Settings Page - Database management and statistics
 */

import React from 'react';
import { Database, Download, Upload, Trash2, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { useDatabaseStats, useDatabaseBackup } from '../../core/db-hooks';

export function Settings() {
  const { stats, loading, refresh } = useDatabaseStats();
  const { exportDatabase, importDatabase, clearAllData, exporting, importing } = useDatabaseBackup();

  const handleExport = async () => {
    const result = await exportDatabase();
    if (result.success) {
      alert('✅ Database exported successfully!');
    } else {
      alert(`❌ Export failed: ${result.error}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importDatabase(file);
    if (result.success) {
      alert('✅ Database imported successfully!');
      refresh();
      window.location.reload(); // Reload to refresh all data
    } else {
      alert(`❌ Import failed: ${result.error}`);
    }
    e.target.value = ''; // Reset input
  };

  const handleClearAll = async () => {
    const result = await clearAllData();
    if (result.success) {
      alert('✅ All data cleared!');
      window.location.reload();
    } else if (result.error !== 'Cancelled') {
      alert(`❌ Clear failed: ${result.error}`);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-slate-200">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Database className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">Settings & Database</h1>
          </div>
          <p className="text-sm md:text-base text-slate-600">Manage your local data and view statistics</p>
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
            <h2 className="text-base md:text-lg font-semibold text-slate-800">Statistics</h2>
          </div>

          {loading ? (
            <div className="text-center py-6 md:py-8 text-slate-500 text-sm md:text-base">Loading statistics...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-blue-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">{stats.totalPlans}</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Saved Plans</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-purple-600">{stats.totalExecutions}</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Total Executions</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-green-600">{stats.completedExecutions}</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Completed</div>
              </div>
              
              <div className="bg-amber-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-amber-600">{stats.totalItemsScraped.toLocaleString()}</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Items Scraped</div>
              </div>
              
              <div className="bg-indigo-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-indigo-600">{stats.successRate}%</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Success Rate</div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3 md:p-4">
                <div className="text-2xl md:text-3xl font-bold text-slate-600">{stats.totalJobs}</div>
                <div className="text-xs md:text-sm text-slate-600 mt-1">Queued Jobs</div>
              </div>
            </div>
          )}

          <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-200">
            <Button variant="ghost" size="sm" onClick={refresh}>
              Refresh Statistics
            </Button>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-slate-200">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Database className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
            <h2 className="text-base md:text-lg font-semibold text-slate-800">Backup & Restore</h2>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Download className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-800 mb-1 text-sm md:text-base">Export Database</h3>
                <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-3">
                  Download all your plans, jobs, and execution history as a JSON file
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={Download} 
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export Database'}
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
              <Upload className="w-4 h-4 md:w-5 md:h-5 text-green-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-800 mb-1 text-sm md:text-base">Import Database</h3>
                <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-3">
                  Restore from a previously exported backup file. This will merge with existing data.
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    disabled={importing}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    icon={Upload}
                    disabled={importing}
                    as="span"
                  >
                    {importing ? 'Importing...' : 'Choose Backup File'}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border border-red-200">
          <div className="flex items-center gap-2 mb-3 md:mb-4">
            <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
            <h2 className="text-base md:text-lg font-semibold text-red-800">Danger Zone</h2>
          </div>

          <div className="p-3 md:p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-medium text-slate-800 mb-1 text-sm md:text-base">Clear All Data</h3>
            <p className="text-xs md:text-sm text-slate-600 mb-2 md:mb-3">
              ⚠️ This will permanently delete all plans, jobs, and execution history. This action cannot be undone.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Trash2}
              onClick={handleClearAll}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-100 rounded-lg p-3 md:p-4 text-xs md:text-sm text-slate-600">
          <p className="mb-2">
            <strong>Storage:</strong> All data is stored locally in your browser using IndexedDB (via Dexie.js)
          </p>
          <p>
            <strong>Privacy:</strong> Your data never leaves your device. No cloud sync or external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
