/**
 * Trash restore/purge and request margins/attachments — split from criminalStoreRequestsActions.ts
 */
import type { StoreApi } from 'zustand';
import type {
    JudicialDecision,
} from '@/app/types/criminal';
import {
    normalizeTrashBin,
    type ProceduralSubItemTrashSnapshot,
} from './criminalCaseTrash';
import {
    caseMutationBlocked,
} from './criminalCaseMutationPolicy';
import {
    createCriminalId as createId,
} from './criminalIdUtils';
import type {
    CriminalCase,
    InvestigationLog,
    LawyerRequest,
    OtherEvidenceItem,
    Statement,
} from './criminalCaseModel';
import {
    appendSubItem,
    insertNestedContainer,
    insertRootContainer,
    findContainerInTree,
    normalizeProceduralContainers,
    type ProceduralContainer,
} from './proceduralContainersEngine';
import {
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
} from './judicialDecisionsEngine';
import {
    otherEvidenceMutationBlocked,
} from './investigationDefendantPurge';
import {
    canAddLawyerRequestFollowUpMargin,
    canEditLawyerRequestAttachments,
} from './lawyerRequestsEngine';
import {
    caseMaterialProcedureBlocked,
    statementMutationBlocked,
} from './criminalStoreCaseTransforms';
import { isCriminalCaseMutationBlocked, rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import { clampCriminalText, CRIMINAL_TEXT_LIMITS } from './criminalTextLimits';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalTrashMarginActions(set: SetFn, _get: GetFn): Partial<CriminalStoreState> {
    return {
        restoreTrashItem: (caseId, trashItemId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن استرجاع العناصر — الإضبارة مقفلة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const trash = normalizeTrashBin(target.trashBin);
                const item = trash.find((t) => t.id === trashItemId);
                if (!item) {
                    err = 'العنصر غير موجود في سلة المهملات.';
                    return state;
                }
                if (item.kind === 'statement' && statementMutationBlocked(target)) {
                    err = 'لا يمكن استرجاع الإفادة — مرحلة التحقيق مقفلة.';
                    return state;
                }

                let nextCase: CriminalCase = {
                    ...target,
                    trashBin: trash.filter((t) => t.id !== trashItemId),
                };

                if (item.kind === 'statement') {
                    const st = item.snapshot as Statement;
                    const list = Array.isArray(nextCase.statements) ? nextCase.statements : [];
                    if (list.some((s) => s.id === st.id)) {
                        err = 'الإفادة موجودة مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = { ...nextCase, statements: [...list, st] };
                } else if (item.kind === 'lawyer_request') {
                    const req = item.snapshot as LawyerRequest;
                    const list = Array.isArray(nextCase.lawyerRequests) ? nextCase.lawyerRequests : [];
                    if (list.some((r) => r.id === req.id)) {
                        err = 'الطلب موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = { ...nextCase, lawyerRequests: [...list, req] };
                } else if (item.kind === 'other_evidence') {
                    if (otherEvidenceMutationBlocked(nextCase)) {
                        err = 'لا يمكن استرجاع الدليل — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const ev = item.snapshot as OtherEvidenceItem;
                    const list = Array.isArray(nextCase.otherEvidenceItems) ? nextCase.otherEvidenceItems : [];
                    if (list.some((it) => it.id === ev.id)) {
                        err = 'الدليل موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = { ...nextCase, otherEvidenceItems: [...list, ev] };
                } else if (item.kind === 'judicial_decision') {
                    const decision = item.snapshot as JudicialDecision;
                    const list = Array.isArray(nextCase.judicialDecisions) ? nextCase.judicialDecisions : [];
                    if (findJudicialDecisionByRef(list, decision.id)) {
                        err = 'القرار موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = {
                        ...nextCase,
                        judicialDecisions: coalesceJudicialDecisions([...list, decision]),
                    };
                } else if (item.kind === 'procedural_container') {
                    const container = item.snapshot as ProceduralContainer;
                    const list = normalizeProceduralContainers(nextCase.proceduralContainers);
                    if (findContainerInTree(list, container.id)) {
                        err = 'المسار موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    const parentId = String(container.parentId ?? '').trim();
                    const nextContainers = parentId
                        ? insertNestedContainer(list, parentId, container)
                        : insertRootContainer(list, container);
                    nextCase = { ...nextCase, proceduralContainers: nextContainers };
                } else if (item.kind === 'procedural_sub_item') {
                    const wrapped = item.snapshot as ProceduralSubItemTrashSnapshot;
                    const parentId = String(wrapped.parentContainerId ?? '').trim();
                    const subItem = wrapped.item;
                    if (!parentId || !subItem) {
                        err = 'بيانات الاسترجاع غير مكتملة.';
                        return state;
                    }
                    const list = normalizeProceduralContainers(nextCase.proceduralContainers);
                    const parent = findContainerInTree(list, parentId);
                    if (!parent) {
                        err = 'الحاوية الأم غير موجودة — لا يمكن الاسترجاع.';
                        return state;
                    }
                    const subId =
                        subItem.type === 'container' ? subItem.container.id : subItem.id;
                    const exists = parent.container.subItems.some((it) =>
                        it.type === 'container' ? it.container.id === subId : it.id === subId,
                    );
                    if (exists) {
                        err = 'العنصر موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = {
                        ...nextCase,
                        proceduralContainers: appendSubItem(list, parentId, subItem),
                    };
                } else {
                    const log = item.snapshot as InvestigationLog;
                    const list = Array.isArray(nextCase.investigationLogs) ? nextCase.investigationLogs : [];
                    if (list.some((l) => l.id === log.id)) {
                        err = 'السجل موجود مسبقاً — لا يمكن الاسترجاع.';
                        return state;
                    }
                    nextCase = { ...nextCase, investigationLogs: [...list, log] };
                }

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            });
            return err;
        },
        purgeTrashItem: (caseId, trashItemId) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن إفراغ العنصر — الإضبارة مقفلة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const trash = normalizeTrashBin(target.trashBin);
                if (!trash.some((t) => t.id === trashItemId)) {
                    err = 'العنصر غير موجود في سلة المهملات.';
                    return state;
                }
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            trashBin: trash.filter((t) => t.id !== trashItemId),
                        },
                    },
                };
            });
            return err;
        },
        addRequestMargin: (caseId, requestId, text) =>
            set((state) => {
                const trimmed = clampCriminalText(text, CRIMINAL_TEXT_LIMITS.requestMargin).trim();
                if (!trimmed) return state;
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                const idx = list.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const current = list[idx];
                if (!canAddLawyerRequestFollowUpMargin(current)) return state;
                const margin = {
                    id: createId(),
                    date: new Date().toISOString().slice(0, 10),
                    text: trimmed,
                };
                list[idx] = { ...current, margins: [...(current.margins ?? []), margin] };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, lawyerRequests: list },
                    },
                };
            }),
        toggleRequestStar: (caseId, requestId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                const idx = list.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const current = list[idx];
                list[idx] = { ...current, isStarred: current.isStarred !== true };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, lawyerRequests: list },
                    },
                };
            }),
        addRequestAttachment: (caseId, requestId, name) =>
            set((state) => {
                const trimmed = String(name ?? '').trim();
                if (!trimmed) return state;
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                const idx = list.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const current = list[idx];
                if (!canEditLawyerRequestAttachments(current)) return state;
                const attachment = { id: createId(), name: trimmed };
                list[idx] = {
                    ...current,
                    attachments: [...(current.attachments ?? []), attachment],
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, lawyerRequests: list },
                    },
                };
            }),
        removeRequestAttachment: (caseId, requestId, attachmentId) =>
            set((state) => {
                const aid = String(attachmentId ?? '').trim();
                if (!aid) return state;
                const target = state.casesById[caseId];
                if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                const idx = list.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const current = list[idx];
                if (!canEditLawyerRequestAttachments(current)) return state;
                const nextAtt = (current.attachments ?? []).filter((a) => a.id !== aid);
                list[idx] = {
                    ...current,
                    attachments: nextAtt.length ? nextAtt : undefined,
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, lawyerRequests: list },
                    },
                };
            }),
    };
}
