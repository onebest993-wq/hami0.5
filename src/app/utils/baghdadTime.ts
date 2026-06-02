/**
 * baghdadTime — معالجة المنطقة الزمنية للعراق (Asia/Baghdad, UTC+3 بلا DST).
 *
 * المشكلة (قبل هذا الملف):
 *   كل حسابات الـ Date في النظام تستخدم device-local TZ.
 *   محامٍ على جهاز مضبوط على UTC يرى التواريخ خاطئة بـ 3 ساعات.
 *   حساب "اليوم" / "غداً" يختلف بين الأجهزة.
 *
 * هذا الملف يُوحّد كل عمليات التقويم على Asia/Baghdad،
 * مع الحفاظ على ISO UTC في التخزين (best practice).
 */

const BAGHDAD_TZ = 'Asia/Baghdad';
const BAGHDAD_UTC_OFFSET_MS = 3 * 60 * 60 * 1000; // ثابت (لا DST في العراق)

/**
 * يُرجع YYYY-MM-DD بحسب Asia/Baghdad من Date أو ISO string.
 * مثال: '2026-06-01T22:30:00Z' → '2026-06-02' (لأن في بغداد 01:30 AM)
 */
export function toBaghdadYmd(input: Date | string | number): string | null {
    let date: Date;
    if (input instanceof Date) {
        date = input;
    } else if (typeof input === 'string') {
        // إن كان YYYY-MM-DD فقط (بلا وقت/TZ) → نعتبره بالفعل بتوقيت بغداد
        const ymdOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymdOnly) return input;
        date = new Date(input);
    } else {
        date = new Date(input);
    }
    if (Number.isNaN(date.getTime())) return null;

    // نُحوّل إلى بغداد عبر Intl
    try {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: BAGHDAD_TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(date);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        const d = parts.find((p) => p.type === 'day')?.value;
        if (!y || !m || !d) return null;
        return `${y}-${m}-${d}`;
    } catch {
        // احتياط: حساب يدوي بدون Intl (لو bundle بدون locale data)
        const baghdadMs = date.getTime() + BAGHDAD_UTC_OFFSET_MS;
        const utcDate = new Date(baghdadMs);
        return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
    }
}

/**
 * يُرجع YYYY-MM-DD لليوم الحالي بحسب Asia/Baghdad.
 */
export function todayBaghdadYmd(): string {
    return toBaghdadYmd(new Date()) ?? '';
}

/**
 * يحوّل (YYYY-MM-DD + HH:MM اختياري) → timestamp بـ Asia/Baghdad TZ.
 *
 * @param dateYmd "YYYY-MM-DD"
 * @param timeHm "HH:MM" أو null/undefined
 * @param mode إذا لا يوجد وقت: 'start' = 09:00 بغداد، 'end' = 23:59:59 بغداد
 * @returns timestamp UTC milliseconds, أو null لو الصيغة خاطئة
 */
export function baghdadDateTimeToTimestamp(
    dateYmd: string,
    timeHm?: string | null,
    mode: 'start' | 'end' = 'end',
): number | null {
    const ymdMatch = dateYmd?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!ymdMatch) return null;
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]);
    const d = Number(ymdMatch[3]);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;

    let h = 0;
    let min = 0;
    let sec = 0;
    let ms = 0;
    if (timeHm) {
        const hmMatch = timeHm.match(/^(\d{1,2}):(\d{2})/);
        if (hmMatch) {
            h = Number(hmMatch[1]);
            min = Number(hmMatch[2]);
        }
    } else if (mode === 'start') {
        h = 9;
    } else {
        h = 23;
        min = 59;
        sec = 59;
        ms = 999;
    }

    // Date.UTC تُعيد timestamp لو كانت المدخلات بـ UTC
    // نحن نُريد التفسير بأنّ المدخلات بـ Baghdad TZ → نطرح الـ offset
    const asIfUtc = Date.UTC(y, m - 1, d, h, min, sec, ms);
    return asIfUtc - BAGHDAD_UTC_OFFSET_MS;
}

/**
 * يُرجع بداية ونهاية "اليوم" في بغداد كـ UTC timestamps.
 * مفيد لـ Date Range queries.
 */
export function baghdadDayRange(
    dateYmd?: string,
): { startMs: number; endMs: number } | null {
    const ymd = dateYmd ?? todayBaghdadYmd();
    if (!ymd) return null;
    const startMs = baghdadDateTimeToTimestamp(ymd, null, 'start');
    const endMs = baghdadDateTimeToTimestamp(ymd, null, 'end');
    if (startMs === null || endMs === null) return null;
    // نعدّل start إلى 00:00 بدلاً من 09:00
    return {
        startMs: startMs - 9 * 60 * 60 * 1000,
        endMs,
    };
}

/**
 * يُضيف n من الأيام إلى YYYY-MM-DD باستخدام Asia/Baghdad.
 */
export function addBaghdadDays(dateYmd: string, n: number): string | null {
    const ts = baghdadDateTimeToTimestamp(dateYmd, '12:00', 'start');
    if (ts === null) return null;
    return toBaghdadYmd(new Date(ts + n * 24 * 60 * 60 * 1000));
}
