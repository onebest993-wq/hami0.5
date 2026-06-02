import type { StatementContentHighlight, StatementHighlightColor } from './criminalStore';

export const STATEMENT_HIGHLIGHT_COLORS: { value: StatementHighlightColor; label: string }[] = [
    { value: 'red', label: 'أهم (أحمر)' },
    { value: 'blue', label: 'أزرق' },
    { value: 'yellow', label: 'أصفر' },
];

export function highlightColorClass(color: StatementHighlightColor): string {
    if (color === 'red') return 'text-red-200 bg-red-500/25 rounded px-0.5';
    if (color === 'blue') return 'text-sky-200 bg-sky-500/25 rounded px-0.5';
    return 'text-amber-100 bg-amber-500/25 rounded px-0.5';
}

export function sanitizeContentHighlights(
    raw: unknown,
    contentLength: number,
): StatementContentHighlight[] {
    if (!Array.isArray(raw) || contentLength <= 0) return [];
    const len = Math.max(0, contentLength);
    const out: StatementContentHighlight[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const o = item as Record<string, unknown>;
        const start = Number(o.start);
        const end = Number(o.end);
        const color = o.color;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
        if (color !== 'red' && color !== 'blue' && color !== 'yellow') continue;
        const s = Math.max(0, Math.min(len, Math.floor(start)));
        const e = Math.max(0, Math.min(len, Math.floor(end)));
        if (e <= s) continue;
        out.push({ start: s, end: e, color });
    }
    return out.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function mergeHighlightSegments(
    content: string,
    highlights: StatementContentHighlight[],
): { text: string; color?: StatementHighlightColor }[] {
    const text = String(content ?? '');
    if (!text) return [{ text: '' }];
    const sorted = sanitizeContentHighlights(highlights, text.length);
    if (!sorted.length) return [{ text }];

    const parts: { text: string; color?: StatementHighlightColor }[] = [];
    let pos = 0;
    for (const h of sorted) {
        if (h.start > pos) parts.push({ text: text.slice(pos, h.start) });
        parts.push({ text: text.slice(h.start, h.end), color: h.color });
        pos = h.end;
    }
    if (pos < text.length) parts.push({ text: text.slice(pos) });
    return parts;
}
