import { flushSync } from 'react-dom';
import type { Creditor, Debtor, ExecutionFile, Party } from '@/app/types/execution';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import type { HeirDetailRow } from '../helpers/heirUtils';
import type { PartyEditTargetState } from '../helpers/partyEditPersistence';
import type { PartyEditDraftState, ShowToast } from './usePartyEditWorkflow.types';
import type { HeirUtilsModule } from './usePartyEditWorkflow.types';

export async function openPartyEditDraft(args: {
    kind: 'creditor' | 'debtor';
    index: number;
    opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor };
    loadPartyEditPersistence: () => Promise<{
        getPartyListFromFile: typeof import('../helpers/partyEditPersistence').getPartyListFromFile;
        resolvePartyIndexInList: typeof import('../helpers/partyEditPersistence').resolvePartyIndexInList;
    }>;
    ensureHeirUtils: () => Promise<HeirUtilsModule>;
    heirUtilsCache: HeirUtilsModule | null;
    setHeirUtilsEpoch: (fn: (n: number) => number) => void;
    executionDataRef: { current: ExecutionFile | null | undefined };
    viewExecutionData: ExecutionFile | null | undefined;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    showToast: ShowToast;
    setPartyEditDraft: (draft: PartyEditDraftState) => void;
    setEditPartyTarget: (target: PartyEditTargetState) => void;
}): Promise<void> {
    const {
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
    } = args;
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
}
