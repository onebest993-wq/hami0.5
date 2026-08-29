/**
 * تطهير مشترك لنصوص وأعداد تبويب المقر قبل الرسم.
 * لا يُستبدل به تطهير الخادم — طبقة عرض فقط.
 */

export function stripHqControlChars(raw: unknown, maxLen: number): string {
    return String(raw ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, Math.max(0, maxLen));
}

export function clampHqCount(value: unknown, max = 1_000_000_000): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(Math.floor(n), max);
}

export function isHqAbortError(error: unknown, signal?: AbortSignal): boolean {
    if (signal?.aborted) return true;
    if (!error || typeof error !== 'object') return false;
    return String((error as { name?: unknown }).name ?? '') === 'AbortError';
}
