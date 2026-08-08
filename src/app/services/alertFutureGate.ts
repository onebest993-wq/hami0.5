import { normalizeDateToYmd } from '@/app/services/calendar/bridge/core';
import { toBaghdadYmd } from '@/app/utils/baghdadTime';

/** YYYY-MM-DD وفق Asia/Baghdad */
export function localTodayYmd(now: Date = new Date()): string {
    return toBaghdadYmd(now) ?? normalizeDateToYmd(now.toISOString()) ?? '';
}

export function compareYmd(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
}

/** تاريخ الحدث >= اليوم (مقارنة يومية محلية) */
export function isEventDateOnOrAfterToday(dateYmd: string | null | undefined, now?: Date): boolean {
    const ymd = normalizeDateToYmd(dateYmd ?? '');
    if (!ymd) return false;
    return compareYmd(ymd, localTodayYmd(now)) >= 0;
}

/**
 * تاريخ الحدث > اليوم بدقة (يستبعد التواريخ الماضية واليوم نفسه).
 * يُستخدم في البطاقة العامة لمنع ظهور تنبيهات اليوم نفسه (المستخدم يراها مباشرة في التقويم).
 */
export function isEventStrictlyAfterToday(
    dateYmd: string | null | undefined,
    now?: Date,
): boolean {
    const ymd = normalizeDateToYmd(dateYmd ?? '');
    if (!ymd) return false;
    return compareYmd(ymd, localTodayYmd(now)) > 0;
}

export function daysFromTodayYmd(eventYmd: string, todayYmd: string): number {
    const a = parseYmdParts(eventYmd);
    const b = parseYmdParts(todayYmd);
    if (!a || !b) return 0;
    const t1 = Date.UTC(a.y, a.m - 1, a.d);
    const t2 = Date.UTC(b.y, b.m - 1, b.d);
    return Math.round((t1 - t2) / (24 * 60 * 60 * 1000));
}

function parseYmdParts(ymd: string): { y: number; m: number; d: number } | null {
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** استحقاق ISO — الجزء اليومي >= اليوم */
export function isFutureDueIso(iso: string | null | undefined, now?: Date): boolean {
    if (!iso) return false;
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return false;
    const d = new Date(ts);
    const ymd = localTodayYmd(d);
    return compareYmd(ymd, localTodayYmd(now)) >= 0;
}

/** أقصى أفق عرض في البطاقة العامة (يوم) */
export const ALERT_FUTURE_MAX_HORIZON_DAYS = 120;
