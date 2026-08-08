import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { collectCalendarSparkNudges } from '@/app/spark/engine/sparkCalendarEngine';
import {
    hasCalendarSparkSupplementalSources,
    type CalendarSparkSupplementalInput,
} from '@/app/spark/calendar/calendarSparkSupplementalScan';

/** عدّاد إشارات سبارك للتقويم — للشارة على بلاطة dockCalendar وتبويب التنبيهات */
export function countCalendarSparkAttention(
    events: UnifiedEvent[],
    supplemental?: CalendarSparkSupplementalInput,
    options?: { nowMs?: number },
): number {
    if (!events.length && !hasCalendarSparkSupplementalSources(supplemental)) return 0;
    const ctx = buildCalendarSparkContext(events, {
        nowMs: options?.nowMs,
        horizonHours: 168,
        conflictHorizonDays: 7,
    });
    const nudges = collectCalendarSparkNudges(ctx, supplemental);
    if (!nudges.length) return 0;
    return new Set(nudges.map((nudge) => nudge.targetFileId ?? nudge.id)).size;
}
