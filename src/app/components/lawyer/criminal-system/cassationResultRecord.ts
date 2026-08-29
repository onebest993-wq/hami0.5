import type {
    CassationAppealResult,
    CassationOutcome,
    CassationProceeding,
    CassationType,
} from '@/app/types/criminal';
import { CASSATION_APPEAL_RESULT_TO_OUTCOME, type DispositiveCassationAppealResult } from '@/app/types/criminal';
import { isDispositiveCassationResult } from './proceduralCassationResults';
import type { CriminalCase } from './criminalCaseModel';
import type { DefendantPersonalStage } from '@/app/types/criminal';
import { personalStageForDecision } from './partyPersonalStage';
import {
    resolveStageBeforeCassation,
    type RecordCassationResultPayload,
} from './cassationFilingMeta';
import { migrateLegacyCassationToProceeding } from './cassationFilingApply';
import {
    applyPersonalStagesToDefendants,
    buildCassationTimelineEvent,
    createId,
    mergeCassationTimelineEvents,
} from './cassationMutationShared';
import {
    applyAffirmationLocks,
    applyQuashRemandJourney,
    resolveRemandCaseStage,
} from './cassationRemandJourneyApply';

export type RecordCassationResultOutcome = {
    caseRecord: CriminalCase;
    error?: string;
};

const EMPTY_BENEFICIARY_GUARD_ERROR =
    'يجب تحديد المستفيدين من النقض/الاستدراك صراحةً (أسباب شخصية — م 269/ب). تم منع تعديل مصائر جميع المتهمين بالخطأ.';

const EMPTY_VIRTUAL_APPELLANT_ERROR =
    'يجب تحديد متهم واحد على الأقل كطاعن/مرجع للطعن التمييزي (أسباب شخصية — لا يُقبل تعميم الطعن على جميع المتهمين تلقائياً).';

function resolveExplicitPartyIds(payload: RecordCassationResultPayload): string[] {
    const ids = (
        Array.isArray(payload.virtualAppellantDefendantIds) ? payload.virtualAppellantDefendantIds : []
    )
        .concat(Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    return [...new Set(ids)];
}

function requiresExplicitVirtualAppellants(payload: RecordCassationResultPayload): boolean {
    if (payload.isObjectiveGrounds === true) return false;
    return (
        payload.result === 'affirmation' ||
        payload.result === 'quash_modify' ||
        payload.result === 'quash_dismissal' ||
        payload.result === 'quash_remand'
    );
}

/** يمنع proceeding افتراضياً يشمل كل المتهمين طاعنين عند أسباب شخصية. */
function guardVirtualProceedingAppellants(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): string | null {
    const existing =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    if (existing) return null;
    if (!requiresExplicitVirtualAppellants(payload)) return null;
    if (resolveExplicitPartyIds(payload).length === 0) {
        return EMPTY_VIRTUAL_APPELLANT_ERROR;
    }
    return null;
}

function resolveVirtualCassationType(caseRecord: CriminalCase, override?: CassationType): CassationType {
    if (override) return override;
    const stage = resolveStageBeforeCassation(caseRecord);
    if (stage === 'investigation') return 'investigation_judge_appeal';
    if (stage === 'felony') return 'federal_cassation_felony';
    return 'criminal_cassation_misdemeanor';
}

/** إنشاء أو استعادة سجل الطعن النشط — لا يُرجع أبداً undefined. */
function resolveOrCreateCassationProceeding(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): CassationProceeding {
    const existing =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    if (existing) return existing;

    const explicitAppellants = resolveExplicitPartyIds(payload);
    const fallbackAppellants = requiresExplicitVirtualAppellants(payload)
        ? explicitAppellants
        : explicitAppellants.length
          ? explicitAppellants
          : (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
    const filedAt = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);

    return {
        id: createId(),
        cassationType: resolveVirtualCassationType(caseRecord, payload.virtualCassationType),
        status: 'pending',
        filedAt,
        cassationNumber: 'سجل قضائي',
        appellantDefendantIds: fallbackAppellants,
        stageBeforeCassation: resolveStageBeforeCassation(caseRecord),
    };
}

function guardPersonalQuashBeneficiaries(
    result: CassationAppealResult,
    shared269b: boolean,
    explicitTargetDefendantIds?: string[],
): string | null {
    if (shared269b) return null;
    if (result !== 'quash_dismissal' && result !== 'quash_remand' && result !== 'quash_modify') {
        return null;
    }
    const explicit = (Array.isArray(explicitTargetDefendantIds) ? explicitTargetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (explicit.length === 0) {
        return EMPTY_BENEFICIARY_GUARD_ERROR;
    }
    return null;
}

export function resolvePersonalBeneficiaryIds(
    caseRecord: CriminalCase,
    shared269b: boolean,
    explicitTargetDefendantIds?: string[],
): string[] {
    if (shared269b) {
        return (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
    }
    return (Array.isArray(explicitTargetDefendantIds) ? explicitTargetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

/** معالجة مخرجات الاستدراك التمييزي — واجهة المرحلة 2. */
export function recordCassationResult(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): RecordCassationResultOutcome {
    const virtualGuard = guardVirtualProceedingAppellants(caseRecord, payload);
    if (virtualGuard) {
        return { caseRecord, error: virtualGuard };
    }

    const proceeding = resolveOrCreateCassationProceeding(caseRecord, payload);

    const date = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(payload.details ?? '').trim();
    const shared269b = payload.isObjectiveGrounds === true;
    const guardError = guardPersonalQuashBeneficiaries(
        payload.result,
        shared269b,
        payload.targetDefendantIds,
    );
    const beneficiaryIds = resolvePersonalBeneficiaryIds(
        caseRecord,
        shared269b,
        payload.targetDefendantIds,
    );
    if (guardError) {
        return { caseRecord, error: guardError };
    }

    if (!isDispositiveCassationResult(payload.result)) {
        return { caseRecord, error: 'نتيجة غير مدعومة في مسار الحسم الختامي للتمييز.' };
    }
    const outcome: CassationOutcome = CASSATION_APPEAL_RESULT_TO_OUTCOME[payload.result as DispositiveCassationAppealResult];
    const concludedProceeding: CassationProceeding = {
        ...proceeding,
        status: 'concluded',
        outcome,
        sharedObjectiveGrounds269b: shared269b,
        concludedAt: date,
        conclusionDetails: details,
    };

    let next: CriminalCase = {
        ...caseRecord,
        cassationProceeding: concludedProceeding,
        isSentToCassation: proceeding.cassationType === 'federal_cassation_felony' || proceeding.cassationType === 'criminal_cassation_misdemeanor',
    };

    if (payload.result === 'affirmation') {
        next = applyAffirmationLocks(next, date);
        return {
            caseRecord: {
            ...next,
            isArchived: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_confirm',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'تصديق تمييزي',
                        title: 'تصديق الحكم — إغلاق الطعن',
                        description: details || 'تصديق الحكم التمييزي وتثبيت أقفال المرحلة السابقة.',
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
            },
        };
    }

    if (payload.result === 'quash_modify') {
        const article = String(payload.modifiedArticle ?? '').trim();
        const charge = String(payload.modifiedCharge ?? '').trim();
        const summary = [charge, article, details].filter(Boolean).join(' • ');
        if (shared269b) {
            if (article) {
                next = {
                    ...next,
                    basics: { ...next.basics, legalArticle: article },
                    legalArticleHistory: [
                        ...(Array.isArray(next.legalArticleHistory) ? next.legalArticleHistory : []),
                        {
                            id: createId(),
                            article,
                            changedAtDate: date,
                            changedBy: 'trial_court',
                        },
                    ],
                };
            }
        } else {
            next = applyPersonalStagesToDefendants(next, beneficiaryIds, 'convicted');
        }
        return {
            caseRecord: {
            ...next,
            isFrozen: true,
            isInvestigationLocked: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_reduce',
                date,
                details: summary || details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'نقض تمييزي — تعديل',
                        title: 'نقض وتعديل الوصف/المادة',
                        description: summary || details,
                        defendantIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
            },
        };
    }

    if (payload.result === 'quash_dismissal') {
        next = applyPersonalStagesToDefendants(next, beneficiaryIds, 'acquitted', {
            status: 'حر',
            isPartyRecordLocked: true,
        });
        next = {
            ...next,
            defendants: (next.defendants ?? []).map((d) => {
                if (!beneficiaryIds.includes(d.id)) return d;
                return {
                    ...d,
                    status: 'حر' as const,
                    personalStage: 'acquitted' as DefendantPersonalStage,
                    isPartyRecordLocked: true,
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                };
            }),
            isFrozen: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_acquit_release',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'نقض تمييزي — إفراج نهائي',
                        title: 'نقض واستدراك — براءة نهائية',
                        description: details,
                        defendantIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
        };
        const allTerminal = (next.defendants ?? []).every(
            (d) => d.personalStage === 'acquitted' || d.personalStage === 'lawsuit_dropped_death',
        );
        return { caseRecord: { ...next, isArchived: allTerminal } };
    }

    if (payload.result === 'quash_remand') {
        const ps = personalStageForDecision(
            proceeding.cassationType === 'investigation_judge_appeal'
                ? 'cassation_quash_investigation'
                : resolveRemandCaseStage(proceeding, payload.remandTargetStage) === 'felony'
                  ? 'cassation_quash_trial_felony'
                  : resolveRemandCaseStage(proceeding, payload.remandTargetStage) === 'investigation'
                    ? 'cassation_quash_investigation'
                    : 'cassation_quash_trial_misdemeanor',
        );
        if (ps) {
            next = applyPersonalStagesToDefendants(next, beneficiaryIds, ps);
        }
        next = {
            ...next,
            cassationProceeding: concludedProceeding,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_remand',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
        };
        return {
            caseRecord: applyQuashRemandJourney(next, date, details, proceeding, {
                isObjectiveGrounds: shared269b,
                beneficiaryIds,
                remandTargetStage: payload.remandTargetStage,
                timelineOverlay: payload.timelineOverlay,
                suppressTimelineAppend: payload.suppressTimelineAppend,
                sameCourtRetrialRemand: payload.sameCourtRetrialRemand === true,
            }),
        };
    }

    return { caseRecord: next };
}
