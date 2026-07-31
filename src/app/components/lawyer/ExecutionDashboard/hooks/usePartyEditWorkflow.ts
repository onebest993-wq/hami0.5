import {
    useCallback,
    useEffect,
    useState,
    type MutableRefObject,
} from 'react';
import { flushSync } from 'react-dom';
import type { Creditor, Debtor, ExecutionFile, Party } from '@/app/types/execution';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import type { HeirDetailRow } from '../helpers/heirUtils';
import {
    clearPartyEditDisplayOverlay,
    collectPartyEditIdentityKeys,
    getPartyEditDisplayOverlay,
    hidePartyEditModalImmediate,
    paintPartyEditNameImmediate,
    scheduleAfterNextPaint,
    setPartyEditDisplayOverlay,
} from '../helpers/partyEditDisplayOverlay';
import type { PartyEditTargetState } from '../helpers/partyEditPersistence';

type HeirUtilsModule = typeof import('../helpers/heirUtils');

const loadHeirUtils = () => import('../helpers/heirUtils');
const loadPartyEditPersistence = () => import('../helpers/partyEditPersistence');
const loadPartyEditValidation = () => import('../helpers/partyEditValidation');

let heirUtilsCache: HeirUtilsModule | null = null;

async function ensureHeirUtils(): Promise<HeirUtilsModule> {
    if (heirUtilsCache) return heirUtilsCache;
    heirUtilsCache = await loadHeirUtils();
    return heirUtilsCache;
}

type PartyEditDraftState = {
    name: string;
    phone: string;
    address: string;
    heirs: HeirDetailRow[];
    lockBaseInfo: boolean;
    includeHeirsInForm?: boolean;
    heirsOnlyEdit?: boolean;
};

type HeirsQuickViewState = {
    title: string;
    rows: Array<{ name: string; phone: string; address: string; isClient?: boolean }>;
} | null;

type ShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
) => void;

export interface UsePartyEditWorkflowParams {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null>;
    decisionsStorageExecutionId: string;
    isHistoricalMode: boolean;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: ShowToast;
}

function schedulePersistWork(work: () => void): void {
    if (typeof queueMicrotask === 'function') {
        queueMicrotask(work);
        return;
    }
    setTimeout(work, 0);
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

    // أزل الطبقة التفاؤلية فقط بعد وصول المصدر الحقيقي لنفس القيم — بلا وميض رجوع للقديم.
    useEffect(() => {
        const creditors = executionData?.creditors;
        if (Array.isArray(creditors)) {
            for (const row of creditors) {
                const id = row?.id != null ? String(row.id).trim() : '';
                if (!id) continue;
                const overlay = getPartyEditDisplayOverlay('creditor', id);
                if (!overlay) continue;
                if (
                    String(row.name ?? '') === overlay.name &&
                    String(row.phone ?? '') === overlay.phone &&
                    String(row.address ?? '') === overlay.address
                ) {
                    clearPartyEditDisplayOverlay('creditor', id);
                }
            }
        }
        const debtors = executionData?.debtors;
        if (Array.isArray(debtors)) {
            for (const row of debtors) {
                const id = row?.id != null ? String(row.id).trim() : '';
                if (!id) continue;
                const overlay = getPartyEditDisplayOverlay('debtor', id);
                if (!overlay) continue;
                if (
                    String(row.name ?? '') === overlay.name &&
                    String(row.phone ?? '') === overlay.phone &&
                    String(row.address ?? '') === overlay.address
                ) {
                    clearPartyEditDisplayOverlay('debtor', id);
                }
            }
        }
    }, [executionData?.creditors, executionData?.debtors]);

    const openEditParty = useCallback(
        async (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor },
        ) => {
            try {
                const [{ getPartyListFromFile, resolvePartyIndexInList }, heirUtils] =
                    await Promise.all([loadPartyEditPersistence(), ensureHeirUtils()]);
                if (!heirUtilsCache) setHeirUtilsEpoch((n) => n + 1);
                const { makeHeirRowId, dedupeHeirDetailRowsByName } = heirUtils;
                const base = executionDataRef.current ?? viewExecutionData ?? executionData;
                const list = getPartyListFromFile(base, kind);
                const resolvedIndex = resolvePartyIndexInList(list, index, opts?.party ?? null);
                const row = opts?.party ?? (resolvedIndex >= 0 ? list[resolvedIndex] : null);
                if (!row || resolvedIndex < 0) {
                    showToast('تعذر فتح التعديل — لم يُعثر على بيانات الطرف', 'warning');
                    return;
                }
                const partyId = String((row as { id?: unknown }).id ?? resolvedIndex);
                // بدون import لـ partyDisplayName/partyHeirsEditOnlyMode — يمنع سحب readQueries إلى main
                const heirsOnlyEdit = (() => {
                    const deceased =
                        resolvedIndex === 0
                            ? Boolean(
                                  row.isDeceased ||
                                      getPartyDeathCaseForRole(base, kind) ||
                                      (kind === 'creditor'
                                          ? base?.is_creditor_deceased
                                          : base?.is_debtor_deceased),
                              )
                            : Boolean(row.isDeceased);
                    if (!deceased) return false;
                    const subSt =
                        kind === 'creditor'
                            ? getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId)
                            : getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId);
                    if (subSt === 'approved' || subSt === 'alternative') return true;
                    const partyHeirs = (row.heirs || []).filter((s) => /\S/.test(String(s)));
                    const details = Array.isArray(
                        (row as { heirs_details?: unknown[] }).heirs_details,
                    )
                        ? (
                              (row as { heirs_details: Array<{ name?: string }> }).heirs_details ||
                              []
                          ).filter((h) => /\S/.test(String(h?.name || '')))
                        : [];
                    if (partyHeirs.length > 0 || details.length > 0) return true;
                    const deathCase = getPartyDeathCaseForRole(base, kind);
                    const caseHeirs = (deathCase?.heir_names || []).filter((s) =>
                        /\S/.test(String(s)),
                    );
                    const caseDetails = (deathCase?.heir_details || []).filter((h) =>
                        /\S/.test(String(h?.name || '')),
                    );
                    return caseHeirs.length > 0 || caseDetails.length > 0;
                })();
                const lockBaseInfo =
                    heirsOnlyEdit ||
                    (kind === 'creditor'
                        ? Boolean(
                              row.isDeceased ||
                                  (resolvedIndex === 0 && base?.is_creditor_deceased),
                          )
                        : Boolean(
                              row.isDeceased ||
                                  (resolvedIndex === 0 && base?.is_debtor_deceased),
                          ));
                const substitutionApproved =
                    kind === 'creditor'
                        ? getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                              'approved' ||
                          getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                              'alternative'
                        : getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                              'approved' ||
                          getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) ===
                              'alternative';
                const includeHeirsInForm = Boolean(
                    opts?.forceHeirs || heirsOnlyEdit || lockBaseInfo || substitutionApproved,
                );
                const hasHeirsDetailsField = Array.isArray(
                    (row as { heirs_details?: unknown }).heirs_details,
                );
                const heirDetailsRaw = hasHeirsDetailsField
                    ? ((row as { heirs_details: unknown[] }).heirs_details as Array<{
                          name?: unknown;
                          phone?: unknown;
                          address?: unknown;
                          isClient?: unknown;
                      }>)
                    : [];
                const heirRowsRaw = hasHeirsDetailsField
                    ? heirDetailsRaw.map((h) => ({
                          rowId: makeHeirRowId(),
                          name: String(h?.name || ''),
                          phone: String(h?.phone || ''),
                          address: String(h?.address || ''),
                          isClient: Boolean(h?.isClient),
                      }))
                    : ((row.heirs || []).map((h) => ({
                          rowId: makeHeirRowId(),
                          name: String(h || ''),
                          phone: '',
                          address: '',
                          isClient: false,
                      })) as HeirDetailRow[]);
                let heirRows = includeHeirsInForm ? dedupeHeirDetailRowsByName(heirRowsRaw) : [];
                if (heirsOnlyEdit && heirRows.length === 0) {
                    const partyDeathCase = getPartyDeathCaseForRole(base, kind);
                    const caseDetails = (partyDeathCase?.heir_details || [])
                        .map((h) => ({
                            rowId: makeHeirRowId(),
                            name: String(h?.name || ''),
                            phone: String(h?.phone || ''),
                            address: String(h?.address || ''),
                            isClient: false,
                        }))
                        .filter((h) => /\S/.test(h.name));
                    const caseNames = (partyDeathCase?.heir_names || [])
                        .map((name) => ({
                            rowId: makeHeirRowId(),
                            name: String(name || ''),
                            phone: '',
                            address: '',
                            isClient: false,
                        }))
                        .filter((h) => /\S/.test(h.name));
                    heirRows = dedupeHeirDetailRowsByName(
                        caseDetails.length > 0 ? caseDetails : caseNames,
                    );
                }
                const baseDraft = {
                    name: row.name || '',
                    phone: row.phone || '',
                    address: row.address || '',
                    heirs:
                        includeHeirsInForm && heirRows.length > 0
                            ? heirRows.map((h) => ({ ...h, rowId: h.rowId || makeHeirRowId() }))
                            : [],
                    lockBaseInfo,
                    includeHeirsInForm,
                    heirsOnlyEdit,
                };
                let cloned = baseDraft;
                try {
                    const sc = (globalThis as { structuredClone?: <T>(x: T) => T }).structuredClone;
                    cloned = sc
                        ? sc(baseDraft)
                        : (JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft);
                } catch {
                    cloned = JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft;
                }
                flushSync(() => {
                    setPartyEditDraft(cloned);
                    setEditPartyTarget({ kind, index: resolvedIndex, partyId });
                });
            } catch {
                showToast('تعذّر تحميل أداة تعديل الطرف.', 'warning');
            }
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

        void Promise.all([loadPartyEditPersistence(), loadPartyEditValidation()])
            .then(([{ buildPartyEditPersistPatch, getPartyListFromFile, resolvePartyIndexInList }, { validatePartyEditDraft }]) => {
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
                if (!validation.ok) {
                    showToast(validation.message, 'warning');
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
                showToast('تم حفظ بيانات الطرف', 'success');

                scheduleAfterNextPaint(() => {
                    setEditPartyTarget(null);
                    setPartyEditDraft(null);
                    schedulePersistWork(() => {
                        persistExecutionMerge(patch);
                    });
                });
            })
            .catch(() => {
                showToast('تعذّر تحميل أداة حفظ تعديل الطرف.', 'warning');
            });
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
