export function normalizeHeirWorkflowKey(name: string): string {
    const raw = String(name || '').trim();
    return raw
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '');
}
