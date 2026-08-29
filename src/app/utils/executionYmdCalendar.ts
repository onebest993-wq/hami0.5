/**
 * مصدر واحد لحسابات YYYY-MM-DD في التنفيذ والطعون.
 *
 * - inclusive_same_day: يوم الإصدار/التبليغ = اليوم 0 (طعون المنفذ)
 * - next_day_start: العد من اليوم التالي (مهلة رضا، تكليف حضور، نشر)
 */
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/localYmd';
import { parseLocalNotificationDate } from '@/app/utils/executionStateMachineChrono';

export type YmdWindowCountMode = 'inclusive_same_day' | 'next_day_start';

export function normalizeYmd(raw: string | null | undefined): string {
    const s = String(raw ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = parseLocalNotificationDate(s);
    return Number.isNaN(d.getTime()) ? '' : formatDateToLocalYmd(d);
}

export function todayYmd(now: Date = new Date()): string {
    return getLocalTodayYmd(now);
}

export function ymdToLocalDate(ymd: string): Date | null {
    const n = normalizeYmd(ymd);
    if (!n) return null;
    const d = parseLocalNotificationDate(n);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function localDateToYmd(d: Date): string {
    return formatDateToLocalYmd(d);
}

/** إضافة أيام تقويمية إلى YYYY-MM-DD */
export function addCalendarDaysYmd(ymd: string, days: number): string {
    const n = normalizeYmd(ymd);
    if (!n) return '';
    const d = parseLocalNotificationDate(n);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return formatDateToLocalYmd(d);
}

/** أول وآخر يوم ضمن نافذة بعدد أيام محدد */
export function windowBoundsYmd(
    anchorYmd: string,
    windowDays: number,
    mode: YmdWindowCountMode = 'inclusive_same_day',
): { startYmd: string; endYmd: string } {
    const anchor = normalizeYmd(anchorYmd);
    if (!anchor || windowDays <= 0) {
        return { startYmd: anchor, endYmd: anchor };
    }
    if (mode === 'next_day_start') {
        const startYmd = addCalendarDaysYmd(anchor, 1);
        return {
            startYmd,
            endYmd: addCalendarDaysYmd(startYmd, windowDays - 1),
        };
    }
    return {
        startYmd: anchor,
        endYmd: addCalendarDaysYmd(anchor, windowDays - 1),
    };
}

/** أيام منذ بداية النافذة (اليوم 0 = أول يوم مسموح) */
export function daysElapsedFromAnchorYmd(
    anchorYmd: string,
    today: Date = new Date(),
    mode: YmdWindowCountMode = 'inclusive_same_day',
): number {
    const anchor = normalizeYmd(anchorYmd);
    if (!anchor) return 999;
    const startYmd =
        mode === 'next_day_start' ? addCalendarDaysYmd(anchor, 1) : anchor;
    const a = parseLocalNotificationDate(startYmd);
    const t = parseLocalNotificationDate(getLocalTodayYmd(today));
    if (Number.isNaN(a.getTime()) || Number.isNaN(t.getTime())) return 999;
    return Math.floor((t.getTime() - a.getTime()) / 86400000);
}

export function isYmdWindowOpen(elapsedDays: number, windowDays: number): boolean {
    return elapsedDays >= 0 && elapsedDays < windowDays;
}

export function lastDayOfYmdWindow(
    anchorYmd: string,
    windowDays: number,
    mode: YmdWindowCountMode = 'inclusive_same_day',
): string {
    return windowBoundsYmd(anchorYmd, windowDays, mode).endYmd;
}

export const EXECUTION_GRACE_PERIOD_DAYS = 7;

/** مهلة الرضا — 7 أيام تقويمية من اليوم التالي للإخبار */
export function gracePeriodWindowBoundsYmd(
    notificationYmd: string,
    extraCalendarDays: number = 0,
) {
    return windowBoundsYmd(
        notificationYmd,
        EXECUTION_GRACE_PERIOD_DAYS + Math.max(0, extraCalendarDays),
        'next_day_start',
    );
}

/** أول يوم يُسمح فيه بالإجراء الجبري بعد انتهاء المهلة الرضائية */
export function gracePeriodFirstCoerciveDayYmd(
    notificationYmd: string,
    extraCalendarDays: number = 0,
): string {
    const { endYmd } = gracePeriodWindowBoundsYmd(notificationYmd, extraCalendarDays);
    return addCalendarDaysYmd(endYmd, 1);
}

export function diffDaysYmd(fromYmd: string, toYmd: string): number | null {
    const a = ymdToLocalDate(fromYmd);
    const b = ymdToLocalDate(toYmd);
    if (!a || !b) return null;
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
