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
} from '@/app/utils/executorSeizureDecisionQueue';
import { isPartyHeirsEditOnlyMode } from '@/app/utils/partyDisplayName';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import {
    collectPartyHeirDetailRows,
    dedupeHeirDetailRowsByName,
    makeHeirRowId,
    type HeirDetailRow,
} from '../helpers';
import {
    buildPartyEditPersistPatch,
    getPartyListFromFile,
    resolvePartyIndexInList,
    type PartyEditTargetState,
} from '../helpers/partyEditPersistence';

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

    useEffect(() => {
        if (!editPartyTarget) setPartyEditHeirDeleteConfirmIdx(null);
    }, [editPartyTarget]);

    const openEditParty = useCallback(
        (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor },
        ) => {
            const base = executionDataRef.current ?? viewExecutionData ?? executionData;
            const list = getPartyListFromFile(base, kind);
            const resolvedIndex = resolvePartyIndexInList(list, index, opts?.party ?? null);
            const row = opts?.party ?? (resolvedIndex >= 0 ? list[resolvedIndex] : null);
            if (!row || resolvedIndex < 0) {
                showToast('تعذر فتح التعديل — لم يُعثر على بيانات الطرف', 'warning');
                return;
            }
            const partyId = String((row as { id?: unknown }).id ?? resolvedIndex);
            const heirsOnlyEdit = isPartyHeirsEditOnlyMode(
                base,
                kind,
                row as Party,
                resolvedIndex,
                decisionsStorageExecutionId,
            );
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
            const hasHeirsDetailsField = Array.isArray((row as { heirs_details?: unknown }).heirs_details);
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
                cloned = sc ? sc(baseDraft) : (JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft);
            } catch {
                cloned = JSON.parse(JSON.stringify(baseDraft)) as typeof baseDraft;
            }
            flushSync(() => {
                setPartyEditDraft(cloned);
                setEditPartyTarget({ kind, index: resolvedIndex, partyId });
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
        (party: Party | null | undefined, partyKind: 'creditor' | 'debtor') =>
            collectPartyHeirDetailRows(party, executionData, partyKind),
        [
            executionData,
            executionData?.creditor_party_death_case,
            executionData?.debtor_party_death_case,
            executionData?.party_death_case,
            executionData?.creditors,
            executionData?.debtors,
        ],
    );

    const openHeirsQuickView = useCallback(
        (party: Party | null | undefined, partyKind: 'creditor' | 'debtor', title: string) => {
            const rows = buildPartyHeirsRows(party, partyKind);
            if (rows.length === 0) {
                showToast('لا توجد بيانات ورثة مسجّلة بعد.', 'info');
                return;
            }
            flushSync(() => {
                setHeirsQuickView({ title, rows });
            });
        },
        [buildPartyHeirsRows, showToast],
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
        persistExecutionMerge(patch);
        setEditPartyTarget(null);
        setPartyEditDraft(null);
        showToast('تم حفظ بيانات الطرف', 'success');
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
