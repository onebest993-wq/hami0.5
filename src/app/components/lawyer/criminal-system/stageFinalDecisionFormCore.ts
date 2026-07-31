import type { DecisionPresenceType } from './decisionAppealLifecycleCore';
import type { StageConclusion } from './criminalCaseModel';
import type { CaseSovereignContext } from './caseClassificationEngine';

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

export const FULL_STAGE_FINAL_DECISION_KIND_OPTIONS: { value: StageFinalDecisionKind; label: string }[] = [
    { value: 'conviction_penalty', label: 'إدانة وعقوبة' },
    { value: 'acquittal', label: 'براءة' },
    { value: 'release', label: 'إفراج' },
    { value: 'criminal_expiration', label: 'انقضاء الدعوى الجزائية' },
];

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
