/**
 * Defendant/complainant status, seizures, bail, physical location — split from criminalStoreLifecycleActions.ts
 */
import type { StoreApi } from 'zustand';
import {
    ensureStageJourneyOnCase,
} from './criminalStorePersistSupport';
import {
    normalizeGuarantorDetails,
} from './criminalGuarantorModel';
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
    CriminalComplainant,
    CriminalDefendant,
    DefendantStatus,
    DetentionHistory,
    PhysicalLocation,
    TimelineEvent,
} from './criminalCaseModel';
import {
    investigationJuvenileDetentionAuthorityLabel,
} from './juvenileInvestigationRules';
import {
    resolveCurrentJourneyNodeId,
} from './stageJourneyRuntimeCore';
import {
    findOpenDetentionHistoryIndex,
    readDetentionHistoryLog,
    requiresDetentionAuthority,
    requiresDetentionExpiryDate,
    stampProceduralNodeId,
} from './criminalStoreCaseTransforms';
import type { CriminalStoreState } from './criminalStoreState.types';
import { createCriminalSeizedAssetActions } from './criminalStoreSeizedAssetActions';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalPartyStatusActions(set: SetFn, get: GetFn): Partial<CriminalStoreState> {
    return {
        ...createCriminalSeizedAssetActions(set, get),
        updateCaseDefendantStatus: (caseId, defendantId, status) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const nextStatus = status as DefendantStatus;
                const defs = Array.isArray(target.defendants) ? target.defendants : [];
                const idx = defs.findIndex((d) => d.id === id);
                if (idx < 0) return state;
                const current = defs[idx] as CriminalDefendant;
                const prevStatus = current.status;
                if (prevStatus === nextStatus) return state;

                const date = new Date().toISOString().slice(0, 10);
                const existingHistory = readDetentionHistoryLog(current);
                const openIdx = findOpenDetentionHistoryIndex(existingHistory);
                const startsDetention = requiresDetentionAuthority(nextStatus);
                const endsDetention =
                    nextStatus === 'مكفل' ||
                    nextStatus === 'حر' ||
                    nextStatus === 'provisional_delivery';
                const nextHistory =
                    startsDetention && openIdx < 0
                        ? [
                              ...existingHistory,
                              {
                                  id: createId(),
                                  location: String(current.detentionAuthority ?? '').trim() || 'غير محدد',
                                  startDate: date,
                              },
                          ]
                        : endsDetention && openIdx >= 0
                          ? existingHistory.map((h, i) => (i === openIdx ? { ...h, endDate: date } : h))
                          : existingHistory;

                const updated: CriminalDefendant = {
                    ...current,
                    status: nextStatus,
                    detentionHistoryLog: nextHistory,
                };
                if (
                    nextStatus === 'juvenile_detention' &&
                    Boolean((current as CriminalDefendant).isJuvenile)
                ) {
                    updated.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                }
                if (!requiresDetentionAuthority(updated.status)) updated.detentionAuthority = '';
                if (!requiresDetentionExpiryDate(updated.status)) updated.detentionExpiryDate = '';

                const nextDefendants = defs.map((d, i) => (i === idx ? updated : d));

                const event: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'decision',
                    category: 'تحديث حالة المتهم',
                    title: 'تحديث حالة المتهم',
                    description: `تم تغيير حالة المتهم (${String(current.fullName ?? '').trim() || '—'}) من (${String(
                        prevStatus ?? '',
                    ) || '—'}) إلى (${String(nextStatus ?? '') || '—'}).`,
                    defendantIds: [id],
                };

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            defendants: nextDefendants,
                            timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                        },
                    },
                };
            }),
        updateCrossComplainantAccusedStatus: (caseId, complainantId, status) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cid = String(complainantId ?? '').trim();
                if (!cid) return state;
                const nextStatus = status as DefendantStatus;
                const comps = Array.isArray(target.complainants) ? target.complainants : [];
                const idx = comps.findIndex((c) => c.id === cid);
                if (idx < 0) return state;
                const current = comps[idx] as CriminalComplainant;
                // 🛡️ منع التغيير على مشتكٍ غير حامل لصفة متقابلة (لا case-level ولا per-complainant).
                const isAccused =
                    target.isMutualComplaint === true || current.isCrossComplaint === true;
                if (!isAccused) return state;
                const prevStatus = current.accusedStatus ?? '';
                if (prevStatus === nextStatus) return state;

                const date = new Date().toISOString().slice(0, 10);
                const existingHistory = Array.isArray(current.accusedDetentionHistoryLog)
                    ? current.accusedDetentionHistoryLog
                    : [];
                const openIdx = (() => {
                    for (let i = existingHistory.length - 1; i >= 0; i--) {
                        const it = existingHistory[i] as DetentionHistory | undefined;
                        if (it && !String(it.endDate ?? '').trim()) return i;
                    }
                    return -1;
                })();
                const startsDetention = requiresDetentionAuthority(nextStatus);
                const endsDetention =
                    nextStatus === 'مكفل' ||
                    nextStatus === 'حر' ||
                    nextStatus === 'provisional_delivery';
                const nextHistory: DetentionHistory[] =
                    startsDetention && openIdx < 0
                        ? [
                              ...existingHistory,
                              {
                                  id: createId(),
                                  location:
                                      String(current.accusedDetentionAuthority ?? '').trim() ||
                                      'غير محدد',
                                  startDate: date,
                              },
                          ]
                        : endsDetention && openIdx >= 0
                          ? existingHistory.map((h, i) =>
                                i === openIdx ? { ...h, endDate: date } : h,
                            )
                          : existingHistory;

                const updated: CriminalComplainant = {
                    ...current,
                    accusedStatus: nextStatus,
                    accusedDetentionHistoryLog: nextHistory,
                };
                if (
                    nextStatus === 'juvenile_detention' &&
                    Boolean((current as CriminalComplainant).isJuvenile)
                ) {
                    updated.accusedDetentionAuthority =
                        investigationJuvenileDetentionAuthorityLabel();
                }
                if (!requiresDetentionAuthority(nextStatus)) updated.accusedDetentionAuthority = '';
                if (!requiresDetentionExpiryDate(nextStatus)) updated.accusedDetentionExpiryDate = '';

                const nextComplainants = comps.map((c, i) => (i === idx ? updated : c));

                const event: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'decision',
                    category: 'تحديث حالة المشتكي (شكوى متقابلة)',
                    title: 'تحديث حالة المشتكي بصفته متهماً',
                    description: `تم تغيير حالة المشتكي (${String(current.fullName ?? '').trim() || '—'}) بصفته متهماً في شكوى متقابلة من (${String(
                        prevStatus ?? '',
                    ) || '—'}) إلى (${String(nextStatus ?? '') || '—'}).`,
                    complainantIds: [cid],
                };

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            complainants: nextComplainants,
                            timelineEvents: [
                                ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                event,
                            ],
                        },
                    },
                };
            }),
        registerCrossComplainantAccusedDeath: (caseId, complainantId, date) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (target.isArchived) return state;
                const cid = String(complainantId ?? '').trim();
                if (!cid) return state;
                const comps = Array.isArray(target.complainants) ? target.complainants : [];
                const idx = comps.findIndex((c) => c.id === cid);
                if (idx < 0) return state;
                const current = comps[idx] as CriminalComplainant;
                const isAccused =
                    target.isMutualComplaint === true || current.isCrossComplaint === true;
                if (!isAccused) return state;
                if ((current as { accusedIsPartyRecordLocked?: boolean }).accusedIsPartyRecordLocked) {
                    return state;
                }
                const eventDate = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
                const name = String(current.fullName ?? '').trim() || '—';
                const nodeId = resolveCurrentJourneyNodeId(
                    ensureStageJourneyOnCase(target).stageJourney,
                );
                const event: TimelineEvent = stampProceduralNodeId(
                    {
                        id: createId(),
                        date: eventDate,
                        type: 'decision',
                        category: 'سقوط الدعوى الفرعية — وفاة مشتكي متقابل',
                        title: 'وفاة مشتكي متقابل',
                        description: `⚠️ سقوط الدعوى الجزائية الفرعية بحق المشتكي ${name} (شكوى متقابلة) لوفاته`,
                        complainantIds: [cid],
                    },
                    nodeId,
                );
                const updated: CriminalComplainant = {
                    ...current,
                    accusedStatus: 'متوفى' as DefendantStatus,
                    accusedIsPartyRecordLocked: true,
                    accusedPersonalStage: 'lawsuit_dropped_death',
                    accusedDetentionAuthority: '',
                    accusedDetentionExpiryDate: '',
                };
                const nextComps = comps.map((c, i) => (i === idx ? updated : c));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            complainants: nextComps,
                            timelineEvents: [
                                ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                event,
                            ],
                        },
                    },
                };
            }),
        confirmBailAfterAppeal: (caseId, defendantIds) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                const rawIds = Array.isArray(defendantIds)
                    ? defendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
                    : [];
                const ids = resolveProceduralDefendantIds(
                    Array.isArray(target.complainants) ? target.complainants : [],
                    Array.isArray(target.defendants) ? target.defendants : [],
                    rawIds,
                    target.isMutualComplaint === true,
                );
                const today = new Date().toISOString().slice(0, 10);
                const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                    if (ids.length && !ids.includes(d.id)) return d;

                    const existingHistory = readDetentionHistoryLog(d);
                    const openIdx = findOpenDetentionHistoryIndex(existingHistory);
                    const nextHistory =
                        openIdx >= 0
                            ? existingHistory.map((h, i) => (i === openIdx ? { ...h, endDate: today } : h))
                            : existingHistory;

                    const next = { ...d, status: 'مكفل' as DefendantStatus, detentionHistoryLog: nextHistory };
                    if (!requiresDetentionAuthority(next.status)) next.detentionAuthority = '';
                    if (!requiresDetentionExpiryDate(next.status)) next.detentionExpiryDate = '';
                    return next;
                });

                const event: TimelineEvent = {
                    id: createId(),
                    date: today,
                    type: 'decision',
                    category: 'تصديق الكفالة',
                    title: 'تصديق الكفالة',
                    description: 'انقضاء مهلة طعن الادعاء العام، وتم إطلاق سراح المتهم بكفالة رسمياً.',
                    defendantIds: ids.length ? ids : undefined,
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, defendants: nextDefendants, timelineEvents: [...(target.timelineEvents ?? []), event] },
                    },
                };
            }),
        fileInAbsentiaObjection: (caseId, defendantId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const today = new Date().toISOString().slice(0, 10);
                let didUpdate = false;
                const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                    if (d.id !== id) return d;
                    const det = d.inAbsentiaDetails;
                    if (!det) return d;
                    if (det.isObjectionFiled) return d;
                    didUpdate = true;
                    return { ...d, inAbsentiaDetails: { ...det, isObjectionFiled: true } };
                });
                if (!didUpdate) return state;
                const event: TimelineEvent = {
                    id: createId(),
                    date: today,
                    type: 'decision',
                    category: 'تقديم اعتراض على الحكم الغيابي',
                    title: 'تقديم اعتراض على الحكم الغيابي',
                    description: 'تم تقديم لائحة الاعتراض وتسليم المتهم لإعادة المحاكمة الاعتراضية.',
                    defendantIds: [id],
                };
                const firstSession: TimelineEvent = {
                    id: createId(),
                    date: today,
                    type: 'court_session',
                    category: 'جلسة المحاكمة الاعتراضية الأولى',
                    title: 'جلسة المحاكمة الاعتراضية الأولى',
                    description: 'تم فتح أول جلسة للمحاكمة الاعتراضية بعد تقديم الاعتراض.',
                    defendantIds: [id],
                };
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            defendants: nextDefendants,
                            timelineEvents: [
                                ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                event,
                                firstSession,
                            ],
                        },
                    },
                };
            }),
        updateBailForfeiture: (caseId, defendantId, data) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                const id = String(defendantId ?? '').trim();
                if (!id) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const hasTarget = list.some((d) => d.id === id);
                if (!hasTarget) return state;

                const note =
                    data && typeof data === 'object' && typeof data.forfeitureNote === 'string'
                        ? String(data.forfeitureNote).trim()
                        : '';
                const existingDef = list.find((d) => d.id === id);
                const existingGuarantor = normalizeGuarantorDetails(existingDef?.guarantorDetails);
                if (!existingGuarantor) return state;

                const nextInfo = note || existingGuarantor.guarantorInfo;
                if (nextInfo === existingGuarantor.guarantorInfo) return state;

                const nextDefendants = list.map((d) => {
                    if (d.id !== id) return d;
                    return {
                        ...d,
                        guarantorDetails: { ...existingGuarantor, guarantorInfo: nextInfo },
                    };
                });

                const date = new Date().toISOString().slice(0, 10);
                const desc = note ? `ملاحظة مصادرة الكفالة: ${note}` : 'تم تحديث بيانات الكفالة';
                const ev: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'decision',
                    category: 'تحديث مصادرة الكفالة',
                    title: 'مصادرة الكفالة',
                    description: desc,
                    defendantIds: [id],
                };

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            defendants: nextDefendants,
                            timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), ev],
                        },
                    },
                };
            }),
        updateCasePhysicalLocation: (caseId, location, customName) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (target.isArchived) return state;

                const normalizedLocation: PhysicalLocation = [
                    'judge_desk',
                    'investigator_room',
                    'prosecution',
                    'police_station',
                    'archive',
                    'custom',
                ].includes(String(location))
                    ? (String(location) as PhysicalLocation)
                    : 'custom';
                const normalizedCustom =
                    normalizedLocation === 'custom' ? String(customName ?? '').trim() : '';

                const didChange =
                    String(target.physicalLocation ?? 'custom') !== normalizedLocation ||
                    String(target.physicalLocationCustomName ?? '').trim() !== normalizedCustom;
                if (!didChange) return state;

                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            physicalLocation: normalizedLocation,
                            physicalLocationCustomName: normalizedLocation === 'custom' ? normalizedCustom : '',
                        },
                    },
                };
            }),
    };
}
