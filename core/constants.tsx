import { 
  Globe, 
  MousePointer, 
  Type, 
  Repeat, 
  List, 
  Database,
  ArrowLeft,
  ArrowDown,
  Hourglass,
  GitBranch
} from 'lucide-react';
import { Plan, SavedPlan, Job } from './types';

export const BLOCK_TYPES = {
  NAVIGATE: { type: 'navigate', label: 'Navigate', icon: Globe, color: 'bg-blue-100 text-blue-600', hasChildren: false },
  CLICK: { type: 'click', label: 'Click Element', icon: MousePointer, color: 'bg-orange-100 text-orange-600', hasChildren: false },
  INPUT: { type: 'input', label: 'Input Text', icon: Type, color: 'bg-purple-100 text-purple-600', hasChildren: false },
  LOOP: { type: 'loop_elements', label: 'Loop Elements', icon: Repeat, color: 'bg-green-100 text-green-600', hasChildren: true },
  PAGINATION: { type: 'loop_pagination', label: 'Pagination Loop', icon: List, color: 'bg-teal-100 text-teal-600', hasChildren: true },
  EXTRACT: { type: 'extract_scope', label: 'Extract Data', icon: Database, color: 'bg-pink-100 text-pink-600', hasChildren: false },
  GO_BACK: { type: 'go_back', label: 'Go Back', icon: ArrowLeft, color: 'bg-slate-100 text-slate-600', hasChildren: false },
  SCROLL: { type: 'scroll', label: 'Scroll', icon: ArrowDown, color: 'bg-indigo-100 text-indigo-600', hasChildren: false },
  WAIT: { type: 'wait', label: 'Wait', icon: Hourglass, color: 'bg-yellow-100 text-yellow-600', hasChildren: false },
  CONDITION: { type: 'condition', label: 'If / Else', icon: GitBranch, color: 'bg-cyan-100 text-cyan-600', hasChildren: true },
} as const;

export const INITIAL_PLAN: Plan = {
  meta: { name: "New Scraper Plan", version: "1.0", userAgent: "Desktop" },
  variables: { baseUrl: "https://example.com" },
  pipeline: []
};
