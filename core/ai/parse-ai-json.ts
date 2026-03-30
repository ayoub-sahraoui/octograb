export function parseAiJson<T>(
    content: string,
    expectedRoot: 'object' | 'array',
): T {
    const normalized = normalizeAiJsonText(content);
    const rootToken = expectedRoot === 'object' ? '{' : '[';

    const direct = tryParse<T>(normalized, expectedRoot);
    if (direct.ok) {
        return direct.value;
    }

    for (let index = 0; index < normalized.length; index += 1) {
        if (normalized[index] !== rootToken) {
            continue;
        }

        const candidate = extractBalancedJson(normalized, index);
        if (!candidate) {
            continue;
        }

        const parsed = tryParse<T>(candidate, expectedRoot);
        if (parsed.ok) {
            return parsed.value;
        }
    }

    throw new Error(`AI returned invalid ${expectedRoot} JSON.`);
}

function normalizeAiJsonText(content: string): string {
    return content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^json\s*/i, '')
        .trim();
}

function extractBalancedJson(content: string, startIndex: number): string | null {
    const stack: string[] = [];
    let inString = false;
    let escaping = false;

    for (let index = startIndex; index < content.length; index += 1) {
        const char = content[index];

        if (inString) {
            if (escaping) {
                escaping = false;
                continue;
            }
            if (char === '\\') {
                escaping = true;
                continue;
            }
            if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{' || char === '[') {
            stack.push(char);
            continue;
        }

        if (char === '}' || char === ']') {
            const last = stack[stack.length - 1];
            if (!last || !isMatchingPair(last, char)) {
                return null;
            }

            stack.pop();
            if (stack.length === 0) {
                return content.slice(startIndex, index + 1);
            }
        }
    }

    return null;
}

function isMatchingPair(open: string, close: string): boolean {
    return (open === '{' && close === '}') || (open === '[' && close === ']');
}

function tryParse<T>(
    candidate: string,
    expectedRoot: 'object' | 'array',
): { ok: true; value: T } | { ok: false } {
    try {
        const parsed = JSON.parse(candidate);
        if (expectedRoot === 'array' && !Array.isArray(parsed)) {
            return { ok: false };
        }
        if (expectedRoot === 'object' && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')) {
            return { ok: false };
        }
        return { ok: true, value: parsed as T };
    } catch {
        return { ok: false };
    }
}
