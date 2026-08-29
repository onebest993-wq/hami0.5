/**
 * سلة مهملات طلبات المحامي والقرارات — مُستخرَج من criminalStoreLawyerRequestActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    findJudicialDecisionByRef,
    findJudicialDecisionStoreIndex,
} from './judicialDecisionsEngine';
import {
    appendCaseTrashItem,
    caseMaterialProcedureBlocked,
    filterOutJudicialDecisionsForRequest,
} from './criminalStoreCaseTransforms';
import { rejectCriminalCaseMutation } from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLawyerRequestTrashActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        moveLawyerRequestToTrash: (caseId: string, requestId: string) => {
            let err: string | null = null;
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (caseMaterialProcedureBlocked(target)) {
                    err = 'لا يمكن حذف الطلب — الإضبارة مقفلة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(target, state.sessionOwnerLawyerId);
                if (err) return state;
                const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                const doomed = list.find((r) => r.id === requestId);
                if (!doomed) {
                    err = 'الطلب غير موجود.';
                    return state;
                }
                const next = list.filter((r) => r.id !== requestId);
                const nextJudicial = filterOutJudicialDecisionsForRequest(target.judicialDecisions, requestId);
                const nextCase = appendCaseTrashItem(
                    { ...target, lawyerRequests: next, judicialDecisions: nextJudicial },
                    'lawyer_request',
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
        deleteLawyerRequest: (caseId: string, requestId: string) => {
            // Owner/session guard lives in moveLawyerRequestToTrash.
            get().moveLawyerRequestToTrash(caseId, requestId);
        },
        moveJudicialDecisionToTrash: (caseId: string, decisionRef: string) => {
            const ref = String(decisionRef ?? '').trim();
            if (!ref) return 'معرّف القرار غير صالح.';
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            if (caseMaterialProcedureBlocked(target)) {
                return 'لا يمكن حذف القرار — الإضبارة مقفلة.';
            }
            const ownerDenied = rejectCriminalCaseMutation(target, get().sessionOwnerLawyerId);
            if (ownerDenied) return ownerDenied;
            const stored = Array.isArray(target.judicialDecisions) ? target.judicialDecisions : [];
            const doomed = findJudicialDecisionByRef(stored, ref);
            const sourceRequestId = String(doomed?.sourceRequestId ?? '').trim();
            if (sourceRequestId) {
                const requests = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                if (requests.some((r) => r.id === sourceRequestId)) {
                    return get().moveLawyerRequestToTrash(caseId, sourceRequestId);
                }
            }
            if (!doomed) return 'القرار غير موجود.';
            let err: string | null = null;
            set((state) => {
                const row = state.casesById[caseId];
                if (!row) {
                    err = 'الإضبارة غير موجودة.';
                    return state;
                }
                if (caseMaterialProcedureBlocked(row)) {
                    err = 'لا يمكن حذف القرار — الإضبارة مقفلة.';
                    return state;
                }
                err = rejectCriminalCaseMutation(row, state.sessionOwnerLawyerId);
                if (err) return state;
                const list = Array.isArray(row.judicialDecisions) ? [...row.judicialDecisions] : [];
                const idx = findJudicialDecisionStoreIndex(list, doomed);
                if (idx < 0) {
                    err = 'القرار غير موجود.';
                    return state;
                }
                const picked = list[idx]!;
                const filtered = list.filter((_, i) => i !== idx);
                const nextCase = appendCaseTrashItem(
                    { ...row, judicialDecisions: filtered },
                    'judicial_decision',
                    picked,
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
    };
}
