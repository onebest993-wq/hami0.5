import type { CaseStage } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import type { DecisionCaseType, DecisionPresenceType } from './decisionAppealPeriodEngine';
import {
    ORDINARY_CASSATION_WINDOW_DAYS,
    computeOrdinaryCassationWindow,
    formatAppealResultLabel,
    isCassationResultAffirmationUpheld,
    isCassationResultQuashRemand,
    resolveAppealPeriodStartExclusive,
    resolveCassationCorrectionRemainingDaysForAnchor,
} from './decisionAppealPeriodEngine';
import type { StageConclusion } from './criminalCaseModel';
import type { VerdictCard, VerdictCardOutcome } from './verdictCardsEngine';
import {
    canShowVerdictCassationCorrection,
    isVerdictCassationFilingComplete,
    isVerdictCassationUnderReview,
    isVerdictCorrectionAppealFiled,
    isVerdictCorrectionAppealPending,
    isVerdictOrdinaryCassationConsumed,
} from './verdictCardsEngine';
import {
    applyStageGatesToVerdictCardActions,
    isVerdictInterventionLockActive,
} from './stageCassationActionGates';
import { computeAppealDeadline } from './trialSessionsEngine';
import { type CaseSovereignContext } from './caseClassificationEngine';

/** أنواع القرار الختامي للمرحلة — القائمة الرئيسية في النموذج. */
export type StageFinalDecisionKind =
    | 'conviction_penalty'
    | 'acquittal'
    | 'release'
    | 'criminal_expiration'
    | 'settlement_waiver';

export type MasterPenaltyKind =
    | 'severe_imprisonment'
    | 'simple_imprisonment'
    | 'fine'
    | 'combined_imprisonment_fine';

export type StageFinalPenaltyBlock = {
    masterKind: MasterPenaltyKind;
    years?: number;
    months?: number;
    fineAmountIqd?: number;
    substituteImprisonmentDays?: number;
    substituteImprisonmentMonths?: number;
    suspendedExecution?: boolean;
    suspendedExecutionReason?: string;
    penalties_supplementary?: string | null;
    /** @deprecated استخدم penalties_supplementary */
    accessory_penalties?: string;
};

export type StageFinalDecisionProcedurePath = 'summary' | 'full';

export type StageFinalDecisionFormPayload = {
    kind: StageFinalDecisionKind;
    issuedAt: string;
    presenceType: DecisionPresenceType;
    decisionText: string;
    penalty?: StageFinalPenaltyBlock;
    defendantIds?: string[];
    expirationReason?: StageConclusion['expirationReason'];
    decisionPath?: StageFinalDecisionProcedurePath;
    convictionText?: string;
};

export type StageFinalDecisionBadgeTone =
    | 'countdown_orange'
    | 'final_green'
    | 'absentee_gray'
    | 'absentee_objection'
    | 'cassation_review'
    | 'cassation_result'
    | 'neutral';

export type StageFinalDecisionBadge = {
    label: string;
    tone: StageFinalDecisionBadgeTone;
};

export type StageFinalDecisionCardActions = {
    showCassationAppeal: boolean;
    showAbsentiaPublication: boolean;
    showAbsentiaObjection: boolean;
    showComplainantCassation: boolean;
    showRecordCassationResult: boolean;
    showCassationCorrection: boolean;
};

export type StageFinalDecisionUserRole = CriminalCaseUserRole | 'lawyer_of_defendant' | 'lawyer_of_claimant';

export type StageFinalDecisionActionsContext = {
    readOnly?: boolean;
    referenceDate?: Date;
    userRole?: StageFinalDecisionUserRole;
    caseStage?: CaseStage;
};

export function normalizeStageFinalDecisionUserRole(
    userRole?: StageFinalDecisionUserRole,
): CriminalCaseUserRole {
    const r = String(userRole ?? '').trim();
    if (r === 'defendant_lawyer' || r === 'lawyer_of_defendant') return 'defendant_lawyer';
    if (r === 'complainant_lawyer' || r === 'lawyer_of_claimant') return 'complainant_lawyer';
    return '';
}

export function isStageFinalConvictionOutcome(card: VerdictCard): boolean {
    return card.outcome === 'conviction' || card.finalDecisionKind === 'conviction_penalty';
}

export function isStageFinalAcquittalOrReleaseOutcome(card: VerdictCard): boolean {
    return (
        card.outcome === 'acquittal' ||
        card.outcome === 'release' ||
        card.finalDecisionKind === 'acquittal' ||
        card.finalDecisionKind === 'release'
    );
}

/** يتحكم بظهور زر «تسجيل طعن تمييزي» حسب دور المحامي ونتيجة القرار الختامي. */
export function canShowStageFinalCassationAppealByRole(
    card: VerdictCard,
    userRole?: StageFinalDecisionUserRole,
): boolean {
    const role = normalizeStageFinalDecisionUserRole(userRole);
    if (role === 'defendant_lawyer') {
        return isStageFinalConvictionOutcome(card);
    }
    if (role === 'complainant_lawyer') {
        return isStageFinalConvictionOutcome(card) || isStageFinalAcquittalOrReleaseOutcome(card);
    }
    return isStageFinalConvictionOutcome(card) || isStageFinalAcquittalOrReleaseOutcome(card);
}

export const STAGE_FINAL_DECISION_KIND_OPTIONS: { value: StageFinalDecisionKind; label: string }[] = [
    { value: 'conviction_penalty', label: 'إدانة وعقوبة' },
    { value: 'acquittal', label: 'براءة' },
    { value: 'release', label: 'إفراج' },
    { value: 'criminal_expiration', label: 'انقضاء/سقوط الدعوى الجزائية' },
    { value: 'settlement_waiver', label: 'قبول الصلح والتنازل' },
];

/** خيارات الحسم الموضوعي — المسار الكامل (جناية / جنحة غير موجزة). */
export const FULL_STAGE_FINAL_DECISION_KIND_OPTIONS: { value: StageFinalDecisionKind; label: string }[] = [
    { value: 'conviction_penalty', label: 'إدانة وعقوبة' },
    { value: 'acquittal', label: 'براءة' },
    { value: 'release', label: 'إفراج' },
    { value: 'criminal_expiration', label: 'انقضاء الدعوى الجزائية' },
];

/** عقوبات المسار الموجز — غرامة أو حبس بسيط فقط. */
export const SUMMARY_PENALTY_KIND_OPTIONS: { value: MasterPenaltyKind; label: string }[] = [
    { value: 'fine', label: 'غرامة مالية' },
    { value: 'simple_imprisonment', label: 'حبس بسيط' },
];

export const MASTER_PENALTY_OPTIONS: { value: MasterPenaltyKind; label: string }[] = [
    { value: 'severe_imprisonment', label: 'سجن / حبس شديد' },
    { value: 'simple_imprisonment', label: 'حبس بسيط' },
    { value: 'fine', label: 'غرامة مالية' },
    { value: 'combined_imprisonment_fine', label: 'عقوبة مركبة: حبس وغرامة' },
];

const MS_PER_DAY = 86_400_000;

function startOfLocalDayMs(isoDate: string): number {
    const raw = String(isoDate ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!m) return NaN;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addCalendarDaysIso(isoDate: string, days: number): string {
    const start = startOfLocalDayMs(isoDate);
    if (!Number.isFinite(start)) return '';
    return new Date(start + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** مهلة الاعتراض الغيابي من تاريخ التبليغ بالنشر. */
export function resolveAbsentiaObjectionDays(caseType: DecisionCaseType): number {
    if (caseType === 'مخالفة') return 30;
    if (caseType === 'جنحة') return 90;
    return 180;
}

export function resolveAbsentiaObjectionDeadline(
    publicationDate: string,
    caseType: DecisionCaseType,
): string {
    return addCalendarDaysIso(publicationDate, resolveAbsentiaObjectionDays(caseType));
}

export function inferDecisionCaseTypeFromStage(caseStage: CaseStage, crimeTypeLabel?: string): DecisionCaseType {
    const crime = String(crimeTypeLabel ?? '').trim();
    if (/مخالف/i.test(crime)) return 'مخالفة';
    if (caseStage === 'felony' || /جنا/i.test(crime)) return 'جناية';
    return 'جنحة';
}

export function inferDecisionCaseTypeFromContext(
    context: CaseSovereignContext,
    caseStage: CaseStage,
): DecisionCaseType {
    if (context.case_classification === 'مخالفة') return 'مخالفة';
    if (context.case_classification === 'جناية') return 'جناية';
    return inferDecisionCaseTypeFromStage(caseStage, context.case_classification);
}

export function stageFinalDecisionKindLabel(kind: StageFinalDecisionKind | undefined): string {
    return STAGE_FINAL_DECISION_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? '—';
}

export function masterPenaltyLabel(kind: MasterPenaltyKind | undefined): string {
    return MASTER_PENALTY_OPTIONS.find((o) => o.value === kind)?.label ?? '—';
}

export function resolvePenaltiesSupplementary(penalty: StageFinalPenaltyBlock | undefined): string {
    if (!penalty) return '';
    const raw =
        penalty.penalties_supplementary != null
            ? penalty.penalties_supplementary
            : penalty.accessory_penalties;
    return String(raw ?? '').trim();
}

export function formatPenaltyDisplay(penalty: StageFinalPenaltyBlock | undefined): string {
    if (!penalty) return '';
    const parts: string[] = [];
    const durationParts: string[] = [];
    if (penalty.years && penalty.years > 0) durationParts.push(`${penalty.years} ${penalty.years === 1 ? 'سنة' : 'سنوات'}`);
    if (penalty.months && penalty.months > 0) durationParts.push(`${penalty.months} ${penalty.months === 1 ? 'شهر' : 'أشهر'}`);

    if (penalty.masterKind === 'fine' || penalty.masterKind === 'combined_imprisonment_fine') {
        if (penalty.fineAmountIqd && penalty.fineAmountIqd > 0) {
            parts.push(`غرامة مقدارها ${penalty.fineAmountIqd.toLocaleString('ar-IQ')} دينار عراقي`);
        }
        const sub: string[] = [];
        if (penalty.substituteImprisonmentMonths && penalty.substituteImprisonmentMonths > 0) {
            sub.push(`${penalty.substituteImprisonmentMonths} شهر`);
        }
        if (penalty.substituteImprisonmentDays && penalty.substituteImprisonmentDays > 0) {
            sub.push(`${penalty.substituteImprisonmentDays} يوم`);
        }
        if (sub.length) parts.push(`حبس بديل عند عدم الدفع: ${sub.join(' و')}`);
    }

    if (
        penalty.masterKind === 'severe_imprisonment' ||
        penalty.masterKind === 'simple_imprisonment' ||
        penalty.masterKind === 'combined_imprisonment_fine'
    ) {
        const kindLabel =
            penalty.masterKind === 'severe_imprisonment'
                ? 'حبس شديد'
                : penalty.masterKind === 'simple_imprisonment'
                  ? 'حبس بسيط'
                  : 'حبس';
        if (durationParts.length) parts.unshift(`${kindLabel} لمدة ${durationParts.join(' و')}`);
        else parts.unshift(kindLabel);
    }

    if (penalty.suspendedExecution) {
        parts.push(
            penalty.suspendedExecutionReason?.trim()
                ? `مشمول بإيقاف التنفيذ — ${penalty.suspendedExecutionReason.trim()}`
                : 'مشمول بإيقاف التنفيذ',
        );
    }
    return parts.join(' — ');
}

export function mapKindToVerdictOutcome(kind: StageFinalDecisionKind): VerdictCardOutcome | null {
    if (kind === 'conviction_penalty') return 'conviction';
    if (kind === 'acquittal') return 'acquittal';
    if (kind === 'release' || kind === 'settlement_waiver') return 'release';
    if (kind === 'criminal_expiration') return 'acquittal';
    return null;
}

export function mapKindToStageDecisionType(kind: StageFinalDecisionKind): StageConclusion['decisionType'] {
    if (kind === 'conviction_penalty') return 'conviction';
    if (kind === 'acquittal') return 'acquittal';
    if (kind === 'release' || kind === 'settlement_waiver') return 'release';
    return 'expiration';
}

export const MISDEMEANOR_MAX_IMPRISONMENT_YEARS = 5;

function validateMisdemeanorImprisonmentYears(
    years: number | undefined,
    context?: CaseSovereignContext,
): string | null {
    const classification = context?.case_classification;
    if (classification !== 'جنحة' && classification !== 'مخالفة') return null;
    if ((years ?? 0) > MISDEMEANOR_MAX_IMPRISONMENT_YEARS) {
        return `مدة الحبس في الجنح لا تتجاوز ${MISDEMEANOR_MAX_IMPRISONMENT_YEARS} سنوات.`;
    }
    return null;
}

export function validateStageFinalDecisionForm(
    payload: StageFinalDecisionFormPayload,
    context?: CaseSovereignContext,
): string | null {
    const issuedAt = String(payload.issuedAt ?? '').trim();
    if (!issuedAt) return 'تاريخ صدور القرار مطلوب.';
    if (!payload.kind) return 'اختر نوع القرار الختامي.';
    if (payload.presenceType !== 'وجاهي' && payload.presenceType !== 'غيابي') {
        return 'حدّد طبيعة الحكم (حضوري أو غيابي).';
    }

    const isSummary = payload.decisionPath === 'summary' || context?.isSummaryProcedure === true;

    if (isSummary) {
        const p = payload.penalty;
        if (!p?.masterKind || (p.masterKind !== 'fine' && p.masterKind !== 'simple_imprisonment')) {
            return 'اختر نوع العقوبة الموجزة (غرامة أو حبس بسيط).';
        }
        const yearsErr = validateMisdemeanorImprisonmentYears(p.years, context);
        if (yearsErr) return yearsErr;
        if (p.masterKind === 'fine') {
            if (!p.fineAmountIqd || p.fineAmountIqd <= 0) return 'أدخل مقدار الغرامة.';
        }
        if (p.masterKind === 'simple_imprisonment') {
            const total = (p.years ?? 0) + (p.months ?? 0);
            if (total <= 0) return 'أدخل مدة الحبس البسيط (سنة/شهر).';
        }
        return null;
    }

    const text = String(payload.decisionText ?? '').trim();
    if (payload.kind !== 'conviction_penalty' && !text) return 'نص القرار مطلوب.';
    if (payload.kind === 'conviction_penalty') {
        const convictionText = String(payload.convictionText ?? '').trim();
        if (!convictionText) return 'أدخل نص قرار الحكم بالإدانة.';
        const p = payload.penalty;
        if (!p?.masterKind) return 'اختر نوع العقوبة الأستاذية.';
        const yearsErr = validateMisdemeanorImprisonmentYears(p.years, context);
        if (yearsErr) return yearsErr;
        const needsDuration =
            p.masterKind === 'severe_imprisonment' ||
            p.masterKind === 'simple_imprisonment' ||
            p.masterKind === 'combined_imprisonment_fine';
        if (needsDuration) {
            const total = (p.years ?? 0) + (p.months ?? 0);
            if (total <= 0) return 'أدخل مدة الحبس (سنة/شهر).';
        }
        if (p.masterKind === 'fine' || p.masterKind === 'combined_imprisonment_fine') {
            if (!p.fineAmountIqd || p.fineAmountIqd <= 0) return 'أدخل مقدار الغرامة.';
        }
        if (p.suspendedExecution && !String(p.suspendedExecutionReason ?? '').trim()) {
            return 'أدخل أسباب ومستند إيقاف التنفيذ.';
        }
    }
    if (payload.kind === 'criminal_expiration' && !payload.expirationReason) {
        return 'اختر سبب انقضاء الدعوى.';
    }
    return null;
}

export function buildStageConclusionFromForm(
    payload: StageFinalDecisionFormPayload,
    stageType: StageConclusion['stageType'],
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'],
): StageConclusion {
    const id =
        globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const isSummary = payload.decisionPath === 'summary';
    let details = payload.decisionText;
    const supplementaryLine = resolvePenaltiesSupplementary(payload.penalty);

    if (isSummary && payload.penalty) {
        const penaltyLine = formatPenaltyDisplay(payload.penalty);
        details = penaltyLine ? `أمر جزائي / عقوبة موجزة — ${penaltyLine}` : 'أمر جزائي / عقوبة موجزة';
        if (supplementaryLine) {
            details = `${details}\n\nتدابير/عقوبات تكميلية: ${supplementaryLine}`;
        }
    } else if (payload.kind === 'conviction_penalty') {
        const conviction = String(payload.convictionText ?? payload.decisionText ?? '').trim();
        const penaltyLine =
            payload.penalty && payload.penalty.masterKind ? formatPenaltyDisplay(payload.penalty) : '';
        details = [conviction, penaltyLine].filter(Boolean).join('\n\n').trim();
        if (supplementaryLine) {
            details = details
                ? `${details}\n\nعقوبات تبعية وتكميلية: ${supplementaryLine}`
                : `عقوبات تبعية وتكميلية: ${supplementaryLine}`;
        }
    }

    return {
        id,
        stageType,
        decisionType: mapKindToStageDecisionType(payload.kind),
        date: payload.issuedAt,
        details,
        defendantStatusAtDecision,
        defendantIds: payload.defendantIds?.length ? payload.defendantIds : undefined,
        expirationReason:
            payload.kind === 'criminal_expiration' ? payload.expirationReason : undefined,
    };
}

export function enrichVerdictCardFromForm(
    card: VerdictCard,
    payload: StageFinalDecisionFormPayload,
    caseType: DecisionCaseType,
): VerdictCard {
    const outcome = mapKindToVerdictOutcome(payload.kind);
    if (!outcome) return card;
    const presence = payload.presenceType;
    const appealDeadline =
        presence === 'غيابي' ? '' : computeAppealDeadline(payload.issuedAt);

    return {
        ...card,
        outcome,
        issuedAt: payload.issuedAt,
        appealDeadline,
        decisionDraft: payload.decisionText,
        finalDecisionKind: payload.kind,
        presenceType: presence,
        penalty: payload.penalty,
        caseCrimeType: caseType,
        decisionProcedurePath: payload.decisionPath,
        absentiaPublicationDate: undefined,
        absentiaObjectionDeadline: undefined,
        absentiaObjectionFiled: false,
        absentiaTreatedAsInPerson: false,
        cassationAppealFiled: false,
    };
}

export function resolveStageFinalDecisionBadge(
    card: VerdictCard,
    referenceDate = new Date(),
): StageFinalDecisionBadge {
    const presence = card.presenceType ?? 'وجاهي';
    const issuedAt = String(card.issuedAt ?? '').trim();

    if (presence === 'غيابي') {
        const pub = String(card.absentiaPublicationDate ?? '').trim();
        if (!pub) {
            return { label: 'حكم غيابي — بانتظار التبليغ بالنشر', tone: 'absentee_gray' };
        }
        if (card.absentiaObjectionFiled) {
            return { label: 'تم تسجيل اعتراض غيابي — قيد المتابعة', tone: 'absentee_objection' };
        }
        const caseType = card.caseCrimeType ?? 'جنحة';
        const deadline =
            String(card.absentiaObjectionDeadline ?? '').trim() ||
            resolveAbsentiaObjectionDeadline(pub, caseType);
        const todayMs = Date.UTC(
            referenceDate.getUTCFullYear(),
            referenceDate.getUTCMonth(),
            referenceDate.getUTCDate(),
        );
        const deadlineMs = startOfLocalDayMs(deadline);
        const remaining = Number.isFinite(deadlineMs)
            ? Math.ceil((deadlineMs - todayMs) / MS_PER_DAY)
            : 0;
        if (remaining > 0) {
            return {
                label: `غيابي — متبقي ${remaining} يوم للاعتراض`,
                tone: 'absentee_objection',
            };
        }
        if (!card.absentiaTreatedAsInPerson) {
            return { label: 'انقضت مهلة الاعتراض — يُعامل بمنزلة الوجاهي', tone: 'countdown_orange' };
        }
    }

    const anchor =
        card.absentiaTreatedAsInPerson && card.absentiaPublicationDate
            ? resolveAppealPeriodStartExclusive(
                  resolveAbsentiaObjectionDeadline(
                      card.absentiaPublicationDate,
                      card.caseCrimeType ?? 'جنحة',
                  ),
              )
            : resolveAppealPeriodStartExclusive(issuedAt);

    const window = computeOrdinaryCassationWindow(anchor || issuedAt, referenceDate);

    if (isVerdictCassationUnderReview(card)) {
        return { label: '🔵 طعن تمييزي - قيد التدقيق', tone: 'cassation_review' };
    }

    if (isVerdictOrdinaryCassationConsumed(card)) {
        const resultRaw = String(card.ordinaryAppeal?.result ?? '').trim();
        if (isCassationResultQuashRemand(resultRaw)) {
            return {
                label: `🔴 ${formatAppealResultLabel(resultRaw) || 'نقض القرار وإعادته'}`,
                tone: 'cassation_result',
            };
        }
        if (isCassationResultAffirmationUpheld(resultRaw)) {
            const recordedAt = String(card.ordinaryAppeal?.resultRecordedAt ?? '').trim();
            const correctionRemaining = recordedAt
                ? resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, referenceDate)
                : 0;
            if (correctionRemaining > 0) {
                return {
                    label: `🟠 تأييد تمييزي — متبقي ${correctionRemaining} يوم للتصحيح`,
                    tone: 'countdown_orange',
                };
            }
            return { label: 'حكم بات نافذ — انقضت مهلة التصحيح', tone: 'final_green' };
        }
        return {
            label: formatAppealResultLabel(resultRaw) || 'نتيجة تمييز مسجّلة',
            tone: 'cassation_result',
        };
    }

    if (card.cassationAppealFiled) {
        return { label: '🔵 طعن تمييزي - قيد التدقيق', tone: 'cassation_review' };
    }
    if (window.isExpired) {
        return { label: 'حكم بات نافذ — لانقضاء مدة الطعن', tone: 'final_green' };
    }
    return {
        label: `متبقي ${window.remainingDays} يوم للتمييز العادي`,
        tone: 'countdown_orange',
    };
}

export function resolveStageFinalDecisionActions(
    card: VerdictCard,
    contextOrReadOnly?: StageFinalDecisionActionsContext | boolean,
    legacyReferenceDate = new Date(),
): StageFinalDecisionCardActions {
    const ctx: StageFinalDecisionActionsContext =
        typeof contextOrReadOnly === 'boolean'
            ? { readOnly: contextOrReadOnly, referenceDate: legacyReferenceDate }
            : { referenceDate: new Date(), ...contextOrReadOnly };
    const { readOnly, referenceDate = new Date(), userRole, caseStage } = ctx;
    const normalizedRole = normalizeStageFinalDecisionUserRole(userRole);
    const roleAllowsCassation = canShowStageFinalCassationAppealByRole(card, userRole);
    const underReview = isVerdictCassationUnderReview(card);
    const showCorrection = canShowVerdictCassationCorrection(card, { userRole, referenceDate });

    if (readOnly) {
        return {
            showCassationAppeal: false,
            showAbsentiaPublication: false,
            showAbsentiaObjection: false,
            showComplainantCassation: false,
            showRecordCassationResult: false,
            showCassationCorrection: false,
        };
    }
    const presence = card.presenceType ?? 'وجاهي';
    const badge = resolveStageFinalDecisionBadge(card, referenceDate);

    if (presence === 'غيابي') {
        const pub = String(card.absentiaPublicationDate ?? '').trim();
        const absentiaCassationReady =
            Boolean(pub) &&
            (card.absentiaTreatedAsInPerson === true || badge.label.includes('بمنزلة الوجاهي'));
        const window = computeOrdinaryCassationWindow(
            resolveAppealPeriodStartExclusive(card.issuedAt) || card.issuedAt,
            referenceDate,
        );
        const withinWindow = !isVerdictCassationFilingComplete(card) && !window.isExpired;
        const gated = applyStageGatesToVerdictCardActions({
            caseStage,
            interventionLock: isVerdictInterventionLockActive(card),
            ordinaryAppealPending: isVerdictCassationUnderReview(card),
            ordinaryAppealFiled: isVerdictCassationFilingComplete(card),
            correctionAppealPending: isVerdictCorrectionAppealPending(card),
            correctionAppealFiled: isVerdictCorrectionAppealFiled(card),
            showCassationAppeal:
                roleAllowsCassation &&
                normalizedRole === 'defendant_lawyer' &&
                absentiaCassationReady &&
                withinWindow,
            showComplainantCassation:
                roleAllowsCassation &&
                normalizedRole === 'complainant_lawyer' &&
                absentiaCassationReady &&
                withinWindow,
            showCassationCorrection: showCorrection,
            showRecordCassationResult: underReview,
        });
        return {
            showAbsentiaPublication: !pub,
            showAbsentiaObjection:
                Boolean(pub) && !card.absentiaObjectionFiled && badge.tone === 'absentee_objection',
            ...gated,
        };
    }

    const window = computeOrdinaryCassationWindow(
        resolveAppealPeriodStartExclusive(card.issuedAt) || card.issuedAt,
        referenceDate,
    );
    const withinWindow = !isVerdictCassationFilingComplete(card) && !window.isExpired;
    const gated = applyStageGatesToVerdictCardActions({
        caseStage,
        interventionLock: isVerdictInterventionLockActive(card),
        ordinaryAppealPending: isVerdictCassationUnderReview(card),
        ordinaryAppealFiled: isVerdictCassationFilingComplete(card),
        correctionAppealPending: isVerdictCorrectionAppealPending(card),
        correctionAppealFiled: isVerdictCorrectionAppealFiled(card),
        showCassationAppeal: roleAllowsCassation && withinWindow,
        showComplainantCassation: false,
        showCassationCorrection: showCorrection,
        showRecordCassationResult: underReview,
    });
    return {
        showAbsentiaPublication: false,
        showAbsentiaObjection: false,
        ...gated,
    };
}

/** بعد انقضاء مهلة الاعتراض الغيابي دون إجراء — يُفعَّل عداد الـ 30 يوماً. */
export function applyAbsentiaObjectionExpiry(card: VerdictCard, referenceDate = new Date()): VerdictCard {
    if (card.presenceType !== 'غيابي') return card;
    const pub = String(card.absentiaPublicationDate ?? '').trim();
    if (!pub || card.absentiaObjectionFiled) return card;
    const deadline =
        String(card.absentiaObjectionDeadline ?? '').trim() ||
        resolveAbsentiaObjectionDeadline(pub, card.caseCrimeType ?? 'جنحة');
    const todayMs = Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
    );
    const deadlineMs = startOfLocalDayMs(deadline);
    if (!Number.isFinite(deadlineMs) || todayMs <= deadlineMs) return card;
    const anchor = resolveAppealPeriodStartExclusive(deadline);
    return {
        ...card,
        absentiaTreatedAsInPerson: true,
        appealDeadline: computeAppealDeadline(anchor || deadline),
    };
}

export { ORDINARY_CASSATION_WINDOW_DAYS };
