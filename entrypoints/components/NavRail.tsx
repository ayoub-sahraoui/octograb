import React from 'react';
import { Layout, Archive, Briefcase, Sparkles, LucideIcon } from 'lucide-react';

interface NavItemProps {
  id: string;
  icon: LucideIcon;
  label: string;
  currentView: string;
  setView: (view: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, icon: Icon, label, currentView, setView }) => (
  <button 
    onClick={() => setView(id)}
    className={`w-full p-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${currentView === id ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
  >
    <Icon className="w-6 h-6" />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

interface NavRailProps {
  view: string;
  setView: (view: string) => void;
}

export const NavRail: React.FC<NavRailProps> = ({ view, setView }) => {
  return (
    <div className="w-16 bg-white border-r border-slate-200 flex flex-col items-center py-4 z-50">
      <NavItem id="builder" icon={Layout} label="Builder" currentView={view} setView={setView} />
      <NavItem id="plans" icon={Archive} label="Plans" currentView={view} setView={setView} />
      <NavItem id="jobs" icon={Briefcase} label="Jobs" currentView={view} setView={setView} />
      <div className="w-full px-2 my-2"><div className="h-px bg-slate-200"></div></div>
      <NavItem id="ai-wizard" icon={Sparkles} label="AI Gen" currentView={view} setView={setView} />
    </div>
  );
};
