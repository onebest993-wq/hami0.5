/**
 * Merge, conclude, draft, severance commit/cancel — split from criminalStoreLifecycleActions.ts
 */

import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
} from '@/app/types/criminal';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';

import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';

import {
    caseStageFromStoredStage,
    isInvestigationStoredStage,
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    recordCassationResult,
    stageConclusionToCassationPayload,
} from './cassationEngine';
import {
    resolvePersonalStageTargets,
} from './criminalCaseGovernance';

import {
    applyInvestigationClosureFromStageConclusion,
} from './investigationDefendantPurge';
import {
    hasIdentifiedDefendant,
} from './criminalUnknownDefendant';
import {
    JUVENILE_TRIAL_COURT_NAME,
} from './juvenileInvestigationRules';
import type {
    InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';

import {
    buildInitialStageJourney,
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    proceduralActionFromConclusion,
} from './stageJourneyTransitionCore';
import {
    upsertVerdictCardFromConclusion,
} from './verdictCardsEngine';
import {
    buildProceduralRouteLawyerRequest,
    isProceduralStageRouteActionId,
} from './trialReferralOrdersEngine';

import {
    allDefendantsTerminal,
    applyCaseSplitFugitiveReferral,
    applyDefaultJudgmentArchive,
    applyDefaultJudgmentOpposition,
    applyPersonalStagesFromConclusion,
    applyPrejudicialPostponement,
    applyProceduralActionToCase,
    applyProceduralRouteTransition,
    normalizeReferralDefendantIds,
    patchInvestigationReferralCase,
    referralPayloadValid,
    stampProceduralNodeId,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';


/** concludeStage + referCaseToTrial — extracted for ≤1000 budget. */

export type ConcludeStageReferral = {
    courtName: string;
    caseNumber: string;
    stage: string;
    publicProsecutionNumber?: string;
    misdemeanorType?: string;
    defendantIds?: string[];
    defendantStatuses?: Record<string, string>;
};

/** Special / cassation / route. Returns handled state, or null to continue. */
export function tryConcludeStageEarly(
    state: CriminalStoreState,
    caseId: string,
    conclusion: StageConclusion,
    referral: ConcludeStageReferral | undefined,
    blocking: { error: string | null },
): CriminalStoreState | null {
    const target = state.casesById[caseId];
    if (!target) return state;
    if (target.isArchived || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
        blocking.error = target.isArchived
            ? 'الإضبارة مؤرشفة ولا يمكن إصدار قرار مرحلي عليها.'
            : 'الإضبارة مجمدة ولا يمكن إصدار قرار مرحلي عليها.';
        return state;
    }
    if (
        conclusion.decisionType === 'referral' &&
        target.unknownDefendant &&
        !hasIdentifiedDefendant(target.defendants)
    ) {
        return state;
    }

    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim();

    if (conclusion.decisionType === 'case_split_fugitive_referral' && referral) {
        const stageLabel = referral.stage;
        if (stageLabel !== 'محكمة الجنح' && stageLabel !== 'محكمة الجنايات') return state;
        const updated = applyCaseSplitFugitiveReferral(target, conclusion, {
            courtName: referral.courtName,
            caseNumber: referral.caseNumber,
            stage: stageLabel,
        });
        return { casesById: { ...state.casesById, [caseId]: updated } };
    }

    if (conclusion.decisionType === 'postpone_article_183') {
        const updated = applyPrejudicialPostponement(ensureStageJourneyOnCase(target), date, details);
        return {
            casesById: {
                ...state.casesById,
                [caseId]: { ...updated, finalDecision: conclusion },
            },
        };
    }

    if (conclusion.decisionType === 'default_judgment_issue') {
        const updated = applyDefaultJudgmentArchive(
            applyPersonalStagesFromConclusion(ensureStageJourneyOnCase(target), conclusion),
            conclusion,
        );
        return { casesById: { ...state.casesById, [caseId]: updated } };
    }

    if (conclusion.decisionType === 'default_judgment_opposition') {
        const updated = applyDefaultJudgmentOpposition(
            applyPersonalStagesFromConclusion(ensureStageJourneyOnCase(target), conclusion),
            conclusion,
        );
        return { casesById: { ...state.casesById, [caseId]: updated } };
    }

    if (conclusion.decisionType === 'temporary_release_insufficient_evidence') {
        const scoped: StageConclusion = {
            ...conclusion,
            decisionType: 'release',
        };
        let nextCase = applyPersonalStagesFromConclusion(
            { ...target, isFrozen: false, finalDecision: conclusion },
            scoped,
        );
        const nodes = ensureStageJourneyOnCase(nextCase).stageJourney ?? buildInitialStageJourney();
        const activeNodeId = resolveCurrentJourneyNodeId(nodes);
        const event = stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision',
                category: 'إفراج مؤقت',
                title: '🔒 إفراج مؤقت لعدم كفاية الأدلة',
                description: details,
                defendantIds: conclusion.defendantIds,
            },
            activeNodeId,
        );
        nextCase = {
            ...nextCase,
            stageJourney: nodes,
            timelineEvents: [
                ...(Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : []),
                event,
            ],
        };
        return { casesById: { ...state.casesById, [caseId]: nextCase } };
    }

    const cassationPayload = stageConclusionToCassationPayload(target, conclusion);
    if (cassationPayload) {
        const engineOutcome = recordCassationResult(ensureStageJourneyOnCase(target), cassationPayload);
        if (engineOutcome.error) {
            blocking.error = engineOutcome.error;
            return state;
        }
        let nextCase = engineOutcome.caseRecord;
        const archiveAll = allDefendantsTerminal(nextCase.defendants ?? []);
        if (
            conclusion.decisionType === 'cassation_confirm' ||
            conclusion.decisionType === 'cassation_quash_reduce' ||
            conclusion.decisionType === 'cassation_quash_acquit_release'
        ) {
            nextCase = { ...nextCase, isArchived: archiveAll || nextCase.isArchived };
        }
        return {
            casesById: {
                ...state.casesById,
                [caseId]: nextCase,
            },
        };
    }

    const routeActionId = proceduralActionFromConclusion(
        conclusion.decisionType,
        resolveCaseStageFromRecord(ensureStageJourneyOnCase(target)),
        target.basics.crimeType,
    );
    if (routeActionId) {
        const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
        const details = String(conclusion.details ?? '').trim();
        const courtNum =
            conclusion.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
            conclusion.decisionType === 'felony_to_misdemeanor_jurisdiction' ||
            conclusion.decisionType === 'cassation_quash_trial_misdemeanor' ||
            conclusion.decisionType === 'cassation_quash_trial_felony'
                ? String(referral?.caseNumber ?? target.courtCaseNumber ?? target.location.caseNumber ?? '').trim()
                : undefined;
        const courtName =
            conclusion.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
            conclusion.decisionType === 'felony_to_misdemeanor_jurisdiction'
                ? String(referral?.courtName ?? target.location.courtName ?? '').trim()
                : undefined;
        let sourceProceduralNodeId = '';
        let originStage: CaseStage = resolveCaseStageFromRecord(target);
        let updated: CriminalCase;
        if (isProceduralStageRouteActionId(routeActionId)) {
            const routed = applyProceduralRouteTransition(
                target,
                routeActionId,
                date,
                details,
                { courtCaseNumber: courtNum, courtName },
                conclusion.defendantIds,
                conclusion.defendantStatusAtDecision,
            );
            updated = routed.caseRecord;
            sourceProceduralNodeId = routed.sourceProceduralNodeId;
            originStage = routed.originStage;
        } else {
            updated = applyProceduralActionToCase(target, routeActionId, date, details, {
                courtCaseNumber: courtNum,
                courtName,
            });
        }
        updated = applyPersonalStagesFromConclusion(updated, conclusion);
        const routeReq = buildProceduralRouteLawyerRequest(
            updated,
            conclusion,
            routeActionId,
            sourceProceduralNodeId,
            originStage,
        );
        if (routeReq) {
            const priorReqs = Array.isArray(updated.lawyerRequests)
                ? updated.lawyerRequests
                : [];
            const nextReqs = [
                ...priorReqs.filter((r) => r.id !== routeReq.id),
                routeReq,
            ];
            updated = upsertJudicialDecisionOnCase(
                { ...updated, lawyerRequests: nextReqs },
                routeReq,
            );
        }
        const terminalCassation =
            conclusion.decisionType === 'cassation_confirm' ||
            conclusion.decisionType === 'cassation_quash_reduce' ||
            conclusion.decisionType === 'cassation_quash_acquit_release';
        const archiveAll =
            terminalCassation && allDefendantsTerminal(updated.defendants ?? []);
        return {
            casesById: {
                ...state.casesById,
                [caseId]: terminalCassation
                    ? {
                          ...updated,
                          finalDecision: conclusion,
                          isFrozen: true,
                          isArchived: archiveAll,
                      }
                    : updated,
            },
        };
    }

    return null;
}
