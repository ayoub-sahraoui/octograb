export function deriveExtractedColumns(rows: Record<string, any>[]): string[] {
    const columns: string[] = [];

    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!columns.includes(key)) {
                columns.push(key);
            }
        }
    }

    return columns;
}
