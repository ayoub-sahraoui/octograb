
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock, Play, Trash2, Eye } from 'lucide-react';
import { Job } from '../../core/types';
import { db } from '../../core/database';
import { Button } from '../components/Button';

interface JobsProps {
  jobs: Job[];
}

export const Jobs: React.FC<JobsProps> = ({ jobs: initialJobs }) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const handleDeleteJob = async (id: string) => {
    if (confirm('Delete this job?')) {
      await db.deleteJob(id);
      setJobs(jobs.filter(j => j.id !== id));
    }
  };

  const handleRunJob = async (job: Job) => {
    // Load the plan and navigate to builder to run it
    const plan = await db.getPlan(job.planId || '');
    if (plan) {
      window.location.hash = '#/builder';
      // The user can then click "Dry Run" from the builder
      alert(`Plan "${plan.name}" loaded in Builder. Click "Dry Run" to execute.`);
    } else {
      alert('Plan not found. It may have been deleted.');
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'running': return 'bg-blue-100 text-blue-700 animate-pulse';
      default: return 'bg-slate-100 text-slate-600';
    }
  };
  
  const getStatusIcon = (s: string) => {
    switch(s) {
      case 'completed': return CheckCircle2;
      case 'failed': return AlertCircle;
      case 'running': return Loader2;
      default: return Clock;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-4 md:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 md:gap-4 mb-4 md:mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">Job Queue</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Queued plans ready to execute</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Plan Name</th>
                  <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Submitted</th>
                  <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Duration</th>
                  <th className="px-4 lg:px-6 py-3 text-xs lg:text-sm">Items</th>
                  <th className="px-4 lg:px-6 py-3 text-right text-xs lg:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 lg:px-6 py-8 md:py-12 text-center text-slate-400">
                      No queued jobs. Add a plan to the queue from the Plans page.
                    </td>
                  </tr>
                )}
                {jobs.map(job => {
                  const StatusIcon = getStatusIcon(job.status);
                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 md:py-4">
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium ${getStatusColor(job.status)}`}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 md:py-4 font-medium text-slate-800 text-xs md:text-sm">{job.planName}</td>
                      <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 text-xs md:text-sm">{job.submittedAt}</td>
                      <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 font-mono text-xs md:text-sm">{job.duration || '-'}</td>
                      <td className="px-4 lg:px-6 py-3 md:py-4 text-slate-500 text-xs md:text-sm">{job.items || '-'}</td>
                      <td className="px-4 lg:px-6 py-3 md:py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === 'queued' && (
                            <button 
                              onClick={() => handleRunJob(job)}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1 text-xs font-medium transition-colors"
                              title="Run Job"
                            >
                              <Play className="w-4 h-4" /> Run
                            </button>
                          )}
                          {job.status === 'completed' && (
                            <button 
                              onClick={() => window.location.hash = '#/history'}
                              className="text-green-600 hover:text-green-700 cursor-pointer transition-colors"
                              title="View Results"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteJob(job.id)}
                            className="text-red-600 hover:text-red-700 cursor-pointer transition-colors"
                            title="Delete Job"
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
            {jobs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No queued jobs. Add a plan to the queue from the Plans page.
              </div>
            )}
            {jobs.map(job => {
              const StatusIcon = getStatusIcon(job.status);
              return (
                <div key={job.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm mb-1">{job.planName}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(job.status)}`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'queued' && (
                        <button 
                          onClick={() => handleRunJob(job)}
                          className="text-blue-600 hover:text-blue-700 cursor-pointer"
                          title="Run Job"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {job.status === 'completed' && (
                        <button 
                          onClick={() => window.location.hash = '#/history'}
                          className="text-green-600 hover:text-green-700 cursor-pointer"
                          title="View Results"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                        title="Delete Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Submitted</div>
                      <div className="font-medium">{job.submittedAt}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Duration</div>
                      <div className="font-mono font-medium">{job.duration || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">Items</div>
                      <div className="font-medium">{job.items || '-'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

