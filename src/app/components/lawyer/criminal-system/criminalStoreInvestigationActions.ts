/**
 * Statement / evidence / timeline / investigation-log actions — extracted from criminalStore.ts
 */
import type { StoreApi } from 'zustand';
import type {
    CriminalCase,
    OtherEvidenceItem,
    Statement,
} from './criminalCaseModel';
import { createCriminalId as createId } from './criminalIdUtils';
import { ensureStageJourneyOnCase } from './criminalStorePersistSupport';
import {
    applyCompleteInvestigationLetter,
    applyInvestigationLogExhibitLifecycleUpdate,
    applyInvestigationLogInsertion,
    applyInvestigationLogUpdate,
    applyStatementInsertion,
    applyStatementUpdate,
} from './criminalInvestigationMutationEngine';
import { applyTimelineEventInsertion } from './criminalTimelineEventInsertEngine';
import { otherEvidenceMutationBlocked, investigationLogsMutationBlocked } from './investigationDefendantPurge';
import {
    appendCaseTrashItem,
    stampProceduralNodeId,
    statementMutationBlocked,
} from './criminalStoreCaseTransforms';
import { resolveCurrentJourneyNodeId, isJourneyTenureArchived } from './stageJourneyRuntimeCore';
import { isLockedInvestigationTimelineEvent } from './criminalStageUtils';
import { rejectCriminalCaseMutation, CRIMINAL_MUTATION_DENIED_MSG, isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import { clampCriminalText, CRIMINAL_TEXT_LIMITS } from './criminalTextLimits';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalInvestigationActions(set: SetFn, get: GetFn) {
    return {
        addStatement: (caseId, statement) => {
            let err: string | null = null;
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const clamped: Statement = {
                    ...statement,
                    content: clampCriminalText(statement.content, CRIMINAL_TEXT_LIMITS.statementContent),
                    ...(statement.notes != null && String(statement.notes).length > 0
                        ? { notes: clampCriminalText(statement.notes, CRIMINAL_TEXT_LIMITS.note) }
                        : {}),
                };
                const result = applyStatementInsertion(target, clamped);
                if (result.ok === false) {
                    err =
                        result.reason === 'blocked'
                            ? 'لا يمكن إضافة إفادة — الإضبارة مقفلة.'
                            : result.reason === 'unknown_defendant'
                              ? 'لا يمكن تسجيل إفادة لمتهم مجهول الهوية.'
                              : 'تعذّر حفظ الإفادة.';
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            });
            return err;
        },
        addOtherEvidenceItem: (caseId, item) => {
            let err: string | null = null;
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (otherEvidenceMutationBlocked(target)) {
                    err = 'لا يمكن إضافة أدلة — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const evidenceType = clampCriminalText(
                    item.evidenceType,
                    CRIMINAL_TEXT_LIMITS.shortLabel,
                ).trim();
                if (!evidenceType) {
                    err = 'نوع الدليل مطلوب.';
                    return state;
                }
                const notes = clampCriminalText(item.notes, CRIMINAL_TEXT_LIMITS.note).trim();
                const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                const stamped = stampProceduralNodeId(
                    {
                        id: String(item.id ?? createId()),
                        evidenceType,
                        isLinkedToDossier: item.isLinkedToDossier === true,
                        attachmentDate:
                            item.isLinkedToDossier === true && String(item.attachmentDate ?? '').trim()
                                ? String(item.attachmentDate).trim()
                                : undefined,
                        notes,
                        createdAt: new Date().toISOString().slice(0, 10),
                    } as OtherEvidenceItem,
                    nodeId,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            otherEvidenceItems: [
                                ...(Array.isArray(target.otherEvidenceItems) ? target.otherEvidenceItems : []),
                                stamped,
                            ],
                        },
                    },
                };
            });
            return err;
        },
        removeOtherEvidenceItem: (caseId, itemId) => get().moveOtherEvidenceToTrash(caseId, itemId),
        moveOtherEvidenceToTrash: (caseId, itemId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                if (otherEvidenceMutationBlocked(target)) {
                    err = 'لا يمكن حذف الدليل — الإضبارة مؤرشفة أو مضمومة.';
                    return state;
                }
                const list = Array.isArray(target.otherEvidenceItems) ? target.otherEvidenceItems : [];
                const doomed = list.find((it) => it.id === itemId);
                if (!doomed) {
                    err = 'الدليل غير موجود.';
                    return state;
                }
                const next = list.filter((it) => it.id !== itemId);
                const nextCase = appendCaseTrashItem(
                    { ...target, otherEvidenceItems: next },
                    'other_evidence',
                    doomed,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        updateStatement: (caseId, statementId, updatedData) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const result = applyStatementUpdate(target, statementId, updatedData);
                if (!result.ok) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            }),
        addTimelineEvent: (caseId, event) =>
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const result = applyTimelineEventInsertion(target, event);
                if (!result.ok) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            }),
        deleteTimelineEvent: (caseId, eventId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.timelineEvents) ? target.timelineEvents : [];
                const doomed = list.find((e) => e.id === eventId);
                const journey = ensureStageJourneyOnCase(target).stageJourney ?? [];
                const tenureNodeId = String((doomed as { proceduralNodeId?: string })?.proceduralNodeId ?? '').trim();
                if (tenureNodeId && isJourneyTenureArchived(journey, tenureNodeId)) {
                    return state;
                }
                if (doomed && target.isInvestigationLocked && isLockedInvestigationTimelineEvent(doomed.category, doomed.type)) {
                    return state;
                }
                const next = list.filter((e) => e.id !== eventId);
                if (next.length === list.length) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, timelineEvents: next },
                    },
                };
            }),
        moveStatementToTrash: (caseId, statementId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (statementMutationBlocked(target)) {
                    err = 'لا يمكن حذف الإفادة — الإضبارة مقفلة.';
                    return state;
                }
                const list = Array.isArray(target.statements) ? target.statements : [];
                const doomed = list.find((s) => s.id === statementId);
                if (!doomed) {
                    err = 'الإفادة غير موجودة.';
                    return state;
                }
                const next = list.filter((s) => s.id !== statementId);
                const nextCase = appendCaseTrashItem({ ...target, statements: next }, 'statement', doomed);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        deleteStatement: (caseId, statementId) => {
            get().moveStatementToTrash(caseId, statementId);
        },
        addInvestigationLog: (caseId, log) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const result = applyInvestigationLogInsertion(target, log);
                if (!result.ok) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            }),
        updateInvestigationLog: (caseId, logId, updatedData) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const result = applyInvestigationLogUpdate(target, logId, updatedData);
                if (!result.ok) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            }),
        completeInvestigationLetter: (caseId, logId, payload) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                const result = applyCompleteInvestigationLetter(target, logId, payload);
                if (!result.ok) {
                    err = 'error' in result ? result.error : 'تعذر إكمال الكتاب/التقرير.';
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            });
            return err;
        },
        updateInvestigationLogExhibitLifecycle: (caseId, logId, lifecycle) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                const result = applyInvestigationLogExhibitLifecycleUpdate(target, logId, lifecycle);
                if (!result.ok) {
                    err = 'error' in result ? result.error : 'تعذر تحديث دورة حياة المبرز.';
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: result.nextCase,
                    },
                };
            });
            return err;
        },
        moveInvestigationLogToTrash: (caseId, logId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (investigationLogsMutationBlocked(target)) {
                    err = 'لا يمكن حذف السجل — الإضبارة مقفلة.';
                    return state;
                }
                const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
                const doomed = list.find((l) => l.id === logId);
                if (!doomed) {
                    err = 'السجل غير موجود.';
                    return state;
                }
                const next = list.filter((l) => l.id !== logId);
                const nextCase = appendCaseTrashItem(
                    { ...target, investigationLogs: next },
                    'investigation_log',
                    doomed,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        deleteInvestigationLog: (caseId, logId) => {
            get().moveInvestigationLogToTrash(caseId, logId);
        },
    };
}
