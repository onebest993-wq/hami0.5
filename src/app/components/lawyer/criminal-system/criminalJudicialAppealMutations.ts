import type {
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialDecision,
} from '@/app/types/criminal';
import type { CriminalCase } from './criminalCaseModel';
import type { RecordJudicialCassationResultPayload } from './cassationJudicialForm';
import { ensureStageJourneyOnCase } from './criminalStorePersistSupport';
import { resolveCaseStageFromRecord } from './criminalStageRuntimeCore';
import {
    coalesceJudicialDecisions,
    decisionAlreadyHasCassationAppeal,
    findJudicialDecisionByRef,
    findJudicialDecisionStoreIndex,
    hasJudicialAppealBeenFiledOnPath,
    mergeJudicialDecisionsFromRequests,
} from './judicialDecisionsEngine';
import { formatAppealResultLabelLite, resolveAppealResultCategoryLite } from './appealResultLabels';
import { buildCassationHistoricalBadgeLite } from './cassationResultSummary';
import { recordCassationResult } from './cassationEngine';
import {
    applyInvestigationPurgeAfterCassation,
    investigationPurgeDecisionAllowsCassationAppeal,
    resolvePurgeCassationRestoreDefendantIds,
    validateInvestigationPurgeCassationResult,
} from './investigationDefendantPurge';
import {
    isInvestigationMergeJudicialTemplate,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    isInvestigationStructuralCassationTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { applyProceduralCassationEffects, isProceduralCassationResult } from './proceduralCassationResults';
import {
    restoreComplaintCourtReferralOnQuash,
    shouldRestoreCourtAfterReferralQuash,
} from './complaintCourtReferralEngine';
import { revertSeveranceAfterCassationAnnulment } from './severanceCassationEngine';
import { revertCaseMergeAfterCassationAnnulment } from './caseMergeMigration';
import { persistSealedJudicialDecisionOnCase } from './criminalJudicialDecisionSeal';
import { createCriminalId as createId } from './criminalIdUtils';

type FileJudicialDecisionAppealPayload = {
    appellantType: JudicialAppellantType;
    appellantIds: string[];
    targetDefendantIds: string[];
    filedAt?: string;
    appellantManualLabel?: string;
    appealPath?: JudicialCassationAppealPath;
};

type DeclareJudicialDecisionFinalPayload = {
    declarerType: JudicialAppellantType;
    declarerIds: string[];
    declarerManualLabel?: string;
    declaredAt?: string;
};

type CasesById = Record<string, CriminalCase>;

function resolveJudicialDecisionsForCase(caseRecord: CriminalCase): JudicialDecision[] {
    return mergeJudicialDecisionsFromRequests(caseRecord.judicialDecisions, caseRecord.lawyerRequests);
}

export function fileJudicialDecisionAppealOnCase(
    target: CriminalCase,
    decisionId: string,
    payload: FileJudicialDecisionAppealPayload,
): { error: string | null; nextCase: CriminalCase | null } {
    const decisions = resolveJudicialDecisionsForCase(target);
    const did = String(decisionId ?? '').trim();
    const merged = findJudicialDecisionByRef(decisions, did);
    if (!merged) return { error: 'القرار غير موجود في السجل.', nextCase: null };

    const appealPath: JudicialCassationAppealPath = payload.appealPath ?? 'ordinary';
    if (appealPath === 'ordinary') {
        const purgeTemplate = normalizeProceduralRequestTemplate(
            merged.proceduralTemplate ?? merged.title,
        );
        if (isInvestigationPurgeDecisionTemplate(purgeTemplate)) {
            if (resolveCaseStageFromRecord(target) !== 'investigation') {
                return { error: 'الطعن التمييزي غير متاح خارج مرحلة التحقيق.', nextCase: null };
            }
            if (!investigationPurgeDecisionAllowsCassationAppeal(merged)) {
                return { error: 'هذا القرار لا يقبل طعناً تمييزياً.', nextCase: null };
            }
        }
        if (decisionAlreadyHasCassationAppeal(merged)) {
            return {
                error: 'تم تسجيل طعن تمييزي على هذا القرار مسبقاً — لا يجوز الطعن مرتين فيه.',
                nextCase: null,
            };
        }
    } else if (appealPath === 'intervention_264b') {
        if (hasJudicialAppealBeenFiledOnPath(merged, 'intervention_264b')) {
            return { error: 'تم تسجيل طلب التدخل التمييزي على هذا القرار مسبقاً.', nextCase: null };
        }
    } else if (appealPath === 'correction_266') {
        if (hasJudicialAppealBeenFiledOnPath(merged, 'correction_266')) {
            return { error: 'تم تسجيل طلب تصحيح القرار التمييزي مسبقاً.', nextCase: null };
        }
    }

    const appellantIds = (Array.isArray(payload.appellantIds) ? payload.appellantIds : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);
    const appellantManualLabel = String(payload.appellantManualLabel ?? '').trim();
    if (!appellantIds.length && !appellantManualLabel) {
        return {
            error: 'حدّد طرفاً واحداً على الأقل أو أدخل اسم من قام بالإجراء يدوياً.',
            nextCase: null,
        };
    }

    const filedAt = String(payload.filedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const targetDefendantIds = (
        Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : appellantIds
    )
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);

    const appeal = {
        id: createId(),
        appellantType: payload.appellantType,
        appellantIds,
        targetDefendantIds,
        cassationStatus: 'pending' as const,
        filedAt,
        appellantManualLabel: appellantManualLabel || undefined,
        appealPath,
    };
    const updated: JudicialDecision = {
        ...merged,
        appeals: [...(merged.appeals ?? []), appeal],
        isAppealed: true,
        interventionCassationPending:
            appealPath === 'intervention_264b' ? true : merged.interventionCassationPending,
        cassationCorrectionPending:
            appealPath === 'correction_266' ? true : merged.cassationCorrectionPending,
        cassationPapersReceivedAt:
            appealPath === 'correction_266' && !merged.cassationPapersReceivedAt
                ? filedAt
                : merged.cassationPapersReceivedAt,
    };

    const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
    const storeIdx = findJudicialDecisionStoreIndex(list, updated);
    const nextList =
        storeIdx >= 0
            ? list.map((decision, index) =>
                  index === storeIdx
                      ? { ...decision, ...updated, id: decision.id, appeals: updated.appeals }
                      : decision,
              )
            : [...list, updated];

    return {
        error: null,
        nextCase: {
            ...target,
            judicialDecisions: coalesceJudicialDecisions(nextList),
        },
    };
}

export function declareJudicialDecisionFinalOnCase(
    target: CriminalCase,
    decisionId: string,
    payload: DeclareJudicialDecisionFinalPayload,
): { error: string | null; nextCase: CriminalCase | null } {
    const mergedList = resolveJudicialDecisionsForCase(target);
    const hit = findJudicialDecisionByRef(mergedList, String(decisionId ?? '').trim());
    if (!hit) return { error: 'القرار غير موجود في السجل.', nextCase: null };
    if (hit.isJudgmentFinalDeclared === true) {
        return { error: 'تم إعلان الحكم باتاً مسبقاً على هذا القرار.', nextCase: null };
    }

    const declarerIds = (Array.isArray(payload.declarerIds) ? payload.declarerIds : [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);
    const declarerManualLabel = String(payload.declarerManualLabel ?? '').trim();
    if (!declarerIds.length && !declarerManualLabel) {
        return { error: 'حدّد من قام بإعلان الحكم باتاً.', nextCase: null };
    }

    const declaredAt = String(payload.declaredAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const patch: Partial<JudicialDecision> = {
        isJudgmentFinalDeclared: true,
        judgmentFinalDeclaredAt: declaredAt,
        judgmentFinalDeclaredByLabel: declarerManualLabel || undefined,
        judgmentFinalDeclaredByIds: declarerIds.length ? declarerIds : undefined,
    };

    const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
    const storeIdx = findJudicialDecisionStoreIndex(list, hit);
    const nextList =
        storeIdx >= 0
            ? list.map((decision, index) =>
                  index === storeIdx ? { ...decision, ...patch, id: decision.id } : decision,
              )
            : [...list, { ...hit, ...patch }];

    return {
        error: null,
        nextCase: {
            ...target,
            judicialDecisions: coalesceJudicialDecisions(nextList),
        },
    };
}

export function recordJudicialAppealResultOnCases(
    casesById: CasesById,
    caseId: string,
    decisionId: string,
    appealId: string,
    payload: RecordJudicialCassationResultPayload,
): { error: string | null; nextCasesById: CasesById | null } {
    const target = ensureStageJourneyOnCase(casesById[caseId] as CriminalCase);
    if (!target) return { error: 'الإضبارة غير موجودة.', nextCasesById: null };
    if (!payload.result) return { error: null, nextCasesById: casesById };

    const decisions = resolveJudicialDecisionsForCase(target);
    const did = String(decisionId ?? '').trim();
    const aid = String(appealId ?? '').trim();
    const beneficiaryIds =
        payload.result === 'affirmation'
            ? []
            : (Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : [])
                  .map((item) => String(item ?? '').trim())
                  .filter(Boolean);

    const decision = findJudicialDecisionByRef(decisions, did);
    if (!decision) return { error: 'القرار غير موجود في السجل.', nextCasesById: null };

    const purgeTemplate = normalizeProceduralRequestTemplate(
        decision.proceduralTemplate ?? decision.title,
    );
    const isClosurePurge = isInvestigationPurgeDecisionTemplate(purgeTemplate);
    const isStructuralCassation = isInvestigationStructuralCassationTemplate(purgeTemplate);
    const isSeveranceDecision = isInvestigationSeveranceJudicialTemplate(purgeTemplate);
    const isMergeDecision = isInvestigationMergeJudicialTemplate(purgeTemplate);
    const concludedAt = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const appealsList = Array.isArray(decision.appeals) ? decision.appeals : [];

    if (isProceduralCassationResult(payload.result)) {
        if (isStructuralCassation) {
            const validationErr = validateInvestigationPurgeCassationResult(payload.result);
            if (validationErr) return { error: validationErr, nextCasesById: null };
        }

        const appeals = appealsList.map((appeal) =>
            appeal.id === aid
                ? {
                      ...appeal,
                      result: payload.result,
                      beneficiaryIds: undefined,
                      cassationStatus: 'concluded' as const,
                      cassationDirectives: payload.cassationDirectives,
                      concludedAt,
                      filedAt: appeal.filedAt ?? concludedAt,
                  }
                : appeal,
        );
        if (!appeals.some((appeal) => appeal.id === aid)) {
            return { error: 'الطعن التمييزي غير موجود على هذا القرار.', nextCasesById: null };
        }

        const appealResultLabel = formatAppealResultLabelLite(String(payload.result ?? ''));
        const isUphold = resolveAppealResultCategoryLite(String(payload.result ?? '')) === 'upheld';
        const updatedDecision: JudicialDecision = {
            ...decision,
            appeals,
            isLocked: true,
            isAppealed: true,
            interventionCassationPending: false,
            cassationCorrectionPending: false,
            appealResult: appealResultLabel || undefined,
            cassationPapersReceivedAt: isUphold ? concludedAt : decision.cassationPapersReceivedAt,
        };
        const concludedAppeal = appeals.find((appeal) => appeal.id === aid)!;

        if (isStructuralCassation) {
            if (payload.result === 'procedural_annulment') {
                if (isSeveranceDecision) {
                    const revertOutcome = revertSeveranceAfterCassationAnnulment(
                        casesById,
                        caseId,
                        updatedDecision,
                    );
                    if (revertOutcome.error) {
                        return { error: revertOutcome.error, nextCasesById: null };
                    }
                    const sealedParent = persistSealedJudicialDecisionOnCase(
                        revertOutcome.casesById[caseId] ?? target,
                        updatedDecision,
                    );
                    return {
                        error: null,
                        nextCasesById: {
                            ...revertOutcome.casesById,
                            [caseId]: sealedParent,
                        },
                    };
                }

                if (isMergeDecision) {
                    const revertOutcome = revertCaseMergeAfterCassationAnnulment(
                        casesById,
                        caseId,
                        updatedDecision,
                    );
                    if (revertOutcome.error) {
                        return { error: revertOutcome.error, nextCasesById: null };
                    }
                    const sealedParent = persistSealedJudicialDecisionOnCase(
                        revertOutcome.casesById[caseId] ?? target,
                        updatedDecision,
                    );
                    return {
                        error: null,
                        nextCasesById: {
                            ...revertOutcome.casesById,
                            [caseId]: sealedParent,
                        },
                    };
                }

                if (isClosurePurge) {
                    const restoreIds = resolvePurgeCassationRestoreDefendantIds(
                        target,
                        updatedDecision,
                        concludedAppeal,
                    );
                    if (!restoreIds.length) {
                        return {
                            error: 'تعذّر تحديد المتهمين المُعادين — تحقق من نطاق القرار أو أهداف الطعن.',
                            nextCasesById: null,
                        };
                    }
                }
            }

            let nextCase = persistSealedJudicialDecisionOnCase(target, updatedDecision);
            if (isClosurePurge) {
                nextCase = applyInvestigationPurgeAfterCassation(nextCase, updatedDecision, concludedAppeal);
            }
            return {
                error: null,
                nextCasesById: {
                    ...casesById,
                    [caseId]: nextCase,
                },
            };
        }

        let nextCase: CriminalCase = { ...target };
        nextCase = applyProceduralCassationEffects(nextCase, decision, concludedAppeal, {
            result: payload.result,
            cassationDirectives: payload.cassationDirectives,
            date: concludedAt,
        });
        nextCase = persistSealedJudicialDecisionOnCase(nextCase, updatedDecision);
        nextCase = applyInvestigationPurgeAfterCassation(nextCase, updatedDecision, concludedAppeal);
        return {
            error: null,
            nextCasesById: {
                ...casesById,
                [caseId]: nextCase,
            },
        };
    }

    const appeals = appealsList.map((appeal) =>
        appeal.id === aid
            ? {
                  ...appeal,
                  result: payload.result,
                  beneficiaryIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                  cassationStatus: 'concluded' as const,
                  isObjectiveGrounds269b: payload.isObjectiveGrounds === true,
                  remandTargetStage: payload.remandTargetStage,
                  modifiedCharge: payload.modifiedCharge,
                  modifiedArticle: payload.modifiedArticle,
                  concludedAt,
                  filedAt: appeal.filedAt ?? concludedAt,
              }
            : appeal,
    );
    if (!appeals.some((appeal) => appeal.id === aid)) {
        return { error: 'الطعن التمييزي غير موجود على هذا القرار.', nextCasesById: null };
    }

    const appealResultLabel = formatAppealResultLabelLite(String(payload.result ?? ''));
    const isUphold = resolveAppealResultCategoryLite(String(payload.result ?? '')) === 'upheld';
    const updatedDecision: JudicialDecision = {
        ...decision,
        appeals,
        isLocked: true,
        isAppealed: true,
        interventionCassationPending: false,
        cassationCorrectionPending: false,
        appealResult: appealResultLabel || undefined,
        cassationPapersReceivedAt: isUphold ? concludedAt : decision.cassationPapersReceivedAt,
    };

    const partyLabel = (id: string) => {
        const defendant = (target.defendants ?? []).find((item) => item.id === id);
        if (defendant) return String(defendant.fullName ?? '').trim() || '—';
        const complainant = (target.complainants ?? []).find((item) => item.id === id);
        if (complainant) return String(complainant.fullName ?? '').trim() || '—';
        return '—';
    };

    const concludedAppeal = appeals.find((appeal) => appeal.id === aid)!;
    const badgeText = buildCassationHistoricalBadgeLite(
        concludedAppeal,
        partyLabel,
        decision.title,
    );
    const personalQuashTargets =
        (payload.result === 'quash_dismissal' ||
            payload.result === 'quash_remand' ||
            payload.result === 'quash_modify') &&
        !payload.isObjectiveGrounds;

    let nextCase: CriminalCase = { ...target };
    const virtualAppellants = (
        Array.isArray(concludedAppeal.appellantIds) ? concludedAppeal.appellantIds : []
    )
        .concat(
            Array.isArray(concludedAppeal.targetDefendantIds)
                ? concludedAppeal.targetDefendantIds
                : [],
        )
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);

    const engineOutcome = recordCassationResult(nextCase, {
        result: payload.result,
        date: concludedAt,
        details: badgeText ?? payload.details ?? '',
        isObjectiveGrounds: payload.isObjectiveGrounds === true,
        targetDefendantIds: personalQuashTargets
            ? beneficiaryIds.length
                ? beneficiaryIds
                : undefined
            : payload.targetDefendantIds,
        remandTargetStage: payload.remandTargetStage,
        modifiedCharge: payload.modifiedCharge,
        modifiedArticle: payload.modifiedArticle,
        virtualAppellantDefendantIds: [...new Set(virtualAppellants)],
        suppressTimelineAppend: true,
    });
    if (engineOutcome.error) {
        return { error: engineOutcome.error, nextCasesById: null };
    }

    nextCase = engineOutcome.caseRecord;
    nextCase = persistSealedJudicialDecisionOnCase(nextCase, updatedDecision);
    nextCase = applyInvestigationPurgeAfterCassation(nextCase, updatedDecision, concludedAppeal);

    if (shouldRestoreCourtAfterReferralQuash(updatedDecision, nextCase, payload.result)) {
        nextCase = restoreComplaintCourtReferralOnQuash(
            nextCase,
            String(updatedDecision.sourceRequestId ?? '').trim(),
        );
    }

    return {
        error: null,
        nextCasesById: {
            ...casesById,
            [caseId]: nextCase,
        },
    };
}
