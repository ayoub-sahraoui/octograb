export interface ExecutionPreflightFeedback {
    title: string;
    summary: string;
    suggestedAction: string;
    problem: string;
    whyItHappened: string;
    fixSteps: string[];
    selector?: string;
    affectedPath?: string;
    details: string[];
}

function splitIssuePath(issue: string): { path?: string; message: string } {
    const separatorIndex = issue.indexOf(': ');
    if (separatorIndex === -1) {
        return { message: issue };
    }

    return {
        path: issue.slice(0, separatorIndex),
        message: issue.slice(separatorIndex + 2),
    };
}

function extractSelector(message: string): string | undefined {
    return message.match(/selector "([^"]+)"/)?.[1];
}

function extractAffectedName(path?: string): string {
    if (!path) return 'the affected block';
    const parts = path.split(' > ').map((part) => part.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'the affected block';
}

export function buildSelectorPreflightFeedback(
    blockingIssues: string[],
    warnings: string[] = [],
): ExecutionPreflightFeedback {
    const firstIssue = blockingIssues[0] || 'We found a selector issue before scraping started.';
    const { path, message } = splitIssuePath(firstIssue);

    if (message.includes('should match one element')) {
        return {
            title: 'Pick one exact element',
            summary: 'This selector matches more than one element, so the scraper would not know which one to use.',
            suggestedAction: 'Open the block and choose one exact clickable element before running again.',
            problem: 'The click target matches more than one element.',
            whyItHappened: 'The selector is too broad for a block that needs one exact element.',
            fixSteps: [
                'Open the affected block in Builder.',
                'Choose one exact clickable element.',
                'Rerun the preflight check.',
            ],
            selector: extractSelector(message),
            affectedPath: path,
            details: [message, ...warnings],
        };
    }

    if (message.includes('same-tab click/detail/go-back flow')) {
        const fieldName = extractAffectedName(path);
        return {
            title: 'Detail page field not found',
            summary: 'A field that should be extracted from the detail page was not found during preflight.',
            suggestedAction: 'Open the affected field, repick the element on the detail page, and rerun preflight.',
            problem: `The field "${fieldName}" was not found on the detail page.`,
            whyItHappened: 'This field belongs on the detail page after a same-tab click/detail/go-back flow, so OctoGrab opened the first detail page before checking it.',
            fixSteps: [
                'Open the affected field in Builder.',
                'Repick the element on the detail page.',
                'Rerun the preflight check.',
            ],
            selector: extractSelector(message),
            affectedPath: path,
            details: [message, ...warnings],
        };
    }

    if (message.includes('matched no elements on the detail page')) {
        const fieldName = extractAffectedName(path);
        return {
            title: 'Detail page element not found',
            summary: 'We could not find this selector on the first detail page during the pre-run check.',
            suggestedAction: 'Open the detail block, pick the element again on the detail page, then rerun the blueprint.',
            problem: `The field "${fieldName}" was not found on the detail page.`,
            whyItHappened: 'The saved selector does not match the current detail-page DOM.',
            fixSteps: [
                'Open the affected detail block in Builder.',
                'Pick the element again on the detail page.',
                'Rerun the preflight check.',
            ],
            selector: extractSelector(message),
            affectedPath: path,
            details: [message, ...warnings],
        };
    }

    if (message.includes('matched no elements on this page')) {
        const fieldName = extractAffectedName(path);
        return {
            title: 'Element not found on the page',
            summary: 'We could not find this selector before scraping started.',
            suggestedAction: 'Open the affected block, pick the element again, and rerun the preflight check.',
            problem: `OctoGrab could not find "${fieldName}" on the current page.`,
            whyItHappened: 'The saved selector does not match the page at the time preflight runs.',
            fixSteps: [
                'Open the affected block in Builder.',
                'Pick the element again on the current page.',
                'Rerun the preflight check.',
            ],
            selector: extractSelector(message),
            affectedPath: path,
            details: [message, ...warnings],
        };
    }

    return {
        title: 'Preflight check failed',
        summary: 'We found a selector issue before scraping started, so the run was stopped early.',
        suggestedAction: 'Review the affected block, fix the selector, and try the run again.',
        problem: 'A selector issue stopped the run before scraping started.',
        whyItHappened: 'One or more blocks could not be verified against the live page.',
        fixSteps: [
            'Review the affected block in Builder.',
            'Fix or repick the selector.',
            'Rerun the preflight check.',
        ],
        selector: extractSelector(message),
        affectedPath: path,
        details: [message, ...warnings],
    };
}
