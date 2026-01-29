
import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Job } from '../../core/types';

interface JobsProps {
  jobs: Job[];
}

export const Jobs: React.FC<JobsProps> = ({ jobs }) => {
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
    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Job Queue</h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Plan Name</th>
                <th className="px-6 py-3">Submitted</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(jobs || []).map(job => {
                const StatusIcon = getStatusIcon(job.status);
                return (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        <StatusIcon className={`w-3 h-3 mr-1 ${job.status === 'running' ? 'animate-spin' : ''}`} />
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">{job.planName}</td>
                    <td className="px-6 py-4 text-slate-500">{job.submittedAt}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{job.duration || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{job.items || '-'}</td>
                    <td className="px-6 py-4 text-right">
                       {job.status === 'completed' && <button className="text-blue-600 hover:underline cursor-pointer">Download</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
