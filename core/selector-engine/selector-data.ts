export enum ElementType {
    CLICKABLE = 'clickable',
    INPUT = 'input',
    SELECT = 'select',
    TEXT = 'text',
    CONTAINER = 'container',
    FORM = 'form'
}

export enum ElementMode {
    SINGLE = 'single',
    MULTIPLE = 'multiple'
}

export class SelectorData {
    elements: HTMLElement[] = [];
    selectors?: {
        css: string;
        xpath: string;
        recommended: string;
    };
    type?: ElementType;
    mode: ElementMode = ElementMode.SINGLE;

    constructor() { }
}