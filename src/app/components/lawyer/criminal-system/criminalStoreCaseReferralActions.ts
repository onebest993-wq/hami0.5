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
import {
    CRIMINAL_MUTATION_DENIED_MSG,
    isCriminalCaseMutationBlocked,
} from './criminalCaseMutationGuard';
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

export function createCriminalCaseReferralActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        applyInvestigationReferral: (caseId, payload) => {
            set((state) => {
                const current = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!current || isCriminalCaseMutationBlocked(current, state.sessionOwnerLawyerId)) return state;
                const nextCase = applyInvestigationReferralOnCase(current, payload, {
                    isMisdemeanorType,
                    patchInvestigationReferralCase,
                    patchDefendantsInvestigationStatus: (caseRecord, defendantIds, status) =>
                        patchDefendantsInvestigationStatus(
                            caseRecord,
                            defendantIds,
                            status as InvestigationDefendantStatus,
                        ),
                });
                if (!nextCase) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
        },
        referInvestigationDefendantToTrial: (caseId, payload) => {
            const parent0 = get().casesById[caseId] as CriminalCase | undefined;
            if (!parent0 || isCriminalCaseMutationBlocked(parent0, get().sessionOwnerLawyerId)) return null;
            const prepared = prepareReferralTrialFork(parent0, payload);
            if (!prepared) return null;
            const seededDraft = prepared.seededDraft;
            set({ draft: seededDraft });
            const newCaseId = get().createCaseFromDraft();
            if (!newCaseId) return null;

            set((state) => {
                const parent = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                const child = state.casesById[newCaseId] as CriminalCase | undefined;
                if (!parent || !child) return state;
                const { nextParent, nextChild } = finalizeReferralTrialFork(
                    parent,
                    child,
                    newCaseId,
                    payload,
                    prepared,
                    {
                        patchInvestigationReferralCase,
                        applyTrialChargeReferralSeed,
                        applyPersonalStagesToDefendants: (
                            caseRecord,
                            defendantIds,
                            personalStage,
                            patch,
                        ) =>
                            applyPersonalStagesToDefendants(
                                caseRecord,
                                defendantIds,
                                personalStage as DefendantPersonalStage,
                                patch
                                    ? {
                                          status: patch.status as CriminalDefendant['status'],
                                      }
                                    : undefined,
                            ),
                        mapDecisionStatusToDefendantStatus,
                        patchDefendantsInvestigationStatus: (caseRecord, defendantIds, status) =>
                            patchDefendantsInvestigationStatus(
                                caseRecord,
                                defendantIds,
                                status as InvestigationDefendantStatus,
                            ),
                        appendJudicialDecisionOnCase,
                    },
                );

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextParent,
                        [newCaseId]: nextChild,
                    },
                };
            });
            return newCaseId;
        },
        referAndGenerateCase: (currentCaseId, targetCourt, decisionDetails, referralMeta) => {
            set((state) => {
                const current = state.casesById[currentCaseId];
                if (!current || isCriminalCaseMutationBlocked(current, state.sessionOwnerLawyerId)) return state;
                if (current.isArchived) return state;

                const stageKey =
                    targetCourt === 'محكمة الجنايات'
                        ? 'felony'
                        : targetCourt === 'محكمة الجنح'
                          ? 'misdemeanor'
                          : targetCourt === JUVENILE_TRIAL_COURT_NAME
                            ? 'juvenile'
                            : null;
                if (stageKey && referralMeta) {
                    const nextCase = patchInvestigationReferralCase(
                        current,
                        stageKey,
                        referralMeta.courtName,
                        referralMeta.caseNumber,
                        String(decisionDetails.date ?? '').trim(),
                        String(decisionDetails.details ?? '').trim(),
                        decisionDetails.defendantStatusAtDecision ?? 'bailed',
                        decisionDetails.defendantIds ?? [],
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [currentCaseId]: {
                                ...nextCase,
                                finalDecision: decisionDetails,
                            },
                        },
                    };
                }

                const stage = isCourtStageValue(targetCourt) ? targetCourt : current.basics.stage;
                const referralDate =
                    String(decisionDetails?.date ?? '').trim() ||
                    new Date().toISOString().slice(0, 10);
                const referralDetails = String(decisionDetails?.details ?? '').trim();
                const event: TimelineEvent = {
                    id: createId(),
                    date: referralDate,
                    type: 'decision',
                    category: 'قرار إحالة إلى المحكمة المختصة',
                    title: 'إحالة',
                    description:
                        `${referralDetails || 'تمت الإحالة إلى المحكمة المختصة.'}` +
                        (referralMeta
                            ? `\nالمحكمة: ${String(referralMeta.courtName ?? '').trim() || '—'} • الرقم: ${String(
                                  referralMeta.caseNumber ?? '',
                              ).trim() || '—'}`
                            : ''),
                };

                const nextLocation: CriminalCaseLocation = referralMeta
                    ? {
                          ...current.location,
                          courtName: referralMeta.courtName,
                          caseNumber: referralMeta.caseNumber,
                      }
                    : current.location;

                const nextCase: CriminalCase = {
                    ...current,
                    basics: { ...current.basics, stage },
                    location: nextLocation,
                    timelineEvents: [...(Array.isArray(current.timelineEvents) ? current.timelineEvents : []), event],
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [currentCaseId]: nextCase,
                    },
                };
            });
            return currentCaseId;
        },
        endInvestigationTemporaryClosure: (caseId) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target) return 'الإضبارة غير موجودة.';
            if (isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) {
                return CRIMINAL_MUTATION_DENIED_MSG;
            }
            if (target.investigationDossierClosure?.kind !== 'temporary') {
                return 'لا يوجد غلق مؤقت نشط على هذه الإضبارة.';
            }
            const date = new Date().toISOString().slice(0, 10);
            const event: TimelineEvent = {
                id: createId(),
                date,
                type: 'investigation',
                category: 'إجراء مخصص (إدخال يدوي)',
                title: 'إعادة الشكوى وإنهاء الغلق المؤقت',
                description: 'إنهاء تجميد الإضبارة التحقيقية وإعادة تفعيل مسار التحقيق.',
            };
            const nextCase = endInvestigationTemporaryClosureOnCase({
                ...target,
                timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
            });
            set((state) => ({
                casesById: {
                    ...state.casesById,
                    [caseId]: nextCase,
                },
            }));
            return null;
        },
        reopenClosedCase: (caseId, reopenReason) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const reason = String(reopenReason ?? '').trim();
                if (!reason) return state;

                const date = new Date().toISOString().slice(0, 10);
                const event: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'investigation',
                    category: 'إعادة فتح دعوى لظهور دليل',
                    title: 'إعادة فتح الدعوى',
                    description: reason,
                };

                const withJourney = appendStageJourneyPhaseOverlay(
                    ensureStageJourneyOnCase(target).stageJourney ?? buildInitialStageJourney(),
                    'reopened_new_evidence',
                    {
                        transitionText: 'إعادة فتح — ظهور أدلة جديدة',
                        startedAt: date,
                        labelSuffix: 'أدلة جديدة',
                    },
                );

                const next: CriminalCase = reopenInvestigationDefendantsOnCase({
                    ...target,
                    isFrozen: false,
                    isInvestigationLocked: false,
                    isPrejudicialPostponed: false,
                    finalDecision: undefined,
                    investigationDossierClosure: undefined,
                    isArchived: undefined,
                    isDefaultJudgmentArchived: false,
                    stageJourney: withJourney,
                    timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                });

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: next,
                    },
                };
            })
    };
}
