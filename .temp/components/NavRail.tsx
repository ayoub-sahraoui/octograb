import React from 'react';
import { NavLink } from 'react-router-dom';
import { Layout, Archive, Briefcase, History, Sparkles, Settings, LucideIcon } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => 
      `w-full p-2.5 md:p-3 flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'text-blue-600 bg-blue-50 border-r-4 border-blue-600 font-semibold' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[9px] md:text-[10px] font-medium leading-tight">{label}</span>
      </>
    )}
  </NavLink>
);

export const NavRail: React.FC = () => {
  return (
    <div className="w-14 md:w-16 bg-white border-r border-slate-200 flex flex-col items-center py-3 md:py-4 z-50 shrink-0">
      <NavItem to="/builder" icon={Layout} label="Builder" />
      <NavItem to="/plans" icon={Archive} label="Plans" />
      <NavItem to="/jobs" icon={Briefcase} label="Jobs" />
      <NavItem to="/history" icon={History} label="History" />
      <div className="w-full px-2 my-1.5 md:my-2"><div className="h-px bg-slate-200"></div></div>
      <NavItem to="/ai-wizard" icon={Sparkles} label="AI Gen" />
      <div className="flex-1"></div>
      <div className="w-full px-2 my-1.5 md:my-2"><div className="h-px bg-slate-200"></div></div>
      <NavItem to="/settings" icon={Settings} label="Settings" />
    </div>
  );
};
