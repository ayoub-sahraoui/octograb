import { describe, expect, it, vi } from 'vitest';
import { resolveScope, getElements, getElement } from '../core/dom-query';

describe('resolveScope', () => {
    it('throws when a generated scope marker no longer exists in the DOM', () => {
        const fakeDocument = {
            documentElement: { nodeName: 'HTML' },
        };

        expect(() => resolveScope({
            selector: '[data-octo-scope="missing-scope"]',
            selectorType: 'css',
            index: 0,
        } as any, fakeDocument as any)).toThrow('missing-scope');
    });
});

describe('dom-query scoped selectors', () => {
    it('getElements matches scope itself when selector matches scope', () => {
        const fakeChild = {
            tagName: 'DIV',
            className: 'my-child',
            nodeType: 1,
            matches: (sel: string) => sel === '.my-child',
            querySelectorAll: (sel: string) => []
        };
        const fakeParent = {
            tagName: 'DIV',
            className: 'my-parent',
            nodeType: 1,
            matches: (sel: string) => sel === '.my-parent' || sel === ':scope',
            querySelectorAll: (sel: string) => sel === '.my-child' ? [fakeChild] : []
        };

        // Matching scope itself using ':scope'
        const matchScope = getElements(':scope', 'css', fakeParent as any);
        expect(matchScope).toEqual([fakeParent]);

        // Matching scope itself by className selector
        const matchClassName = getElements('.my-parent', 'css', fakeParent as any);
        expect(matchClassName).toEqual([fakeParent]);

        // Matching descendant
        const matchDescendant = getElements('.my-child', 'css', fakeParent as any);
        expect(matchDescendant).toEqual([fakeChild]);
    });

    it('getElements handles starting child combinator', () => {
        const fakeChild = {
            tagName: 'SPAN',
            nodeType: 1,
            matches: (sel: string) => false,
            querySelectorAll: (sel: string) => []
        };
        const fakeParent = {
            tagName: 'DIV',
            nodeType: 1,
            matches: (sel: string) => false,
            querySelectorAll: (sel: string) => {
                if (sel === ':scope > span') return [fakeChild];
                return [];
            }
        };

        const matched = getElements('> span', 'css', fakeParent as any);
        expect(matched).toEqual([fakeChild]);
    });
});

describe('dom-query text and auto selector resolution', () => {
    it('getElements matches exact text on leaf nodes', () => {
        const childEl = {
            nodeType: 1,
            tagName: 'SPAN',
            textContent: 'Books',
            contains: () => false,
        };
        const parentEl = {
            nodeType: 1,
            tagName: 'DIV',
            textContent: '  Books  ',
            contains: (el: any) => el === childEl,
            ownerDocument: {
                evaluate: vi.fn((xpath: string) => {
                    if (xpath.includes('normalize-space() = "Books"')) {
                        return {
                            snapshotLength: 2,
                            snapshotItem: (i: number) => i === 0 ? parentEl : childEl,
                        };
                    }
                    return { snapshotLength: 0 };
                })
            }
        };

        const matched = getElements('Books', 'text', parentEl as any);
        expect(matched).toEqual([childEl]);
    });

    it('getElements auto selector handles CSS, XPath, and Text fallbacks', () => {
        const fakeEl = { nodeType: 1, tagName: 'A' };
        
        const mockDoc = {
            nodeType: 9,
            evaluate: vi.fn(() => ({
                snapshotLength: 1,
                snapshotItem: () => fakeEl,
            }))
        };

        const matchedXPath = getElements('//a', 'auto', mockDoc as any);
        expect(matchedXPath).toEqual([fakeEl]);
        expect(mockDoc.evaluate).toHaveBeenCalled();

        const scope = {
            nodeType: 1,
            ownerDocument: {
                createDocumentFragment: () => ({
                    querySelectorAll: () => []
                })
            },
            querySelectorAll: vi.fn(() => [fakeEl]),
        };
        const matchedCSS = getElements('.my-link', 'auto', scope as any);
        expect(matchedCSS).toEqual([fakeEl]);
        expect(scope.querySelectorAll).toHaveBeenCalledWith('.my-link');

        const scopeNoMatch = {
            nodeType: 1,
            querySelectorAll: vi.fn(() => []),
            ownerDocument: {
                createDocumentFragment: () => ({
                    querySelectorAll: () => []
                }),
                evaluate: vi.fn(() => ({
                    snapshotLength: 1,
                    snapshotItem: () => fakeEl,
                }))
            }
        };

        const matchedFallback = getElements('Books', 'auto', scopeNoMatch as any);
        expect(matchedFallback).toEqual([fakeEl]);
    });
});
