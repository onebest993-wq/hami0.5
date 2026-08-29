/**
 * Merge, conclude, draft, severance commit/cancel — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';


import {
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';






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
    TimelineEvent,
} from './criminalCaseModel';
import {
    makeInitialDraft,
} from './criminalCaseDraftFactory';
import {
    normalizeLegacyCriminalStage,
} from './criminalStageRuntimeCore';




import {
    DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
} from '@/app/types/investigationDefendant';
import {
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    filterSeveranceSelectableDefendants,
    investigationDossierMaterialMutationBlocked,
    normalizeInvestigationDefendantStatus,
} from './investigationDefendantPurge';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import {
    coerceDefendantFullName,
    resolveDefendantFullName,
} from './criminalUnknownDefendant';






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
    appendJudicialSeveranceRequestOnParent,
    buildSeveranceDraftFromParent,
    cloneDraftSnapshot,
    scrubRemovedPartyIdsFromJudicialDecisions,
    scrubRemovedPartyIdsFromLawyerRequests,
    statementBelongsToSeveredDefendants,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

/** Severance draft actions — extracted for ≤1000 budget. */
export function createCriminalSeveranceDraftActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {

        beginSeveranceFromDossier: (parentCaseId, defendantIds, options) => {
            const state = get();
            const parent = state.casesById[parentCaseId];
            if (!parent || parent.isArchived || parent.isSeveredChild) return false;
            if (isCriminalCaseMutationBlocked(parent, state.sessionOwnerLawyerId)) return false;
            if (investigationDossierMaterialMutationBlocked(parent)) return false;
            const parentComplainants = Array.isArray(parent.complainants) ? parent.complainants : [];
            const parentDefendantsForRule = Array.isArray(parent.defendants) ? parent.defendants : [];
            if (
                !caseAllowsSeveranceOrDossierStrike(parentComplainants, parentDefendantsForRule) ||
                !caseAllowsDefendantSeverance(parentDefendantsForRule)
            ) {
                return false;
            }
            const allowed = new Set(
                (Array.isArray(defendantIds) ? defendantIds : [])
                    .map((id) => String(id ?? '').trim())
                    .filter(Boolean),
            );
            if (!allowed.size) return false;
            const parentDefendants = Array.isArray(parent.defendants) ? parent.defendants : [];
            const selectable = filterSeveranceSelectableDefendants(parentDefendants);
            const selectableIdSet = new Set(selectable.map((d) => d.id));
            const snapshots = parentDefendants
                .filter((d) => allowed.has(d.id) && selectableIdSet.has(d.id))
                .map((d) => normalizeDefendantPersonalFields({ ...d }));
            if (!snapshots.length) return false;
            if (snapshots.length >= selectable.length) return false;

            const judicialDraft = options?.judicialSeveranceDraft;
            const draftDefendants = snapshots.map((d) => ({
                ...d,
                id: createId(),
                investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
            }));
            const formDraft = buildSeveranceDraftFromParent(parent, draftDefendants);
            const lockedCaseStage =
                normalizeLegacyCriminalStage(
                    String(parent.basics?.stage ?? '').trim() || 'مرحلة التحقيق',
                    parent.basics?.crimeType,
                ) || 'مرحلة التحقيق';
            const lockedFormDraft: CriminalCaseDraft = {
                ...formDraft,
                basics: {
                    ...formDraft.basics,
                    stage: lockedCaseStage,
                },
            };

            set({
                draft: makeInitialDraft(),
                pendingSeveranceContext: {
                    parentCaseId,
                    parentDefendantIds: snapshots.map((d) => d.id),
                    defendantSnapshots: snapshots,
                    initiatedAt: new Date().toISOString(),
                    judicialSeveranceDraft: judicialDraft,
                    severanceReason: options?.severanceReason,
                    formDraft: cloneDraftSnapshot(lockedFormDraft),
                    lockedCaseStage,
                },
            });
            return true;
        },

        stashPendingSeveranceForm: () =>
            set((state) => {
                const ctx = state.pendingSeveranceContext;
                if (!ctx) return state;
                const pristine = makeInitialDraft();
                const draftHasNamedDefendant = (Array.isArray(state.draft.defendants)
                    ? state.draft.defendants
                    : []
                ).some((d) => resolveDefendantFullName(d));
                const savedFormHasNamedDefendant = (Array.isArray(ctx.formDraft?.defendants)
                    ? ctx.formDraft.defendants
                    : []
                ).some((d) => resolveDefendantFullName(d));
                const draftHasNamedComplainant = (Array.isArray(state.draft.complainants)
                    ? state.draft.complainants
                    : []
                ).some((c) => String(c.fullName ?? '').trim());
                const savedFormHasNamedComplainant = (Array.isArray(ctx.formDraft?.complainants)
                    ? ctx.formDraft.complainants
                    : []
                ).some((c) => String(c.fullName ?? '').trim());
                if (
                    (!draftHasNamedDefendant && savedFormHasNamedDefendant) ||
                    (!draftHasNamedComplainant && savedFormHasNamedComplainant)
                ) {
                    return { draft: pristine };
                }
                return {
                    pendingSeveranceContext: {
                        ...ctx,
                        formDraft: cloneDraftSnapshot(state.draft),
                    },
                    draft: pristine,
                };
            }),

        resumePendingSeveranceForm: () => {
            const ctx = get().pendingSeveranceContext;
            if (!ctx?.formDraft) return false;
            let nextDraft = cloneDraftSnapshot(ctx.formDraft);
            const snaps = ctx.defendantSnapshots;
            if (snaps.length && Array.isArray(nextDraft.defendants)) {
                nextDraft = {
                    ...nextDraft,
                    defendants: nextDraft.defendants.map((d, index) => {
                        if (resolveDefendantFullName(d)) return coerceDefendantFullName(d);
                        const snapName = resolveDefendantFullName(snaps[index]);
                        return snapName ? { ...d, fullName: snapName } : coerceDefendantFullName(d);
                    }),
                };
            }
            set({ draft: nextDraft });
            return true;
        },

        prepareNormalCriminalCaseForm: () =>
            set({
                draft: makeInitialDraft(),
                pendingSeveranceContext: null,
            }),

        commitSeveranceFromDossier: () => {
            const stateBefore = get();
            const ctx = stateBefore.pendingSeveranceContext;
            if (!ctx) return null;
            const parent = stateBefore.casesById[ctx.parentCaseId];
            if (!parent || parent.isArchived) return null;
            if (isCriminalCaseMutationBlocked(parent, stateBefore.sessionOwnerLawyerId)) return null;

            const lockedStage = ctx.lockedCaseStage;
            if (lockedStage && stateBefore.draft.basics.stage !== lockedStage) {
                set({
                    draft: {
                        ...stateBefore.draft,
                        basics: {
                            ...stateBefore.draft.basics,
                            stage: lockedStage,
                        },
                    },
                });
            }

            // 1) إنشاء الإضبارة الجديدة عبر المسار المعياري — يضمن normalization كاملاً.
            const newCaseId = get().createCaseFromDraft();
            if (!newCaseId) return null;

            const severedAt = new Date().toISOString().slice(0, 10);
            const allowedParentIds = new Set<string>(ctx.parentDefendantIds);

            set((state) => {
                const child = state.casesById[newCaseId];
                const parentRecord = state.casesById[ctx.parentCaseId];
                if (!child || !parentRecord) return state;

                // 2) ترحيل العناصر المرتبطة حصرياً بالمتهمين المنقولين.
                const movedDefendantNames = buildSeveredDefendantNameSet(ctx.defendantSnapshots);
                const migrationOrigin = {
                    caseId: parentRecord.id,
                    caseNumber: resolveOfficialCaseNumber(parentRecord) || parentRecord.id,
                };

                const parentRequests = partitionLawyerRequestsForSeverance(
                    parentRecord.lawyerRequests,
                    allowedParentIds,
                    parentRecord,
                );
                const parentJudicialDecisions = partitionJudicialDecisionsForSeverance(
                    parentRecord.judicialDecisions ?? [],
                    allowedParentIds,
                    parentRecord,
                );
                const parentInvestigationLogs = partitionInvestigationLogsForSeverance(
                    parentRecord.investigationLogs,
                    allowedParentIds,
                    parentRecord,
                );
                const parentTimelinePartition = partitionTimelineEventsForSeverance(
                    parentRecord.timelineEvents,
                    allowedParentIds,
                    parentRecord,
                );
                // الإفادات مفتاحها الاسم لا المعرّف — نُرحّل إفادات المتهمين المنقولين فقط
                // إذا كانت من نوع «defendant» واسم المُدلي مطابق لأحد المنقولين.
                const parentStatements = Array.isArray(parentRecord.statements)
                    ? parentRecord.statements
                    : [];
                const migratedStatements = parentStatements.filter((s) =>
                    statementBelongsToSeveredDefendants(s, movedDefendantNames),
                );
                const keptStatements = parentStatements.filter(
                    (s) => !migratedStatements.includes(s),
                );

                // 3) حذف المتهمين المنقولين من الأم نهائياً.
                const remainingParentDefendants = (Array.isArray(parentRecord.defendants)
                    ? parentRecord.defendants
                    : []
                ).filter((d) => !allowedParentIds.has(d.id));

                // 4) ختم حدث «تفريق الدعوى» على الأم.
                const judicialNote = String(ctx.judicialSeveranceDraft?.lawyerNote ?? '').trim();
                const severanceEvent: TimelineEvent = {
                    id: createId(),
                    date: String(ctx.judicialSeveranceDraft?.requestDate ?? '').trim() || severedAt,
                    type: 'decision',
                    category: 'تفريق الدعاوى',
                    title: 'تفريق وشطر الإضبارة',
                    description: [
                        judicialNote || null,
                        `تم شطر إضبارة المتهمين: ${[...movedDefendantNames].join('، ') || '—'} إلى إضبارة مستقلة (${resolveOfficialCaseNumber(child) || child.id}).`,
                    ]
                        .filter(Boolean)
                        .join('\n'),
                };

                const priorChildren = Array.isArray(parentRecord.severedChildCaseIds)
                    ? parentRecord.severedChildCaseIds
                    : [];

                const scrubRemovedIds = allowedParentIds;
                let updatedParent: CriminalCase = {
                    ...parentRecord,
                    defendants: remainingParentDefendants,
                    statements: keptStatements,
                    timelineEvents: [...parentTimelinePartition.kept, severanceEvent],
                    lawyerRequests: scrubRemovedPartyIdsFromLawyerRequests(
                        parentRequests.kept,
                        scrubRemovedIds,
                    ),
                    investigationLogs: parentInvestigationLogs.kept,
                    judicialDecisions:
                        parentRecord.judicialDecisions === undefined
                            ? undefined
                            : scrubRemovedPartyIdsFromJudicialDecisions(
                                  parentJudicialDecisions.kept,
                                  scrubRemovedIds,
                              ),
                    severedChildCaseIds: [...priorChildren, child.id],
                };
                updatedParent = appendJudicialSeveranceRequestOnParent(updatedParent, ctx, {
                    childCaseId: child.id,
                    parentDefendantIds: [...ctx.parentDefendantIds],
                });

                const severanceReason = ctx.severanceReason;
                const patchedChildDefendants = (Array.isArray(child.defendants)
                    ? child.defendants
                    : []
                ).map((d, index) => {
                    let next: CriminalDefendant;
                    if (resolveDefendantFullName(d)) {
                        next = coerceDefendantFullName(d);
                    } else {
                        const snap = ctx.defendantSnapshots[index];
                        const snapName = snap ? resolveDefendantFullName(snap) : '';
                        next = snapName
                            ? { ...d, fullName: snapName }
                            : coerceDefendantFullName(d);
                    }
                    if (
                        severanceReason === 'defendant_absconding' &&
                        next.status !== 'هارب'
                    ) {
                        next = { ...next, status: 'هارب' as DefendantStatus };
                    }
                    if (normalizeInvestigationDefendantStatus(next.investigationStatus) !== 'active') {
                        next = {
                            ...next,
                            investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                        };
                    }
                    return next;
                });

                const partyIdMaps = buildSeverancePartyIdMaps(
                    parentRecord,
                    patchedChildDefendants,
                    ctx.parentDefendantIds,
                    child.complainants,
                );
                const migratedRequests = parentRequests.migrated.map((req) =>
                    remapLawyerRequestForSeveredChild(req, partyIdMaps, migrationOrigin),
                );
                const migratedDecisions = parentJudicialDecisions.migrated.map((decision) =>
                    remapJudicialDecisionForSeveredChild(decision, partyIdMaps, migrationOrigin),
                );
                const migratedLogs = parentInvestigationLogs.migrated.map((log) =>
                    remapInvestigationLogForSeveredChild(log, partyIdMaps, migrationOrigin),
                );
                const migratedTimeline = parentTimelinePartition.migrated.map((event) =>
                    remapTimelineEventForSeveredChild(event, partyIdMaps, migrationOrigin),
                );

                const updatedChild: CriminalCase = {
                    ...child,
                    defendants: patchedChildDefendants,
                    parentCaseId: parentRecord.id,
                    isSeveredChild: true,
                    severedAt,
                    ...(severanceReason
                        ? {
                              severanceReason,
                              ...(ctx.severanceReasonDetail
                                  ? { severanceReasonDetail: ctx.severanceReasonDetail }
                                  : {}),
                              stageJourney: buildSeveredChildStageJourney(
                                  severanceReason,
                                  severedAt,
                              ),
                          }
                        : {}),
                    statements: [
                        ...(Array.isArray(child.statements) ? child.statements : []),
                        ...migratedStatements,
                    ],
                    timelineEvents: [
                        ...(Array.isArray(child.timelineEvents) ? child.timelineEvents : []),
                        ...migratedTimeline,
                    ],
                    lawyerRequests: [
                        ...(Array.isArray(child.lawyerRequests) ? child.lawyerRequests : []),
                        ...migratedRequests,
                    ],
                    investigationLogs: [
                        ...(Array.isArray(child.investigationLogs) ? child.investigationLogs : []),
                        ...migratedLogs,
                    ],
                    judicialDecisions:
                        migratedDecisions.length || child.judicialDecisions
                            ? [
                                  ...(Array.isArray(child.judicialDecisions)
                                      ? child.judicialDecisions
                                      : []),
                                  ...migratedDecisions,
                              ]
                            : child.judicialDecisions,
                };

                return {
                    casesById: {
                        ...state.casesById,
                        [parentRecord.id]: updatedParent,
                        [newCaseId]: updatedChild,
                    },
                    pendingSeveranceContext: null,
                    draft: makeInitialDraft(),
                };
            });

            return newCaseId;
        },

        cancelPendingSeverance: () => {
            set({ pendingSeveranceContext: null, draft: makeInitialDraft() });
        },

        setPendingSeveranceReason: (reason, detail) =>
            set((state) => {
                const ctx = state.pendingSeveranceContext;
                if (!ctx) return state;
                const nextDetail =
                    reason === 'other'
                        ? String(detail ?? ctx.severanceReasonDetail ?? '').trim() || undefined
                        : undefined;
                return {
                    pendingSeveranceContext: {
                        ...ctx,
                        severanceReason: reason,
                        severanceReasonDetail: nextDetail,
                    },
                };
            }),
    };
}
