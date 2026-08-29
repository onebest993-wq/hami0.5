/**
 * Merge, conclude, draft, severance commit/cancel — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';
import { removeAllCriminalBridgedCalendarEvents } from './criminalCalendarBridgePrune';
import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import type {
    CaseStage,
} from '@/app/types/criminal';
import {
    normalizeOurRepresentation,
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import { scheduleRevokeCriminalCaseShares } from '@/app/services/caseShare/caseShareDossierRevocation';
import { isMergedDossierCase } from './criminalCaseMutationPolicy';
import {
    resolveOfficialCaseNumber,
} from './criminalCaseReferenceUtils';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    CriminalCaseDraft,
    CriminalDefendant,
    DefendantStatus,
    StageConclusion,
    TimelineEvent,
} from './criminalCaseModel';
import {
    makeInitialDraft,
} from './criminalCaseDraftFactory';
import {
    caseStageFromStoredStage,
    isInvestigationStoredStage,
    normalizeLegacyCriminalStage,
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
    DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
} from '@/app/types/investigationDefendant';
import {
    applyInvestigationClosureFromStageConclusion,
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    filterSeveranceSelectableDefendants,
    investigationDossierMaterialMutationBlocked,
    normalizeInvestigationDefendantStatus,
} from './investigationDefendantPurge';
import {
    hasIdentifiedDefendant,
    coerceDefendantFullName,
    resolveDefendantFullName,
} from './criminalUnknownDefendant';
import {
    JUVENILE_TRIAL_COURT_NAME,
} from './juvenileInvestigationRules';
import type {
    InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';
import {
    syncDraftOfficeRepresentation,
} from './criminalOfficeClient';
import {
    buildSeverancePartyIdMaps,
    buildSeveredDefendantNameSet,
    partitionInvestigationLogsForSeverance,
    partitionJudicialDecisionsForSeverance,
    partitionLawyerRequestsForSeverance,
    partitionTimelineEventsForSeverance,
    remapInvestigationLogForSeveredChild,
    remapJudicialDecisionForSeveredChild,
    remapLawyerRequestForSeveredChild,
    remapTimelineEventForSeveredChild,
} from './severanceMigrationEngine';
import {
    buildSeveredChildStageJourney,
} from './caseSeveranceView';
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
    MergeValidationError,
    prepareMergedCaseTransaction,
} from './caseMergeMigration';
import {
    findCaseInStore,
} from './caseMergeTimeline';
import {
    allDefendantsTerminal,
    appendJudicialSeveranceRequestOnParent,
    applyCaseSplitFugitiveReferral,
    applyDefaultJudgmentArchive,
    applyDefaultJudgmentOpposition,
    applyPersonalStagesFromConclusion,
    applyPrejudicialPostponement,
    applyProceduralActionToCase,
    applyProceduralRouteTransition,
    buildSeveranceDraftFromParent,
    cloneDraftSnapshot,
    normalizeReferralDefendantIds,
    patchInvestigationReferralCase,
    prepareDraftSnapshotForCaseCreation,
    referralPayloadValid,
    scrubRemovedPartyIdsFromJudicialDecisions,
    scrubRemovedPartyIdsFromLawyerRequests,
    seedCriminalCaseFromDraftSnapshot,
    stampProceduralNodeId,
    statementBelongsToSeveredDefendants,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalConcludeStageActions } from './criminalStoreConcludeStageActions';
import { createCriminalSeveranceDraftActions } from './criminalStoreSeveranceDraftActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalMergeDraftActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalConcludeStageActions(set, get),
        ...createCriminalSeveranceDraftActions(set, get),
        mergeCases: (parentCaseId: string, childCaseId: string, mergeReason: string) => {
            const snapshot = get();
            const casesById = snapshot.casesById;
            const parentEntry = findCaseInStore(casesById, parentCaseId);
            const childEntry = findCaseInStore(casesById, childCaseId);
            if (!parentEntry) {
                throw new MergeValidationError(
                    'missing_parent',
                    'تعذّر تنفيذ الضم: الإضبارة الأم غير موجودة.',
                );
            }
            if (!childEntry) {
                throw new MergeValidationError(
                    'missing_child',
                    'تعذّر تنفيذ الضم: الإضبارة المراد ضمها غير موجودة في النظام.',
                );
            }
            const parentDenied = rejectCriminalCaseMutation(
                parentEntry.record,
                snapshot.sessionOwnerLawyerId,
            );
            if (parentDenied) throw new MergeValidationError('ownership_denied', parentDenied);
            const childDenied = rejectCriminalCaseMutation(
                childEntry.record,
                snapshot.sessionOwnerLawyerId,
            );
            if (childDenied) throw new MergeValidationError('ownership_denied', childDenied);
            const { updatedParent, frozenChild } = prepareMergedCaseTransaction(
                parentEntry.record,
                childEntry.record,
                mergeReason,
                { createId },
                casesById,
            );

            set((state) => {
                const parentInSet = state.casesById[parentEntry.storageKey];
                const childInSet = state.casesById[childEntry.storageKey];
                if (!parentInSet || !childInSet) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [parentEntry.storageKey]: updatedParent,
                        [childEntry.storageKey]: frozenChild,
                    },
                };
            });
        },
        severJuvenileDefendantToJuvenileCourt: (
            caseId: string,
            defendantId: string,
            date: string,
            details: string,
        ) => {
            const snapshot = get();
            const source = snapshot.casesById[caseId];
            if (!source) return null;
            if (rejectCriminalCaseMutation(source, snapshot.sessionOwnerLawyerId)) return null;
            if (source.isArchived) return null;

            const defId = String(defendantId ?? '').trim();
            const cleanDate = String(date ?? '').trim();
            const cleanDetails = String(details ?? '').trim();
            if (!defId || !cleanDate || !cleanDetails) return null;

            const sourceDefendants = Array.isArray(source.defendants) ? source.defendants : [];
            const juvenile = sourceDefendants.find((d) => d.id === defId);
            if (!juvenile) return null;
            if (!Boolean(juvenile.isJuvenile)) return null;

            const event: TimelineEvent = {
                id: createId(),
                date: cleanDate,
                type: 'decision',
                category: 'تفريق دعوى المتهم الحدث ومسار محكمة الأحداث',
                title: 'تفريق دعوى الحدث',
                description: `تم تفريق دعوى المتهم الحدث (${String(juvenile.fullName ?? '').trim() || '—'}) لمسار محكمة الأحداث (جنح/جنايات حسب التصنيف). ${cleanDetails}`,
                defendantIds: [defId],
            };

            set((state) => {
                const current = state.casesById[caseId];
                if (!current) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...current,
                            timelineEvents: [...(Array.isArray(current.timelineEvents) ? current.timelineEvents : []), event],
                        },
                    },
                };
            });

            return null;
        },
        createCaseFromDraft: () => {
            const stateBefore = get();
            const owner = String(stateBefore.sessionOwnerLawyerId ?? '').trim();
            if (!owner) return null;
            const role = String(stateBefore.draft?.basics?.role ?? '').trim();
            const syncedDraft = syncDraftOfficeRepresentation(stateBefore.draft);
            const incoming = String(syncedDraft.basics?.ourRepresentation ?? '').trim();
            const normalized = normalizeOurRepresentation(incoming, role);
            const nextDraft: CriminalCaseDraft = {
                ...syncedDraft,
                basics: { ...syncedDraft.basics, ourRepresentation: normalized },
            };
            const preparedSnapshot = prepareDraftSnapshotForCaseCreation(nextDraft);
            const nowDate = new Date().toISOString().slice(0, 10);

            const caseId = createId();
            let created = false;
            set((state) => {
                const sessionOwner = String(state.sessionOwnerLawyerId ?? '').trim();
                if (!sessionOwner) return state;
                const seededCase = seedCriminalCaseFromDraftSnapshot(
                    preparedSnapshot,
                    caseId,
                    nowDate,
                    sessionOwner,
                );
                if (!seededCase) return state;
                created = true;
                return {
                    draft: nextDraft,
                    casesById: {
                        ...state.casesById,
                        [caseId]: seededCase,
                    },
                };
            });
            return created ? caseId : null;
        },
        deleteCase: (id: string): boolean => {
            const snapshot = get();
            const target = snapshot.casesById[id];
            if (!target) return false;
            if (rejectCriminalCaseMutation(target, snapshot.sessionOwnerLawyerId)) return false;
            if (target.isArchived || isMergedDossierCase(target)) return false;
            set((state) => {
                const current = state.casesById[id];
                if (!current) return state;
                if (current.isArchived || isMergedDossierCase(current)) return state;
                const next = { ...state.casesById };
                delete next[id];
                return { casesById: next };
            });
            if (get().casesById[id]) return false;
            scheduleRevokeCriminalCaseShares(snapshot.sessionOwnerLawyerId, id);
            // 🧹 حذف كل أحداث التقويم المربوطة بهذه الإضبارة (حتى لا تبقى يتيمة)
            void removeAllCriminalBridgedCalendarEvents(id).catch((err) => {
                if (import.meta.env.DEV) {
                    console.warn('[criminal] فشل تنظيف أحداث التقويم بعد حذف الإضبارة', id, err);
                }
            });
            return true;
        },
        resetDraft: () => set({ draft: makeInitialDraft() }),
    };
}
