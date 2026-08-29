/**
 * Pure case transforms for CriminalCase — unified procedural-route engine
 * (referral/return/cassation/confirmation transitions) and the legacy
 * per-action dispatcher built on top of it. None of these touch the Zustand
 * store directly.
 */
import {
    ensureStageJourneyOnCase,
    resolveInvestigationCaseNumberSnapshot,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
    ProceduralTransitionActionId,
} from '@/app/types/criminal';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    StageConclusion,
} from './criminalCaseModel';
import {
    resolveCaseStageFromRecord,
    shouldUseJuvenileTrialJourneyLabels,
    syncStoredStageFromJourneyCaseStage,
} from './criminalStageRuntimeCore';
import {
    buildInitialStageJourney,
    forkStageJourneyFromCurrent,
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    findTransitionOption,
    journeyNodeLabel,
    resolveJourneyTransitionMeta,
} from './stageJourneyTransitionCore';
import {
    formatProceduralRouteDescription,
    isProceduralStageRouteActionId,
    proceduralRouteTimelineCategory,
} from './trialReferralOrdersEngine';
import type {
    ProceduralStageRouteActionId,
} from './trialReferralOrdersEngine';
import {
    personalStageForDecision,
} from './partyPersonalStageCore';
import {
    stampProceduralNodeId,
    mapDecisionStatusToDefendantStatus,
    normalizeReferralDefendantIds,
} from './caseTransformShared';
import {
    applyPersonalStagesToDefendants,
} from './caseTransformPersonalStage';
import {
    applyStageJourneyTransition,
} from './caseTransformJourneyLifecycle';
import {
    patchInvestigationReferralCase,
} from './caseTransformInvestigationReferral';

function stageCourtNumberForJourney(caseRecord: CriminalCase, stage: CaseStage): string {
    if (stage === 'investigation') {
        const inv = String(caseRecord.investigationCaseNumber ?? caseRecord.location.investigationDossierNumber ?? '').trim();
        return inv;
    }
    return String(caseRecord.courtCaseNumber ?? caseRecord.location.caseNumber ?? '').trim();
}

function partialRouteBranchLabel(
    stage: CaseStage,
    role: 'remain' | 'routed',
    juvenileTrialDisplay = false,
): string {
    if (stage === 'investigation') return role === 'remain' ? 'تحقيق — مستمر' : 'تحقيق — محالون';
    if (stage === 'felony') return role === 'remain' ? 'جنايات — مستمر' : 'جنايات — محالون';
    if (stage === 'misdemeanor') {
        if (juvenileTrialDisplay) {
            return role === 'remain' ? 'أحداث — مستمر' : 'أحداث — محالون';
        }
        return role === 'remain' ? 'جنح — مستمر' : 'جنح — محالون';
    }
    if (stage === 'cassation') return role === 'remain' ? 'تمييز — مستمر' : 'تمييز — محالون';
    return role === 'remain' ? 'مسار — مستمر' : 'مسار — محالون';
}

function unlockInvestigationOnCase(caseRecord: CriminalCase, prior: CriminalCase): CriminalCase {
    const invNum = resolveInvestigationCaseNumberSnapshot(prior);
    return {
        ...caseRecord,
        investigationCaseNumber: invNum !== '—' ? invNum : caseRecord.investigationCaseNumber,
        isInvestigationLocked: false,
    };
}

/**
 * محرّك موحّد لكل تحوّلات المسار (إحالة/إرجاع/تمييز/نقض/تصديق):
 * استقلالية العقدة المصدر، تفرع جزئي، وأرشفة المرحلة السابقة — كإحالة التحقيق.
 */
export function applyProceduralRouteTransition(
    target: CriminalCase,
    actionId: ProceduralStageRouteActionId,
    transitionDate: string,
    notes: string,
    court?: { courtName?: string; courtCaseNumber?: string },
    defendantIds?: string[],
    defendantStatusAtDecision?: StageConclusion['defendantStatusAtDecision'],
): { caseRecord: CriminalCase; sourceProceduralNodeId: string; originStage: CaseStage } {
    const current = ensureStageJourneyOnCase(target);
    const originStage = resolveCaseStageFromRecord(current);
    const option = findTransitionOption(originStage, actionId);
    if (!option) {
        return { caseRecord: current, sourceProceduralNodeId: '', originStage };
    }

    const date = String(transitionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtNum = String(court?.courtCaseNumber ?? '').trim();
    const courtName = String(court?.courtName ?? '').trim();
    const courtLabel =
        option.targetStage === 'felony'
            ? 'محكمة الجنايات'
            : option.targetStage === 'misdemeanor'
              ? 'محكمة الجنح'
              : option.targetStage === 'cassation'
                ? 'محكمة التمييز'
                : 'مرحلة التحقيق';
    const description = formatProceduralRouteDescription(actionId, {
        details: String(notes ?? '').trim(),
        courtName,
        courtCaseNumber: courtNum,
        courtLabel,
        fallbackTitle: option.menuLabel,
    });
    const meta = resolveJourneyTransitionMeta(actionId, option);
    const sourceProceduralNodeId = resolveCurrentJourneyNodeId(current.stageJourney);
    const timelineCategory = proceduralRouteTimelineCategory(actionId);
    const { scopedIds, remainingIds, isPartialReferral } = normalizeReferralDefendantIds(
        current,
        defendantIds ?? [],
    );
    const effectiveScoped = scopedIds.length
        ? scopedIds
        : normalizeReferralDefendantIds(current, []).allDefIds;

    const stampRouteEvent = (nodeId: string, ids?: string[]) =>
        stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision' as const,
                category: timelineCategory,
                title: option.menuLabel,
                description,
                defendantIds: ids?.length ? ids : undefined,
            },
            nodeId,
        );

    if (isPartialReferral) {
        const defs = Array.isArray(current.defendants) ? current.defendants : [];
        const routedJuvenile = shouldUseJuvenileTrialJourneyLabels(defs, {
            defendantIds: scopedIds,
            storedStage: current.basics?.stage,
        });
        const remainJuvenile = shouldUseJuvenileTrialJourneyLabels(defs, {
            defendantIds: remainingIds,
            storedStage: current.basics?.stage,
        });
        const remainStage = originStage;
        const remainLabel = journeyNodeLabel(remainStage, stageCourtNumberForJourney(current, remainStage), {
            juvenileTrialDisplay:
                remainJuvenile && (remainStage === 'misdemeanor' || remainStage === 'felony'),
        });
        const routedLabel =
            option.targetStage === 'investigation'
                ? actionId === 'cassation_quash_investigation'
                    ? 'مرحلة التحقيق (نقض تمييزي)'
                    : 'مرحلة التحقيق (إعادة لوجود نقص)'
                : journeyNodeLabel(option.targetStage, courtNum, { juvenileTrialDisplay: routedJuvenile });

        const nodes = forkStageJourneyFromCurrent(current.stageJourney ?? buildInitialStageJourney(), {
            startedAt: date,
            transitionText: meta.transitionText,
            branches: [
                {
                    branchId: 'partial-route-remain',
                    branchLabel: partialRouteBranchLabel(remainStage, 'remain', remainJuvenile),
                    stage: remainStage,
                    label: remainLabel,
                    defendantIds: remainingIds,
                    transitionKind: 'parallel_fork',
                },
                {
                    branchId: 'partial-route-target',
                    branchLabel: partialRouteBranchLabel(option.targetStage, 'routed', routedJuvenile),
                    stage: option.targetStage,
                    label: routedLabel,
                    defendantIds: scopedIds,
                    transitionKind: meta.transitionKind,
                },
            ],
        });

        const remainNodeId =
            nodes.find((n) => n.branchId === 'partial-route-remain' && n.status === 'current')?.id ?? '';

        let next: CriminalCase = {
            ...current,
            caseStage: remainStage,
            basics: { ...current.basics, stage: syncStoredStageFromJourneyCaseStage(remainStage, current.basics?.stage) },
            stageJourney: nodes,
            finalDecision: undefined,
            isFrozen: false,
            timelineEvents: [
                ...(Array.isArray(current.timelineEvents) ? current.timelineEvents : []),
                stampRouteEvent(sourceProceduralNodeId, scopedIds),
                stampRouteEvent(remainNodeId, remainingIds),
            ],
        };

        if (option.targetStage === 'investigation' || actionId === 'cassation_quash_investigation') {
            next = unlockInvestigationOnCase(next, current);
        }
        if (actionId === 'cassation_confirm') {
            next = { ...next, isFrozen: true };
        }
        if (effectiveScoped.length && defendantStatusAtDecision) {
            const ps = personalStageForDecision(actionId, undefined);
            if (ps) {
                next = applyPersonalStagesToDefendants(next, effectiveScoped, ps, {
                    status: mapDecisionStatusToDefendantStatus(defendantStatusAtDecision),
                });
            }
        }
        return { caseRecord: next, sourceProceduralNodeId, originStage };
    }

    const { caseRecord } = applyStageJourneyTransition(current, {
        targetStage: option.targetStage,
        storedStageOverride:
            option.targetStage === 'investigation'
                ? syncStoredStageFromJourneyCaseStage('investigation', current.basics?.stage)
                : option.targetStage === 'misdemeanor'
                  ? syncStoredStageFromJourneyCaseStage('misdemeanor', current.basics?.stage)
                  : option.targetStage === 'felony'
                    ? 'محكمة الجنايات'
                    : undefined,
        transitionText: meta.transitionText,
        transitionKind: meta.transitionKind,
        startedAt: date,
        courtCaseNumber: courtNum || undefined,
        courtName: courtName || undefined,
    });

    let nextCase: CriminalCase = {
        ...caseRecord,
        finalDecision: undefined,
        isFrozen: actionId === 'cassation_confirm',
        timelineEvents: [
            ...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []),
            stampRouteEvent(sourceProceduralNodeId, effectiveScoped.length ? effectiveScoped : undefined),
        ],
    };

    if (
        actionId === 'return_investigation_deficiency' ||
        actionId === 'cassation_quash_investigation'
    ) {
        nextCase = unlockInvestigationOnCase(nextCase, current);
    }

    return { caseRecord: nextCase, sourceProceduralNodeId, originStage };
}

export function applyProceduralActionToCase(
    target: CriminalCase,
    actionId: ProceduralTransitionActionId,
    transitionDate: string,
    notes: string,
    court?: { courtName?: string; courtCaseNumber?: string },
): CriminalCase {
    const current = ensureStageJourneyOnCase(target);
    const currentStage = resolveCaseStageFromRecord(current);
    const option = findTransitionOption(currentStage, actionId);
    if (!option) return current;

    const date = String(transitionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const detailText = String(notes ?? '').trim() || option.menuLabel;

    if (actionId === 'refer_misdemeanor' || actionId === 'refer_felony') {
        return patchInvestigationReferralCase(
            current,
            actionId === 'refer_felony' ? 'felony' : 'misdemeanor',
            String(court?.courtName ?? '').trim() ||
                (actionId === 'refer_felony' ? 'محكمة الجنايات' : 'محكمة الجنح'),
            String(court?.courtCaseNumber ?? '').trim(),
            date,
            detailText,
            'bailed',
            [],
        );
    }

    if (isProceduralStageRouteActionId(actionId)) {
        return applyProceduralRouteTransition(
            current,
            actionId,
            date,
            detailText,
            court,
            [],
            undefined,
        ).caseRecord;
    }

    return current;
}
