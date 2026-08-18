import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeData: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => storeData[key] || null,
  setItem: (key: string, value: string) => { storeData[key] = value; },
  removeItem: (key: string) => { delete storeData[key]; },
  clear: () => { for (const key in storeData) delete storeData[key]; },
  length: 0,
  key: (index: number) => Object.keys(storeData)[index] || null,
};

vi.mock('../core/messaging', () => ({
  sendToContentScript: vi.fn(async () => ({ success: true })),
  onMessageFromContentScript: vi.fn(() => () => undefined),
}));

describe('blueprint wizard store', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('canProceed works correctly for fields step in single mode', async () => {
    const { default: store } = await import('../entrypoints/stores/blueprint-wizard-store');
    store.reset();
    store.setUrl('https://example.com');
    store.setStep('fields');

    // No fields -> cannot proceed
    expect(store.canProceed()).toBe(false);

    // One field -> can proceed
    store.addField('field_1', '.title', 'text', 'list');
    expect(store.canProceed()).toBe(true);

    // Duplicate fields -> cannot proceed
    store.addField('field_2', '.title2', 'text', 'list');
    const field2 = store.state.fields[1];
    store.updateField(field2.id, { name: 'field_1' });
    expect(store.canProceed()).toBe(false);
  });

  it('canProceed works correctly for fields step in detail mode', async () => {
    const { default: store } = await import('../entrypoints/stores/blueprint-wizard-store');
    store.reset();
    store.setUrl('https://example.com');
    store.setMode('detail');
    store.setStep('fields');

    // Add list field only -> cannot proceed
    store.addField('field_1', '.title', 'text', 'list');
    expect(store.canProceed()).toBe(false);

    // Add detail field -> can proceed
    store.addField('field_2', '.desc', 'text', 'detail');
    expect(store.canProceed()).toBe(true);
  });

  it('nextStep flows correctly', async () => {
    const { default: store } = await import('../entrypoints/stores/blueprint-wizard-store');
    store.reset();
    store.setUrl('https://example.com');
    expect(store.state.step).toBe('url');

    store.nextStep();
    expect(store.state.step).toBe('mode');

    store.setMode('single');
    store.nextStep();
    expect(store.state.step).toBe('container');
  });
});
