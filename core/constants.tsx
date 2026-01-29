import { 
  Globe, 
  MousePointer, 
  Type, 
  Repeat, 
  List, 
  Database 
} from 'lucide-react';
import { Plan, SavedPlan, Job } from './types';

export const BLOCK_TYPES = {
  NAVIGATE: { type: 'navigate', label: 'Navigate', icon: Globe, color: 'bg-blue-100 text-blue-600', hasChildren: false },
  CLICK: { type: 'click', label: 'Click Element', icon: MousePointer, color: 'bg-orange-100 text-orange-600', hasChildren: false },
  INPUT: { type: 'input', label: 'Input Text', icon: Type, color: 'bg-purple-100 text-purple-600', hasChildren: false },
  LOOP: { type: 'loop_elements', label: 'Loop Elements', icon: Repeat, color: 'bg-green-100 text-green-600', hasChildren: true },
  PAGINATION: { type: 'loop_pagination', label: 'Pagination Loop', icon: List, color: 'bg-teal-100 text-teal-600', hasChildren: true },
  EXTRACT: { type: 'extract_scope', label: 'Extract Data', icon: Database, color: 'bg-pink-100 text-pink-600', hasChildren: false },
} as const;

export const INITIAL_PLAN: Plan = {
  meta: { name: "New Scraper Plan", version: "1.0", userAgent: "Desktop" },
  variables: { baseUrl: "https://example.com" },
  pipeline: []
};

export const MOCK_SAVED_PLANS: SavedPlan[] = [
  { 
    id: 'plan_1', 
    name: 'Amazon Products', 
    updatedAt: '2023-10-24T10:30:00Z', 
    plan: { ...INITIAL_PLAN, meta: { ...INITIAL_PLAN.meta, name: 'Amazon Products' }, pipeline: [{ id: 'nav1', type: 'navigate', url: 'https://amazon.com' }] } 
  },
  { 
    id: 'plan_2', 
    name: 'LinkedIn Jobs', 
    updatedAt: '2023-10-22T14:15:00Z', 
    plan: { ...INITIAL_PLAN, meta: { ...INITIAL_PLAN.meta, name: 'LinkedIn Jobs' }, pipeline: [] } 
  },
  {
    id: 'plan_3',
    name: 'Deep Nesting Demo',
    updatedAt: '2023-10-25T09:00:00Z',
    plan: {
      meta: { name: 'Deep Nesting Demo', version: "1.0", userAgent: "Desktop" },
      variables: { baseUrl: "https://example.com" },
      pipeline: [
        {
          id: 'root_nav',
          type: 'navigate',
          url: 'https://example.com/categories',
          children: []
        },
        {
          id: 'cat_pagination',
          type: 'loop_pagination',
          config: { nextButtonSelector: '.next-cat', maxPages: 3 },
          children: [
            {
              id: 'category_loop',
              type: 'loop_elements',
              selector: '.category-link',
              children: [
                { id: 'click_cat', type: 'click', selector: 'a', navigationBehavior: 'new_tab' },
                { 
                  id: 'product_loop', 
                  type: 'loop_elements', 
                  selector: '.product-item', 
                  children: [
                    { 
                      id: 'extract_prod', 
                      type: 'extract_scope', 
                      fields: [{ key: 'name', selector: '.name', attribute: 'text' }] 
                    },
                    {
                        id: 'comments_loop',
                        type: 'loop_elements',
                        selector: '.comment',
                        children: [
                            { id: 'extract_comment', type: 'extract_scope', fields: [{ key: 'text', selector: 'p', attribute: 'text' }] }
                        ]
                    }
                  ] 
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

export const MOCK_JOBS: Job[] = [
  { id: 'job_101', planName: 'Amazon Products', status: 'completed', submittedAt: '10:30 AM', duration: '45s', items: 150 },
  { id: 'job_102', planName: 'LinkedIn Jobs', status: 'failed', submittedAt: '09:15 AM', duration: '12s', items: 0 },
  { id: 'job_103', planName: 'Amazon Products', status: 'completed', submittedAt: 'Yesterday', duration: '1m 20s', items: 340 },
];
