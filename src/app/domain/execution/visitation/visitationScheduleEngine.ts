import type {
    VisitationDecisionMode,
    VisitationScheduleBundle,
    VisitationScheduleConfig,
    VisitationSession,
    VisitationSessionStatus,
} from '@/app/types/visitationSchedule';

export const ARABIC_WEEKDAY_LABELS = [
    'الأحد',
    'الإثنين',
    'الثلاثاء',
    'الأربعاء',
    'الخميس',
    'الجمعة',
    'السبت',
] as const;

function escapeVisitationPrintHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export const MONTH_WEEK_OPTIONS = [
    { value: 1, label: 'الأسبوع الأول' },
    { value: 2, label: 'الأسبوع الثاني' },
    { value: 3, label: 'الأسبوع الثالث' },
    { value: 4, label: 'الأسبوع الرابع' },
] as const;

export const VISITATION_DECISION_OPTIONS: Array<{
    value: VisitationDecisionMode;
    label: string;
}> = [
    { value: 'viewing_only', label: 'مشاهدة فقط' },
    { value: 'viewing_pickup', label: 'مشاهدة واستصحاب' },
    { value: 'viewing_pickup_sleepover', label: 'مشاهدة واستصحاب ومبيت' },
];

export function getVisitationFieldLabels(mode: VisitationDecisionMode): {
    location: string;
    startTime: string;
    endTime?: string;
    sleepoverNights?: string;
    returnTime?: string;
} {
    switch (mode) {
        case 'viewing_only':
            return {
                location: 'مكان المشاهدة',
                startTime: 'وقت بدء المشاهدة',
                endTime: 'وقت انتهاء المشاهدة',
            };
        case 'viewing_pickup':
            return {
                location: 'مكان استلام وتسليم الطفل',
                startTime: 'وقت الاستلام',
                endTime: 'وقت الإرجاع بنفس اليوم',
            };
        case 'viewing_pickup_sleepover':
            return {
                location: 'مكان استلام وتسليم الطفل',
                startTime: 'وقت الاستلام',
                sleepoverNights: 'عدد ليالي المبيت',
                returnTime: 'وقت الإرجاع في يوم الانتهاء',
            };
    }
}

export function getDecisionModeLabel(mode: VisitationDecisionMode): string {
    return VISITATION_DECISION_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
}

/** أزرار التوثيق — مشتقة من نوع القرار المحكوم به */
export function getVisitationDocumentationActions(mode: VisitationDecisionMode): {
    successLabel: string;
    absenceLabel: string;
    confirmSuccess: string;
    confirmAbsence: string;
    successToast: string;
    absenceToast: string;
    timelineSuccessTitle: string;
    timelineAbsenceTitle: string;
    statusSuccessShort: string;
    statusAbsenceShort: string;
} {
    switch (mode) {
        case 'viewing_only':
            return {
                successLabel: 'تسجيل تنفيذ المشاهدة',
                absenceLabel: 'تسجيل نكول عن المشاهدة',
                confirmSuccess: 'هل تؤكد تنفيذ المشاهدة في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن المشاهدة وتوليد المحضر؟',
                successToast: 'تم توثيق تنفيذ المشاهدة',
                absenceToast: 'تم توثيق النكول — المحضر جاهز للطباعة',
                timelineSuccessTitle: 'تنفيذ قرار المشاهدة',
                timelineAbsenceTitle: 'محضر نكول عن المشاهدة',
                statusSuccessShort: 'تم تنفيذ المشاهدة',
                statusAbsenceShort: 'نكول عن المشاهدة',
            };
        case 'viewing_pickup':
            return {
                successLabel: 'تسجيل الاستلام والإرجاع',
                absenceLabel: 'تسجيل نكول عن الاستصحاب',
                confirmSuccess: 'هل تؤكد تنفيذ الاستلام والإرجاع في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن الاستصحاب وتوليد المحضر؟',
                successToast: 'تم توثيق الاستلام والإرجاع',
                absenceToast: 'تم توثيق النكول عن الاستصحاب — المحضر جاهز',
                timelineSuccessTitle: 'تنفيذ قرار الاستصحاب',
                timelineAbsenceTitle: 'محضر نكول عن الاستصحاب',
                statusSuccessShort: 'تم تنفيذ الاستصحاب',
                statusAbsenceShort: 'نكول عن الاستصحاب',
            };
        case 'viewing_pickup_sleepover':
            return {
                successLabel: 'تسجيل الاستلام والمبيت والإرجاع',
                absenceLabel: 'تسجيل نكول عن الاستصحاب والمبيت',
                confirmSuccess: 'هل تؤكد تنفيذ الاستلام والمبيت والإرجاع في هذا الموعد؟',
                confirmAbsence: 'هل تؤكد نكول الطرف عن الاستصحاب والمبيت وتوليد المحضر؟',
                successToast: 'تم توثيق الاستلام والمبيت',
                absenceToast: 'تم توثيق النكول — المحضر جاهز للطباعة',
                timelineSuccessTitle: 'تنفيذ قرار الاستصحاب والمبيت',
                timelineAbsenceTitle: 'محضر نكول عن الاستصحاب والمبيت',
                statusSuccessShort: 'تم تنفيذ الاستصحاب والمبيت',
                statusAbsenceShort: 'نكول عن الاستصحاب والمبيت',
            };
    }
}

export function parseYmdToLocalDate(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatYmdLocal(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/** الأسبوع 1–4 ضمن الشهر (أيام 1–7، 8–14، …) */
export function weekOfMonthFromDate(d: Date): number {
    return Math.min(4, Math.ceil(d.getDate() / 7));
}

/** أسماء الأشهر (التقويم الميلادي — العراق) */
export const IRAQI_ARABIC_MONTHS = [
    'كانون الثاني',
    'شباط',
    'آذار',
    'نيسان',
    'أيار',
    'حزيران',
    'تموز',
    'آب',
    'أيلول',
    'تشرين الأول',
    'تشرين الثاني',
    'كانون الأول',
] as const;

export function formatDateLongAr(ymd: string): string {
    const d = parseYmdToLocalDate(ymd);
    if (!d) return ymd;
    return `${ARABIC_WEEKDAY_LABELS[d.getDay()]} الموافق ${d.getDate()} ${IRAQI_ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** يضيف أياماً تقويمية إلى YYYY-MM-DD */
export function addCalendarDaysToYmd(ymd: string, days: number): string | null {
    const d = parseYmdToLocalDate(ymd);
    if (!d || !Number.isFinite(days)) return null;
    d.setDate(d.getDate() + Math.round(days));
    return formatYmdLocal(d);
}

export function formatVisitationClock(raw: string | undefined): string {
    const t = String(raw || '').trim();
    if (!t) return '—';
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    return `${m[1].padStart(2, '0')}:${m[2]}`;
}

export type VisitationSessionTimingLine = {
    label: string;
    value: string;
};

/**
 * يصف توقيت موعد واحد وفق نوع القرار:
 * - مشاهدة/استلام يومي: أوقات في يوم الموعد
 * - مبيت: تاريخ/وقت الاستلام + تاريخ/وقت الإرجاع بعد عدد الليالي
 */
export function describeVisitationSessionTiming(
    config: VisitationScheduleConfig,
    sessionDateYmd: string
): VisitationSessionTimingLine[] {
    const labels = getVisitationFieldLabels(config.decisionMode);
    const location = String(config.location || '').trim() || '—';
    const startClock = formatVisitationClock(config.startTime);
    const lines: VisitationSessionTimingLine[] = [
        { label: labels.location, value: location },
    ];

    switch (config.decisionMode) {
        case 'viewing_only':
            lines.push({
                label: 'التوقيت',
                value: `${labels.startTime}: ${startClock} — ${labels.endTime ?? 'النهاية'}: ${formatVisitationClock(config.endTime)}`,
            });
            break;
        case 'viewing_pickup':
            lines.push({
                label: 'التوقيت',
                value: `${labels.startTime}: ${startClock} — ${labels.endTime ?? 'الإرجاع'}: ${formatVisitationClock(config.endTime)} (نفس اليوم)`,
            });
            break;
        case 'viewing_pickup_sleepover': {
            const nights = Math.max(1, Number(config.sleepoverNights) || 1);
            const returnYmd = addCalendarDaysToYmd(sessionDateYmd, nights);
            const nightLabel = nights === 1 ? 'ليلة واحدة' : `${nights} ليالي`;
            lines.push({
                label: labels.startTime,
                value: `الساعة ${startClock}`,
            });
            lines.push({
                label: 'تاريخ الإرجاع بعد المبيت',
                value: `${returnYmd ? formatDateLongAr(returnYmd) : '—'} (بعد ${nightLabel})`,
            });
            lines.push({
                label: labels.returnTime ?? 'وقت الإرجاع',
                value: formatVisitationClock(config.returnTime),
            });
            break;
        }
    }

    return lines;
}

/** @deprecated استخدم describeVisitationSessionTiming */
export function computeSleepoverReturnYmd(pickupYmd: string, sleepoverNights: number): string | null {
    const nights = Math.max(1, Number(sleepoverNights) || 1);
    return addCalendarDaysToYmd(pickupYmd, nights);
}

/** أول تاريخ ≥ executionStartDate يطابق أيام الأسبوع وترتيب أسابيع الشهر */
export function resolveFirstMatchingAppointmentDate(
    executionStartDate: string,
    weekDays: number[],
    monthWeeks: number[],
    maxScanDays = 366
): string | null {
    const start = parseYmdToLocalDate(executionStartDate);
    if (!start) return null;
    const wdSet = new Set(weekDays.filter((n) => n >= 0 && n <= 6));
    const mwSet = new Set(monthWeeks.filter((n) => n >= 1 && n <= 4));
    if (wdSet.size === 0 || mwSet.size === 0) return null;

    const cursor = new Date(start);
    for (let i = 0; i < maxScanDays; i++) {
        if (wdSet.has(cursor.getDay()) && mwSet.has(weekOfMonthFromDate(cursor))) {
            return formatYmdLocal(cursor);
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return null;
}

export function formatSmartFirstAppointmentMessage(firstYmd: string): string {
    return `النظام الذكي: بناءً على محدداتك، أول موعد فعلي سيكون بتاريخ: ${formatDateLongAr(firstYmd)}.`;
}

export function daysUntilYmd(fromYmd: string, toYmd: string): number {
    const a = parseYmdToLocalDate(fromYmd);
    const b = parseYmdToLocalDate(toYmd);
    if (!a || !b) return 0;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function formatCountdownAr(fromYmd: string, sessionYmd: string): string {
    const days = daysUntilYmd(fromYmd, sessionYmd);
    if (days === 0) return 'اليوم هو الموعد القادم';
    if (days === 1) return 'متبقي يوم واحد للموعد القادم';
    return `متبقي ${days} أيام للموعد القادم`;
}

export type VisitationMonthGroup = {
    key: string;
    label: string;
    sessions: VisitationSession[];
};

export function groupSessionsByMonth(sessions: VisitationSession[]): VisitationMonthGroup[] {
    const map = new Map<string, VisitationSession[]>();
    for (const s of sessions) {
        const d = parseYmdToLocalDate(s.date);
        if (!d) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const list = map.get(key) ?? [];
        list.push(s);
        map.set(key, list);
    }
    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, list]) => {
            const [y, m] = key.split('-').map(Number);
            return {
                key,
                label: `شهر ${IRAQI_ARABIC_MONTHS[m - 1]} ${y}`,
                sessions: [...list].sort((a, b) => a.date.localeCompare(b.date)),
            };
        });
}

export function monthGroupSummary(
    group: VisitationMonthGroup,
    todayYmd: string
): string {
    const total = group.sessions.length;
    const done = group.sessions.filter((s) => isVisitationSessionDocumented(s)).length;
    const allFutureScheduled = group.sessions.every(
        (s) => s.status === 'scheduled' && s.date >= todayYmd
    );
    if (done === 0 && allFutureScheduled) return `مجدول — ينتظر التنفيذ (${total} موعد)`;
    if (done > 0) return `يحتوي على ${total} موعد — ${done} موثّق`;
    return `يحتوي على ${total} ${total === 1 ? 'موعد' : 'مواعيد'}`;
}

export function sessionStatusShort(
    status: VisitationSessionStatus,
    decisionMode?: VisitationDecisionMode
): string {
    if (decisionMode) {
        const actions = getVisitationDocumentationActions(decisionMode);
        switch (status) {
            case 'completed':
                return actions.statusSuccessShort;
            case 'default_party_one':
            case 'default_party_two':
                return actions.statusAbsenceShort;
            default:
                return 'مجدول';
        }
    }
    switch (status) {
        case 'completed':
            return 'تم التنفيذ';
        case 'default_party_one':
        case 'default_party_two':
            return 'نكول / غياب';
        default:
            return 'مجدول';
    }
}

/** توثيق فعلي — فقط بعد ضغط المستخدم في محضر المتابعة */
export function isVisitationSessionDocumented(session: VisitationSession): boolean {
    if (session.status === 'scheduled') return false;
    const at = String(session.documentedAt || '').trim();
    if (!at) return false;
    return Number.isFinite(Date.parse(at));
}

export function sanitizeVisitationSession(session: VisitationSession): VisitationSession {
    if (session.status === 'scheduled') return session;
    if (isVisitationSessionDocumented(session)) return session;
    return {
        ...session,
        status: 'scheduled',
        defaultParty: undefined,
        documentedAt: undefined,
    };
}

export function sanitizeVisitationSessions(sessions: VisitationSession[]): VisitationSession[] {
    return sessions.map(sanitizeVisitationSession);
}

export function sessionCalendarLabel(
    session: VisitationSession,
    decisionMode?: VisitationDecisionMode,
    todayYmd?: string
): string {
    if (isVisitationSessionDocumented(session)) {
        return sessionStatusShort(session.status, decisionMode);
    }
    const today = String(todayYmd || '').trim();
    if (today && session.date < today) {
        return 'لم يُوثَّق بعد';
    }
    return 'مجدول';
}

export type VisitationCalendarCellTone = 'empty' | 'scheduled' | 'overdue' | 'documented_success' | 'documented_absence';

export function resolveVisitationCalendarCellTone(
    session: VisitationSession | undefined,
    todayYmd: string
): VisitationCalendarCellTone {
    if (!session) return 'empty';
    if (isVisitationSessionDocumented(session)) {
        return session.status === 'completed' ? 'documented_success' : 'documented_absence';
    }
    const today = String(todayYmd || '').trim();
    if (today && session.date < today) return 'overdue';
    return 'scheduled';
}

export function normalizeVisitationConfig(
    partial: Partial<VisitationScheduleConfig>
): Partial<VisitationScheduleConfig> {
    const executionStartDate =
        String(partial.executionStartDate || partial.anchorDate || '').trim() || '';
    return { ...partial, executionStartDate };
}

export function applyAutoResolvedAnchor(
    partial: Partial<VisitationScheduleConfig>
): Partial<VisitationScheduleConfig> {
    const normalized = normalizeVisitationConfig(partial);
    const weekDays = normalized.weekDays ?? [];
    const monthWeeks = normalized.monthWeeks ?? [];
    const start = String(normalized.executionStartDate || '').trim();
    if (!start || weekDays.length === 0 || monthWeeks.length === 0) {
        return normalized;
    }
    const resolved = resolveFirstMatchingAppointmentDate(start, weekDays, monthWeeks);
    if (!resolved) return normalized;
    return { ...normalized, executionStartDate: start, anchorDate: resolved };
}

export function endOfCalendarMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfCalendarMonthFromYmd(ymd: string): Date | null {
    const d = parseYmdToLocalDate(ymd);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** يولّد المواعيد ضمن نطاق [from, to] مع احترام قواعد الأسبوع */
export function generateVisitationSessionsInRange(
    config: VisitationScheduleConfig,
    rangeStartYmd: string,
    rangeEndYmd: string,
    searchFromYmd?: string
): VisitationSession[] {
    const rangeStart = parseYmdToLocalDate(rangeStartYmd);
    const rangeEnd = parseYmdToLocalDate(rangeEndYmd);
    const searchFrom = parseYmdToLocalDate(searchFromYmd || rangeStartYmd);
    if (!rangeStart || !rangeEnd || !searchFrom) return [];

    const weekDays = new Set(config.weekDays.filter((n) => n >= 0 && n <= 6));
    const monthWeeks = new Set(config.monthWeeks.filter((n) => n >= 1 && n <= 4));
    if (weekDays.size === 0 || monthWeeks.size === 0) return [];

    const cursor = new Date(Math.max(rangeStart.getTime(), searchFrom.getTime()));
    const sessions: VisitationSession[] = [];

    while (cursor <= rangeEnd) {
        const dow = cursor.getDay();
        const wom = weekOfMonthFromDate(cursor);
        if (weekDays.has(dow) && monthWeeks.has(wom)) {
            const ymd = formatYmdLocal(cursor);
            sessions.push({
                id: `vs-${ymd}-${dow}`,
                date: ymd,
                dayLabel: ARABIC_WEEKDAY_LABELS[dow],
                status: 'scheduled',
            });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return sessions;
}

export function generateVisitationSessions(config: VisitationScheduleConfig): VisitationSession[] {
    const anchor = parseYmdToLocalDate(config.anchorDate);
    if (!anchor) return [];
    const monthEnd = endOfCalendarMonth(anchor);
    return generateVisitationSessionsInRange(
        config,
        config.anchorDate,
        formatYmdLocal(monthEnd),
        config.anchorDate
    );
}

export function mergeVisitationSessions(
    existing: VisitationSession[],
    incoming: VisitationSession[]
): VisitationSession[] {
    const map = new Map(existing.map((s) => [s.id, s]));
    for (const row of incoming) {
        if (!map.has(row.id)) map.set(row.id, row);
    }
    return sanitizeVisitationSessions(
        [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
    );
}

export const VISITATION_CALENDAR_WINDOW_MONTHS = 4;

/** يمدّ نافذة التقويم: من بداية الشهر الحالي لعدة أشهر (تتجدد تلقائياً) */
export function syncRollingCalendarSessions(
    config: VisitationScheduleConfig,
    existing: VisitationSession[],
    todayYmd: string,
    months = VISITATION_CALENDAR_WINDOW_MONTHS
): VisitationSession[] {
    const today = parseYmdToLocalDate(todayYmd);
    if (!today) return existing;
    const windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const windowEnd = endOfCalendarMonth(
        new Date(today.getFullYear(), today.getMonth() + Math.max(1, months) - 1, 1)
    );
    const anchor = parseYmdToLocalDate(config.anchorDate);
    const searchFrom = anchor && anchor > windowStart ? anchor : windowStart;
    const generated = generateVisitationSessionsInRange(
        config,
        formatYmdLocal(windowStart),
        formatYmdLocal(windowEnd),
        formatYmdLocal(searchFrom)
    );
    return mergeVisitationSessions(existing, generated);
}

/** @deprecated استخدم syncRollingCalendarSessions */
export function syncRollingTwoMonthSessions(
    config: VisitationScheduleConfig,
    existing: VisitationSession[],
    todayYmd: string
): VisitationSession[] {
    return syncRollingCalendarSessions(config, existing, todayYmd);
}

export function findCurrentVisitationSession(
    sessions: VisitationSession[],
    todayYmd: string
): VisitationSession | null {
    const today = String(todayYmd || '').trim();
    const due = sessions
        .filter((s) => s.status === 'scheduled' && s.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date));
    return due[0] ?? null;
}

export function findNextVisitationSessionAfter(
    sessions: VisitationSession[],
    afterYmd: string
): VisitationSession | null {
    const after = String(afterYmd || '').trim();
    const upcoming = sessions
        .filter((s) => s.status === 'scheduled' && s.date > after)
        .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] ?? null;
}

export function findNearestScheduledSession(
    sessions: VisitationSession[],
    todayYmd: string
): VisitationSession | null {
    const current = findCurrentVisitationSession(sessions, todayYmd);
    if (current) return current;
    return findNextVisitationSession(sessions, todayYmd);
}

export function findNextVisitationSession(
    sessions: VisitationSession[],
    todayYmd: string
): VisitationSession | null {
    const today = String(todayYmd || '').trim();
    const upcoming = sessions
        .filter((s) => s.status === 'scheduled' && (!today || s.date >= today))
        .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0] ?? null;
}

export function formatVisitationSessionDateAr(session: VisitationSession): string {
    const d = parseYmdToLocalDate(session.date);
    if (!d) return session.date;
    return `${session.dayLabel} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function sessionStatusLabel(status: VisitationSessionStatus): string {
    switch (status) {
        case 'completed':
            return 'تم التنفيذ (حضور)';
        case 'default_party_one':
            return 'نكول / غياب الطرف الأول';
        case 'default_party_two':
            return 'نكول / غياب الطرف الثاني';
        default:
            return 'مجدول';
    }
}

export function validateVisitationScheduleConfig(
    config: Partial<VisitationScheduleConfig>
): string | null {
    const normalized = normalizeVisitationConfig(config);
    const start = String(normalized.executionStartDate || '').trim();
    if (!start) return 'تاريخ المباشرة بالتنفيذ مطلوب';
    if (!parseYmdToLocalDate(start)) return 'تاريخ المباشرة غير صالح';
    if (!String(config.location || '').trim()) return 'حقل المكان مطلوب';
    if (!String(config.startTime || '').trim()) return 'وقت البداية مطلوب';
    if (!config.decisionMode) return 'نوع القرار مطلوب';
    if (config.decisionMode !== 'viewing_pickup_sleepover' && !String(config.endTime || '').trim()) {
        return 'وقت النهاية / الإرجاع مطلوب';
    }
    if (config.decisionMode === 'viewing_pickup_sleepover') {
        const nights = Number(config.sleepoverNights);
        if (!Number.isFinite(nights) || nights < 1) return 'عدد ليالي المبيت مطلوب';
        if (!String(config.returnTime || '').trim()) return 'وقت الإرجاع في يوم الانتهاء مطلوب';
    }
    if (!Array.isArray(config.weekDays) || config.weekDays.length === 0) {
        return 'اختر يوماً واحداً على الأقل في الأسبوع';
    }
    if (!Array.isArray(config.monthWeeks) || config.monthWeeks.length === 0) {
        return 'اختر أسبوعاً واحداً على الأقل في الشهر';
    }
    const resolved = resolveFirstMatchingAppointmentDate(
        start,
        config.weekDays,
        config.monthWeeks
    );
    if (!resolved) {
        return 'تعذّر إيجاد موعد يطابق أيام الأسبوع وترتيب الأسابيع — راجع المحددات';
    }
    return null;
}

export function buildVisitationScheduleBundle(
    config: VisitationScheduleConfig
): { bundle: VisitationScheduleBundle } | { error: string } {
    const withAnchor = applyAutoResolvedAnchor(config) as VisitationScheduleConfig;
    const err = validateVisitationScheduleConfig(withAnchor);
    if (err) return { error: err };
    const anchor = String(withAnchor.anchorDate || '').trim();
    const sessions = generateVisitationSessions({ ...withAnchor, anchorDate: anchor });
    if (sessions.length === 0) {
        return { error: 'لم يُولَّد أي موعد — راجع أيام الأسبوع والأسابيع المختارة' };
    }
    return {
        bundle: {
            config: {
                ...withAnchor,
                anchorDate: anchor,
                generatedAt: new Date().toISOString(),
            },
            sessions,
        },
    };
}

export type VisitationBreachMemoInput = {
    session: VisitationSession;
    config: VisitationScheduleConfig;
    absentPartyLabel: string;
    creditorName: string;
    debtorName: string;
    childNames: string[];
    fileNumber?: string;
};

export function buildVisitationBreachMemoHtml(input: VisitationBreachMemoInput): string {
    const modeLabel = escapeVisitationPrintHtml(getDecisionModeLabel(input.config.decisionMode));
    const sessionDate = escapeVisitationPrintHtml(formatVisitationSessionDateAr(input.session));
    const labels = getVisitationFieldLabels(input.config.decisionMode);
    const locationLabel = escapeVisitationPrintHtml(labels.location);
    const location = escapeVisitationPrintHtml(input.config.location);
    const children = escapeVisitationPrintHtml(
        input.childNames.length > 0 ? input.childNames.join('، ') : '…………………………',
    );
    const creditorName = escapeVisitationPrintHtml(input.creditorName || '…………');
    const debtorName = escapeVisitationPrintHtml(input.debtorName || '…………');
    const absentPartyLabel = escapeVisitationPrintHtml(input.absentPartyLabel);
    const fileNumber = escapeVisitationPrintHtml(input.fileNumber || '…………');
    const startTime = escapeVisitationPrintHtml(input.config.startTime);
    const endTime = escapeVisitationPrintHtml(input.config.endTime);
    const returnTime = escapeVisitationPrintHtml(input.config.returnTime);
    const sleepoverNights = escapeVisitationPrintHtml(String(input.config.sleepoverNights ?? ''));
    const timeLine =
        input.config.decisionMode === 'viewing_pickup_sleepover'
            ? `وقت الاستلام: ${startTime} — ليالي المبيت: ${sleepoverNights} — وقت الإرجاع: ${returnTime}`
            : `${escapeVisitationPrintHtml(labels.startTime)}: ${startTime} — ${escapeVisitationPrintHtml(labels.endTime ?? 'وقت الإرجاع')}: ${endTime}`;

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>محضر نكول عن ${modeLabel}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 32px; line-height: 1.9; color: #111; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 24px; }
  .meta { margin: 16px 0; }
  .box { border: 1px solid #333; padding: 16px; margin-top: 24px; min-height: 120px; }
  .sign { margin-top: 48px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<h1>محضر نكول عن (${modeLabel})</h1>
<div class="meta"><strong>رقم الإضبارة:</strong> ${fileNumber}</div>
<div class="meta"><strong>تاريخ الموعد:</strong> ${sessionDate}</div>
<div class="meta"><strong>${locationLabel}:</strong> ${location}</div>
<div class="meta"><strong>الأوقات:</strong> ${timeLine}</div>
<div class="meta"><strong>أسماء الأولاد:</strong> ${children}</div>
<div class="meta"><strong>الدائن:</strong> ${creditorName}</div>
<div class="meta"><strong>المدين:</strong> ${debtorName}</div>
<div class="box">
<p>بتاريخ الموعد المذكور أعلاه، حضر المنفذ العدل/ممثل مديرية التنفيذ إلى ${location} لتنفيذ قرار ${modeLabel}،
وقد تبيّن <strong>نكول / غياب ${absentPartyLabel}</strong> عن الحضور دون عذر مقبول وفق أحكام التنفيذ.</p>
<p>وعليه تم تنظيم هذا المحضر للاستفادة منه في الإجراءات القانونية اللاحقة.</p>
</div>
<div class="sign">
<span>توقيع المنفذ العدل: _______________</span>
<span>التاريخ: _______________</span>
</div>
</body>
</html>`;
}

export function openVisitationBreachMemoPrint(input: VisitationBreachMemoInput): void {
    if (typeof window === 'undefined') return;
    const html = buildVisitationBreachMemoHtml(input);
    const w = window.open('', '_blank', 'noopener,noreferrer,width=820,height=960');
    if (!w) return;
    const doc = w.document;
    doc.open();
    doc.close();

    const parsed = new DOMParser().parseFromString(html, 'text/html');
    doc.documentElement.replaceWith(doc.importNode(parsed.documentElement, true));
    w.focus();
    w.setTimeout(() => {
        try {
            w.print();
        } catch {
            /* ignore */
        }
    }, 400);
}
