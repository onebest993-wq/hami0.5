/**
 * Helpers مشتركة بين builders الإشعارات الجديدة (execution/lawsuit/financial).
 * نُخرجها لملف منفصل لتجنّب circular import مع SecretaryOrchestrator.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * يحاول تفسير YMD أو ISO إلى timestamp. يقبل: 'YYYY-MM-DD' و 'YYYY-MM-DDTHH:mm:ss[.sss]Z' و timestamp رقمي.
 */
export function parseYmdToTs(value: unknown): number | null {
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? t : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value < 10_000_000_000 ? value * 1000 : value;
    }
    if (typeof value !== 'string') return null;
    const s = value.trim();
    if (!s) return null;
    // YYYY-MM-DD (محلي)
    const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (ymd) {
        const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
        const t = d.getTime();
        return Number.isFinite(t) ? t : null;
    }
    const d = new Date(s);
    const t = d.getTime();
    return Number.isFinite(t) ? t : null;
}

/** عدد الأيام (مدوّر للأسفل) من نقطة الآن إلى ts مستقبلي. */
export function dayDiff(targetTs: number, nowTs: number): number {
    return Math.floor((targetTs - nowTs) / DAY_MS);
}

/** أيام تقويمية حتى يوم الهدف (٠ = اليوم نفسه) — بلا انزلاق ساعة منتصف الليل. */
export function calendarDaysUntil(targetTs: number, nowTs: number): number {
    const targetDay = new Date(targetTs);
    targetDay.setHours(0, 0, 0, 0);
    const nowDay = new Date(nowTs);
    nowDay.setHours(0, 0, 0, 0);
    return Math.round((targetDay.getTime() - nowDay.getTime()) / DAY_MS);
}

/** التحقق من تاريخ ISO آمن. */
export function safeIso(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const t = parseYmdToTs(value);
    return t != null ? new Date(t).toISOString() : undefined;
}
