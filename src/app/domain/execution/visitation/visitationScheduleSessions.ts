import type {
    VisitationDecisionMode,
    VisitationScheduleBundle,
    VisitationScheduleConfig,
    VisitationSession,
    VisitationSessionStatus,
} from '@/app/types/visitationSchedule';
import {
    endOfCalendarMonth,
    formatYmdLocal,
    parseYmdToLocalDate,
    resolveFirstMatchingAppointmentDate,
    weekOfMonthFromDate,
} from './visitationScheduleDateUtils';
import {
    ARABIC_WEEKDAY_LABELS,
    getVisitationDocumentationActions,
    IRAQI_ARABIC_MONTHS,
} from './visitationScheduleLabels';

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
