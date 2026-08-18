export type SelectorCardinality = 'single' | 'multiple' | 'any';

export type SelectorRole =
    | 'click-target'
    | 'hover-target'
    | 'input-target'
    | 'loop-root'
    | 'pagination-next'
    | 'scroll-target'
    | 'condition-target'
    | 'assert-target'
    | 'wait-target'
    | 'extract-scope'
    | 'extract-field';

export type ExpectedElementType = 'clickable' | 'input' | 'any';

export type SelectorContext = 'list-field' | 'detail-field' | 'global-field' | 'scope-field';

import { Block } from "./types";

export function getSelectorContext(block?: Block | null, role?: SelectorRole): SelectorContext {
    if (!block || role !== 'extract-field') {
        return 'global-field';
    }

    // Find the extract_scope block we are in
    let extractScopeBlock: Block | null = null;
    let current: Block | null | undefined = block;
    while (current) {
        if (current.type === 'extract_scope') {
            extractScopeBlock = current;
            break;
        }
        current = current.parent;
    }

    if (!extractScopeBlock) {
        return 'global-field';
    }

    const config = extractScopeBlock.config as any;

    // B: Is there a custom scope selector?
    if (config?.scopeSelector?.value) {
        return 'scope-field';
    }

    // Check if any parent extract_scope has a scope selector (if resetScope is false)
    if (!config?.resetScope) {
        let parent: Block | null | undefined = extractScopeBlock.parent;
        while (parent) {
            if (parent.type === 'extract_scope') {
                const parentConfig = parent.config as any;
                if (parentConfig?.scopeSelector?.value) {
                    return 'scope-field';
                }
                if (parentConfig?.resetScope) {
                    break;
                }
            }
            parent = parent.parent;
        }
    }

    // D: Is resetScope true?
    const isResetScope = !!config?.resetScope;

    // Check if inside loop elements
    let loopElementsAncestor: Block | null = null;
    let temp: Block | null | undefined = extractScopeBlock.parent;
    while (temp) {
        if (temp.type === 'loop_elements') {
            loopElementsAncestor = temp;
            break;
        }
        temp = temp.parent;
    }

    const insideLoop = loopElementsAncestor !== null;

    // H: Is this after detail click?
    let isAfterDetailClick = false;

    // Check if any ancestor is a click block (meaning we are nested inside a click/detail page context)
    let parentWalk: Block | null | undefined = extractScopeBlock.parent;
    while (parentWalk) {
        if (parentWalk.type === 'click') {
            const clickConfig = parentWalk.config as any;
            if (clickConfig?.selector?.value) {
                isAfterDetailClick = true;
                break;
            }
        }
        parentWalk = parentWalk.parent;
    }

    // Fallback: Check preceding click siblings inside the loop (sequential same-tab click)
    if (!isAfterDetailClick && loopElementsAncestor) {
        const children = loopElementsAncestor.children || [];
        let targetChild: Block | null = null;
        let curr: Block | null | undefined = extractScopeBlock;
        while (curr) {
            if (curr.parent === loopElementsAncestor) {
                targetChild = curr;
                break;
            }
            curr = curr.parent;
        }

        if (targetChild) {
            const index = children.indexOf(targetChild);
            if (index !== -1) {
                for (let i = 0; i < index; i++) {
                    const sibling = children[i];
                    if (sibling.enabled !== false && sibling.type === 'click') {
                        const clickConfig = sibling.config as any;
                        if (clickConfig?.selector?.value && !clickConfig.openInNewTab) {
                            isAfterDetailClick = true;
                            break;
                        }
                    }
                }
            }
        }
    }

    if (isResetScope) {
        if (isAfterDetailClick) {
            return 'detail-field';
        }
        return 'global-field';
    } else {
        if (insideLoop) {
            if (isAfterDetailClick) {
                return 'detail-field';
            }
            return 'list-field';
        }
        return 'global-field';
    }
}
