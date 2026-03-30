import { makeAutoObservable } from "mobx";
import { MacroDefinition, MacroParameter } from "../models/macro-block";

const STORAGE_KEY = 'octograb_macros';

/**
 * Store for managing reusable macro definitions.
 * Macros are blueprint fragments that can be referenced and expanded inline.
 */
export class MacroRegistryStore {
    macros: Map<string, MacroDefinition> = new Map();
    isLoaded: boolean = false;

    constructor() {
        makeAutoObservable(this);
        this.loadFromStorage();
    }

    // ─── Action Methods ────────────────────────────────────────────────────

    setMacros(macros: Map<string, MacroDefinition>) {
        this.macros = macros;
    }

    setMacro(macroId: string, macro: MacroDefinition) {
        this.macros.set(macroId, macro);
    }

    deleteMacro(macroId: string) {
        this.macros.delete(macroId);
    }

    clearMacros() {
        this.macros.clear();
    }

    setLoaded(loaded: boolean) {
        this.isLoaded = loaded;
    }

    // ─── Async Methods ─────────────────────────────────────────────────────

    /**
     * Load macros from browser storage
     */
    async loadFromStorage(): Promise<void> {
        if (typeof browser === 'undefined') {
            this.setLoaded(true);
            return;
        }
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const stored = result[STORAGE_KEY];

            if (stored && Array.isArray(stored)) {
                this.clearMacros();
                for (const macro of stored) {
                    if (macro.id) {
                        this.setMacro(macro.id, macro);
                    }
                }
                this.setLoaded(true);
            } else {
                this.setLoaded(true);
            }
        } catch (error) {
            console.error('[MacroRegistry] Failed to load macros:', error);
            this.setLoaded(true);
        }
    }

    /**
     * Save macros to browser storage
     */
    private async saveToStorage(): Promise<void> {
        try {
            const macrosArray = Array.from(this.macros.values());
            await browser.storage.local.set({ [STORAGE_KEY]: macrosArray });
        } catch (error) {
            console.error('[MacroRegistry] Failed to save macros:', error);
        }
    }

    /**
     * Register a new macro or update existing
     */
    async registerMacro(macro: MacroDefinition): Promise<void> {
        const now = new Date().toISOString();
        const existing = this.macros.get(macro.id);

        this.setMacro(macro.id, {
            ...macro,
            createdAt: existing?.createdAt || now,
            updatedAt: now
        });

        await this.saveToStorage();
    }

    /**
     * Remove a macro by ID
     */
    async removeMacro(macroId: string): Promise<boolean> {
        if (!this.macros.has(macroId)) return false;

        this.deleteMacro(macroId);
        await this.saveToStorage();
        return true;
    }

    /**
     * Get a macro by ID
     */
    getMacro(macroId: string): MacroDefinition | undefined {
        return this.macros.get(macroId);
    }

    /**
     * Get all macros as an array
     */
    getAllMacros(): MacroDefinition[] {
        return Array.from(this.macros.values());
    }

    /**
     * Check if a macro exists
     */
    hasMacro(macroId: string): boolean {
        return this.macros.has(macroId);
    }

    /**
     * Create a macro definition from blocks
     */
    createMacroDefinition(
        name: string,
        description: string,
        blocks: any[],
        parameters?: MacroParameter[]
    ): MacroDefinition {
        return {
            id: crypto.randomUUID(),
            name,
            description,
            blocks,
            parameters: parameters || []
        };
    }
}

// Singleton instance
export const macroRegistryStore = new MacroRegistryStore();
