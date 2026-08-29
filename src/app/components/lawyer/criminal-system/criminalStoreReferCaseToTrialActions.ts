/**
 * Merge, conclude, draft, severance commit/cancel — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';


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
import {
    CRIMINAL_MUTATION_DENIED_MSG,
    isCriminalCaseMutationBlocked,
} from './criminalCaseMutationGuard';


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

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

/** concludeStage + referCaseToTrial — extracted for ≤1000 budget. */
export function createCriminalReferCaseToTrialActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        referCaseToTrial: (caseId, referralData, newCourtData) => {
            set((state) => {
                const source = state.casesById[caseId];
                if (!source || isCriminalCaseMutationBlocked(source, state.sessionOwnerLawyerId)) return state;
                if (!isInvestigationStoredStage(String(source.basics.stage ?? '').trim())) return state;
                if (source.unknownDefendant && !hasIdentifiedDefendant(source.defendants)) return state;
                const date = String(referralData?.decisionDate ?? '').trim();
                const courtName = String(newCourtData?.courtName ?? '').trim();
                const caseNumber = String(newCourtData?.caseNumber ?? '').trim();
                if (
                    !referralPayloadValid({
                        courtName,
                        courtCaseNumber: caseNumber,
                        decisionDate: date,
                    })
                ) {
                    return state;
                }
                const storedStageStr = String(newCourtData.stage ?? '').trim();
                const referralTarget: InvestigationReferralTargetStage =
                    storedStageStr === JUVENILE_TRIAL_COURT_NAME
                        ? 'juvenile'
                        : caseStageFromStoredStage(storedStageStr) === 'felony'
                          ? 'felony'
                          : 'misdemeanor';
                const updated = patchInvestigationReferralCase(
                    ensureStageJourneyOnCase(source),
                    referralTarget,
                    courtName,
                    caseNumber,
                    date,
                    `تمت الإحالة بموجب ${String(referralData?.decisionNumber ?? '').trim() || 'قرار إحالة'} بتاريخ ${date}.`,
                    'bailed',
                    [],
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [source.id]: updated,
                    },
                };
            });
            return caseId;
        }
    };
}
