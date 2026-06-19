const STORAGE_KEY = 'hami:fast-track-request-type-templates';
const MAX_TEMPLATES = 20;
const MAX_TEMPLATE_LENGTH = 80;

export function normalizeRequestTypeTemplate(text: string): string {
    return String(text ?? '').replace(/\s+/g, ' ').trim();
}

export function loadRequestTypeTemplates(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of parsed) {
            const normalized = normalizeRequestTypeTemplate(String(item));
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            out.push(normalized);
            if (out.length >= MAX_TEMPLATES) break;
        }
        return out;
    } catch {
        return [];
    }
}

export function persistRequestTypeTemplates(templates: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_TEMPLATES)));
    } catch {
        /* ignore quota errors */
    }
}

export function addRequestTypeTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeRequestTypeTemplate(text);
    if (!normalized || normalized.length > MAX_TEMPLATE_LENGTH) return templates;
    const withoutDup = templates.filter((t) => t !== normalized);
    return [normalized, ...withoutDup].slice(0, MAX_TEMPLATES);
}

export function removeRequestTypeTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeRequestTypeTemplate(text);
    return templates.filter((t) => t !== normalized);
}
