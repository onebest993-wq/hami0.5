// @ts-nocheck
import type { CassationAppealRemandTarget } from '@/app/types/criminal';
import { recordCassationResult, type RecordCassationResultPayload } from './cassationEngine';
import type { CrimeType, CriminalCase, CriminalCaseStage } from './criminalStore';
import { mapLegacyJuvenileCourtNameToAdultStage } from './criminalStageUtils';
import { resolveStageBeforeCassation } from './cassationEngine';
import type { VerdictCard, VerdictOrdinaryAppealTrack } from './verdictCardsEngine';
import { reopenTrialDossierAfterCassationRemand } from './trialSessionsEngine';

/** خيارات نتيجة التمييز على بطاقة الحكم الختامي (جنح/جنايات) — 6 خيارات حصراً. */
export const VERDICT_CASSATION_RESULT_OPTIONS = [
    { value: 'verdict_formal_dismissal', label: 'رد الطعن شكلاً' },
    { value: 'verdict_substantive_affirmation', label: 'تأييد القرار موضوعاً' },
    {
        value: 'verdict_quash_remand_retrial',
        label: 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة',
    },
    {
        value: 'verdict_quash_referral_jurisdiction',
        label: 'نقض القرار وإحالة الدعوى لمحكمة أخرى لعدم الاختصاص',
    },
    {
        value: 'verdict_quash_modify_mitigate',
        label: 'نقض القرار وتعديله موضوعياً (تخفيف العقوبة / الإفراج)',
    },
    {
        value: 'verdict_quash_modify_aggravate',
        label: 'نقض القرار وتعديله موضوعياً (تشديد العقوبة)',
    },
] as const;

export type VerdictCassationResultValue = (typeof VERDICT_CASSATION_RESULT_OPTIONS)[number]['value'];

/** مراحل الإحالة لعدم الاختصاص — تُمرَّر إلى updateCaseStage. */
export const VERDICT_REFERRAL_COURT_OPTIONS = [
    { value: 'محكمة الجنح', label: 'محكمة الجنح' },
    { value: 'محكمة الجنايات', label: 'محكمة الجنايات' },
    { value: 'محكمة الأحداث', label: 'محكمة الأحداث' },
    { value: 'محكمة التحقيق', label: 'محكمة التحقيق' },
] as const;

export type VerdictReferralCourtValue = (typeof VERDICT_REFERRAL_COURT_OPTIONS)[number]['value'];

export type VerdictCassationResultSaveInput = {
    result: VerdictCassationResultValue;
    resultRecordedAt: string;
    referredCourtLabel?: string;
    bindingDirections?: string;
    penaltyModificationText?: string;
};

const LEGACY_RESULT_MAP: Record<string, VerdictCassationResultValue> = {
    procedural_affirmation: 'verdict_substantive_affirmation',
    affirmation: 'verdict_substantive_affirmation',
    'تأييد القرار': 'verdict_substantive_affirmation',
    quash_remand: 'verdict_quash_remand_retrial',
    'نقض القرار وإعادته': 'verdict_quash_remand_retrial',
    'نقض وإعادة': 'verdict_quash_remand_retrial',
};

export function coerceLegacyVerdictCassationResult(raw: string | undefined): VerdictCassationResultValue | '' {
    const key = String(raw ?? '').trim();
    if (!key) return '';
    const known = VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === key);
    if (known) return known.value;
    return LEGACY_RESULT_MAP[key] ?? '';
}

export function verdictCassationResultLabel(resultRaw: string | undefined): string {
    const key = String(resultRaw ?? '').trim();
    if (!key) return '—';
    const match = VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === key);
    if (match) return match.label;
    const coerced = coerceLegacyVerdictCassationResult(key);
    if (coerced) {
        return VERDICT_CASSATION_RESULT_OPTIONS.find((o) => o.value === coerced)?.label ?? key;
    }
    if (key === 'تأييد القرار') return 'تأييد القرار';
    if (/نقض.*إعادة/i.test(key)) return 'نقض القرار وإعادة الأوراق لنفس المحكمة لإعادة المحاكمة';
    return key;
}

export function verdictCassationResultNeedsReferralCourt(result: VerdictCassationResultValue): boolean {
    return result === 'verdict_quash_referral_jurisdiction';
}

export function verdictCassationResultNeedsBindingDirections(result: VerdictCassationResultValue): boolean {
    return result === 'verdict_quash_remand_retrial';
}

export function verdictCassationResultNeedsPenaltyModification(result: VerdictCassationResultValue): boolean {
    return result === 'verdict_quash_modify_mitigate' || result === 'verdict_quash_modify_aggravate';
}

/** م 266 — نتائج تقبل طلب التصحيح (حكم موضوعي نهائي). */
export function isVerdictCassationCorrectionEligibleResult(raw: string): boolean {
    const key = coerceLegacyVerdictCassationResult(raw) || String(raw ?? '').trim();
    return (
        key === 'verdict_substantive_affirmation' ||
        key === 'verdict_quash_modify_mitigate' ||
        key === 'verdict_quash_modify_aggravate' ||
        key === 'quash_modify'
    );
}

/** م 267 — حجب مطلق لزر التصحيح. */
export function isVerdictCassationCorrectionBlockedResult(raw: string): boolean {
    const key = coerceLegacyVerdictCassationResult(raw) || String(raw ?? '').trim();
    if (key === 'verdict_formal_dismissal') return true;
    if (key === 'verdict_quash_remand_retrial') return true;
    if (key === 'verdict_quash_referral_jurisdiction') return true;
    if (key === 'quash_remand') return true;
    if (/نقض\s*و\s*إعادة/i.test(String(raw ?? ''))) return true;
    return false;
}

export function resolveReferralLabelToCaseStage(
    label: string,
    crimeType?: CrimeType | '',
): CriminalCaseStage | null {
    const raw = String(label ?? '').trim();
    if (!raw) return null;
    if (raw === 'محكمة التحقيق') return 'مرحلة التحقيق';
    if (raw === 'محكمة الجنح') return 'محكمة الجنح';
    if (raw === 'محكمة الجنايات') return 'محكمة الجنايات';
    if (raw === 'محكمة الأحداث') {
        return mapLegacyJuvenileCourtNameToAdultStage('محكمة الأحداث', crimeType);
    }
    return null;
}

export function validateVerdictCassationResultSave(
    input: Partial<VerdictCassationResultSaveInput>,
): string | null {
    const result = input.result;
    if (!result) return 'اختر النتيجة التمييزية.';
    const date = String(input.resultRecordedAt ?? '').trim();
    if (!date) return 'تاريخ صدور القرار التمييزي مطلوب.';
    if (verdictCassationResultNeedsReferralCourt(result)) {
        if (!resolveReferralLabelToCaseStage(String(input.referredCourtLabel ?? '').trim())) {
            return 'اختر المحكمة المحال إليها.';
        }
    }
    if (verdictCassationResultNeedsBindingDirections(result)) {
        if (!String(input.bindingDirections ?? '').trim()) {
            return 'أدخل توجيهات محكمة التمييز الملزمة.';
        }
    }
    if (verdictCassationResultNeedsPenaltyModification(result)) {
        if (!String(input.penaltyModificationText ?? '').trim()) {
            return 'أدخل منطوق تعديل العقوبة أو توجيهات المحكمة.';
        }
    }
    return null;
}

export function buildVerdictOrdinaryAppealPatch(
    input: VerdictCassationResultSaveInput,
    current?: VerdictOrdinaryAppealTrack,
): VerdictOrdinaryAppealTrack {
    const patch: Partial<VerdictOrdinaryAppealTrack> = {
        result: input.result,
        resultRecordedAt: input.resultRecordedAt.trim(),
    };
    if (verdictCassationResultNeedsReferralCourt(input.result)) {
        patch.referredCourtStage = String(input.referredCourtLabel ?? '').trim() || undefined;
    }
    if (verdictCassationResultNeedsBindingDirections(input.result)) {
        patch.bindingDirections = String(input.bindingDirections ?? '').trim() || undefined;
    }
    if (verdictCassationResultNeedsPenaltyModification(input.result)) {
        patch.penaltyModificationText = String(input.penaltyModificationText ?? '').trim() || undefined;
    }
    return { ...(current ?? {}), ...patch };
}

/** محكمة الموضوع قبل التمييز — لا يعتمد على caseStage المتقادم. */
function remandTargetForSameCourtRetrial(caseRecord: CriminalCase): CassationAppealRemandTarget {
    const stageBefore = resolveStageBeforeCassation(caseRecord);
    if (stageBefore === 'felony') return 'felony';
    if (stageBefore === 'misdemeanor') return 'misdemeanor';
    return 'investigation';
}

function buildCassationPayloadForVerdictResult(
    caseRecord: CriminalCase,
    card: VerdictCard,
    input: VerdictCassationResultSaveInput,
): RecordCassationResultPayload | null {
    const date = input.resultRecordedAt.trim();
    const defendantIds = card.defendantIds?.length ? card.defendantIds : undefined;

    if (input.result === 'verdict_substantive_affirmation') {
        return {
            result: 'affirmation',
            date,
            details: 'تأييد القرار موضوعاً — بطاقة الحكم الختامي.',
            isObjectiveGrounds: true,
            targetDefendantIds: defendantIds,
            virtualAppellantDefendantIds: defendantIds,
            timelineOverlay: {
                category: 'نتيجة تمييزية — حكم ختامي',
                title: 'تأييد القرار موضوعاً',
            },
        };
    }

    if (input.result === 'verdict_quash_remand_retrial') {
        return {
            result: 'quash_remand',
            date,
            details: String(input.bindingDirections ?? '').trim(),
            isObjectiveGrounds: true,
            remandTargetStage: remandTargetForSameCourtRetrial(caseRecord),
            targetDefendantIds: defendantIds,
            virtualAppellantDefendantIds: defendantIds,
            sameCourtRetrialRemand: true,
            timelineOverlay: {
                category: 'نتيجة تمييزية — حكم ختامي',
                title: 'نقض وإعادة للمحاكمة',
            },
        };
    }

    if (
        input.result === 'verdict_quash_modify_mitigate' ||
        input.result === 'verdict_quash_modify_aggravate'
    ) {
        const details = String(input.penaltyModificationText ?? '').trim();
        return {
            result: 'quash_modify',
            date,
            details,
            isObjectiveGrounds: true,
            targetDefendantIds: defendantIds,
            virtualAppellantDefendantIds: defendantIds,
            modifiedCharge: details,
            timelineOverlay: {
                category: 'نتيجة تمييزية — حكم ختامي',
                title:
                    input.result === 'verdict_quash_modify_mitigate'
                        ? 'نقض وتعديل موضوعي — تخفيف'
                        : 'نقض وتعديل موضوعي — تشديد',
            },
        };
    }

    return null;
}

export type ApplyVerdictCassationResultOutcome = {
    caseRecord: CriminalCase;
    referralStage?: CriminalCaseStage;
    error?: string;
};

/** أثر تسجيل قرار التمييز على الإضبارة — يُعاد استخدام recordCassationResult وupdateCaseStage. */
export function applyVerdictCassationResultEffects(
    caseRecord: CriminalCase,
    card: VerdictCard,
    input: VerdictCassationResultSaveInput,
    crimeType?: CrimeType | '',
): ApplyVerdictCassationResultOutcome {
    const validationErr = validateVerdictCassationResultSave(input);
    if (validationErr) return { caseRecord, error: validationErr };

    if (input.result === 'verdict_formal_dismissal') {
        const date = input.resultRecordedAt.trim();
        const events = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
        return {
            caseRecord: {
                ...caseRecord,
                isSentToCassation: false,
                timelineEvents: [
                    ...events,
                    {
                        id: `evt_${Date.now()}`,
                        date,
                        category: 'نتيجة تمييزية — حكم ختامي',
                        title: 'رد الطعن شكلاً',
                        description: 'رد الطعن التمييزي شكلاً — تثبيت الحكم المطعون فيه.',
                    },
                ],
            },
        };
    }

    if (input.result === 'verdict_quash_referral_jurisdiction') {
        const stage = resolveReferralLabelToCaseStage(String(input.referredCourtLabel ?? '').trim(), crimeType);
        if (!stage) return { caseRecord, error: 'المحكمة المحال إليها غير صالحة.' };
        const date = input.resultRecordedAt.trim();
        const events = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
        return {
            caseRecord: {
                ...caseRecord,
                isArchived: false,
                isFrozen: false,
                isInvestigationLocked: false,
                isSentToCassation: false,
                finalDecision: undefined,
                timelineEvents: [
                    ...events,
                    {
                        id: `evt_${Date.now()}`,
                        date,
                        category: 'نتيجة تمييزية — حكم ختامي',
                        title: 'نقض وإحالة لعدم الاختصاص',
                        description: `إحالة الدعوى إلى ${String(input.referredCourtLabel ?? '').trim()}.`,
                    },
                ],
            },
            referralStage: stage,
        };
    }

    const payload = buildCassationPayloadForVerdictResult(caseRecord, card, input);
    if (!payload) return { caseRecord, error: 'نتيجة غير مدعومة.' };

    const outcome = recordCassationResult(caseRecord, payload);
    if (outcome.error) return { caseRecord, error: outcome.error };

    let next = outcome.caseRecord;

    if (input.result === 'verdict_quash_remand_retrial') {
        next = {
            ...next,
            trials: reopenTrialDossierAfterCassationRemand(next.trials),
        };
    }

    if (
        input.result === 'verdict_quash_modify_mitigate' ||
        input.result === 'verdict_quash_modify_aggravate'
    ) {
        const modText = String(input.penaltyModificationText ?? '').trim();
        const cards = (Array.isArray(next.verdictCards) ? next.verdictCards : []).map((c) =>
            c.id === card.id
                ? {
                      ...c,
                      decisionDraft: modText || c.decisionDraft,
                  }
                : c,
        );
        next = { ...next, verdictCards: cards };
    }

    return { caseRecord: next };
}
