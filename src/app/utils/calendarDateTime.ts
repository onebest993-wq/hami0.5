function normalizeDigits(input: string): string {
    const map: Record<string, string> = {
        '٠': '0',
        '١': '1',
        '٢': '2',
        '٣': '3',
        '٤': '4',
        '٥': '5',
        '٦': '6',
        '٧': '7',
        '٨': '8',
        '٩': '9',
        '۰': '0',
        '۱': '1',
        '۲': '2',
        '۳': '3',
        '۴': '4',
        '۵': '5',
        '۶': '6',
        '۷': '7',
        '۸': '8',
        '۹': '9',
    };
    let out = '';
    for (const ch of input) out += map[ch] ?? ch;
    return out;
}

/** YYYY-MM-DD محلي */
export function parseYmdLocal(ymd: string): { y: number; m: number; d: number } | null {
    const cleaned = normalizeDigits(ymd).trim();
    const m = cleaned.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!m) return null;
    const y = Number(m[1]);
    const month = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || month < 1 || month > 12 || d < 1 || d > 31) return null;
    return { y, m: month, d };
}

/** HH:MM — 24h */
export function parseHmLocal(hm: string): { h: number; min: number } | null {
    const cleaned = normalizeDigits(hm).trim();
    const m = cleaned.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, min };
}

export type CalendarInstantMode = 'start' | 'end';

/**
 * يحوّل تاريخ التقويم (YYYY-MM-DD + وقت اختياري) إلى timestamp UTC milliseconds
 * مع تفسير المدخلات بـ **Asia/Baghdad** (UTC+3، لا DST).
 *
 * - مع وقت: بداية الموعد بتوقيت بغداد.
 * - بدون وقت: نهاية اليوم بتوقيت بغداد (23:59:59) لتجنّب «متأخر» صباح يوم الجلسة.
 *
 * هذا يضمن أن لاعبَين على جهازين بمنطقتين زمنيتين مختلفتين يحسبان نفس
 * "بداية" و"نهاية" الحدث.
 */
const BAGHDAD_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

export function calendarEventToTimestamp(
    dateYmd: string,
    timeHm?: string | null,
    mode: CalendarInstantMode = 'end',
): number | null {
    const ymd = parseYmdLocal(dateYmd);
    if (!ymd) return null;

    const hm = timeHm ? parseHmLocal(timeHm) : null;
    let h = 0;
    let min = 0;
    let sec = 0;
    let ms = 0;
    if (hm) {
        h = hm.h;
        min = hm.min;
    } else if (mode === 'start') {
        h = 9;
    } else {
        h = 23;
        min = 59;
        sec = 59;
        ms = 999;
    }
    // نُفسّر (y, m, d, h, min) على أنها أرقام تقويم بغداد:
    // - نبنيها كأنها UTC ثم نطرح الـ offset → نحصل على الـ UTC timestamp المطابق.
    const asIfUtc = Date.UTC(ymd.y, ymd.m - 1, ymd.d, h, min, sec, ms);
    return asIfUtc - BAGHDAD_UTC_OFFSET_MS;
}

export function calendarEventToIso(
    dateYmd: string,
    timeHm?: string | null,
    mode: CalendarInstantMode = 'end',
): string | undefined {
    const ts = calendarEventToTimestamp(dateYmd, timeHm, mode);
    return ts == null ? undefined : new Date(ts).toISOString();
}
