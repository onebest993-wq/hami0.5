export function pickNonemptyString(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value ?? '').trim();
        if (text) return text;
    }
    return '';
}

export function readFileDetailsField(file: Record<string, unknown>, key: string): string {
    const details = file.details;
    if (!details || typeof details !== 'object') return '';
    const raw = (details as Record<string, unknown>)[key];
    return typeof raw === 'string' ? raw.trim() : '';
}
