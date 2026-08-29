/**
 * CRUD طلبات المحامي (إضافة/تحديث/إنهاء) — مُستخرَج من criminalStoreLawyerRequestActions.ts
 */
import type { StoreApi } from 'zustand';
import { ensureStageJourneyOnCase } from './criminalStorePersistSupport';
import { resolveProceduralDefendantIds } from './criminalProceduralPartyUtils';
import { caseMutationBlocked } from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import type { CriminalCase, DefendantStatus, LawyerRequest } from './criminalCaseModel';
import { isLawyerRequestPending } from './lawyerRequestStatusMachine';
import {
    stripLawyerRequestDecisionPatch,
    validateFinalizeLawyerRequestInput,
    type FinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import {
    applyLawyerRequestOutcomeOnCase,
    findOpenDetentionHistoryIndex,
    readDetentionHistoryLog,
    readLawyerRequestDefendantIds,
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
    stampProceduralNodeId,
    upsertJudicialDecisionOnCase,
} from './criminalStoreCaseTransforms';
import { resolveCurrentJourneyNodeId } from './stageJourneyRuntimeCore';
import type { CriminalStoreState } from './criminalStoreState.types';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLawyerRequestCrudActions(set: SetFn, get: GetFn) {
    return {
        addOrUpdateRequest: (caseId: string, request: LawyerRequest) =>
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) {
                    return state;
                }
                const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                const idx = list.findIndex((r) => r.id === request.id);
                const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                const isNew = idx < 0;
                const stampedReq = stampProceduralNodeId(
                    isNew
                        ? ({
                              ...request,
                              status: 'pending',
                              judgeMargin: undefined,
                              decisionDate: undefined,
                              isLocked: false,
                              decisionArchived: undefined,
                          } as LawyerRequest)
                        : request,
                    nodeId,
                );
                if (!isNew && (stampedReq.status !== 'pending' || stampedReq.isLocked)) {
                    return state;
                }
                const next = idx >= 0 ? list.map((r, i) => (i === idx ? stampedReq : r)) : [...list, stampedReq];
                const isBailApproval =
                    request.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(request.type ?? ''));
                const partyIds = readLawyerRequestDefendantIds(request);
                const defendantIds = resolveProceduralDefendantIds(
                    Array.isArray(target.complainants) ? target.complainants : [],
                    Array.isArray(target.defendants) ? target.defendants : [],
                    partyIds,
                    target.isMutualComplaint === true,
                );
                const nextDefendants =
                    isBailApproval && defendantIds.length
                        ? (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                              if (!defendantIds.includes(d.id)) return d;
                              const nextHistory = readDetentionHistoryLog(d);
                              const decisionDate = String(request.decisionDate ?? request.requestDate ?? '').trim();
                              const closeDate = decisionDate || new Date().toISOString().slice(0, 10);
                              const openIdx = findOpenDetentionHistoryIndex(nextHistory);
                              const updatedHistory =
                                  openIdx >= 0
                                      ? nextHistory.map((h, i) => (i === openIdx ? { ...h, endDate: closeDate } : h))
                                      : nextHistory;
                              const nextDef = {
                                  ...d,
                                  status: 'bailed_pending_appeal' as DefendantStatus,
                                  detentionHistoryLog: updatedHistory,
                              };
                              if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                              if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                              return nextDef;
                          })
                        : target.defendants;
                let nextCase: CriminalCase = {
                    ...target,
                    defendants: nextDefendants,
                    lawyerRequests: next,
                };
                nextCase = upsertJudicialDecisionOnCase(nextCase, stampedReq);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            }),
        finalizeLawyerRequest: (caseId: string, requestId: string, input: FinalizeLawyerRequestInput) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) {
                return 'تعذّر حفظ هامش القاضي.';
            }
            const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
            const current = list.find((r) => r.id === requestId);
            if (!current) return 'الطلب غير موجود.';
            const err = validateFinalizeLawyerRequestInput(input, current.requestDate);
            if (err) return err;
            if (current.status === 'executed') return 'قرار نافذ — لا يُعدَّل عبر مسار الطلب.';
            if (!isLawyerRequestPending(current)) return 'الطلب ليس قيد النظر أو مُقفلاً مسبقاً.';
            const decisionDate = String(input.decisionDate).trim();
            const requestDate = String(current.requestDate ?? '').trim();
            set((state) => {
                const t = state.casesById[caseId] as CriminalCase | undefined;
                if (!t) return state;
                const reqs = Array.isArray(t.lawyerRequests) ? t.lawyerRequests : [];
                const idx = reqs.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const finalStatus: LawyerRequest['status'] =
                    input.status === 'approved' ? 'approved' : 'rejected';
                const nextRequest: LawyerRequest = {
                    ...reqs[idx]!,
                    status: finalStatus,
                    judgeMargin: String(input.judgeMargin).trim(),
                    decisionDate,
                    isLocked: true,
                    decisionArchived: true,
                };
                const next = reqs.map((r, i) => (i === idx ? nextRequest : r));
                const nextCase = applyLawyerRequestOutcomeOnCase({ ...t, lawyerRequests: next }, nextRequest);
                return { casesById: { ...state.casesById, [caseId]: nextCase } };
            });
            const type = String(current.type ?? '').trim();
            const isWaiverDecision =
                /صلح/.test(type) && /تنازل/.test(type) && /حق شخصي|الحق الشخصي/.test(type);
            if (isWaiverDecision && input.status === 'approved') {
                get().waivePrivateRight(caseId, decisionDate || requestDate);
            }
            return null;
        },
        updateLawyerRequest: (caseId: string, requestId: string, updatedData: Partial<LawyerRequest>) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                const idx = list.findIndex((r) => r.id === requestId);
                if (idx < 0) return state;
                const current = list[idx];
                if (current.isLocked === true || current.decisionArchived === true) {
                    return state;
                }
                if (!isLawyerRequestPending(current)) {
                    return state;
                }
                const patch = stripLawyerRequestDecisionPatch(updatedData);
                const nextRequest = {
                    ...list[idx],
                    ...patch,
                    id: list[idx].id,
                } as LawyerRequest;
                const next = list.map((r, i) => (i === idx ? nextRequest : r));
                const isBailApproval =
                    nextRequest.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(nextRequest.type ?? ''));
                const partyIds = readLawyerRequestDefendantIds(nextRequest);
                const defendantIds = resolveProceduralDefendantIds(
                    Array.isArray(target.complainants) ? target.complainants : [],
                    Array.isArray(target.defendants) ? target.defendants : [],
                    partyIds,
                    target.isMutualComplaint === true,
                );
                const nextDefendants =
                    isBailApproval && defendantIds.length
                        ? (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                              if (!defendantIds.includes(d.id)) return d;
                              const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                              if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                              if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                              return nextDef;
                          })
                        : target.defendants;
                let nextCase: CriminalCase = { ...target, defendants: nextDefendants, lawyerRequests: next };
                nextCase = upsertJudicialDecisionOnCase(nextCase, nextRequest);
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                };
            }),
    };
}
