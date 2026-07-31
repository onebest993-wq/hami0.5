import type { CaseStage } from '@/app/types/criminal';
import {
    ORDINARY_CASSATION_WINDOW_DAYS,
    computeOrdinaryCassationWindow,
    resolveOrdinaryCassationLastDayInclusive,
    type DecisionPresenceType,
} from './decisionAppealPeriodEngine';
import { resolveAppealCaseStage } from './trialChargeEngine';
import { parseEventDateKey } from './stageJourney';
import { coerceLegacyVerdictCassationResult } from './verdictCassationResultEngine';
import type { VerdictCard } from './verdictCardsEngine';

export type TrialWitnessExpert = {
    name: string;
    type: 'witness' | 'expert';
    summary: string;
};

export type TrialVerdictOutcome = 'conviction' | 'acquittal' | 'release';
export type TrialVerdictPresenceType = 'in_person_verdict' | 'absentee_verdict';

export type TrialSessionVerdict = {
    outcome: TrialVerdictOutcome;
    presenceType: TrialVerdictPresenceType;
    date: string;
    appealDeadline: string;
};

export type TrialSessionStatus = 'pending' | 'postponed' | 'verdict_issued';

/** جولة المحاكمة — قبل أو بعد نقض التمييز وإعادة الأوراق. */
export type TrialSessionRound = 'initial' | 'post_cassation_remand';

export type TrialSessionPreparatoryDecision = {
    title: string;
    details: string;
    isBlockingSuit: boolean;
    judicialDecisionId: string;
    sessionNumber?: string;
    sessionId?: string;
};

export type TrialSessionOrigin = 'user' | 'hearing_schedule_placeholder';

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

export type FinalizeTrialVerdictInput = {
    outcome: TrialVerdictOutcome;
    presenceType?: TrialVerdictPresenceType;
    date: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isTrialPresenceStatus(v: string): v is TrialSession['presenceStatus'] {
    return v === 'present' || v === 'absent';
}

export function isTrialSessionStatus(v: string): v is TrialSessionStatus {
    return v === 'pending' || v === 'postponed' || v === 'verdict_issued';
}

export function isTrialVerdictOutcome(v: string): v is TrialVerdictOutcome {
    return v === 'conviction' || v === 'acquittal' || v === 'release';
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

export type AppealCountdownSnapshot = {
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

/** تاريخ قرار التمييز «نقض وإعادة الأوراق» — بداية الجولة الثانية. */
export function resolveCassationRemandRetrialPivotDate(
    verdictCards: VerdictCard[] | undefined,
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
        if (!latest || parseEventDateKey(d) >= parseEventDateKey(latest)) latest = d;
    }
    return latest;
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

/** إعادة فتح أضبارة المحاكمة بعد نقض وإعادة — لتمكين جلسات جديدة. */
export function reopenTrialDossierAfterCassationRemand(sessions: unknown): TrialSession[] {
    const list = normalizeTrialSessions(sessions);
    return list.map((s) => {
        const withoutVerdict =
            s.status === 'verdict_issued'
                ? (() => {
                      const { verdict: _verdict, ...rest } = s;
                      return { ...rest, status: 'postponed' as const };
                  })()
                : s;
        return {
            ...withoutVerdict,
            trialRound: withoutVerdict.trialRound ?? ('initial' as const),
        };
    });
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

export function parseTrialSessionNumber(sessionNumber: string): number {
    const n = Number.parseInt(String(sessionNumber ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

export function isFirstTrialSessionNumber(sessionNumber: string): boolean {
    return parseTrialSessionNumber(sessionNumber) === 1;
}

export type TrialPresenceOption = { value: 'present' | 'absent'; label: string };

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
    const appealDeadline = String(o.appealDeadline ?? '').trim() || (date ? computeAppealDeadline(date) : '');
    if (!ISO_DATE.test(date) || !ISO_DATE.test(appealDeadline)) return undefined;
    return { outcome, presenceType, date, appealDeadline };
}

export function normalizeTrialSession(raw: unknown): TrialSession | null {
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

export function normalizeTrialSessions(raw: unknown): TrialSession[] {
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeTrialSession).filter(Boolean) as TrialSession[];
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

export function hasPendingTrialSession(existing: TrialSession[]): boolean {
    return existing.some((s) => s.status === 'pending');
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

export function filterTrialSessionsForDisplay(
    trials: TrialSession[] | undefined,
    nextHearingDate?: string,
): TrialSession[] {
    const scheduled = String(nextHearingDate ?? '').trim();
    const list = normalizeTrialSessions(trials);
    if (!scheduled) return list;
    return list.filter((s) => !isPhantomScheduledTrialSession(s, scheduled, list));
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
