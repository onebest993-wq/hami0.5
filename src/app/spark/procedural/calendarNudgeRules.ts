import type { SparkNudge } from '@/app/spark/types';
import type { CalendarSparkContext, CalendarSparkEventRef } from '@/app/spark/context/calendarSparkContext';
import { remainingLegalWorkingDaysUntil } from '@/app/services/calendar/legalDeadlineEngine';
import {
    eventYmd,
    isDeadlineLikeEvent,
    isHearingLikeEvent,
    ymdFromMs,
} from '@/app/spark/calendar/calendarSparkTimeUtils';
import { resolveCalendarEventFollowAction } from '@/app/spark/calendar/calendarSparkBridge';
import { calendarMultiDayTravelRule } from '@/app/spark/procedural/calendarMultiDayTravelRule';

function isHearingLike(event: CalendarSparkEventRef): boolean {
    return isHearingLikeEvent(event.type, event.source);
}

function formatWhenLabel(event: CalendarSparkEventRef): string {
    if (event.hoursUntil <= 24) return 'خلال ٢٤ ساعة';
    return 'خلال ٤٨ ساعة';
}

export function calendarHearingPrepGapRule(ctx: CalendarSparkContext): SparkNudge | null {
    const event = ctx.upcoming.find(
        (item) =>
            isHearingLike(item) &&
            item.hoursUntil <= 48 &&
            !item.caseNo?.trim() &&
            !item.isBridged,
    );
    if (!event) return null;

    return {
        id: `calendar-hearing-prep-gap:${event.eventId}`,
        kind: 'calendar.hearing_prep_gap',
        surface: 'calendar',
        priority: 6,
        message: `يبدو أن جلسة «${event.title}» ${formatWhenLabel(event)} بلا ربط برقم قضية — هل تريد تجهيزها؟`,
        presence: {
            present: [event.title],
            missing: ['رقم القضية أو ربط الإضبارة'],
        },
        source: 'calendarNudgeRules',
        dossierKey: `calendar:${event.eventId}`,
        targetFileId: event.eventId,
        action: resolveCalendarEventFollowAction(ctx.allEvents, event.eventId, {
            label: 'عرض الموعد',
            actionId: 'focus_event',
        }),
    };
}

export function calendarHearingMissingCourtRule(ctx: CalendarSparkContext): SparkNudge | null {
    const today = ymdFromMs(ctx.nowMs);
    const event = ctx.upcoming.find(
        (item) =>
            isHearingLike(item) &&
            item.hoursUntil <= 24 &&
            eventYmd(item.date) !== today &&
            !item.court?.trim() &&
            !item.location?.trim(),
    );
    if (!event) return null;

    return {
        id: `calendar-hearing-missing-court:${event.eventId}`,
        kind: 'calendar.hearing_missing_court',
        surface: 'calendar',
        priority: 5,
        message: `يبدو أن جلسة «${event.title}» ${formatWhenLabel(event)} بلا محكمة أو مكان — هل يهمك الأمر؟`,
        presence: {
            present: [event.title],
            missing: ['المحكمة أو المكان'],
        },
        source: 'calendarNudgeRules',
        dossierKey: `calendar:${event.eventId}`,
        targetFileId: event.eventId,
        action: resolveCalendarEventFollowAction(ctx.allEvents, event.eventId, {
            label: 'عرض الموعد',
            actionId: 'focus_event',
        }),
    };
}

function formatDayLabel(dateYmd: string): string {
    const [y, m, d] = dateYmd.split('-');
    return `${d}/${m}/${y}`;
}

export function calendarTravelConflictRule(ctx: CalendarSparkContext): SparkNudge | null {
    const day = ctx.conflictDays.find((item) => item.conflict.hasTravelConflict);
    if (!day?.conflict.travelWarning) return null;

    return {
        id: `calendar-travel-conflict:${day.dateYmd}`,
        kind: 'calendar.travel_conflict',
        surface: 'calendar',
        priority: 9,
        message: `يبدو أن يوم ${formatDayLabel(day.dateYmd)} فيه ${day.conflict.travelWarning} — هل تود مراجعة الجدول؟`,
        presence: {
            present: [formatDayLabel(day.dateYmd)],
            missing: ['تنسيق المواعيد'],
        },
        source: 'calendarConflictSparkBridge',
        dossierKey: `calendar:day:${day.dateYmd}`,
        targetFileId: day.dateYmd,
        action: { label: 'عرض اليوم', actionId: 'focus_day' },
    };
}

export function calendarScheduleOverloadRule(ctx: CalendarSparkContext): SparkNudge | null {
    const day = ctx.conflictDays.find(
        (item) => item.conflict.isOverloaded && !item.conflict.hasTravelConflict,
    );
    if (!day?.conflict.warningMessage) return null;

    return {
        id: `calendar-schedule-overload:${day.dateYmd}`,
        kind: 'calendar.schedule_overload',
        surface: 'calendar',
        priority: 8,
        message: `يبدو أن يوم ${formatDayLabel(day.dateYmd)} مزدحم — ${day.conflict.warningMessage}`,
        presence: {
            present: [`${day.conflict.totalCount} مواعيد`],
            missing: ['إعادة ترتيب'],
        },
        source: 'calendarConflictSparkBridge',
        dossierKey: `calendar:day:${day.dateYmd}`,
        targetFileId: day.dateYmd,
        action: { label: 'عرض اليوم', actionId: 'focus_day' },
    };
}

export function calendarLocationMismatchRule(ctx: CalendarSparkContext): SparkNudge | null {
    const day = ctx.conflictDays.find(
        (item) =>
            item.conflict.hasLocationMismatch &&
            !item.conflict.hasTravelConflict &&
            !item.conflict.isOverloaded,
    );
    if (!day) return null;

    return {
        id: `calendar-location-mismatch:${day.dateYmd}`,
        kind: 'calendar.location_mismatch',
        surface: 'calendar',
        priority: 7,
        message: `يبدو أن يوم ${formatDayLabel(day.dateYmd)} فيه مواقع متعددة (${day.conflict.distinctLocations.join('، ')}) — هل يهمك الأمر؟`,
        presence: {
            present: day.conflict.distinctLocations.slice(0, 3),
            missing: ['تنسيق المواقع'],
        },
        source: 'calendarConflictSparkBridge',
        dossierKey: `calendar:day:${day.dateYmd}`,
        targetFileId: day.dateYmd,
        action: { label: 'عرض اليوم', actionId: 'focus_day' },
    };
}

export function calendarDeadlineOverdueRule(ctx: CalendarSparkContext): SparkNudge | null {
    const today = ymdFromMs(ctx.nowMs);
    const overdue = ctx.allEvents
        .filter(
            (event) =>
                !event.isCompleted &&
                isDeadlineLikeEvent(event.type, event.source) &&
                eventYmd(event.date) < today,
        )
        .sort((a, b) => eventYmd(a.date).localeCompare(eventYmd(b.date)));

    const event = overdue[0];
    if (!event) return null;

    return {
        id: `calendar-deadline-overdue:${event.id}`,
        kind: 'calendar.deadline_overdue',
        surface: 'calendar',
        priority: 10,
        message: `مهلة «${event.title}» انتهت (${formatDayLabel(eventYmd(event.date))}) — هل تريد مراجعتها في التقويم؟`,
        presence: {
            present: [event.title],
            missing: ['متابعة المهلة'],
        },
        source: 'calendarNudgeRules',
        dossierKey: `calendar:${event.id}`,
        targetFileId: event.id,
        action: resolveCalendarEventFollowAction(ctx.allEvents, event.id, {
            label: 'عرض المهلة',
            actionId: 'focus_event',
        }),
    };
}

export function calendarDeadlineNearRule(ctx: CalendarSparkContext): SparkNudge | null {
    const today = ymdFromMs(ctx.nowMs);
    const candidates = ctx.allEvents
        .filter(
            (event) =>
                !event.isCompleted &&
                isDeadlineLikeEvent(event.type, event.source) &&
                eventYmd(event.date) >= today,
        )
        .map((event) => {
            const ymd = eventYmd(event.date);
            const remaining = remainingLegalWorkingDaysUntil(ymd, today);
            return { event, ymd, remaining };
        })
        .filter((item) => item.remaining > 0 && item.remaining <= 3)
        .sort((a, b) => a.remaining - b.remaining || a.ymd.localeCompare(b.ymd));

    const match = candidates[0];
    if (!match) return null;

    const daysLabel =
        match.remaining === 1 ? 'يوم قانوني واحد' : `${match.remaining} أيام قانونية`;

    return {
        id: `calendar-deadline-near:${match.event.id}`,
        kind: 'calendar.deadline_near',
        surface: 'calendar',
        priority: 8,
        message: `مهلة «${match.event.title}» تنتهي خلال ${daysLabel} (${formatDayLabel(match.ymd)}) — هل تريد تجهيز المتابعة؟`,
        presence: {
            present: [match.event.title, formatDayLabel(match.ymd)],
            missing: ['إجراء قبل انتهاء المهلة'],
        },
        source: 'calendarNudgeRules',
        dossierKey: `calendar:${match.event.id}`,
        targetFileId: match.event.id,
        action: resolveCalendarEventFollowAction(ctx.allEvents, match.event.id, {
            label: 'عرض المهلة',
            actionId: 'focus_event',
        }),
    };
}

export function calendarHearingTodayRule(ctx: CalendarSparkContext): SparkNudge | null {
    const today = ymdFromMs(ctx.nowMs);
    const hearings = ctx.allEvents
        .filter(
            (event) =>
                !event.isCompleted &&
                eventYmd(event.date) === today &&
                isHearingLikeEvent(event.type, event.source),
        )
        .sort((a, b) => {
            const ta = String(a.time ?? '99:99');
            const tb = String(b.time ?? '99:99');
            return ta.localeCompare(tb);
        });

    const event = hearings[0];
    if (!event) return null;

    const court = event.court?.trim() || event.location?.trim();
    const placeHint = court ? ` — ${court}` : '';

    return {
        id: `calendar-hearing-today:${event.id}`,
        kind: 'calendar.hearing_today',
        surface: 'calendar',
        priority: 8,
        message: `جلسة اليوم: «${event.title}»${placeHint} — هل تريد مراجعتها في التقويم؟`,
        presence: {
            present: [event.title, 'اليوم'],
            missing: court ? [] : ['المحكمة أو المكان'],
        },
        source: 'calendarNudgeRules',
        dossierKey: `calendar:${event.id}`,
        targetFileId: event.id,
        action: resolveCalendarEventFollowAction(ctx.allEvents, event.id, {
            label: 'عرض الجلسة',
            actionId: 'focus_event',
        }),
    };
}

export const CALENDAR_SPARK_RULES = [
    calendarDeadlineOverdueRule,
    calendarTravelConflictRule,
    calendarMultiDayTravelRule,
    calendarHearingTodayRule,
    calendarDeadlineNearRule,
    calendarScheduleOverloadRule,
    calendarLocationMismatchRule,
    calendarHearingPrepGapRule,
    calendarHearingMissingCourtRule,
];
