import type { VisitationDecisionMode, VisitationScheduleConfig, VisitationSession } from '@/app/types/visitationSchedule';
import {
    ARABIC_WEEKDAY_LABELS,
    ARABIC_WEEKDAY_SHORT_LABELS,
    getVisitationFieldLabels,
    IRAQI_ARABIC_MONTHS,
} from './visitationScheduleLabels';

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

export function formatDateLongAr(ymd: string): string {
    const d = parseYmdToLocalDate(ymd);
    if (!d) return ymd;
    return `${ARABIC_WEEKDAY_LABELS[d.getDay()]} الموافق ${d.getDate()} ${IRAQI_ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** تاريخ مختصر للبطاقات — بدون سنة عند الحاجة للإيجاز */
export function formatDateCompactAr(ymd: string): string {
    const d = parseYmdToLocalDate(ymd);
    if (!d) return ymd;
    return `${ARABIC_WEEKDAY_SHORT_LABELS[d.getDay()]} ${d.getDate()} ${IRAQI_ARABIC_MONTHS[d.getMonth()]}`;
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

/** تاريخ إرجاع الطفل بعد المبيت — null إذا ليس وضع مبيت */
export function computeVisitationSessionReturnYmd(
    config: VisitationScheduleConfig,
    pickupYmd: string,
): string | null {
    if (config.decisionMode !== 'viewing_pickup_sleepover') return null;
    const nights = Math.max(1, Number(config.sleepoverNights) || 1);
    return addCalendarDaysToYmd(pickupYmd, nights);
}

export type VisitationAppointmentSummary = {
    mode: VisitationDecisionMode;
    location: string;
    pickupTime: string;
    endTime?: string;
    returnDateYmd?: string | null;
    returnTime?: string;
    nightsLabel?: string;
};

/** ملخص مدمج لعرض بطاقة الموعد دون ازدحام */
export function summarizeVisitationAppointment(
    config: VisitationScheduleConfig,
    sessionDateYmd: string,
): VisitationAppointmentSummary {
    const location = String(config.location || '').trim() || '—';
    const pickupTime = formatVisitationClock(config.startTime);
    const base: VisitationAppointmentSummary = {
        mode: config.decisionMode,
        location,
        pickupTime,
    };

    if (config.decisionMode === 'viewing_only') {
        return {
            ...base,
            endTime: formatVisitationClock(config.endTime),
        };
    }
    if (config.decisionMode === 'viewing_pickup') {
        return {
            ...base,
            endTime: formatVisitationClock(config.endTime),
        };
    }

    const nights = Math.max(1, Number(config.sleepoverNights) || 1);
    return {
        ...base,
        returnDateYmd: computeVisitationSessionReturnYmd(config, sessionDateYmd),
        returnTime: formatVisitationClock(config.returnTime),
        nightsLabel: nights === 1 ? 'ليلة واحدة' : `${nights} ليالي`,
    };
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

function daysUntilYmd(fromYmd: string, toYmd: string): number {
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

export function endOfCalendarMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfCalendarMonthFromYmd(ymd: string): Date | null {
    const d = parseYmdToLocalDate(ymd);
    if (!d) return null;
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function formatVisitationSessionDateAr(session: VisitationSession): string {
    const d = parseYmdToLocalDate(session.date);
    if (!d) return session.date;
    return `${session.dayLabel} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
