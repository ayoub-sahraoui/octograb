
import { Block } from './types';

export const findBlock = (blocks: Block[] | undefined, id: string): Block | null => {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) { 
        const found = findBlock(block.children, id); 
        if (found) return found; 
    }
  }
  return null;
};

export const findParentBlock = (blocks: Block[] | undefined, childId: string): Block | null => {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.children) {
      if (block.children.some(child => child.id === childId)) return block;
      const found = findParentBlock(block.children, childId);
      if (found) return found;
    }
  }
  return null;
};

export const updateBlockInTree = (blocks: Block[] | undefined, id: string, updates: Partial<Block>): Block[] => {
  if (!blocks) return [];
  return blocks.map(block => {
    if (block.id === id) return { ...block, ...updates };
    if (block.children) return { ...block, children: updateBlockInTree(block.children, id, updates) };
    return block;
  });
};

export const addBlockToTree = (blocks: Block[] | undefined, parentId: string | null, newBlock: Block): Block[] => {
  if (!blocks) return [newBlock];
  if (!parentId) return [...blocks, newBlock];
  return blocks.map(block => {
    if (block.id === parentId) return { ...block, children: [...(block.children || []), newBlock] };
    if (block.children) return { ...block, children: addBlockToTree(block.children, parentId, newBlock) };
    return block;
  });
};

export const deleteBlockFromTree = (blocks: Block[] | undefined, id: string): Block[] => {
  if (!blocks) return [];
  return blocks.filter(block => block.id !== id).map(block => {
    if (block.children) return { ...block, children: deleteBlockFromTree(block.children, id) };
    return block;
  });
};
