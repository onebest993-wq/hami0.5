export const LEGAL_HIGHLIGHT_COLORS = ['#E6C67355', '#7DD3A855', '#F08A7855', '#8AB4F855'] as const;

export function normalizeCssColor(value: string): string | null {
    const raw = value.trim().toLowerCase();
    if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return null;
    if (raw.startsWith('#')) return raw.length >= 7 ? raw.slice(0, 7) : raw;
    const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(raw);
    if (!rgb) return raw;
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${hex(Number(rgb[1]))}${hex(Number(rgb[2]))}${hex(Number(rgb[3]))}`;
}

export function matchHighlightColor(cssColor: string | null): string | null {
    if (!cssColor) return null;
    const normalized = normalizeCssColor(cssColor);
    if (!normalized) return null;
    for (const candidate of LEGAL_HIGHLIGHT_COLORS) {
        const base = candidate.slice(0, 7);
        if (normalized === base || normalized.startsWith(base)) return candidate;
    }
    return normalized.length >= 7 ? `${normalized}55` : null;
}

export function highlightColorsMatch(a: string, b: string): boolean {
    const na = normalizeCssColor(a);
    const nb = normalizeCssColor(b);
    if (na && nb) return na === nb;
    return a.slice(0, 7) === b.slice(0, 7);
}
