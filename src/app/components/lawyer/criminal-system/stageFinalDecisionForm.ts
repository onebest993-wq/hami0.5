import type { CaseStage } from '@/app/types/criminal';
import type { DecisionCaseType } from './decisionAppealPeriodEngine';
import type { StageConclusion } from './criminalCaseModel';
import type { VerdictCard, VerdictCardOutcome } from './verdictCardsEngine';
import { computeAppealDeadline } from './trialSessionsEngine';
import { type CaseSovereignContext } from './caseClassificationEngine';
import { formatPenaltyDisplay, resolvePenaltiesSupplementary } from './stageFinalDecisionPenalty';
import {
    MISDEMEANOR_MAX_IMPRISONMENT_YEARS,
    type StageFinalDecisionFormPayload,
    type StageFinalDecisionKind,
} from './stageFinalDecisionTypes';

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

function mapKindToVerdictOutcome(kind: StageFinalDecisionKind): VerdictCardOutcome | null {
    if (kind === 'conviction_penalty') return 'conviction';
    if (kind === 'acquittal') return 'acquittal';
    if (kind === 'release' || kind === 'settlement_waiver') return 'release';
    if (kind === 'criminal_expiration') return 'acquittal';
    return null;
}

function mapKindToStageDecisionType(kind: StageFinalDecisionKind): StageConclusion['decisionType'] {
    if (kind === 'conviction_penalty') return 'conviction';
    if (kind === 'acquittal') return 'acquittal';
    if (kind === 'release' || kind === 'settlement_waiver') return 'release';
    return 'expiration';
}

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
