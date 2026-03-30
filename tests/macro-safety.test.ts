import { describe, expect, it } from 'vitest';
import { guardMacroExecution, MAX_MACRO_EXPANSION_BLOCKS, MAX_MACRO_EXPANSION_DEPTH } from '../entrypoints/models/macro-safety';

describe('Macro Safety', () => {
    it('rejects recursive macro execution at runtime', () => {
        expect(() =>
            guardMacroExecution({
                macroId: 'macro-a',
                macroName: 'Macro A',
                activeStack: ['macro-a'],
                nextBlockCount: 1,
                expandedBlockCount: 0,
            })
        ).toThrow('Macro cycle detected');
    });

    it('rejects macro depth over the configured limit', () => {
        expect(() =>
            guardMacroExecution({
                macroId: 'macro-z',
                macroName: 'Macro Z',
                activeStack: Array.from({ length: MAX_MACRO_EXPANSION_DEPTH }, (_, index) => `macro-${index}`),
                nextBlockCount: 1,
                expandedBlockCount: 0,
            })
        ).toThrow('Macro expansion depth exceeded');
    });

    it('rejects macro expansion block budgets over the configured limit', () => {
        expect(() =>
            guardMacroExecution({
                macroId: 'macro-big',
                macroName: 'Macro Big',
                activeStack: [],
                nextBlockCount: 5,
                expandedBlockCount: MAX_MACRO_EXPANSION_BLOCKS - 2,
            })
        ).toThrow('Macro expansion would exceed max block limit');
    });
});
