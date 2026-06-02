import type { LegalTask } from '@/app/types/TaskEngine';
import { addDays, startOfLocalDay } from '@/app/utils/nlpParser';

export function getSaturdayOfWeekContaining(ref: Date): Date {
    const d = startOfLocalDay(ref);
    const dow = d.getDay();
    const daysFromSat = (dow - 6 + 7) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - daysFromSat);
    return startOfLocalDay(sat);
}

export function formatShortDate(d: Date): string {
    try {
        return d.toLocaleDateString('ar-IQ', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

export function formatIqd(n: number): string {
    try {
        return `${new Intl.NumberFormat('ar-IQ').format(n)} د.ع.`;
    } catch {
        return `${n} د.ع.`;
    }
}

export function parseAmountInput(s: string): number {
    const n = parseFloat(String(s).replace(/[,\s٬]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isReminderDue(task: LegalTask, now: Date): boolean {
    if (task.reminderAt === null) return false;
    const today = startOfLocalDay(now).getTime();
    const r = startOfLocalDay(task.reminderAt).getTime();
    return today >= r;
}

export function snoozeAfterDays(days: number): Date {
    return addDays(startOfLocalDay(new Date()), days);
}

/** تاريخ محلي من حقل date (yyyy-mm-dd) دون انزياح UTC */
export function dateFromYmdInput(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (Number.isNaN(dt.getTime())) return null;
    return startOfLocalDay(dt);
}
