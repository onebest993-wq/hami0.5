/**
 * Display helpers, death, cassation, referral, identity corrections, stage — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import type {
    CassationType,
    DefendantPersonalStage,
} from '@/app/types/criminal';
import {
    applyPublicRightAfterPrivateWaiver,
} from './publicProsecutionGovernance';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    CriminalCaseLocation,
    CriminalDefendant,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';
import {
    buildActiveParties,
    buildAllParties,
} from './partyContextFilter';
import {
    caseStageFromStoredStage,
    isInvestigationStoredStage,
} from './criminalStageRuntimeCore';
import {
    applyCassationFiling,
    recordCassationResult,
} from './cassationEngine';
import {
    scopeStageConclusionTargets,
} from './criminalCaseGovernance';
import type {
    InvestigationDefendantStatus,
} from '@/app/types/investigationDefendant';
import {
    endInvestigationTemporaryClosureOnCase,
    patchDefendantsInvestigationStatus,
    reopenInvestigationDefendantsOnCase,
} from './investigationDefendantPurge';
import {
    JUVENILE_TRIAL_COURT_NAME,
} from './juvenileInvestigationRules';
import {
    applyInvestigationReferralOnCase,
    finalizeReferralTrialFork,
    prepareReferralTrialFork,
} from './criminalReferralMutations';
import {
    resolveCriminalCaseForDisplay,
} from './caseSeveranceView';
import {
    appendStageJourneyPhaseOverlay,
    buildInitialStageJourney,
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    buildReferralMetaForPendingOrder,
    resolvePendingJourneyOrder,
} from './journeyOrderApplyEngine';
import {
    isMisdemeanorType,
} from './caseClassificationEngine';








import {
    allDefendantsTerminal,
    appendJudicialDecisionOnCase,
    applyPersonalStagesToDefendants,
    applyTrialChargeReferralSeed,
    isCourtStageValue,
    mapDecisionStatusToDefendantStatus,
    patchInvestigationReferralCase,
    stampProceduralNodeId,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalIdentityCorrectionActions } from './criminalStoreIdentityCorrectionActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalCaseCassationOpsActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        recordCassationResult: (caseId, payload) => {
            const target = ensureStageJourneyOnCase(get().casesById[caseId] as CriminalCase);
            if (!target) return 'الإضبارة غير موجودة.';
            if (target.isArchived) return 'الإضبارة مؤرشفة.';
            const outcome = recordCassationResult(target, payload);
            if (outcome.error) return outcome.error;
            const archiveAll = allDefendantsTerminal(outcome.caseRecord.defendants ?? []);
            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...outcome.caseRecord,
                        isArchived: outcome.caseRecord.isArchived || archiveAll,
                    },
                },
            }));
            return null;
        },
        initiateCassationProceeding: (caseId, payload) =>
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] ?? ({} as CriminalCase));
                if (!target?.id) return state;
                if (target.isArchived || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                if (target.cassationProceeding && target.cassationProceeding.status !== 'concluded') {
                    return state;
                }
                const cassationNumber = String(payload.cassationNumber ?? '').trim();
                if (!cassationNumber) return state;
                const next = applyCassationFiling(target, payload);
                return { casesById: { ...state.casesById, [caseId]: next } };
            }),
        sendCaseToCassation: (caseId, data) =>
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] ?? ({} as CriminalCase));
                if (!target?.id || target.isArchived || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                if (target.cassationProceeding && target.cassationProceeding.status !== 'concluded') {
                    return state;
                }
                const cassationNumber = String(data.cassationNumber ?? '').trim();
                const sentDate = String(data.sentDate ?? '').trim();
                const panelName = String(data.panelName ?? '').trim();
                if (!cassationNumber || !sentDate || !panelName) return state;
                const type: CassationType =
                    target.basics.crimeType === 'جناية'
                        ? 'federal_cassation_felony'
                        : 'criminal_cassation_misdemeanor';
                const next = applyCassationFiling(target, {
                    cassationType: type,
                    filedAt: sentDate,
                    details: 'إرسال أوراق الطعن للتمييز',
                    cassationNumber,
                    panelName,
                    sentDate,
                    appellantDefendantIds: (target.defendants ?? []).map((d) => d.id),
                });
                return { casesById: { ...state.casesById, [caseId]: next } };
            })
    };
}
