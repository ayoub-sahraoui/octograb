import { describe, expect, it } from 'vitest';
import { buildMacroConfigDisplay } from '../entrypoints/sidepanel/components/block-configs/macro-config-display';
import { MacroDefinition } from '../entrypoints/models/macro-block';

describe('macro config display', () => {
    const macros: MacroDefinition[] = [
        {
            id: 'login-flow',
            name: 'Login Flow',
            description: 'Logs into the current site',
            parameters: [
                { name: 'email', required: true, description: 'Login email' },
                { name: 'password', required: true, description: 'Login password' },
                { name: 'rememberMe', defaultValue: 'false' },
            ],
            blocks: [],
        },
    ];

    it('builds generated parameter rows from the selected macro', () => {
        const display = buildMacroConfigDisplay(macros, 'login-flow', {
            email: 'dev@example.com',
        });

        expect(display.selectedMacro?.name).toBe('Login Flow');
        expect(display.parameterRows).toEqual([
            {
                name: 'email',
                description: 'Login email',
                required: true,
                value: 'dev@example.com',
            },
            {
                name: 'password',
                description: 'Login password',
                required: true,
                value: '',
            },
            {
                name: 'rememberMe',
                description: undefined,
                required: false,
                value: 'false',
            },
        ]);
    });

    it('flags a stored macro id that no longer exists', () => {
        const display = buildMacroConfigDisplay(macros, 'missing-macro', { legacy: '1' });

        expect(display.selectedMacro).toBeUndefined();
        expect(display.missingMacroId).toBe('missing-macro');
        expect(display.parameterRows).toEqual([]);
    });
});
