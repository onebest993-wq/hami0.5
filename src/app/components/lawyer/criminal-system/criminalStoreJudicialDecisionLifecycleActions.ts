/**
 * Lawyer requests, detention decisions, judicial appeal lifecycle — split from criminalStoreRequestsActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    ensureStageJourneyOnCase,
} from './criminalStorePersistSupport';
import type {
    JudicialDecision,
} from '@/app/types/criminal';
import {
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked, rejectCriminalCaseMutation, CRIMINAL_MUTATION_DENIED_MSG } from './criminalCaseMutationGuard';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    DefendantStatus,
    LawyerRequest,
    TimelineEvent,
} from './criminalCaseModel';
import type { GuarantorPerson } from './criminalGuarantorModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import {
    resolveCaseStageFromRecord,
} from './criminalStageRuntimeCore';
import {
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
    findJudicialDecisionStoreIndex,
} from './judicialDecisionsEngine';
import {
    requiresInvestigationPurgeDefendantScope,
    resolveInvestigationClosureDefendantIds,
} from './investigationDefendantPurge';
import {
    filterUnknownDefendantsFromPartyIds,
    UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE,
} from './criminalUnknownDefendant';
import {
    isDefendantTargetRequestTemplate,
} from './requestPartySelection';
import {
    isLawyerRequestPending,
} from './lawyerRequestStatusMachine';
import {
    stripLawyerRequestDecisionPatch,
    validateCreateLawyerRequestInput,
    validateFinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import {
    buildInitialOrderEnforcement,
} from './orderEnforcementEngine';
import {
    validateDetentionExtensionEnd,
} from './detentionEngine';
import {
    isDetentionDecisionTemplate,
    isInvestigationSeveranceJudicialTemplate,
    isJudicialDecisionTemplate,
    resolveStoredRequestTypeFields,
} from './proceduralRequestTypes';
import {
    declareJudicialDecisionFinalOnCase,
    fileJudicialDecisionAppealOnCase,
    recordJudicialAppealResultOnCases,
} from './criminalJudicialAppealMutations';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    appendCaseTrashItem,
    applyLawyerRequestOutcomeOnCase,
    caseMaterialProcedureBlocked,
    cassationAppealMutationBlocked,
    filterOutJudicialDecisionsForRequest,
    findOpenDetentionHistoryIndex,
    patchDetentionDecisionOnCase,
    patchOrderEnforcementOnCase,
    readDetentionHistoryLog,
    readLawyerRequestDefendantIds,
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
    resolveDecisionPartyIds,
    resolveJudicialDecisionsForCase,
    stampProceduralNodeId,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalJudicialDecisionLifecycleActions(set: SetFn, get: GetFn) {
    return {
        fileJudicialDecisionAppeal: (caseId, decisionId, payload) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || cassationAppealMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر تسجيل الطعن التمييزي.';
            const outcome = fileJudicialDecisionAppealOnCase(target, decisionId, payload);
            if (outcome.error || !outcome.nextCase) return outcome.error;
            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: outcome.nextCase!,
                },
            }));
            return null;
        },
        declareJudicialDecisionFinal: (caseId, decisionId, payload) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target) return 'الإضبارة غير موجودة.';
            if (rejectCriminalCaseMutation(target, get().sessionOwnerLawyerId)) return CRIMINAL_MUTATION_DENIED_MSG;
            const outcome = declareJudicialDecisionFinalOnCase(target, decisionId, payload);
            if (outcome.error || !outcome.nextCase) return outcome.error;
            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: outcome.nextCase!,
                },
            }));
            return null;
        },
        patchJudicialDecisionLifecycle: (caseId, decisionId, patch) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target) return 'الإضبارة غير موجودة.';
            if (rejectCriminalCaseMutation(target, get().sessionOwnerLawyerId)) return CRIMINAL_MUTATION_DENIED_MSG;
            const merged = resolveJudicialDecisionsForCase(target);
            const did = String(decisionId ?? '').trim();
            const hit = findJudicialDecisionByRef(merged, did);
            if (!hit) return 'القرار غير موجود في السجل.';
            const updated: JudicialDecision = { ...hit, ...patch };
            const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
            const storeIdx = findJudicialDecisionStoreIndex(list, updated);
            const nextList =
                storeIdx >= 0
                    ? list.map((d, i) => (i === storeIdx ? { ...d, ...patch, id: d.id } : d))
                    : [...list, updated];
            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: {
                        ...target,
                        judicialDecisions: coalesceJudicialDecisions(nextList),
                    },
                },
            }));
            return null;
        },
        recordJudicialAppealResult: (caseId, decisionId, appealId, payload) => {
            const target0 = get().casesById[caseId] as CriminalCase | undefined;
            if (!target0 || cassationAppealMutationBlocked(target0) || isCriminalCaseMutationBlocked(target0, get().sessionOwnerLawyerId)) return 'تعذّر تسجيل النتيجة.';
            let blockingError: string | null = null;
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target || cassationAppealMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const outcome = recordJudicialAppealResultOnCases(
                    state.casesById,
                    caseId,
                    decisionId,
                    appealId,
                    payload,
                );
                if (outcome.error) {
                    blockingError = outcome.error;
                    return state;
                }
                if (!outcome.nextCasesById) return state;
                return {
                    casesById: outcome.nextCasesById,
                };
            });
            return blockingError;
        }
    };
}
