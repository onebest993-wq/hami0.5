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
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
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
import { createCriminalDetentionDecisionActions } from './criminalStoreDetentionDecisionActions';
import { createCriminalJudicialDecisionLifecycleActions } from './criminalStoreJudicialDecisionLifecycleActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalLawyerRequestActions(set: SetFn, get: GetFn) {
    return {
        ...createCriminalDetentionDecisionActions(set, get),
        ...createCriminalJudicialDecisionLifecycleActions(set, get),
        addOrUpdateRequest: (caseId, request) =>
            set((state) => {
                const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
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
                              const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus, detentionHistoryLog: updatedHistory };
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
        createLawyerRequest: (caseId, input) => {
            const err = validateCreateLawyerRequestInput(input);
            if (err) return { error: err, requestId: null };
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return { error: 'تعذّر تسجيل الطلب.', requestId: null };
            const resolved = resolveStoredRequestTypeFields(
                input.proceduralTemplate,
                String(input.customTypeName ?? ''),
                input.isAppealable === true,
            );
            const detentionStart = String(input.detentionStartDate ?? '').trim();
            const detentionEnd = String(input.detentionEndDate ?? '').trim();
            const requestDate = String(input.requestDate).trim();
            const lawyerNote = String(input.lawyerNote).trim();
            const isJudicial = isJudicialDecisionTemplate(resolved.proceduralTemplate);
            if (isInvestigationSeveranceJudicialTemplate(resolved.proceduralTemplate)) {
                return {
                    error: 'قرار تفريق الإضبارة يُكمَّل عبر مسار شطر الإضبارة — اختر المتهمين ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                    requestId: null,
                };
            }
            const requestedPartyIds = filterUnknownDefendantsFromPartyIds(
                target.defendants,
                input.defendantIds,
            );
            if (
                Array.isArray(input.defendantIds) &&
                input.defendantIds.length > requestedPartyIds.length &&
                isDefendantTargetRequestTemplate(resolved.proceduralTemplate)
            ) {
                return { error: UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE, requestId: null };
            }
            if (
                isJudicial &&
                requiresInvestigationPurgeDefendantScope(resolved.proceduralTemplate) &&
                resolveCaseStageFromRecord(target) === 'investigation'
            ) {
                const purgeIds = resolveInvestigationClosureDefendantIds(target, {
                    id: 'pending',
                    requestDate,
                    type: resolved.type,
                    lawyerNote,
                    status: 'executed',
                    defendantIds: requestedPartyIds,
                    proceduralTemplate: resolved.proceduralTemplate,
                });
                if (!purgeIds.length) {
                    return {
                        error: 'حدّد متهماً واحداً على الأقل مشمولاً بقرار الغلق/الصلح/التفريق.',
                        requestId: null,
                    };
                }
            }
            const legalArticleBasis = String(input.legalArticleBasis ?? '').trim() || undefined;
            const orderEnforcement = buildInitialOrderEnforcement(
                resolved.proceduralTemplate,
                legalArticleBasis ?? '',
                input.enforcementKind,
            );
            const defendantBailPayload = (() => {
                const b = input.defendantBail;
                if (!b || (b.kind !== 'financial' && b.kind !== 'personal')) return undefined;
                if (b.kind === 'financial') {
                    const amt = String(b.bailAmount ?? '').trim();
                    if (!amt) return undefined;
                    return { kind: 'financial' as const, bailAmount: amt };
                }
                const list = Array.isArray(b.guarantors) ? b.guarantors : [];
                const guarantors: GuarantorPerson[] = list
                    .map((g, i) => ({
                        id: String(g?.id ?? '').trim() || `g_${Date.now()}_${i}`,
                        fullName: String(g?.fullName ?? '').trim(),
                    }))
                    .filter((g) => g.fullName.length > 0);
                if (guarantors.length === 0) return undefined;
                return { kind: 'personal' as const, guarantors };
            })();
            /**
             * بيانات «حجز الأموال» المهيكلة — تُنظَّف وتُختصر على الأصناف ذات الوصف،
             * ثم تُلتقط معرّفات للأصناف لإلصاقها بكل متهم لاحقاً.
             */
            const assetSeizurePayload = (() => {
                const s = input.assetSeizure;
                if (!s || !Array.isArray(s.perDefendant) || s.perDefendant.length === 0) return undefined;
                const cleaned = s.perDefendant
                    .map((entry) => {
                        const did = String(entry?.defendantId ?? '').trim();
                        if (!did) return null;
                        const assets: SeizedAsset[] = (Array.isArray(entry?.assets) ? entry.assets : [])
                            .map((a, i) => {
                                const description = String(a?.description ?? '').trim();
                                if (!description) return null;
                                const out: SeizedAsset = {
                                    id: `${createId()}_${i}`,
                                    description,
                                    createdAt: new Date().toISOString(),
                                };
                                const ref = String(a?.referenceNumber ?? '').trim();
                                if (ref) out.referenceNumber = ref;
                                const dt = String(a?.seizureDate ?? '').trim();
                                if (dt) out.seizureDate = dt;
                                const notes = String(a?.notes ?? '').trim();
                                if (notes) out.notes = notes;
                                return out;
                            })
                            .filter((x): x is SeizedAsset => x !== null);
                        if (!assets.length) return null;
                        return { defendantId: did, assets };
                    })
                    .filter((x): x is { defendantId: string; assets: SeizedAsset[] } => x !== null);
                if (!cleaned.length) return undefined;
                return { perDefendant: cleaned };
            })();
            const request: LawyerRequest = {
                id: createId(),
                requestDate,
                type: resolved.type,
                lawyerNote,
                status: isJudicial ? 'executed' : 'pending',
                defendantIds: requestedPartyIds.length ? requestedPartyIds : undefined,
                proceduralTemplate: resolved.proceduralTemplate,
                isAppealable: resolved.isAppealable,
                detentionStartDate: detentionStart || undefined,
                detentionEndDate: detentionEnd || undefined,
                legalArticleBasis: orderEnforcement?.legalArticleBasis ?? legalArticleBasis,
                orderEnforcement,
                referredCourtName: String(input.referredCourtName ?? '').trim() || undefined,
                defendantBail: defendantBailPayload,
                assetSeizure: assetSeizurePayload,
                ...(isJudicial
                    ? {
                          isLocked: true,
                          decisionArchived: true,
                          judgeMargin: lawyerNote,
                          decisionDate: requestDate,
                      }
                    : {}),
            };
            if (isJudicial) {
                set((state) => {
                    const t = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!t) return state;
                    const nodeId = resolveCurrentJourneyNodeId(t.stageJourney);
                    const stamped = stampProceduralNodeId(request, nodeId);
                    const reqs = Array.isArray(t.lawyerRequests) ? t.lawyerRequests : [];
                    let nextCase = applyLawyerRequestOutcomeOnCase(
                        { ...t, lawyerRequests: [...reqs, stamped] },
                        stamped,
                    );
                    /**
                     * إذا كان القرار «حجز الأموال» — نُلصق الأصناف بكل طرف هارب مُختار،
                     * ونُولّد سجلّاً واحداً في التايم لاين لكل طرف. نَحترم شرط «الهروب» حصراً.
                     *
                     * ⚖️ ازدواجية الصفة (شكوى متقابلة): إن كان perDefendant.defendantId يُطابق
                     *    مشتكياً متقابلاً، تُلصق الأصناف على حقل `accusedSeizedAssets`
                     *    داخل سجل المشتكي نفسه — لا نَنقل الكائن إلى مصفوفة المتهمين.
                     */
                    if (assetSeizurePayload) {
                        const caseIsMutual = (nextCase as { isMutualComplaint?: boolean }).isMutualComplaint === true;
                        const defendantsArr = Array.isArray(nextCase.defendants) ? nextCase.defendants : [];
                        const complainantsArr = Array.isArray(nextCase.complainants) ? nextCase.complainants : [];
                        const seizureEvents: TimelineEvent[] = [];
                        const stampToday = new Date().toISOString().slice(0, 10);
                        const updatedDefendants = defendantsArr.map((d) => {
                            const entry = assetSeizurePayload.perDefendant.find(
                                (p) => p.defendantId === d.id,
                            );
                            if (!entry) return d;
                            if (d.status !== 'هارب') return d;
                            const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
                            const prevAssets = Array.isArray(d.seizedAssets) ? d.seizedAssets : [];
                            seizureEvents.push({
                                id: createId(),
                                date: stampToday,
                                type: 'decision',
                                category: 'حجز الأموال',
                                title: `حجز أموال على المتهم الهارب: ${String(d.fullName ?? '').trim() || '—'}`,
                                description: stamp.map((a) => `• ${a.description}`).join('\n'),
                                defendantIds: [d.id],
                            });
                            return { ...d, seizedAssets: [...prevAssets, ...stamp] };
                        });
                        const updatedComplainants = complainantsArr.map((c) => {
                            const entry = assetSeizurePayload.perDefendant.find(
                                (p) => p.defendantId === c.id,
                            );
                            if (!entry) return c;
                            const isAccused =
                                caseIsMutual ||
                                (c as { isCrossComplaint?: boolean }).isCrossComplaint === true;
                            if (!isAccused) return c;
                            if ((c as { accusedStatus?: string }).accusedStatus !== 'هارب') return c;
                            const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
                            const prevAssets = Array.isArray(
                                (c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets,
                            )
                                ? ((c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets as SeizedAsset[])
                                : [];
                            seizureEvents.push({
                                id: createId(),
                                date: stampToday,
                                type: 'decision',
                                category: 'حجز الأموال (شكوى متقابلة)',
                                title: `حجز أموال على المشتكي الهارب: ${String(c.fullName ?? '').trim() || '—'}`,
                                description: stamp.map((a) => `• ${a.description}`).join('\n'),
                                complainantIds: [c.id],
                            });
                            return { ...c, accusedSeizedAssets: [...prevAssets, ...stamp] };
                        });
                        const prevEvents = Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : [];
                        nextCase = {
                            ...nextCase,
                            defendants: updatedDefendants,
                            complainants: updatedComplainants,
                            timelineEvents: seizureEvents.length
                                ? [...prevEvents, ...seizureEvents]
                                : prevEvents,
                        };
                    }
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
            } else {
                get().addOrUpdateRequest(caseId, request);
            }
            return { error: null, requestId: request.id };
        },
        finalizeLawyerRequest: (caseId, requestId, input) => {
            const target = get().casesById[caseId] as CriminalCase | undefined;
            if (!target || caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, get().sessionOwnerLawyerId)) return 'تعذّر حفظ هامش القاضي.';
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
        updateLawyerRequest: (caseId, requestId, updatedData) =>
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
        moveLawyerRequestToTrash: (caseId, requestId) => {
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
        deleteLawyerRequest: (caseId, requestId) => {
            get().moveLawyerRequestToTrash(caseId, requestId);
        },
        moveJudicialDecisionToTrash: (caseId, decisionRef) => {
            const ref = String(decisionRef ?? '').trim();
            if (!ref) return 'معرّف القرار غير صالح.';
            const target = get().casesById[caseId];
            if (!target) return 'الإضبارة غير موجودة.';
            if (caseMaterialProcedureBlocked(target)) {
                return 'لا يمكن حذف القرار — الإضبارة مقفلة.';
            }
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
