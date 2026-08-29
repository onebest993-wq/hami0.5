import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { calendarModuleVisual } from '@/app/services/calendarModuleVisuals';
import { resolveRadarEventDisplayMeta } from './radarEventDisplayMeta';
import { describeLegalDeadlineForCalendarCard } from '@/app/services/calendar/legalDeadlineEngine';
import { formatCalendarReminderLabel } from '@/app/services/calendar/calendarEventReminder';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    formatEventTimeRange,
    resolveDisplayTitle,
    resolveDistinctiveMark,
    resolveKindLabel,
    shouldShowLegalCountdown,
} from './eventCardDisplay';

export type EventCardViewModel = {
    eventId: string;
    ariaTitle: string;
    displayTitle: string;
    chipLabel: string;
    timeLabel: string | null;
    extraMark: string | null;
    isBridged: boolean;
    isManualAppointment: boolean;
    isCompleted: boolean;
    reminderLabel: string | null;
    countdownLabel: string | null;
    countdownTitle: string | undefined;
    court?: string;
    location?: string;
    partiesSummary?: string;
    clientName: string;
    freeNotes?: string;
    moduleVisual: ReturnType<typeof calendarModuleVisual>;
    canOpenSource: boolean;
    canMutateCalendar: boolean;
};

export function buildEventCardViewModel(
    event: UnifiedEvent,
    canOpenSource: boolean,
): EventCardViewModel {
    const moduleVisual = calendarModuleVisual(event.bridge?.sourceModule);
    const isDiscovered = Boolean(event.bridge?.sourceEventId?.startsWith('field_'));
    const isManualAppointment =
        event.source === 'calendar' && !event.isBridged && event.type === 'custom';

    const meta = resolveRadarEventDisplayMeta({
        notes: event.notes,
        court: event.court,
        partiesSummary: event.partiesSummary,
        sourceLabel: event.sourceLabel,
        location: event.location,
        moduleLabel: event.isBridged ? moduleVisual.label : undefined,
    });

    const kindLabel = resolveKindLabel(event);
    const displayTitle = resolveDisplayTitle(event, kindLabel);
    const timeLabel = formatEventTimeRange(event.time, event.endTime);
    const sourceLabel =
        meta.sourceLabel || (event.isBridged ? moduleVisual.label : undefined) || 'يدوي';
    const distinctive = resolveDistinctiveMark(
        event,
        { court: meta.court, freeNotes: meta.freeNotes },
        kindLabel,
        sourceLabel,
    );

    const legalCountdown = shouldShowLegalCountdown(event) && /^\d{4}-\d{2}-\d{2}/.test(String(event.date ?? ''))
        ? describeLegalDeadlineForCalendarCard({
              expirationYmd: String(event.date).trim().slice(0, 10),
              decisionSource: event.title,
              asOf: getLocalTodayYmd(),
          })
        : null;

    const countdownLabel = legalCountdown
        ? legalCountdown.remainingLegalWorkingDays <= 0
            ? 'انتهت'
            : `${legalCountdown.remainingLegalWorkingDays}ي عمل`
        : null;

    const extraMark =
        distinctive &&
        distinctive !== displayTitle &&
        distinctive !== meta.court &&
        distinctive !== meta.location
            ? distinctive
            : null;

    return {
        eventId: event.id,
        ariaTitle: event.title,
        displayTitle,
        chipLabel: isManualAppointment ? 'موعد' : kindLabel,
        timeLabel,
        extraMark,
        isBridged: Boolean(event.isBridged),
        isManualAppointment,
        isCompleted: Boolean(event.isCompleted),
        reminderLabel: event.reminderMinutesBefore
            ? formatCalendarReminderLabel(event.reminderMinutesBefore)
            : null,
        countdownLabel,
        countdownTitle: legalCountdown
            ? legalCountdown.remainingLegalWorkingDays <= 0
                ? `انتهت المهلة · ${legalCountdown.expirationYmd}`
                : `متبقٍ ${legalCountdown.remainingLegalWorkingDays} يوم عمل · ${legalCountdown.expirationYmd}`
            : undefined,
        court: meta.court,
        location: meta.location,
        partiesSummary: meta.partiesSummary,
        clientName: event.clientName?.trim() || '',
        freeNotes: meta.freeNotes,
        moduleVisual,
        canOpenSource,
        canMutateCalendar: event.source === 'calendar' && !isDiscovered,
    };
}
