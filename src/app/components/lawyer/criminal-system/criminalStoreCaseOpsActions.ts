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
import { createCriminalCaseReferralActions } from './criminalStoreCaseReferralActions';
import { createCriminalCaseCassationOpsActions } from './criminalStoreCaseCassationOpsActions';
import { createCriminalIdentityCorrectionActions } from './criminalStoreIdentityCorrectionActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalCaseOpsActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalCaseReferralActions(set, get),
        ...createCriminalCaseCassationOpsActions(set, get),
        ...createCriminalIdentityCorrectionActions(set, get),
        getCaseForDisplay: (caseId) => {
            const raw = get().casesById[caseId];
            if (!raw) return null;
            return resolveCriminalCaseForDisplay(raw, get().casesById);
        },
        getActiveParties: (caseId) => {
            const target = get().casesById[caseId];
            if (!target) return [];
            const complainants = Array.isArray(target.complainants) ? target.complainants : [];
            const defendants = Array.isArray(target.defendants) ? target.defendants : [];
            return buildActiveParties(complainants, defendants, {
                isMutualComplaint: target.isMutualComplaint === true,
            });
        },
        getAllParties: (caseId) => {
            const target = get().casesById[caseId];
            if (!target) return [];
            const complainants = Array.isArray(target.complainants) ? target.complainants : [];
            const defendants = Array.isArray(target.defendants) ? target.defendants : [];
            return buildAllParties(complainants, defendants, {
                isMutualComplaint: target.isMutualComplaint === true,
            });
        },
        recordPartyDeath: (caseId, defendantId, date) => {
            get().registerPartyDeath(caseId, defendantId, date);
        },
        issueStageDecision: (caseId, conclusion, referral) => {
            const scoped = scopeStageConclusionTargets(conclusion);
            return get().concludeStage(caseId, scoped, referral);
        },
        applyPendingJourneyOrder: (caseId) => {
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            if (target.isArchived) return 'لا يمكن تطبيق الأمر على إضبارة مؤرشفة.';

            const pending = resolvePendingJourneyOrder(target);
            if (!pending) return 'لا يوجد أمر معلّق لتطبيقه على المسار.';

            const referralMeta = buildReferralMetaForPendingOrder(target, pending);
            if (pending.sourceFinalDecision) {
                const scoped = scopeStageConclusionTargets(pending.sourceFinalDecision);
                if (referralMeta && scoped.decisionType === 'referral') {
                    return get().concludeStage(caseId, scoped, referralMeta);
                }
                if (
                    referralMeta &&
                    (scoped.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
                        scoped.decisionType === 'felony_to_misdemeanor_jurisdiction')
                ) {
                    return get().concludeStage(caseId, scoped, referralMeta);
                }
                return get().concludeStage(caseId, scoped, referralMeta ?? undefined);
            }

            if (!referralMeta) {
                return 'أكمل اسم المحكمة ورقم الدعوى قبل تطبيق الإحالة.';
            }

            const actionId = pending.actionId;
            const stageType = actionId === 'refer_felony' ? 'felony' : 'misdemeanor';
            const conclusion: StageConclusion = {
                id: createId(),
                stageType,
                decisionType: 'referral',
                date: new Date().toISOString().slice(0, 10),
                details: 'تطبيق الإحالة من مسار تتبع الإضبارة',
                defendantStatusAtDecision: 'bailed',
            };
            return get().concludeStage(caseId, conclusion, referralMeta);
        },
        registerPartyDeath: (caseId, defendantId, date) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (target.isArchived) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const defId = String(defendantId ?? '').trim();
                if (!defId) return state;
                const defendants = Array.isArray(target.defendants) ? target.defendants : [];
                const victim = defendants.find((d) => d.id === defId);
                if (!victim) return state;
                const eventDate = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
                const name = String(victim.fullName ?? '').trim() || '—';
                const nodeId = resolveCurrentJourneyNodeId(
                    ensureStageJourneyOnCase(target).stageJourney,
                );
                const event: TimelineEvent = stampProceduralNodeId(
                    {
                        id: createId(),
                        date: eventDate,
                        type: 'decision',
                        category: 'سقوط الدعوى — وفاة متهم',
                        title: 'وفاة متهم',
                        description: `⚠️ سقوط الدعوى الجزائية بحق المتهم ${name} لوفاته`,
                        defendantIds: [defId],
                    },
                    nodeId,
                );
                const nextDefendants = defendants.map((d) =>
                    d.id !== defId
                        ? normalizeDefendantPersonalFields(d)
                        : normalizeDefendantPersonalFields({
                              ...d,
                              status: 'متوفى',
                              personalStage: 'lawsuit_dropped_death',
                              isPartyRecordLocked: true,
                              detentionAuthority: '',
                              detentionExpiryDate: '',
                          }),
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            defendants: nextDefendants,
                            timelineEvents: [
                                ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                event,
                            ],
                        },
                    },
                };
            }),
        severCase: (parentCaseId, payload) => {
            const ids = (Array.isArray(payload.defendantIds) ? payload.defendantIds : [])
                .map((x) => String(x ?? '').trim())
                .filter(Boolean);
            if (!ids.length) return null;
            const at = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
            const details = String(payload.details ?? '').trim() || 'قرار تفريق الدعاوى.';
            const began = get().beginSeveranceFromDossier(parentCaseId, ids, {
                judicialSeveranceDraft: {
                    requestDate: at,
                    lawyerNote: details,
                    isAppealable: false,
                },
                severanceReason: payload.severanceReason,
            });
            if (!began) return null;
            if (!get().resumePendingSeveranceForm()) return null;
            const childId = get().commitSeveranceFromDossier();
            return childId;
        },
        updateCaseLocation: (caseId, newLocationType, newLocationName, reason) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;

                const type = newLocationType === 'police' || newLocationType === 'court' ? newLocationType : null;
                const name = String(newLocationName ?? '').trim();
                const why = String(reason ?? '').trim();
                if (!type || !name || !why) return state;

                const date = new Date().toISOString().slice(0, 10);
                const event: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'decision',
                    category: 'إحالة لعدم الاختصاص',
                    title: 'نقل الإضبارة لعدم الاختصاص',
                    description: `تم نقل الإضبارة إلى (${name}) بناءً على قرار عدم الاختصاص لسبب: ${why}`,
                };

                const isInvestigationStage = isInvestigationStoredStage(String(target.basics.stage ?? '').trim());
                const nextLocation: CriminalCaseLocation =
                    type === 'police'
                        ? {
                              ...target.location,
                              investigationPapersAt: isInvestigationStage ? 'مركز شرطة' : target.location.investigationPapersAt,
                              policeStationName: name,
                          }
                        : {
                              ...target.location,
                              courtName: name,
                              investigationCourtName: isInvestigationStage ? name : target.location.investigationCourtName,
                          };

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            location: nextLocation,
                            timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                        },
                    },
                };
            }),
        updateCaseStage: (caseId, stage) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const proceduralKey = caseStageFromStoredStage(stage);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            basics: { ...target.basics, stage },
                            ...(proceduralKey ? { caseStage: proceduralKey } : {}),
                            ...(stage !== 'cassation_court' ? { isSentToCassation: false } : {}),
                        },
                    },
                };
            }),
        updateLegalArticle: (caseId, change) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const history = Array.isArray(target.legalArticleHistory) ? target.legalArticleHistory : [];
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            legalArticleHistory: [...history, change],
                            basics: { ...target.basics, legalArticle: change.article },
                        },
                    },
                };
            }),
        waivePrivateRight: (caseId, waiverDate) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const withWaiver: CriminalCase = {
                    ...target,
                    isPrivateRightWaived: true,
                    waiverDate,
                };
                const nextCase = applyPublicRightAfterPrivateWaiver(withWaiver);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            }),
        /**
         * ضَم إضبارة في الإضبارة الأم — عَملية ذَرّية كاملة.
         *
         * • التَّحقّقات الصَّارمة (مَرحلة، وجود، تَكرار، تَجميد، ...) في `prepareMergedCaseTransaction`.
         *   عند فَشل أي منها يُرفع `MergeValidationError` ولا تُكتَب أي بيانات.
         * • الترحيل يَتضمّن: التايم لاين، الإفادات، السجلات، الطلبات، القرارات
         *   مع ختم تَتبّع دائم (`mergedFromCaseId` / `mergedFromCaseNumber`).
         * • توحيد الأطراف مع منع التَّكرار (بناءً على الاسم النَّظيف).
         * • تَجميد الطِفل: `isFrozen=true, isArchived=true, dossierStatus='merged'`
         *   مع تَفريغ سجلاته (الأصل مَحفوظ بختم التَتبّع داخل الأم).
         */
    };
}

