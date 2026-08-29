/**
 * Barrel: re-exports the visitation schedule domain split.
 * Consumers may keep importing from `.../visitationScheduleEngine`.
 */
export {
    ARABIC_WEEKDAY_LABELS,
    ARABIC_WEEKDAY_SHORT_LABELS,
    MONTH_WEEK_OPTIONS,
    VISITATION_DECISION_OPTIONS,
    IRAQI_ARABIC_MONTHS,
    getVisitationFieldLabels,
    getDecisionModeLabel,
    getVisitationDocumentationActions,
} from './visitationScheduleLabels';

export {
    parseYmdToLocalDate,
    formatYmdLocal,
    weekOfMonthFromDate,
    formatDateLongAr,
    formatDateCompactAr,
    addCalendarDaysToYmd,
    formatVisitationClock,
    describeVisitationSessionTiming,
    computeVisitationSessionReturnYmd,
    summarizeVisitationAppointment,
    resolveFirstMatchingAppointmentDate,
    formatSmartFirstAppointmentMessage,
    formatCountdownAr,
    endOfCalendarMonth,
    startOfCalendarMonthFromYmd,
    formatVisitationSessionDateAr,
} from './visitationScheduleDateUtils';
export type {
    VisitationSessionTimingLine,
    VisitationAppointmentSummary,
} from './visitationScheduleDateUtils';

export {
    groupSessionsByMonth,
    monthGroupSummary,
    sessionStatusShort,
    isVisitationSessionDocumented,
    sanitizeVisitationSession,
    sanitizeVisitationSessions,
    sessionCalendarLabel,
    normalizeVisitationConfig,
    applyAutoResolvedAnchor,
    generateVisitationSessionsInRange,
    generateVisitationSessions,
    mergeVisitationSessions,
    VISITATION_CALENDAR_WINDOW_MONTHS,
    syncRollingCalendarSessions,
    findCurrentVisitationSession,
    findNextVisitationSessionAfter,
    findNearestScheduledSession,
    findNextVisitationSession,
    sessionStatusLabel,
    validateVisitationScheduleConfig,
    buildVisitationScheduleBundle,
} from './visitationScheduleSessions';
export type { VisitationMonthGroup } from './visitationScheduleSessions';

export {
    buildVisitationCalendarDayMarkers,
    resolveVisitationCalendarCellToneForDate,
    resolveVisitationCalendarCellTone,
} from './visitationScheduleCalendar';
export type {
    VisitationCalendarCellTone,
    VisitationCalendarDayRole,
    VisitationCalendarDayMarker,
} from './visitationScheduleCalendar';

export {
    buildVisitationBreachMemoHtml,
    openVisitationBreachMemoPrint,
} from './visitationSchedulePrint';
export type { VisitationBreachMemoInput } from './visitationSchedulePrint';
