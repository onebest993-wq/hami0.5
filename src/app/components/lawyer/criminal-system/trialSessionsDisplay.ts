/**
 * عرض/تطبيع جلسات المحاكمة — بلا محرّكات الطعن الثقيلة.
 *
 * كان `filterTrialSessionsForDisplay` / `normalizeTrialSessions` ساكنين في
 * `trialSessionsEngine` فيسحب تبويب الطلبات (للمرشّحات الخفيفة فقط) سلسلة
 * decisionAppealPeriod → cassation/verdict. هذا الملفّ يبقى بدائياً؛ المحرّك
 * يعيد التصدير للتوافق.
 */

import { parseTrialSessionNumber } from './trialSessionNumber';
import { coerceLegacyVerdictCassationResult } from './verdictCassationResultCatalog';

export type TrialWitnessExpert = {
    name: string;
    type: 'witness' | 'expert';
    summary: string;
};

export type TrialVerdictOutcome = 'conviction' | 'acquittal' | 'release';
type TrialVerdictPresenceType = 'in_person_verdict' | 'absentee_verdict';

export type TrialSessionVerdict = {
    outcome: TrialVerdictOutcome;
    presenceType: TrialVerdictPresenceType;
    date: string;
    appealDeadline: string;
};

export type TrialSessionStatus = 'pending' | 'postponed' | 'verdict_issued';

/** جولة المحاكمة — قبل أو بعد نقض التمييز وإعادة الأوراق. */
type TrialSessionRound = 'initial' | 'post_cassation_remand';

type TrialSessionPreparatoryDecision = {
    title: string;
    details: string;
    isBlockingSuit: boolean;
    judicialDecisionId: string;
    sessionNumber?: string;
    sessionId?: string;
};

type TrialSessionOrigin = 'user' | 'hearing_schedule_placeholder';

export type TrialSession = {
    id: string;
    date: string;
    sessionNumber: string;
    presenceStatus: 'present' | 'absent';
    sessionNotes: string;
    witnessesAndExperts?: TrialWitnessExpert[];
    status: TrialSessionStatus;
    postponementReason?: string;
    nextSessionDate?: string;
    preparationNote?: string;
    verdict?: TrialSessionVerdict;
    /** قرار إعدادي صادر في الجلسة — مرتبط بسجل القرارات والطعون. */
    preparatoryDecision?: TrialSessionPreparatoryDecision;
    /** يُميّز جلسات جولة إعادة المحاكمة بعد نقض التمييز. */
    trialRound?: TrialSessionRound;
    /** مصدر الجلسة — يفصل المرافعة الفعلية عن وضع موعد فقط */
    origin?: TrialSessionOrigin;
};

export type TrialSessionPreparatoryDecisionInput = {
    title: string;
    details: string;
    isBlockingSuit: boolean;
};

export type AddTrialSessionInput = Omit<TrialSession, 'id' | 'status' | 'verdict'> & {
    status?: never;
    verdict?: never;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** مهلة الطعن التمييزي العادي — نفس ثابت المحرّك، بلا استيراد سلسلة الطعن. */
const ORDINARY_CASSATION_WINDOW_DAYS = 30;

function isTrialPresenceStatus(v: string): v is TrialSession['presenceStatus'] {
    return v === 'present' || v === 'absent';
}

function isTrialSessionStatus(v: string): v is TrialSessionStatus {
    return v === 'pending' || v === 'postponed' || v === 'verdict_issued';
}

export function isTrialVerdictOutcome(v: string): v is TrialVerdictOutcome {
    return v === 'conviction' || v === 'acquittal' || v === 'release';
}

function addCalendarDays(isoDate: string, days: number): string {
    const base = String(isoDate ?? '').trim();
    const parsed = ISO_DATE.test(base) ? new Date(`${base}T12:00:00`) : new Date();
    if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
    parsed.setDate(parsed.getDate() + days);
    return parsed.toISOString().slice(0, 10);
}

/** تقدير مهلة الطعن عند التطبيع فقط — لا يستورد decisionAppealPeriodEngine. */
function computeAppealDeadlineForNormalize(verdictDate: string): string {
    const trimmed = String(verdictDate ?? '').trim();
    if (!ISO_DATE.test(trimmed)) {
        return addCalendarDays(new Date().toISOString().slice(0, 10), ORDINARY_CASSATION_WINDOW_DAYS);
    }
    /* اليوم التالي للحكم + ٢٩ يوماً inclusive ≈ المهلة القانونية العادية */
    const periodStart = addCalendarDays(trimmed, 1);
    return addCalendarDays(periodStart, ORDINARY_CASSATION_WINDOW_DAYS - 1);
}

function normalizeWitness(raw: unknown): TrialWitnessExpert | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    const type = o.type === 'expert' ? 'expert' : o.type === 'witness' ? 'witness' : null;
    const summary = String(o.summary ?? '').trim();
    if (!name || !type) return null;
    return { name, type, summary };
}

function normalizeVerdict(raw: unknown): TrialSessionVerdict | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const outcome = String(o.outcome ?? '');
    if (!isTrialVerdictOutcome(outcome)) return undefined;
    const presenceRaw = String(o.presenceType ?? '');
    const presenceType: TrialVerdictPresenceType =
        presenceRaw === 'absentee_verdict' ? 'absentee_verdict' : 'in_person_verdict';
    const date = String(o.date ?? '').trim();
    const appealDeadline =
        String(o.appealDeadline ?? '').trim() || (date ? computeAppealDeadlineForNormalize(date) : '');
    if (!ISO_DATE.test(date) || !ISO_DATE.test(appealDeadline)) return undefined;
    return { outcome, presenceType, date, appealDeadline };
}

function normalizePreparatoryDecision(raw: unknown): TrialSessionPreparatoryDecision | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const title = String(o.title ?? '').trim();
    const details = String(o.details ?? '').trim();
    const judicialDecisionId = String(o.judicialDecisionId ?? '').trim();
    if (!title || !details || !judicialDecisionId) return undefined;
    return {
        title,
        details,
        isBlockingSuit: o.isBlockingSuit === true,
        judicialDecisionId,
        sessionNumber: String(o.sessionNumber ?? '').trim() || undefined,
        sessionId: String(o.sessionId ?? '').trim() || undefined,
    };
}

function normalizeTrialSession(raw: unknown): TrialSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    const date = String(o.date ?? '').trim();
    const sessionNumber = String(o.sessionNumber ?? '').trim();
    const presenceRaw = String(o.presenceStatus ?? '');
    const sessionNotes = String(o.sessionNotes ?? '').trim();
    const statusRaw = String(o.status ?? 'pending');
    if (!id || !ISO_DATE.test(date) || !sessionNumber || !isTrialPresenceStatus(presenceRaw)) return null;
    const status: TrialSessionStatus = isTrialSessionStatus(statusRaw) ? statusRaw : 'pending';
    const witnessesRaw = Array.isArray(o.witnessesAndExperts) ? o.witnessesAndExperts : [];
    const witnessesAndExperts = witnessesRaw.map(normalizeWitness).filter(Boolean) as TrialWitnessExpert[];
    return {
        id,
        date,
        sessionNumber,
        presenceStatus: presenceRaw,
        sessionNotes,
        witnessesAndExperts: witnessesAndExperts.length ? witnessesAndExperts : undefined,
        status,
        postponementReason: String(o.postponementReason ?? '').trim() || undefined,
        nextSessionDate: ISO_DATE.test(String(o.nextSessionDate ?? '').trim())
            ? String(o.nextSessionDate).trim()
            : undefined,
        preparationNote: String(o.preparationNote ?? '').trim() || undefined,
        verdict: normalizeVerdict(o.verdict),
        preparatoryDecision: normalizePreparatoryDecision(o.preparatoryDecision),
        trialRound:
            o.trialRound === 'post_cassation_remand' || o.trialRound === 'initial'
                ? o.trialRound
                : undefined,
        origin:
            o.origin === 'user' || o.origin === 'hearing_schedule_placeholder'
                ? o.origin
                : undefined,
    };
}

export function normalizeTrialSessions(raw: unknown): TrialSession[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeTrialSession).filter(Boolean) as TrialSession[];
}

/** جلسة وُضعت تلقائياً عند تسجيل موعد فقط — ليست مرافعة فعلية */
export function isPhantomScheduledTrialSession(
    session: TrialSession,
    nextHearingDate: string,
    _allSessions: TrialSession[],
): boolean {
    if (session.origin === 'user') return false;
    if (session.origin === 'hearing_schedule_placeholder') {
        const sessionDate = String(session.date ?? '').trim().slice(0, 10);
        const scheduled = String(nextHearingDate ?? '').trim().slice(0, 10);
        return Boolean(sessionDate && scheduled && sessionDate === scheduled);
    }
    if (session.status !== 'pending') return false;
    if (parseTrialSessionNumber(String(session.sessionNumber ?? '')) !== 1) return false;
    if (session.verdict) return false;
    if (session.preparatoryDecision) return false;
    const notes = String(session.sessionNotes ?? '').trim();
    const autoScheduleNotes = new Set(['موعد المحاكمة', 'جلسة محاكمة', 'تاريخ المحاكمة']);
    if (notes && !autoScheduleNotes.has(notes)) return false;
    const sessionDate = String(session.date ?? '').trim().slice(0, 10);
    const scheduled = String(nextHearingDate ?? '').trim().slice(0, 10);
    if (!sessionDate || !scheduled || sessionDate !== scheduled) return false;
    return true;
}

export function filterTrialSessionsForDisplay(
    trials: TrialSession[] | undefined,
    nextHearingDate?: string,
): TrialSession[] {
    const scheduled = String(nextHearingDate ?? '').trim();
    const list = normalizeTrialSessions(trials);
    if (!scheduled) return list;
    return list.filter((s) => !isPhantomScheduledTrialSession(s, scheduled, list));
}

export function prunePhantomScheduledTrialSessions(
    trials: TrialSession[] | undefined,
    nextHearingDate: string,
): TrialSession[] {
    return filterTrialSessionsForDisplay(trials, nextHearingDate);
}

export function hasEffectivePendingTrialSession(
    existing: TrialSession[],
    nextHearingDate?: string,
): boolean {
    return filterTrialSessionsForDisplay(existing, nextHearingDate).some((s) => s.status === 'pending');
}

export function todayIsoDate(now = new Date()): string {
    return now.toISOString().slice(0, 10);
}

/** يتحقق من صحة YYYY-MM-DD ويمنع السنوات الوهمية. */
export function validateTrialSessionIsoDate(iso: string): string | null {
    const trimmed = String(iso ?? '').trim();
    if (!ISO_DATE.test(trimmed)) return 'تاريخ غير صالح — استخدم YYYY-MM-DD.';
    const [y, m, d] = trimmed.split('-').map(Number);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) return 'سنة التاريخ غير معقولة.';
    if (!Number.isFinite(m) || m < 1 || m > 12 || !Number.isFinite(d) || d < 1 || d > 31) {
        return 'تاريخ غير صالح.';
    }
    const dt = new Date(`${trimmed}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return 'تاريخ غير صالح.';
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) {
        return 'تاريخ غير صالح.';
    }
    return null;
}

export function sanitizeTrialSessionIsoDateInput(raw: string): string {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return '';
    if (!ISO_DATE.test(trimmed)) return '';
    return validateTrialSessionIsoDate(trimmed) ? '' : trimmed;
}

export function formatTrialSessionIsoDate(value: string | undefined): string {
    const trimmed = String(value ?? '').trim();
    if (!trimmed || validateTrialSessionIsoDate(trimmed)) return '—';
    return trimmed;
}

/** حقول التمييز المطلوبة لحساب pivot إعادة المحاكمة — بلا verdictCardsEngine. */
export type CassationRemandPivotCard = {
    ordinaryAppeal?: {
        result?: string;
        resultRecordedAt?: string;
    };
};

function parseIsoDateKeyLite(date: string): number {
    const parsed = Date.parse(String(date ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * تاريخ قرار التمييز «نقض وإعادة الأوراق» — بداية الجولة الثانية.
 * نسخة خفيفة: كتالوج التمييز فقط، بلا trialSessionsEngine / stageJourney.
 */
export function resolveCassationRemandRetrialPivotDate(
    verdictCards: CassationRemandPivotCard[] | undefined,
): string | null {
    const cards = Array.isArray(verdictCards) ? verdictCards : [];
    let latest: string | null = null;
    for (const card of cards) {
        const raw = String(card.ordinaryAppeal?.result ?? '').trim();
        const coerced = coerceLegacyVerdictCassationResult(raw);
        const isRemand =
            coerced === 'verdict_quash_remand_retrial' ||
            raw === 'quash_remand' ||
            /نقض\s*.*\s*إعادة/i.test(raw);
        if (!isRemand) continue;
        const d = String(card.ordinaryAppeal?.resultRecordedAt ?? '').trim();
        if (!d) continue;
        if (!latest || parseIsoDateKeyLite(d) >= parseIsoDateKeyLite(latest)) latest = d;
    }
    return latest;
}
