import {
    useCallback,
    useEffect,
    useState,
} from 'react';
import { flushSync } from 'react-dom';
import type { Creditor, Debtor, Party } from '@/app/types/execution';
import type { HeirDetailRow } from '../helpers/heirUtils';
import {
    collectPartyEditIdentityKeys,
    hidePartyEditModalImmediate,
    paintPartyEditNameImmediate,
    scheduleAfterNextPaint,
    setPartyEditDisplayOverlay,
} from '../helpers/partyEditDisplayOverlay';
import type { PartyEditTargetState } from '../helpers/partyEditPersistence';
import {
    buildPartyEditPersistPatch,
    getPartyListFromFile,
    resolvePartyIndexInList,
} from '../helpers/partyEditPersistence';
import { validatePartyEditDraft } from '../helpers/partyEditValidation';

import type {
    HeirUtilsModule,
    HeirsQuickViewState,
    PartyEditDraftState,
    UsePartyEditWorkflowParams,
} from './usePartyEditWorkflow.types';
export type { UsePartyEditWorkflowParams, PartyEditDraftState, HeirsQuickViewState } from './usePartyEditWorkflow.types';
import { schedulePersistWork } from './usePartyEditWorkflow.types';
import { usePartyEditOverlaySync } from './usePartyEditOverlaySync';
import { openPartyEditDraft } from './openPartyEditDraft';

const loadHeirUtils = () => import('../helpers/heirUtils');
const loadPartyEditPersistence = () => import('../helpers/partyEditPersistence');

let heirUtilsCache: HeirUtilsModule | null = null;

async function ensureHeirUtils(): Promise<HeirUtilsModule> {
    if (heirUtilsCache) return heirUtilsCache;
    heirUtilsCache = await loadHeirUtils();
    return heirUtilsCache;
}

export function usePartyEditWorkflow({
    executionData,
    viewExecutionData,
    executionDataRef,
    decisionsStorageExecutionId,
    isHistoricalMode,
    persistExecutionMerge,
    showToast,
}: UsePartyEditWorkflowParams) {
    const [editPartyTarget, setEditPartyTarget] = useState<PartyEditTargetState | null>(null);
    const [partyEditDraft, setPartyEditDraft] = useState<PartyEditDraftState | null>(null);
    const [partyEditHeirDeleteConfirmIdx, setPartyEditHeirDeleteConfirmIdx] = useState<number | null>(
        null,
    );
    const [heirsQuickView, setHeirsQuickView] = useState<HeirsQuickViewState>(null);
    const [heirUtilsEpoch, setHeirUtilsEpoch] = useState(0);

    // تسخين heirUtils بعد أول إطار — خارج حزمة cold-open الثابتة
    useEffect(() => {
        let cancelled = false;
        const warm = () => {
            void ensureHeirUtils().then(() => {
                if (!cancelled) setHeirUtilsEpoch((n) => n + 1);
            });
        };
        let idleId: number | undefined;
        const ric = (
            globalThis as {
                requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
            }
        ).requestIdleCallback;
        if (typeof ric === 'function') {
            idleId = ric(warm, { timeout: 1200 });
        } else {
            idleId = setTimeout(warm, 0) as unknown as number;
        }
        return () => {
            cancelled = true;
            const cic = (
                globalThis as { cancelIdleCallback?: (id: number) => void }
            ).cancelIdleCallback;
            if (typeof cic === 'function' && idleId != null) cic(idleId);
            else clearTimeout(idleId);
        };
    }, []);

    useEffect(() => {
        if (!editPartyTarget) setPartyEditHeirDeleteConfirmIdx(null);
    }, [editPartyTarget]);

    usePartyEditOverlaySync(executionData);

    const openEditParty = useCallback(
        async (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor },
        ) => {
            await openPartyEditDraft({
                kind,
                index,
                opts,
                loadPartyEditPersistence,
                ensureHeirUtils,
                heirUtilsCache,
                setHeirUtilsEpoch,
                executionDataRef,
                viewExecutionData,
                executionData,
                decisionsStorageExecutionId,
                showToast,
                setPartyEditDraft,
                setEditPartyTarget,
            });
        },
        [
            viewExecutionData,
            executionData,
            decisionsStorageExecutionId,
            executionData?.is_creditor_deceased,
            executionData?.is_debtor_deceased,
            showToast,
            executionDataRef,
        ],
    );

    const buildPartyHeirsRows = useCallback(
        (party: Party | null | undefined, partyKind: 'creditor' | 'debtor') => {
            if (!heirUtilsCache) return [] as HeirDetailRow[];
            return heirUtilsCache.collectPartyHeirDetailRows(party, executionData, partyKind);
        },
        [
            executionData,
            executionData?.creditor_party_death_case,
            executionData?.debtor_party_death_case,
            executionData?.party_death_case,
            executionData?.creditors,
            executionData?.debtors,
            heirUtilsEpoch,
        ],
    );

    const openHeirsQuickView = useCallback(
        async (party: Party | null | undefined, partyKind: 'creditor' | 'debtor', title: string) => {
            try {
                const utils = await ensureHeirUtils();
                setHeirUtilsEpoch((n) => n + 1);
                const rows = utils.collectPartyHeirDetailRows(party, executionData, partyKind);
                if (rows.length === 0) {
                    showToast('لا توجد بيانات ورثة مسجّلة بعد.', 'info');
                    return;
                }
                flushSync(() => {
                    setHeirsQuickView({ title, rows });
                });
            } catch {
                showToast('تعذّر تحميل بيانات الورثة.', 'warning');
            }
        },
        [
            executionData,
            executionData?.creditor_party_death_case,
            executionData?.debtor_party_death_case,
            executionData?.party_death_case,
            executionData?.creditors,
            executionData?.debtors,
            showToast,
        ],
    );

    const savePartyEditDraft = useCallback(() => {
        if (!editPartyTarget || !partyEditDraft) return;
        if (isHistoricalMode) {
            showToast('لا يمكن التعديل في وضع المعاينة التاريخية', 'warning');
            return;
        }
        const base = executionDataRef.current;
        if (!base) {
            showToast('تعذر الحفظ — لا توجد بيانات إضبارة', 'warning');
            return;
        }

        try {
            const patch = buildPartyEditPersistPatch(base, editPartyTarget, partyEditDraft);
            if (!patch) {
                showToast('تعذر الحفظ — لم يُعثر على الطرف في الإضبارة', 'warning');
                return;
            }
            const locked = partyEditDraft.lockBaseInfo;
            const onlyHeirs =
                locked &&
                Boolean(partyEditDraft.includeHeirsInForm) &&
                partyEditDraft.heirs.length > 0;
            if (
                locked &&
                !onlyHeirs &&
                !partyEditDraft.includeHeirsInForm &&
                !partyEditDraft.heirsOnlyEdit
            ) {
                showToast(
                    'بيانات الاسم/الهاتف/العنوان مقفلة (وفاة أو إحلال). يمكن تعديل الورثة بعد موافقة المنفذ فقط.',
                    'info',
                );
                return;
            }

            const validation = validatePartyEditDraft(partyEditDraft);
            if (!validation?.ok) {
                showToast(validation?.message ?? 'بيانات التعديل غير صالحة', 'warning');
                return;
            }

            const partyId = String(editPartyTarget.partyId || '').trim();
            const kind = editPartyTarget.kind;
            const list = getPartyListFromFile(base, kind);
            const idx = resolvePartyIndexInList(list, editPartyTarget.index, { id: partyId });
            const prev = idx >= 0 ? list[idx] : null;
            const nextName = String(
                locked ? prev?.name ?? partyEditDraft.name : partyEditDraft.name,
            );
            const nextPhone = String(
                locked ? prev?.phone ?? partyEditDraft.phone : partyEditDraft.phone,
            );
            const nextAddress = String(
                locked ? prev?.address ?? partyEditDraft.address : partyEditDraft.address,
            );
            const aliasIds = collectPartyEditIdentityKeys({
                kind,
                partyId,
                index: idx >= 0 ? idx : editPartyTarget.index,
                workspaceKey:
                    kind === 'creditor'
                        ? `ec-${idx >= 0 ? idx : editPartyTarget.index}`
                        : undefined,
            });

            hidePartyEditModalImmediate();
            paintPartyEditNameImmediate(kind, aliasIds, nextName);
            setPartyEditDisplayOverlay({
                kind,
                partyId: partyId || aliasIds[0] || String(editPartyTarget.index),
                aliasIds,
                name: nextName,
                phone: nextPhone,
                address: nextAddress,
            });
            scheduleAfterNextPaint(() => {
                setEditPartyTarget(null);
                setPartyEditDraft(null);
                schedulePersistWork(() => {
                    const persisted = persistExecutionMerge(patch);
                    if (persisted === false) {
                        showToast('تعذّر حفظ بيانات الطرف — أعد المحاولة', 'error');
                        return;
                    }
                    showToast('تم حفظ بيانات الطرف', 'success');
                });
            });
        } catch {
            showToast('تعذّر حفظ تعديل الطرف.', 'warning');
        }
    }, [
        editPartyTarget,
        partyEditDraft,
        persistExecutionMerge,
        showToast,
        isHistoricalMode,
        executionDataRef,
    ]);

    const removeHeirFromPartyEditDraftAtIndex = useCallback(
        (idx: number) => {
            setPartyEditDraft((d) => {
                if (!d) return d;
                const next = d.heirs.filter((_, i) => i !== idx);
                return { ...d, heirs: next };
            });
            setPartyEditHeirDeleteConfirmIdx(null);
        },
        [decisionsStorageExecutionId, editPartyTarget?.kind],
    );

    const togglePartyEditHeirClient = useCallback((heirIdx: number) => {
        setPartyEditDraft((d) => {
            if (!d) return d;
            const cur = d.heirs[heirIdx];
            if (!cur) return d;
            const was = Boolean(cur.isClient);
            const next = d.heirs.map((h, i) => ({
                ...h,
                isClient: was ? false : i === heirIdx,
            }));
            return { ...d, heirs: next };
        });
    }, []);

    return {
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    };
}
