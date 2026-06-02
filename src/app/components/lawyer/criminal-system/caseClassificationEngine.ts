import type { CriminalCase, CrimeType } from './criminalStore';
import { extractArticleNumber } from './trialChargeEngine';

/** تصنيف الجريمة السيادي للمرحلة. */
export type CaseClassification = CrimeType;
export type MisdemeanorType = 'موجزة' | 'غير موجزة';

export const MISDEMEANOR_TYPE_REFERRAL_OPTIONS: { value: MisdemeanorType; label: string }[] = [
    { value: 'موجزة', label: 'موجزة' },
    { value: 'غير موجزة', label: 'غير موجزة' },
];

export function isMisdemeanorType(value: unknown): value is MisdemeanorType {
    return MISDEMEANOR_TYPE_REFERRAL_OPTIONS.some((o) => o.value === value);
}

export type CaseSovereignContext = {
    case_classification: CaseClassification;
    misdemeanor_type?: MisdemeanorType;
    isSummaryProcedure: boolean;
};

const SUMMARY_REFERRAL_HINT =
    /موجزة|\u0625\u062c\u0631\u0627\u0621\s*موجزة|جنحة\s*موجزة|\u0645\s*201|\u0645\u0627\u062f\u0629\s*201|201\s*[-\u2013]\s*211|\u0627\u0644\u0645\u0648\u0627\u062f\s*201/i;

const NON_SUMMARY_REFERRAL_HINT = /غير موجزة|\u0645\u062d\u0627\u0643\u0645\u0629\s*\u0643\u0627\u0645\u0644\u0629/i;

const SUMMARY_ELIGIBLE_ARTICLE_NUMBERS = new Set([
    375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395,
    396, 397, 398, 399, 400, 401, 402, 403, 404, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425,
    426, 427, 428, 429, 430, 431, 432, 433, 434,
]);

export function isValidCaseClassification(value: string | undefined): value is CaseClassification {
    return value === 'جناية' || value === 'جنحة' || value === 'مخالفة';
}

function normalizeClassificationLabel(value: string | undefined): CaseClassification | null {
    const v = String(value ?? '').trim();
    if (v === 'جناية') return 'جناية';
    if (v === 'جنحة') return 'جنحة';
    if (v === 'مخالفة') return 'مخالفة';
    return null;
}

export function resolveCaseClassification(
    record: Pick<CriminalCase, 'case_classification' | 'basics' | 'caseStage'>,
): CaseClassification {
    const explicit = normalizeClassificationLabel(record.case_classification);
    if (explicit) return explicit;
    const fromCrimeType = normalizeClassificationLabel(record.basics?.crimeType);
    if (fromCrimeType) return fromCrimeType;
    if (record.caseStage === 'felony') return 'جناية';
    if (record.caseStage === 'misdemeanor') return 'جنحة';
    return 'جنحة';
}

function resolveAccusationArticle(record: CriminalCase): string {
    return String(
        record.currentAccusationArticle ?? record.referralArticle ?? record.basics?.legalArticle ?? '',
    ).trim();
}

function inferSummaryFromArticle(articleRaw: string): boolean {
    const num = extractArticleNumber(articleRaw);
    if (num === null) return false;
    return SUMMARY_ELIGIBLE_ARTICLE_NUMBERS.has(num);
}

function inferSummaryFromReferralText(text: string): boolean {
    const blob = String(text ?? '').trim();
    if (!blob) return false;
    if (NON_SUMMARY_REFERRAL_HINT.test(blob)) return false;
    return SUMMARY_REFERRAL_HINT.test(blob);
}

function collectReferralDecisionText(record: CriminalCase): string {
    const parts: string[] = [];
    if (record.finalDecision?.decisionType === 'referral') {
        parts.push(String(record.finalDecision.details ?? ''));
    }
    for (const ev of Array.isArray(record.timelineEvents) ? record.timelineEvents : []) {
        if (String(ev.category ?? '').includes('إحالة')) {
            parts.push(String(ev.description ?? ''));
            parts.push(String(ev.title ?? ''));
        }
    }
    return parts.join('\n');
}

export function resolveMisdemeanorType(
    record: CriminalCase,
    referralDecisionText?: string,
): MisdemeanorType | undefined {
    const classification = resolveCaseClassification(record);
    if (classification === 'مخالفة') return 'موجزة';
    if (classification === 'جناية') return 'غير موجزة';
    if (classification !== 'جنحة') return undefined;
    const stored = record.misdemeanor_type;
    if (stored === 'موجزة' || stored === 'غير موجزة') return stored;
    const referralBlob = String(referralDecisionText ?? collectReferralDecisionText(record)).trim();
    if (inferSummaryFromReferralText(referralBlob)) return 'موجزة';
    if (NON_SUMMARY_REFERRAL_HINT.test(referralBlob)) return 'غير موجزة';
    if (inferSummaryFromArticle(resolveAccusationArticle(record))) return 'موجزة';
    return 'غير موجزة';
}

export function isSummaryProcedurePath(context: CaseSovereignContext): boolean {
    if (context.case_classification === 'مخالفة') return true;
    if (context.case_classification === 'جناية') return false;
    return context.misdemeanor_type === 'موجزة';
}

export function resolveCaseSovereignContext(
    record: CriminalCase,
    referralDecisionText?: string,
): CaseSovereignContext {
    const case_classification = resolveCaseClassification(record);
    const misdemeanor_type = resolveMisdemeanorType(record, referralDecisionText);
    return {
        case_classification,
        misdemeanor_type,
        isSummaryProcedure: isSummaryProcedurePath({ case_classification, misdemeanor_type, isSummaryProcedure: false }),
    };
}

export function syncCaseSovereignContext(
    record: CriminalCase,
    referralDecisionText?: string,
): CriminalCase {
    const ctx = resolveCaseSovereignContext(record, referralDecisionText);
    return {
        ...record,
        case_classification: ctx.case_classification,
        misdemeanor_type: ctx.misdemeanor_type,
    };
}

export function caseClassificationLabel(classification: CaseClassification): string {
    return classification;
}

export function misdemeanorTypeLabel(type: MisdemeanorType | undefined): string {
    if (type === 'موجزة') return 'جنحة موجزة';
    if (type === 'غير موجزة') return 'جنحة غير موجزة';
    return '\u2014';
}


/** يثبّت تصنيف الإحالة الصريح قبل مزامنة السياق السيادي. */
export function applyReferralClassificationOverride(
    caseRecord: CriminalCase,
    targetStage: 'misdemeanor' | 'felony' | 'juvenile',
    misdemeanorType?: MisdemeanorType,
): CriminalCase {
    if (targetStage === 'felony') {
        return { ...caseRecord, case_classification: 'جناية', misdemeanor_type: 'غير موجزة' };
    }
    if (targetStage === 'misdemeanor' || targetStage === 'juvenile') {
        const mt = misdemeanorType ?? (targetStage === 'juvenile' ? 'غير موجزة' : undefined);
        if (!mt) return { ...caseRecord, case_classification: 'جنحة' };
        return { ...caseRecord, case_classification: 'جنحة', misdemeanor_type: mt };
    }
    return caseRecord;
}
