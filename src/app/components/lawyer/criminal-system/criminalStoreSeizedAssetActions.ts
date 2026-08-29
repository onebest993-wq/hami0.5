/**
 * Seized-asset party actions — Wave 7h extract from criminalStorePartyStatusActions.
 */
import type { StoreApi } from 'zustand';
import { createCriminalId as createId } from './criminalIdUtils';
import type { CriminalComplainant, CriminalDefendant } from './criminalCaseModel';
import type { SeizedAsset } from './criminalSeizedAssetModel';
import { caseMutationBlocked } from './criminalCaseMutationPolicy';
import { isCriminalCaseMutationBlocked } from './criminalCaseMutationGuard';
import type { CriminalStoreState } from './criminalStoreState.types';
import type { TimelineEvent } from './criminalCaseModel';

type SetFn = StoreApi<CriminalStoreState>['setState'];
type GetFn = StoreApi<CriminalStoreState>['getState'];

export function createCriminalSeizedAssetActions(set: SetFn, _get: GetFn): Partial<CriminalStoreState> {
    return {
        addCrossComplainantSeizedAssets: (caseId, complainantId, assets, sourceRequestId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cid = String(complainantId ?? '').trim();
                if (!cid) return state;
                const comps = Array.isArray(target.complainants) ? target.complainants : [];
                const idx = comps.findIndex((c) => c.id === cid);
                if (idx < 0) return state;
                const current = comps[idx] as CriminalComplainant;
                const isAccused =
                    target.isMutualComplaint === true || current.isCrossComplaint === true;
                if (!isAccused) return state;
                const stampedDate = new Date().toISOString();
                const cleaned: SeizedAsset[] = (Array.isArray(assets) ? assets : [])
                    .map((a) => {
                        const description = String(a?.description ?? '').trim();
                        if (!description) return null;
                        const out: SeizedAsset = {
                            id: String(a?.id ?? '').trim() || createId(),
                            description,
                            referenceNumber: String(a?.referenceNumber ?? '').trim() || undefined,
                            seizureDate: String(a?.seizureDate ?? '').trim() || undefined,
                            notes: String(a?.notes ?? '').trim() || undefined,
                            createdAt: String(a?.createdAt ?? '').trim() || stampedDate,
                            sourceRequestId: sourceRequestId || undefined,
                        };
                        return out;
                    })
                    .filter((x): x is SeizedAsset => x !== null);
                if (!cleaned.length) return state;
                const prev = Array.isArray(current.accusedSeizedAssets)
                    ? current.accusedSeizedAssets
                    : [];
                const next: CriminalComplainant = {
                    ...current,
                    accusedSeizedAssets: [...prev, ...cleaned],
                };
                const nextComps = comps.map((c, i) => (i === idx ? next : c));
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, complainants: nextComps },
                    },
                };
            }),
        updateCrossComplainantSeizedAsset: (caseId, complainantId, assetId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cid = String(complainantId ?? '').trim();
                const aid = String(assetId ?? '').trim();
                if (!cid || !aid) return state;
                const comps = Array.isArray(target.complainants) ? target.complainants : [];
                const cIdx = comps.findIndex((c) => c.id === cid);
                if (cIdx < 0) return state;
                const current = comps[cIdx] as CriminalComplainant;
                const assets = Array.isArray(current.accusedSeizedAssets)
                    ? current.accusedSeizedAssets
                    : [];
                const aIdx = assets.findIndex((a) => a.id === aid);
                if (aIdx < 0) return state;
                const prevAsset = assets[aIdx]!;
                const nextAsset: SeizedAsset = { ...prevAsset };
                if (patch.description !== undefined) {
                    const d = String(patch.description).trim();
                    if (!d) return state;
                    nextAsset.description = d;
                }
                if (patch.referenceNumber !== undefined) {
                    nextAsset.referenceNumber =
                        String(patch.referenceNumber).trim() || undefined;
                }
                if (patch.seizureDate !== undefined) {
                    nextAsset.seizureDate = String(patch.seizureDate).trim() || undefined;
                }
                if (patch.notes !== undefined) {
                    nextAsset.notes = String(patch.notes).trim() || undefined;
                }
                const nextAssets = assets.map((a, i) => (i === aIdx ? nextAsset : a));
                const nextComps = comps.map((c, i) =>
                    i === cIdx ? { ...c, accusedSeizedAssets: nextAssets } : c,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, complainants: nextComps },
                    },
                };
            }),
        releaseCrossComplainantSeizedAssets: (caseId, complainantId, assetIds) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const cid = String(complainantId ?? '').trim();
                if (!cid) return state;
                const comps = Array.isArray(target.complainants) ? target.complainants : [];
                const cIdx = comps.findIndex((c) => c.id === cid);
                if (cIdx < 0) return state;
                const current = comps[cIdx] as CriminalComplainant;
                const assets = Array.isArray(current.accusedSeizedAssets)
                    ? current.accusedSeizedAssets
                    : [];
                if (!assets.length) return state;
                const idsSet = new Set(
                    (Array.isArray(assetIds) ? assetIds : [])
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean),
                );
                const remaining = idsSet.size
                    ? assets.filter((a) => !idsSet.has(a.id))
                    : [];
                if (remaining.length === assets.length) return state;
                const nextComps = comps.map((c, i) =>
                    i === cIdx ? { ...c, accusedSeizedAssets: remaining } : c,
                );
                return {
                    casesById: {
                        ...state.casesById,
                        [caseId]: { ...target, complainants: nextComps },
                    },
                };
            }),
        addDefendantSeizedAssets: (caseId, defendantId, assets, sourceRequestId) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const did = String(defendantId ?? '').trim();
                if (!did) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const idx = list.findIndex((d) => d.id === did);
                if (idx < 0) return state;
                const current = list[idx];
                // Only fugitives are eligible — guard mirrors the UI gate.
                if (current.status !== 'هارب') return state;

                const nowIso = new Date().toISOString();
                const cleaned = (Array.isArray(assets) ? assets : [])
                    .map((a, i) => {
                        const description = String(a?.description ?? '').trim();
                        if (!description) return null;
                        const out: SeizedAsset = {
                            id: String(a?.id ?? '').trim() || `${createId()}_${i}`,
                            description,
                            createdAt: String(a?.createdAt ?? '').trim() || nowIso,
                        };
                        const ref = String(a?.referenceNumber ?? '').trim();
                        if (ref) out.referenceNumber = ref;
                        const dt = String(a?.seizureDate ?? '').trim();
                        if (dt) out.seizureDate = dt;
                        const notes = String(a?.notes ?? '').trim();
                        if (notes) out.notes = notes;
                        const src = String(sourceRequestId ?? '').trim();
                        if (src) out.sourceRequestId = src;
                        return out;
                    })
                    .filter((x): x is SeizedAsset => x !== null);
                if (!cleaned.length) return state;

                const prevAssets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                const nextDefendants = list.map((d, i) =>
                    i === idx ? { ...d, seizedAssets: [...prevAssets, ...cleaned] } : d,
                );

                const event: TimelineEvent = {
                    id: createId(),
                    date: new Date().toISOString().slice(0, 10),
                    type: 'decision',
                    category: 'حجز الأموال',
                    title: `حجز أموال على المتهم الهارب: ${String(current.fullName ?? '').trim() || '—'}`,
                    description: cleaned.map((a) => `• ${a.description}`).join('\n'),
                    defendantIds: [did],
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
                            ],
                        },
                    },
                };
            }),
        updateDefendantSeizedAsset: (caseId, defendantId, assetId, patch) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const did = String(defendantId ?? '').trim();
                const aid = String(assetId ?? '').trim();
                if (!did || !aid) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const dIdx = list.findIndex((d) => d.id === did);
                if (dIdx < 0) return state;
                const current = list[dIdx];
                const assets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                const aIdx = assets.findIndex((a) => a.id === aid);
                if (aIdx < 0) return state;
                const prevAsset = assets[aIdx];

                const nextAsset: SeizedAsset = { ...prevAsset };
                if (typeof patch?.description === 'string') {
                    const v = patch.description.trim();
                    if (!v) return state; // refuse to wipe the required field
                    nextAsset.description = v;
                }
                if (typeof patch?.referenceNumber === 'string') {
                    const v = patch.referenceNumber.trim();
                    if (v) nextAsset.referenceNumber = v;
                    else delete nextAsset.referenceNumber;
                }
                if (typeof patch?.seizureDate === 'string') {
                    const v = patch.seizureDate.trim();
                    if (v) nextAsset.seizureDate = v;
                    else delete nextAsset.seizureDate;
                }
                if (typeof patch?.notes === 'string') {
                    const v = patch.notes.trim();
                    if (v) nextAsset.notes = v;
                    else delete nextAsset.notes;
                }

                const nextAssets = assets.map((a, i) => (i === aIdx ? nextAsset : a));
                const nextDefendants = list.map((d, i) =>
                    i === dIdx ? { ...d, seizedAssets: nextAssets } : d,
                );

                const event: TimelineEvent = {
                    id: createId(),
                    date: new Date().toISOString().slice(0, 10),
                    type: 'decision',
                    category: 'حجز الأموال',
                    title: `تعديل صنف محجوز — ${String(current.fullName ?? '').trim() || '—'}`,
                    description: `${prevAsset.description} ← ${nextAsset.description}`,
                    defendantIds: [did],
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
                            ],
                        },
                    },
                };
            }),
        releaseDefendantSeizedAssets: (caseId, defendantId, assetIds) =>
            set((state) => {
                const target = state.casesById[caseId];
                if (!target) return state;
                if (caseMutationBlocked(target) || isCriminalCaseMutationBlocked(target, state.sessionOwnerLawyerId)) return state;
                const did = String(defendantId ?? '').trim();
                if (!did) return state;
                const list = Array.isArray(target.defendants) ? target.defendants : [];
                const dIdx = list.findIndex((d) => d.id === did);
                if (dIdx < 0) return state;
                const current = list[dIdx];
                const assets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                if (!assets.length) return state;

                const releaseAll = !Array.isArray(assetIds) || assetIds.length === 0;
                const releaseSet = new Set(
                    (Array.isArray(assetIds) ? assetIds : [])
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean),
                );
                const removed = releaseAll
                    ? assets
                    : assets.filter((a) => releaseSet.has(a.id));
                if (!removed.length) return state;
                const remaining = releaseAll
                    ? []
                    : assets.filter((a) => !releaseSet.has(a.id));

                const nextDefendants = list.map((d, i) =>
                    i === dIdx ? { ...d, seizedAssets: remaining } : d,
                );

                const event: TimelineEvent = {
                    id: createId(),
                    date: new Date().toISOString().slice(0, 10),
                    type: 'decision',
                    category: 'فك الحجز',
                    title: `فك الحجز عن ${removed.length === 1 ? 'صنف' : `${removed.length} أصناف`} — ${
                        String(current.fullName ?? '').trim() || '—'
                    }`,
                    description: removed.map((a) => `• ${a.description}`).join('\n'),
                    defendantIds: [did],
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
                            ],
                        },
                    },
                };
            })
    };
}
