import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../components/ui/badge', () => ({
    Badge: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('execution preflight alert', () => {
    it('renders a dedicated preflight failure card with friendly guidance and actions', async () => {
        const { ExecutionPreflightAlert } = await import('../entrypoints/sidepanel/components/execution-preflight-alert');

        const html = renderToStaticMarkup(
            <ExecutionPreflightAlert
                feedback={{
                    title: 'Pick one exact element',
                    summary: 'This selector matches more than one element, so the scraper would not know which one to use.',
                    suggestedAction: 'Open the block and choose one exact clickable element before running again.',
                    problem: 'The click target matches more than one element.',
                    whyItHappened: 'The selector is too broad for a click.',
                    fixSteps: ['Open the block.', 'Choose one exact clickable element.'],
                    affectedPath: 'Loop > Open detail',
                    details: ['selector ".buy-now" should match one element but matched 3.'],
                }}
                onOpenBuilder={() => undefined}
            />,
        );

        expect(html).toContain('Preflight check failed');
        expect(html).toContain('Pick one exact element');
        expect(html).toContain('Open the block and choose one exact clickable element before running again.');
        expect(html).toContain('Affected block: Loop &gt; Open detail');
        expect(html).toContain('Open in Builder');
        expect(html).toContain('Details');
        expect(html).toContain('Choose one exact clickable element.');
    });

    it('renders plain-language preflight guidance before collapsed technical details', async () => {
        const { ExecutionPreflightAlert } = await import('../entrypoints/sidepanel/components/execution-preflight-alert');

        const html = renderToStaticMarkup(
            <ExecutionPreflightAlert
                feedback={{
                    title: 'Detail page field not found',
                    summary: 'A required detail-page field could not be found.',
                    suggestedAction: 'Repick the field on the detail page.',
                    problem: 'The field "URL image 1" was not found on the detail page.',
                    whyItHappened: 'This field belongs on the detail page after a same-tab click/detail/go-back flow.',
                    fixSteps: [
                        'Open the affected field in Builder.',
                        'Repick the element on the detail page.',
                        'Rerun preflight.',
                    ],
                    selector: '.detail-image',
                    affectedPath: 'Loop > Click title > Extract detail > URL image 1',
                    details: ['selector ".detail-image" matched no elements on the detail page.'],
                }}
            />,
        );

        expect(html).toContain('The field &quot;URL image 1&quot; was not found on the detail page.');
        expect(html).toContain('Repick the element on the detail page.');
        expect(html).toContain('Selector:');
        expect(html).toContain('.detail-image');
        expect(html).toContain('<details');
    });
});
