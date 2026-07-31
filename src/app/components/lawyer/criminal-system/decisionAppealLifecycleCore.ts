import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import {
    formatAppealResultLabelLite,
    resolveAppealResultCategoryLite,
} from './appealResultLabels';
import { normalizeCassationAppealResultLite } from './cassationResultSummary';
import {
    getPendingCassationAppealForResult,
    latestConcludedAppealWithBeneficiary,
} from './judicialDecisionAppealLiteCore';
import { isDecisionCassationAppealable } from './judicialDecisionTemplateLiteCore';
import { parseEventDateKey } from './stageJourneyRuntimeCore';

/** وجاهي / غيابي — م 249 وما يليها. */
export type DecisionPresenceType = 'وجاهي' | 'غيابي';

/** نوع الجريمة لاحتساب مدة الغياب. */
export type DecisionCaseType = 'جناية' | 'جنحة' | 'مخالفة';

/** تصنيف قابلية الطعن — م 249 / 267. */
export type DecisionAppealabilityCategory =
    | 'قابل للطعن على انفراد'
    | 'غير قابل للطعن على انفراد'
    | 'قرار تمييزي';

export type DecisionAppealLifecycleFields = {
    decisionPresenceType: DecisionPresenceType;
    decisionCaseType: DecisionCaseType;
    decisionAppealability: DecisionAppealabilityCategory;
    issuedDate: string;
    isAppealed: boolean;
    appealResult: string;
    isJudgmentFinalDeclared: boolean;
    cassationPapersReceivedAt?: string;
};

export type AppealPeriodSnapshot = {
    totalLegalDays: number;
    remainingDays: number;
    isPeriodExpired: boolean;
    periodStartExclusive: string;
};

export type DecisionAppealBadgeTone =
    | 'review'
    | 'countdown'
    | 'result'
    | 'period_expired'
    | 'preparatory_final'
    | 'absolute_finality'
    | 'quashed'
    | 'manual_final';

export type DecisionAppealBadgeView = {
    label: string;
    tone: DecisionAppealBadgeTone;
};

export type DecisionAppealStatePhase =
    | 'manual_final'
    | 'not_appealed'
    | 'under_cassation_review'
    | 'upheld_correction_window'
    | 'upheld_absolute_final'
    | 'quashed_final';

/** مدة الطعن التمييزي العادي للقرارات القابلة للطعn — 30 يوماً. */
export const ORDINARY_CASSATION_WINDOW_DAYS = 30;

/** مهلة التصحيح بعد التأييد — م 266. */
export const CASSATION_CORRECTION_WINDOW_DAYS = 30;

const MS_PER_DAY = 86_400_000;

function startOfLocalDayMs(isoDate: string): number {
    const raw = String(isoDate ?? '').trim();
    if (!raw) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const parsed = parseEventDateKey(raw);
    if (!Number.isFinite(parsed)) return NaN;
    const d = new Date(parsed);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function todayStartMs(reference = new Date()): number {
    return Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate());
}

function addCalendarDaysFromIso(isoDate: string, days: number): number {
    const start = startOfLocalDayMs(isoDate);
    if (!Number.isFinite(start)) return NaN;
    return start + days * MS_PER_DAY;
}

export function addCalendarDaysIso(isoDate: string, days: number): string {
    const nextMs = addCalendarDaysFromIso(isoDate, days);
    if (!Number.isFinite(nextMs)) return '';
    return new Date(nextMs).toISOString().slice(0, 10);
}

/** آخر يوم inclusive لمهلة الطعن التمييزي العادي — 30 يوماً من اليوم التالي للحكم (م 252). */
export function resolveOrdinaryCassationLastDayInclusive(issuedDate: string): string {
    const periodStart = resolveAppealPeriodStartExclusive(issuedDate);
    if (!periodStart) return '';
    return addCalendarDaysIso(periodStart, ORDINARY_CASSATION_WINDOW_DAYS - 1);
}

function remainingDaysFromIsoAnchor(anchorDate: string, windowDays: number, referenceDate = new Date()): number {
    const deadlineMs = addCalendarDaysFromIso(anchorDate, windowDays);
    const todayMs = todayStartMs(referenceDate);
    if (!Number.isFinite(deadlineMs)) return 0;
    return Math.max(0, Math.ceil((deadlineMs - todayMs) / MS_PER_DAY));
}

/** اليوم التالي لتاريخ الصدور — بداية المدة. */
export function resolveAppealPeriodStartExclusive(issuedDate: string): string {
    const start = startOfLocalDayMs(issuedDate);
    if (!Number.isFinite(start)) return '';
    return new Date(start + MS_PER_DAY).toISOString().slice(0, 10);
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

export function inferDecisionCaseType(
    caseStage?: CaseStage,
    crimeTypeLabel?: string,
): DecisionCaseType {
    const text = String(crimeTypeLabel ?? '').trim();
    if (/مخالف/i.test(text)) return 'مخالفة';
    if (caseStage === 'felony' || /جناي/i.test(text)) return 'جناية';
    if (caseStage === 'misdemeanor' || /جنح/i.test(text)) return 'جنحة';
    return 'جنحة';
}

export function inferDecisionPresenceType(
    decision: JudicialDecision,
    caseStage?: CaseStage,
): DecisionPresenceType {
    if (decision.decisionPresenceType === 'وجاهي' || decision.decisionPresenceType === 'غيابي') {
        return decision.decisionPresenceType;
    }
    if (caseStage === 'absentia_trial') return 'غيابي';
    const text = `${decision.title} ${decision.summary}`;
    if (/غياب/i.test(text)) return 'غيابي';
    return 'وجاهي';
}

export function inferDecisionAppealability(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage },
): DecisionAppealabilityCategory {
    if (
        decision.decisionAppealability === 'قابل للطعن على انفراد' ||
        decision.decisionAppealability === 'غير قابل للطعن على انفراد' ||
        decision.decisionAppealability === 'قرار تمييزي'
    ) {
        return decision.decisionAppealability;
    }

    const sourceRequestId = String(decision.sourceRequestId ?? '').trim();
    const isLawyerOrder =
        Boolean(sourceRequestId) &&
        (decision.requestOutcomeStatus === 'approved' || decision.requestOutcomeStatus === 'rejected');
    if (isLawyerOrder) {
        if (context?.caseStage === 'investigation') return 'قابل للطعن على انفراد';
        if (context?.caseStage === 'misdemeanor' || context?.caseStage === 'felony') {
            return 'غير قابل للطعن على انفراد';
        }
    }

    const text = `${decision.title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (/تمييز|هيئة التمييز|التمييز/i.test(text)) return 'قرار تمييزي';
    if (context?.caseStage === 'cassation' && decision.decisionType === 'dispositive') {
        return 'قرار تمييزي';
    }
    if (decision.decisionType === 'dispositive') return 'قابل للطعن على انفراد';
    if (decision.isAppealable === true) return 'قابل للطعن على انفراد';
    if (!isDecisionCassationAppealable(decision)) {
        return 'غير قابل للطعن على انفراد';
    }
    return 'قابل للطعن على انفراد';
}

export function formatAppealResultLabel(raw: string): string {
    return formatAppealResultLabelLite(raw);
}

export function resolveAppealResultCategory(raw: string): 'upheld' | 'quashed' | '' {
    return resolveAppealResultCategoryLite(raw);
}

export function resolveStoredAppealResultRaw(decision: JudicialDecision): string {
    const fromField = String(decision.appealResult ?? '').trim();
    if (fromField) return fromField;
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    if (concluded?.result) return String(concluded.result);
    return '';
}

export function resolveAppealResultRecordedAt(decision: JudicialDecision): string {
    const explicit = String(decision.cassationPapersReceivedAt ?? '').trim();
    if (explicit) return explicit;
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    return String(concluded?.concludedAt ?? concluded?.filedAt ?? '').trim();
}

export function resolveDecisionAppealLifecycle(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): DecisionAppealLifecycleFields {
    const issuedDate = String(decision.issuedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const decisionPresenceType = inferDecisionPresenceType(decision, context?.caseStage);
    const decisionCaseType =
        decision.decisionCaseType === 'جناية' ||
        decision.decisionCaseType === 'جنحة' ||
        decision.decisionCaseType === 'مخالفة'
            ? decision.decisionCaseType
            : inferDecisionCaseType(context?.caseStage, context?.crimeTypeLabel);
    const decisionAppealability = inferDecisionAppealability(decision, context);

    const pending = getPendingCassationAppealForResult(decision);
    const hasFiledAppeal = (Array.isArray(decision.appeals) ? decision.appeals : []).some(
        (a) => String(a.filedAt ?? '').trim().length > 0,
    );
    const isAppealed =
        decision.isAppealed === true ||
        decision.interventionCassationPending === true ||
        hasFiledAppeal ||
        Boolean(pending);

    const appealResultRaw = resolveStoredAppealResultRaw(decision);
    const appealResult = appealResultRaw ? formatAppealResultLabel(appealResultRaw) : '';

    return {
        decisionPresenceType,
        decisionCaseType,
        decisionAppealability,
        issuedDate,
        isAppealed,
        appealResult,
        isJudgmentFinalDeclared: decision.isJudgmentFinalDeclared === true,
        cassationPapersReceivedAt: decision.cassationPapersReceivedAt,
    };
}

export function resolveDecisionAppealStatePhase(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string; referenceDate?: Date },
): DecisionAppealStatePhase {
    const life = resolveDecisionAppealLifecycle(decision, context);

    if (life.isJudgmentFinalDeclared) return 'manual_final';

    const resultRaw = resolveStoredAppealResultRaw(decision);
    const resultCategory = resolveAppealResultCategory(resultRaw);

    if (resultCategory === 'quashed') return 'quashed_final';

    if (resultCategory === 'upheld') {
        const recordedAt = resolveAppealResultRecordedAt(decision) || life.issuedDate;
        const correctionRemaining = remainingDaysFromIsoAnchor(
            recordedAt,
            CASSATION_CORRECTION_WINDOW_DAYS,
            context?.referenceDate,
        );
        return correctionRemaining > 0 ? 'upheld_correction_window' : 'upheld_absolute_final';
    }

    if (life.isAppealed) return 'under_cassation_review';

    return 'not_appealed';
}

export function resolveCassationCorrectionRemainingDays(
    decision: JudicialDecision,
    referenceDate = new Date(),
): number {
    const recordedAt = resolveAppealResultRecordedAt(decision);
    if (!recordedAt) return 0;
    return remainingDaysFromIsoAnchor(recordedAt, CASSATION_CORRECTION_WINDOW_DAYS, referenceDate);
}

export type CassationCorrectionUserRole =
    | CriminalCaseUserRole
    | 'lawyer_of_defendant'
    | 'lawyer_of_claimant';

export type CassationCorrectionDecisionOutcome = 'conviction' | 'acquittal' | '';

export type CassationCorrectionEligibilityInput = {
    cassationResultRaw: string;
    issuedBy?: string;
    resultRecordedAt?: string;
    decisionOutcome: CassationCorrectionDecisionOutcome;
    userRole?: CassationCorrectionUserRole;
    referenceDate?: Date;
    correctionAlreadyPending?: boolean;
    correctionAlreadyFiled?: boolean;
};

function normalizeCassationCorrectionUserRole(
    userRole?: CassationCorrectionUserRole,
): CriminalCaseUserRole {
    const r = String(userRole ?? '').trim();
    if (r === 'defendant_lawyer' || r === 'lawyer_of_defendant') return 'defendant_lawyer';
    if (r === 'complainant_lawyer' || r === 'lawyer_of_claimant') return 'complainant_lawyer';
    return '';
}

export function isCassationResultQuashRemand(raw: string): boolean {
    const key = String(raw ?? '').trim();
    if (!key) return false;
    if (key === 'verdict_quash_remand_retrial') return true;
    if (normalizeCassationAppealResultLite(key) === 'quash_remand') return true;
    return key === 'نقض وإعادة' || /نقض\s*و\s*إعادة/i.test(key);
}

export function isCassationIssuedByGeneralAssembly(issuedBy: string | undefined): boolean {
    const v = String(issuedBy ?? '').trim();
    if (!v) return false;
    return v === 'الهيئة العامة' || /الهيئة\s*العامة/i.test(v);
}

/** م 267 — منع مطلق لتصحيح نقض وإعادة أو قرارات الهيئة العامة. */
export function isCassationCorrectionBlockedByArticle267(
    cassationResultRaw: string,
    issuedBy?: string,
): boolean {
    return isCassationResultQuashRemand(cassationResultRaw) || isCassationIssuedByGeneralAssembly(issuedBy);
}

export function isCassationResultAffirmationUpheld(raw: string): boolean {
    const key = String(raw ?? '').trim();
    if (!key) return false;
    if (resolveAppealResultCategory(key) === 'upheld') return true;
    const norm = normalizeCassationAppealResultLite(key);
    return norm === 'affirmation' || norm === 'procedural_affirmation';
}

export function resolveJudicialCassationCorrectionOutcome(
    decision: JudicialDecision,
): CassationCorrectionDecisionOutcome {
    const text = `${decision.title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (/براءة|تبرئة/i.test(text) && !/إدانة/i.test(text)) return 'acquittal';
    if (/إدانة|محكوم|عقوبة/i.test(text)) return 'conviction';
    if (decision.disposition === 'favors_defendant') return 'acquittal';
    if (decision.disposition === 'favors_complainant') return 'conviction';
    return '';
}

export function hasCassationCorrectionPartyInterest(
    userRole: CassationCorrectionUserRole | undefined,
    decisionOutcome: CassationCorrectionDecisionOutcome,
): boolean {
    const role = normalizeCassationCorrectionUserRole(userRole);
    if (role === 'defendant_lawyer' && decisionOutcome === 'conviction') return true;
    if (role === 'complainant_lawyer' && decisionOutcome === 'acquittal') return true;
    return false;
}

export function resolveCassationCorrectionRemainingDaysForAnchor(
    recordedAt: string,
    referenceDate = new Date(),
): number {
    const anchor = String(recordedAt ?? '').trim();
    if (!anchor) return 0;
    return remainingDaysFromIsoAnchor(anchor, CASSATION_CORRECTION_WINDOW_DAYS, referenceDate);
}

export function resolveJudicialCassationIssuedBy(decision: JudicialDecision): string {
    const concluded = latestConcludedAppealWithBeneficiary(decision);
    const fromAppeal = String(
        (concluded as { cassationIssuedBy?: string; panelName?: string } | undefined)?.cassationIssuedBy ??
            (concluded as { panelName?: string } | undefined)?.panelName ??
            '',
    ).trim();
    if (isCassationIssuedByGeneralAssembly(fromAppeal)) return fromAppeal;
    const combined = `${decision.title} ${decision.summary}`;
    if (/الهيئة\s*العامة/i.test(combined)) return 'الهيئة العامة';
    return fromAppeal;
}

/** يتحكم بظهور زر «طلب تصحيح القرار التمييزي» — م 266/267. */
export function canShowCassationCorrectionButton(input: CassationCorrectionEligibilityInput): boolean {
    if (input.correctionAlreadyPending || input.correctionAlreadyFiled) return false;

    const resultRaw = String(input.cassationResultRaw ?? '').trim();
    if (!resultRaw) return false;
    if (isCassationCorrectionBlockedByArticle267(resultRaw, input.issuedBy)) return false;
    if (!isCassationResultAffirmationUpheld(resultRaw)) return false;
    if (!hasCassationCorrectionPartyInterest(input.userRole, input.decisionOutcome)) return false;

    const recordedAt = String(input.resultRecordedAt ?? '').trim();
    if (!recordedAt) return false;
    return resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, input.referenceDate) > 0;
}

export function canShowCassationCorrectionForJudicialDecision(
    decision: JudicialDecision,
    context?: {
        userRole?: CassationCorrectionUserRole;
        referenceDate?: Date;
        correctionAlreadyPending?: boolean;
        correctionAlreadyFiled?: boolean;
    },
): boolean {
    return canShowCassationCorrectionButton({
        cassationResultRaw: resolveStoredAppealResultRaw(decision),
        issuedBy: resolveJudicialCassationIssuedBy(decision),
        resultRecordedAt: resolveAppealResultRecordedAt(decision),
        decisionOutcome: resolveJudicialCassationCorrectionOutcome(decision),
        userRole: context?.userRole,
        referenceDate: context?.referenceDate,
        correctionAlreadyPending: context?.correctionAlreadyPending ?? decision.cassationCorrectionPending === true,
        correctionAlreadyFiled: context?.correctionAlreadyFiled,
    });
}

export function resolveDecisionAppealBadge(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string; referenceDate?: Date },
): DecisionAppealBadgeView {
    const life = resolveDecisionAppealLifecycle(decision, context);
    const phase = resolveDecisionAppealStatePhase(decision, context);
    const cassationWindow = computeOrdinaryCassationWindow(life.issuedDate, context?.referenceDate);

    if (phase === 'manual_final') {
        return { label: 'حكم بات — إعلان يدوي', tone: 'manual_final' };
    }

    if (phase === 'under_cassation_review') {
        return { label: 'قيد التدقيق التمييزي', tone: 'review' };
    }

    if (phase === 'quashed_final') {
        return { label: 'قرار منقوض - يعاد للمحكمة', tone: 'quashed' };
    }

    if (phase === 'upheld_absolute_final') {
        return { label: 'حكم بات نافذ قطعي', tone: 'absolute_finality' };
    }

    if (phase === 'upheld_correction_window') {
        return { label: '', tone: 'result' };
    }

    if (life.decisionAppealability === 'غير قابل للطعن على انفراد') {
        return { label: 'قرار إعدادي نافذ', tone: 'preparatory_final' };
    }

    if (cassationWindow.isExpired) {
        return { label: 'انقضاء مدة الطعن العادي', tone: 'period_expired' };
    }

    return {
        label: `متبقي ${cassationWindow.remainingDays} يوم للتمييز`,
        tone: 'countdown',
    };
}

export function enrichJudicialDecisionAppealFields(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): JudicialDecision {
    const life = resolveDecisionAppealLifecycle(decision, context);
    return {
        ...decision,
        decisionPresenceType: life.decisionPresenceType,
        decisionCaseType: life.decisionCaseType,
        decisionAppealability: life.decisionAppealability,
        issuedAt: life.issuedDate,
        isAppealed: life.isAppealed,
        appealResult: life.appealResult || undefined,
        isJudgmentFinalDeclared: life.isJudgmentFinalDeclared || undefined,
        cassationPapersReceivedAt: life.cassationPapersReceivedAt,
    };
}

export function buildDefaultAppealFieldsForNewDecision(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): Partial<JudicialDecision> {
    const life = resolveDecisionAppealLifecycle(decision, context);
    return {
        decisionPresenceType: life.decisionPresenceType,
        decisionCaseType: life.decisionCaseType,
        decisionAppealability: life.decisionAppealability,
        isAppealed: false,
        appealResult: undefined,
        isJudgmentFinalDeclared: false,
    };
}
