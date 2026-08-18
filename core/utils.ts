
import { SerializedBlockNode } from './types';

export const findBlock = (blocks: SerializedBlockNode[] | undefined, id: string): SerializedBlockNode | null => {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const found = findBlock(block.children, id);
      if (found) return found;
    }
    if (block.elseChildren) {
      const found = findBlock(block.elseChildren, id);
      if (found) return found;
    }
  }
  return null;
};

export const findParentBlock = (blocks: SerializedBlockNode[] | undefined, childId: string): SerializedBlockNode | null => {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.children && block.children.some((child) => child.id === childId)) return block;
    if (block.elseChildren && block.elseChildren.some((child) => child.id === childId)) return block;

    if (block.children) {
      const found = findParentBlock(block.children, childId);
      if (found) return found;
    }
    if (block.elseChildren) {
      const found = findParentBlock(block.elseChildren, childId);
      if (found) return found;
    }
  }
  return null;
};

export const updateBlockInTree = (blocks: SerializedBlockNode[] | undefined, id: string, updates: Partial<SerializedBlockNode>): SerializedBlockNode[] => {
  if (!blocks) return [];
  return blocks.map(block => {
    if (block.id === id) return { ...block, ...updates };

    // Check main children
    if (block.children) {
      // Optimization: only map if we think it might be in there? No, just map.
      block = { ...block, children: updateBlockInTree(block.children, id, updates) };
    }
    // Check else children
    if (block.elseChildren) {
      block = { ...block, elseChildren: updateBlockInTree(block.elseChildren, id, updates) };
    }

    return block;
  });
};

export const addBlockToTree = (blocks: SerializedBlockNode[] | undefined, parentId: string | null, newBlock: SerializedBlockNode, targetProperty: 'children' | 'elseChildren' = 'children'): SerializedBlockNode[] => {
  if (!blocks) return parentId ? [] : [newBlock]; // If no blocks and no parent, it's root
  if (!parentId) return [...blocks, newBlock];

  return blocks.map(block => {
    if (block.id === parentId) {
      if (targetProperty === 'elseChildren') {
        return { ...block, elseChildren: [...(block.elseChildren || []), newBlock] };
      } else {
        return { ...block, children: [...(block.children || []), newBlock] };
      }
    }

    // Recurse
    if (block.children) {
      block = { ...block, children: addBlockToTree(block.children, parentId, newBlock, targetProperty) };
    }
    if (block.elseChildren) {
      block = { ...block, elseChildren: addBlockToTree(block.elseChildren, parentId, newBlock, targetProperty) };
    }

    return block;
  });
};

export const deleteBlockFromTree = (blocks: SerializedBlockNode[] | undefined, id: string): SerializedBlockNode[] => {
  if (!blocks) return [];
  return blocks.filter(block => block.id !== id).map(block => {
    if (block.children) {
      block = { ...block, children: deleteBlockFromTree(block.children, id) };
    }
    if (block.elseChildren) {
      block = { ...block, elseChildren: deleteBlockFromTree(block.elseChildren, id) };
    }
    return block;
  });
};

// --- Export Utils ---

export const downloadJSON = (data: any[], filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  // Get all unique keys
  const keys = Array.from(new Set(data.flatMap(Object.keys)));

  // CSV Header
  const header = keys.join(',');

  // CSV Rows
  const rows = data.map(row => {
    return keys.map(key => {
      const val = row[key] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const stringVal = String(val).replace(/"/g, '""');
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal}"`;
      }
      return stringVal;
    }).join(',');
  });

  const csvContent = [header, ...rows].join('\n');
  // Add UTF-8 BOM to ensure proper encoding and prevent character corruption
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  // Convert to TSV (Excel-friendly)
  const keys = Array.from(new Set(data.flatMap(Object.keys)));
  const header = keys.join('\t');

  const rows = data.map(row => {
    return keys.map(key => {
      const val = row[key] ?? '';
      return String(val).replace(/\t/g, ' ');
    }).join('\t');
  });

  const tsvContent = [header, ...rows].join('\n');
  const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export statistics
export const getDataStats = (data: any[]): {
  totalRecords: number;
  fields: string[];
  completeness: Record<string, number>;
  preview: any[];
} => {
  if (!data || data.length === 0) {
    return { totalRecords: 0, fields: [], completeness: {}, preview: [] };
  }

  const fields = Array.from(new Set(data.flatMap(Object.keys)));
  const completeness: Record<string, number> = {};

  fields.forEach(field => {
    const filledCount = data.filter(row =>
      row[field] !== null &&
      row[field] !== undefined &&
      row[field] !== ''
    ).length;
    completeness[field] = Math.round((filledCount / data.length) * 100);
  });

  return {
    totalRecords: data.length,
    fields,
    completeness,
    preview: data.slice(0, 5)
  };
};
