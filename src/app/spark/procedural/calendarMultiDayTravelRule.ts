import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { isHearingLikeEvent, ymdFromMs } from '@/app/spark/calendar/calendarSparkTimeUtils';
import type { SparkNudge } from '@/app/spark/types';
import { normalizeLocation } from '@/app/services/calendar/scheduleConflictDetector';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDaysYmd(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function formatDayLabel(dateYmd: string): string {
    const [y, m, d] = dateYmd.split('-');
    return `${d}/${m}/${y}`;
}

function primaryLocationForDay(
    ctx: CalendarSparkContext,
    dateYmd: string,
): { location: string; title: string } | null {
    const hearings = ctx.allEvents
        .filter(
            (event) =>
                !event.isCompleted &&
                String(event.date ?? '').slice(0, 10) === dateYmd &&
                isHearingLikeEvent(event.type, event.source),
        )
        .map((event) => ({
            location:
                normalizeLocation(event.court) ||
                normalizeLocation(event.location) ||
                '',
            title: String(event.title ?? '').trim() || 'جلسة',
        }))
        .filter((row) => row.location);

    if (!hearings.length) return null;
    const ranked = new Map<string, { count: number; title: string }>();
    for (const row of hearings) {
        const prev = ranked.get(row.location);
        ranked.set(row.location, {
            count: (prev?.count ?? 0) + 1,
            title: prev?.title ?? row.title,
        });
    }
    const best = [...ranked.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    if (!best) return null;
    return { location: best[0], title: best[1].title };
}

/** يكتشف تنقّلاً بين أيام متتالية بمواقع مختلفة (سفر متعدد الأيام) */
export function calendarMultiDayTravelRule(ctx: CalendarSparkContext): SparkNudge | null {
    const today = ymdFromMs(ctx.nowMs);
    const horizonEnd = addDaysYmd(today, 6);

    let best: {
        fromDay: string;
        toDay: string;
        fromLocation: string;
        toLocation: string;
        gapDays: number;
    } | null = null;

    for (let cursor = today; cursor <= horizonEnd; cursor = addDaysYmd(cursor, 1)) {
        const next = addDaysYmd(cursor, 1);
        if (next > horizonEnd) break;
        const from = primaryLocationForDay(ctx, cursor);
        const to = primaryLocationForDay(ctx, next);
        if (!from || !to || from.location === to.location) continue;

        const gapDays = Math.round(
            (Date.parse(`${next}T12:00:00`) - Date.parse(`${cursor}T12:00:00`)) / DAY_MS,
        );
        if (!best || gapDays < best.gapDays) {
            best = {
                fromDay: cursor,
                toDay: next,
                fromLocation: from.location,
                toLocation: to.location,
                gapDays,
            };
        }
    }

    if (!best) return null;

    return {
        id: `calendar-multi-day-travel:${best.fromDay}:${best.toDay}`,
        kind: 'calendar.multi_day_travel',
        surface: 'calendar',
        priority: 8,
        message: `يبدو أن لديك جلسات في «${best.fromLocation}» (${formatDayLabel(best.fromDay)}) ثم «${best.toLocation}» (${formatDayLabel(best.toDay)}) — هل تود تنسيق السفر؟`,
        presence: {
            present: [best.fromLocation, best.toLocation],
            missing: ['تنسيق أيام متتالية'],
        },
        source: 'calendarMultiDayTravelRule',
        dossierKey: `calendar:travel:${best.fromDay}`,
        targetFileId: best.fromDay,
        action: { label: 'عرض اليوم الأول', actionId: 'focus_day' },
    };
}
