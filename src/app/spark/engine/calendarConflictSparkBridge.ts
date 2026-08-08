import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import type { CrossSectionConflictResult } from '@/app/services/calendar/scheduleConflictDetector';
import { detectConflictsFromUnifiedEvents } from '@/app/services/calendar/scheduleConflictDetector';

export type CalendarSparkConflictDay = {
    dateYmd: string;
    conflict: CrossSectionConflictResult;
};

function toLocalYmd(ms: number): string {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDaysYmd(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return toLocalYmd(date.getTime());
}

function collectDatesInHorizon(events: UnifiedEvent[], startYmd: string, horizonDays: number): string[] {
    const dates = new Set<string>();
    for (let i = 0; i < horizonDays; i++) {
        dates.add(addDaysYmd(startYmd, i));
    }
    for (const event of events) {
        if (event.isCompleted) continue;
        const ymd = String(event.date ?? '').trim().slice(0, 10);
        if (!ymd || ymd < startYmd) continue;
        if (ymd <= addDaysYmd(startYmd, horizonDays - 1)) {
            dates.add(ymd);
        }
    }
    return [...dates].sort();
}

/** يمسح أياماً قادمة ويكشف تضارب الإثقال/المواقع/التنقّل — نفس كاشف الرادار */
export function scanCalendarConflictDays(
    events: UnifiedEvent[],
    options?: { nowMs?: number; horizonDays?: number },
): CalendarSparkConflictDay[] {
    const nowMs = options?.nowMs ?? Date.now();
    const horizonDays = options?.horizonDays ?? 7;
    const todayYmd = toLocalYmd(nowMs);
    const dates = collectDatesInHorizon(events, todayYmd, horizonDays);
    const conflicts: CalendarSparkConflictDay[] = [];

    for (const dateYmd of dates) {
        const conflict = detectConflictsFromUnifiedEvents(events, dateYmd);
        if (conflict.hasConflict) {
            conflicts.push({ dateYmd, conflict });
        }
    }

    return conflicts;
}
