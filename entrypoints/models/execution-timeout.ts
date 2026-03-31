const NO_DEFAULT_BLOCK_TIMEOUT_TYPES = new Set([
    'loop_elements',
    'loop_pagination',
    'extract_scope',
    'macro',
]);

export function getBlockExecutionTimeout(block: { type: string; maxExecutionTime?: number | null }): number | null {
    if (typeof block.maxExecutionTime === 'number') {
        return block.maxExecutionTime;
    }

    if (NO_DEFAULT_BLOCK_TIMEOUT_TYPES.has(block.type)) {
        return null;
    }

    return 30000;
}

export async function runWithTimeout<T>(
    work: () => Promise<T>,
    timeoutMs: number,
    label: string,
    onTimeout?: () => Promise<void> | void,
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
        return await new Promise<T>((resolve, reject) => {
            timeoutId = setTimeout(async () => {
                try {
                    await onTimeout?.();
                } catch {
                    // best-effort cleanup
                }
                reject(new Error(`Block "${label}" exceeded ${timeoutMs}ms timeout`));
            }, timeoutMs);

            work()
                .then(resolve)
                .catch(reject);
        });
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}
