import type { CaseStage } from '@/app/types/criminal';
import {
    ORDINARY_CASSATION_WINDOW_DAYS,
    computeOrdinaryCassationWindow,
    resolveOrdinaryCassationLastDayInclusive,
    type DecisionPresenceType,
} from './decisionAppealPeriodEngine';
import { resolveAppealCaseStage } from './trialChargeEngine';
import { parseEventDateKey } from './stageJourney';
import { isFirstTrialSessionNumber, parseTrialSessionNumber } from './trialSessionNumber';
import {
    type AddTrialSessionInput,
    type TrialSession,
    type TrialSessionPreparatoryDecisionInput,
    type TrialSessionStatus,
    type TrialSessionVerdict,
    type TrialVerdictOutcome,
    type TrialWitnessExpert,
    filterTrialSessionsForDisplay,
    formatTrialSessionIsoDate,
    hasEffectivePendingTrialSession,
    isPhantomScheduledTrialSession,
    isTrialVerdictOutcome,
    normalizeTrialSessions,
    prunePhantomScheduledTrialSessions,
    resolveCassationRemandRetrialPivotDate,
    sanitizeTrialSessionIsoDateInput,
    todayIsoDate,
    validateTrialSessionIsoDate,
} from './trialSessionsDisplay';

export type {
    AddTrialSessionInput,
    TrialSession,
    TrialSessionPreparatoryDecisionInput,
    TrialSessionStatus,
    TrialSessionVerdict,
    TrialVerdictOutcome,
    TrialWitnessExpert,
};

export {
    filterTrialSessionsForDisplay,
    formatTrialSessionIsoDate,
    hasEffectivePendingTrialSession,
    isPhantomScheduledTrialSession,
    isTrialVerdictOutcome,
    normalizeTrialSessions,
    prunePhantomScheduledTrialSessions,
    resolveCassationRemandRetrialPivotDate,
    sanitizeTrialSessionIsoDateInput,
    todayIsoDate,
    validateTrialSessionIsoDate,
};

type TrialVerdictPresenceType = NonNullable<TrialSession['verdict']>['presenceType'];

export type FinalizeTrialVerdictInput = {
    outcome: TrialVerdictOutcome;
    presenceType?: TrialVerdictPresenceType;
    date: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isTrialPresenceStatus(v: string): v is TrialSession['presenceStatus'] {
    return v === 'present' || v === 'absent';
}

export function presenceTypeFromSession(presenceStatus: TrialSession['presenceStatus']): TrialVerdictPresenceType {
    return presenceStatus === 'present' ? 'in_person_verdict' : 'absentee_verdict';
}

/** وجاهي إذا حضر المتهم (أو وُصفت الجلسة وجاهية) في أي جلسة مسجّلة — وإلا غيابي. */
export function inferDecisionPresenceFromTrialSessions(
    sessions: TrialSession[],
): DecisionPresenceType {
    return sessions.some((s) => s.presenceStatus === 'present') ? 'وجاهي' : 'غيابي';
}

export function mapStageFinalKindToTrialOutcome(kind: string): TrialVerdictOutcome | null {
    if (kind === 'conviction_penalty') return 'conviction';
    if (kind === 'acquittal' || kind === 'criminal_expiration') return 'acquittal';
    if (kind === 'release' || kind === 'settlement_waiver') return 'release';
    return null;
}

export function mapDecisionPresenceToTrialVerdictPresence(
    presence: string | undefined,
    sessionPresence?: TrialSession['presenceStatus'],
): TrialVerdictPresenceType {
    if (presence === 'غيابي') return 'absentee_verdict';
    if (presence === 'وجاهي') return 'in_person_verdict';
    return presenceTypeFromSession(sessionPresence ?? 'present');
}

export function addCalendarDays(isoDate: string, days: number): string {
    const base = String(isoDate ?? '').trim();
    const parsed = ISO_DATE.test(base) ? new Date(`${base}T12:00:00`) : new Date();
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
    parsed.setDate(parsed.getDate() + days);
    return parsed.toISOString().slice(0, 10);
}

export function computeAppealDeadline(verdictDate: string): string {
    const trimmed = String(verdictDate ?? '').trim();
    if (!ISO_DATE.test(trimmed)) {
        return addCalendarDays(new Date().toISOString().slice(0, 10), ORDINARY_CASSATION_WINDOW_DAYS);
    }
    const lastDay = resolveOrdinaryCassationLastDayInclusive(trimmed);
    return lastDay || addCalendarDays(trimmed, ORDINARY_CASSATION_WINDOW_DAYS);
}

type AppealCountdownSnapshot = {
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
};

export function appealCountdownSnapshot(
    deadline: string,
    nowMs = Date.now(),
    issuedAt?: string,
): AppealCountdownSnapshot {
    const trimmed = String(deadline ?? '').trim();
    const end = ISO_DATE.test(trimmed) ? Date.parse(`${trimmed}T23:59:59`) : NaN;
    if (!Number.isFinite(end)) {
        return { days: 0, hours: 0, minutes: 0, expired: true };
    }
    const diff = end - nowMs;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
    let days = Math.floor(diff / (24 * 3600 * 1000));
    if (issuedAt) {
        const window = computeOrdinaryCassationWindow(issuedAt, new Date(nowMs));
        if (window.isExpired) {
            return { days: 0, hours: 0, minutes: 0, expired: true };
        }
        days = Math.min(days, window.remainingDays);
    } else {
        days = Math.min(days, ORDINARY_CASSATION_WINDOW_DAYS);
    }
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    return { days, hours, minutes, expired: false };
}

export function cassationRoutingGuide(
    caseStage: CaseStage,
    options?: { currentAccusationArticle?: string; crimeType?: string },
): { courtLabel: string; warningText: string } {
    const stage = resolveAppealCaseStage(caseStage, options?.currentAccusationArticle, options?.crimeType);
    if (stage === 'felony') {
        return {
            courtLabel: 'محكمة التمييز الاتحادية',
            warningText:
                '⚠️ صدر الحكم وجاهياً. يتوجب الطعن أمام [محكمة التمييز الاتحادية] خلال 30 يوماً.',
        };
    }
    return {
        courtLabel: 'محكمة الاستئناف في المنطقة بصفتها التمييزية',
        warningText:
            '⚠️ صدر الحكم وجاهياً. يتوجب الطعن أمام [محكمة الاستئناف في المنطقة بصفتها التمييزية] خلال 30 يوماً.',
    };
}

/** آخر جلسة قيد المرافعة — المرجع لإصدار الحكم الفوري. */
export function findCurrentPendingTrialSession(sessions: TrialSession[]): TrialSession | null {
    const sorted = sortTrialSessionsAsc(sessions);
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const row = sorted[i];
        if (row?.status === 'pending') return row;
    }
    return null;
}

/** الجلسة التي أُصدر فيها الحكم الختامي (الأحدث). */
export function findTrialVerdictSession(sessions: TrialSession[]): TrialSession | null {
    const sorted = sortTrialSessionsAsc(sessions);
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
        const row = sorted[i];
        if (row?.status === 'verdict_issued' && row.verdict) return row;
    }
    return null;
}

export function isTrialDossierConcluded(sessions: TrialSession[]): boolean {
    return findTrialVerdictSession(sessions) != null;
}

export function isTrialSessionPostCassationRemand(
    session: TrialSession,
    pivotDate: string | null,
    sortedAsc: TrialSession[],
): boolean {
    if (session.trialRound === 'post_cassation_remand') return true;
    if (session.trialRound === 'initial') return false;
    if (!pivotDate) return false;
    const pivotMs = parseEventDateKey(pivotDate);
    const sessionMs = parseEventDateKey(session.date);
    if (sessionMs > pivotMs) return true;
    if (sessionMs < pivotMs) return false;
    const idx = sortedAsc.findIndex((s) => s.id === session.id);
    if (idx <= 0) return false;
    return sortedAsc.slice(0, idx).some((s) => s.status === 'postponed' || s.status === 'verdict_issued');
}

/* تُستعمل داخلياً أيضاً، فالاستيراد لازم — إعادة التصدير وحدها لا تُنشئ رابطة محلّية */
export { isFirstTrialSessionNumber, parseTrialSessionNumber };

type TrialPresenceOption = { value: 'present' | 'absent'; label: string };

export function resolveTrialPresenceFieldConfig(sessionNumber: string): {
    label: string;
    options: TrialPresenceOption[];
} {
    if (isFirstTrialSessionNumber(sessionNumber)) {
        return {
            label: 'حضور المتهم (الوصف الكلي)',
            options: [
                { value: 'present', label: 'وجاهي' },
                { value: 'absent', label: 'غيابي' },
            ],
        };
    }
    return {
        label: 'حضور المتهم في هذه الجلسة',
        options: [
            { value: 'present', label: 'حضر المتهم' },
            { value: 'absent', label: 'لم يحضر المتهم' },
        ],
    };
}

export function trialSessionPresenceBadge(
    presenceStatus: TrialSession['presenceStatus'],
    sessionNumber?: string,
): string {
    if (sessionNumber && isFirstTrialSessionNumber(sessionNumber)) {
        return presenceStatus === 'present' ? 'وجاهي' : 'غيابي';
    }
    if (sessionNumber) {
        return presenceStatus === 'present' ? 'حضر المتهم' : 'لم يحضر المتهم';
    }
    return presenceStatus === 'present' ? 'جلسة وجاهية' : 'جلسة غيابية';
}

export function validateTrialSessionPreparatoryInput(
    input: TrialSessionPreparatoryDecisionInput,
): string | null {
    const title = String(input.title ?? '').trim();
    const details = String(input.details ?? '').trim();
    if (!title) return 'أدخل اسم القرار الإعدادي / الأمر.';
    if (title.length < 2) return 'اسم القرار قصير — تحقق من الإدخال.';
    if (!details) return 'أدخل تفاصيل ووقائع القرار.';
    return null;
}

export function trialVerdictOutcomeLabel(outcome: TrialVerdictOutcome): string {
    if (outcome === 'conviction') return 'إدانة';
    if (outcome === 'acquittal') return 'براءة';
    return 'إفراج';
}

export function trialSessionStatusLabel(status: TrialSessionStatus): string {
    if (status === 'pending') return 'قيد المرافعة';
    if (status === 'postponed') return 'مؤجّلة';
    return 'حكم صادر';
}

function compareTrialSessionsAsc(a: TrialSession, b: TrialSession): number {
    const aNum = Number.parseInt(String(a.sessionNumber ?? '').replace(/\D/g, ''), 10);
    const bNum = Number.parseInt(String(b.sessionNumber ?? '').replace(/\D/g, ''), 10);
    if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) return aNum - bNum;
    const aT = Date.parse(String(a.date ?? ''));
    const bT = Date.parse(String(b.date ?? ''));
    return (Number.isFinite(aT) ? aT : 0) - (Number.isFinite(bT) ? bT : 0);
}

export function sortTrialSessionsAsc(sessions: TrialSession[]): TrialSession[] {
    return [...sessions].sort(compareTrialSessionsAsc);
}

export function sortTrialSessionsDesc(sessions: TrialSession[]): TrialSession[] {
    return [...sessions].sort((a, b) => compareTrialSessionsAsc(b, a));
}

export function validateAddTrialSessionInput(input: AddTrialSessionInput): string | null {
    const date = String(input.date ?? '').trim();
    const sessionNumber = String(input.sessionNumber ?? '').trim();
    const dateErr = validateTrialSessionIsoDate(date);
    if (dateErr) return dateErr === 'تاريخ غير صالح — استخدم YYYY-MM-DD.' ? 'تاريخ الجلسة غير صالح.' : dateErr;
    if (!sessionNumber) return 'رقم الجلسة مطلوب.';
    if (!isTrialPresenceStatus(String(input.presenceStatus ?? ''))) return 'حدّد حضور المتهم (وجاهي/غيابي).';
    return null;
}

export function suggestNextSessionNumber(existing: TrialSession[]): string {
    const nums = existing
        .map((s) => parseTrialSessionNumber(String(s.sessionNumber ?? '')))
        .filter((n) => n > 0);
    const unique = [...new Set(nums)];
    if (!unique.length) return '1';
    return String(Math.max(...unique) + 1);
}

export function isTrialSessionNumberTaken(
    existing: TrialSession[],
    sessionNumber: string,
    excludeSessionId?: string,
): boolean {
    const target = String(sessionNumber ?? '').trim();
    if (!target) return false;
    const exclude = String(excludeSessionId ?? '').trim();
    return existing.some((s) => {
        if (exclude && s.id === exclude) return false;
        return String(s.sessionNumber ?? '').trim() === target;
    });
}

export function validateTrialSessionNumberUnique(
    existing: TrialSession[],
    sessionNumber: string,
    excludeSessionId?: string,
): string | null {
    if (isTrialSessionNumberTaken(existing, sessionNumber, excludeSessionId)) {
        return `رقم الجلسة ${String(sessionNumber).trim()} مسجّل مسبقاً.`;
    }
    return null;
}
