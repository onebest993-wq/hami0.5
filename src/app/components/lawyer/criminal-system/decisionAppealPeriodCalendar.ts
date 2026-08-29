import { parseEventDateKey } from './stageJourney';
import {
    CASSATION_CORRECTION_WINDOW_DAYS,
    ORDINARY_CASSATION_WINDOW_DAYS,
    type AppealPeriodSnapshot,
    type DecisionCaseType,
    type DecisionPresenceType,
} from './decisionAppealPeriodTypes';

const MS_PER_DAY = 86_400_000;

export function startOfLocalDayMs(isoDate: string): number {
    const raw = String(isoDate ?? '').trim();
    if (!raw) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const parsed = parseEventDateKey(raw);
    if (!Number.isFinite(parsed)) return NaN;
    const d = new Date(parsed);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function todayStartMs(reference = new Date()): number {
    return Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
}

export function addCalendarDaysFromIso(isoDate: string, days: number): number {
    const start = startOfLocalDayMs(isoDate);
    if (!Number.isFinite(start)) return NaN;
    return start + days * MS_PER_DAY;
}

export function addCalendarDaysIso(isoDate: string, days: number): string {
    const nextMs = addCalendarDaysFromIso(isoDate, days);
    if (!Number.isFinite(nextMs)) return '';
    return new Date(nextMs).toISOString().slice(0, 10);
}

/** اليوم التالي لتاريخ الصدور — بداية المدة. */
export function resolveAppealPeriodStartExclusive(issuedDate: string): string {
    const start = startOfLocalDayMs(issuedDate);
    if (!Number.isFinite(start)) return '';
    return new Date(start + MS_PER_DAY).toISOString().slice(0, 10);
}

/** آخر يوم inclusive لمهلة الطعن التمييزي العادي — 30 يوماً من اليوم التالي للحكم (م 252). */
export function resolveOrdinaryCassationLastDayInclusive(issuedDate: string): string {
    const periodStart = resolveAppealPeriodStartExclusive(issuedDate);
    if (!periodStart) return '';
    return addCalendarDaysIso(periodStart, ORDINARY_CASSATION_WINDOW_DAYS - 1);
}

export function remainingDaysFromIsoAnchor(
    anchorDate: string,
    windowDays: number,
    referenceDate = new Date(),
): number {
    const deadlineMs = addCalendarDaysFromIso(anchorDate, windowDays);
    const todayMs = todayStartMs(referenceDate);
    if (!Number.isFinite(deadlineMs)) return 0;
    return Math.max(0, Math.ceil((deadlineMs - todayMs) / MS_PER_DAY));
}

export function resolveTotalAppealLegalDays(
    presence: DecisionPresenceType,
    caseType: DecisionCaseType,
): number {
    if (presence === 'وجاهي') return 30;
    if (caseType === 'مخالفة') return 60;
    if (caseType === 'جنحة') return 120;
    return 210;
}

export function computeAppealPeriodSnapshot(
    issuedDate: string,
    presence: DecisionPresenceType,
    caseType: DecisionCaseType,
    referenceDate = new Date(),
): AppealPeriodSnapshot {
    const totalLegalDays = resolveTotalAppealLegalDays(presence, caseType);
    const periodStart = resolveAppealPeriodStartExclusive(issuedDate);
    const deadlineMs = addCalendarDaysFromIso(issuedDate, totalLegalDays);
    const todayMs = todayStartMs(referenceDate);
    const remainingMs = Number.isFinite(deadlineMs) ? deadlineMs - todayMs : 0;
    const remainingDays = Number.isFinite(remainingMs) ? Math.ceil(remainingMs / MS_PER_DAY) : 0;
    return {
        totalLegalDays,
        remainingDays: Math.max(0, remainingDays),
        isPeriodExpired: remainingDays <= 0,
        periodStartExclusive: periodStart,
    };
}

/** نافذة الطعن التمييزي العادي (30 يوماً) للقرارات القابلة للطعn. */
export function computeOrdinaryCassationWindow(
    issuedDate: string,
    referenceDate = new Date(),
): { remainingDays: number; isExpired: boolean } {
    const periodStart = resolveAppealPeriodStartExclusive(issuedDate);
    const lastDay = resolveOrdinaryCassationLastDayInclusive(issuedDate);
    const todayMs = todayStartMs(referenceDate);
    const startMs = startOfLocalDayMs(periodStart);
    const lastMs = startOfLocalDayMs(lastDay);

    if (!Number.isFinite(startMs) || !Number.isFinite(lastMs)) {
        return { remainingDays: 0, isExpired: true };
    }

    if (todayMs < startMs) {
        return { remainingDays: ORDINARY_CASSATION_WINDOW_DAYS, isExpired: false };
    }

    if (todayMs > lastMs) {
        return { remainingDays: 0, isExpired: true };
    }

    const remainingDays = Math.floor((lastMs - todayMs) / MS_PER_DAY) + 1;
    return { remainingDays, isExpired: false };
}

export function resolveCassationCorrectionRemainingDaysForAnchor(
    recordedAt: string,
    referenceDate = new Date(),
): number {
    const anchor = String(recordedAt ?? '').trim();
    if (!anchor) return 0;
    return remainingDaysFromIsoAnchor(anchor, CASSATION_CORRECTION_WINDOW_DAYS, referenceDate);
}
