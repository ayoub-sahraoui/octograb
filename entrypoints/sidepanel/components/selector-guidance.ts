export type SelectorRole =
    | 'click-target'
    | 'hover-target'
    | 'input-target'
    | 'loop-root'
    | 'wait-target'
    | 'extract-scope'
    | 'extract-field';

export interface SelectorRoleGuidance {
    label: string;
    description: string;
}

export function getSelectorRoleGuidance(role?: SelectorRole): SelectorRoleGuidance | null {
    switch (role) {
        case 'click-target':
            return {
                label: 'Best fit',
                description: 'Target the direct clickable trigger, like the button or link itself, instead of a broad wrapper.',
            };
        case 'hover-target':
            return {
                label: 'Best fit',
                description: 'Target the exact hover trigger. Broad card selectors often match many items, and synthetic hover only uses the first one.',
            };
        case 'input-target':
            return {
                label: 'Best fit',
                description: 'Target the actual form control, such as an input, textarea, or select, rather than its container.',
            };
        case 'loop-root':
            return {
                label: 'Best fit',
                description: 'Target the repeated parent item, like the product card or row, not a child title or link inside it.',
            };
        case 'wait-target':
            return {
                label: 'Best fit',
                description: 'Target the exact element whose presence or visibility should control the wait condition.',
            };
        case 'extract-scope':
            return {
                label: 'Best fit',
                description: 'Target one container that defines the extraction scope. Child field selectors will run inside this scope.',
            };
        case 'extract-field':
            return {
                label: 'Best fit',
                description: 'Target the field node inside the current scope. Keep it local to the scoped container when possible.',
            };
        default:
            return null;
    }
}
