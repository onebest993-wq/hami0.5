import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { DECISIONS_RELOAD_EVENT } from '@/app/utils/executorDecisionContracts';
import type { UnifiedCollectionDecisionState } from '@/app/utils/executorDecisionContracts';
import {
    getLatestUnifiedCollectionDecisionState,
    hasApprovedUnifiedCollection,
} from '@/app/utils/executorDecisionReadQueries';
import { storageCache } from '@/app/utils/storageCache';
import {
    hydrateUnifiedLedgerFromRawStorage,
    reseedDossierBaselineLedgerRows,
    seedUnifiedLedgerStoreForExecution,
    type UnifiedLedgerHydrateParams,
} from './unifiedLedgerHydrate';
import {
    computeTrustBalanceFromPayments,
    emptyStore,
    isUnifiedLedgerLocked,
    notifyUnifiedLedgerUpdated,
    parseStoredMoney,
    parseUnifiedLedgerFromStorage,
    pickRicherLedgerStore,
    resolvePersistedLedgerStore,
    storageKey,
    type UnifiedLedgerTotalParams,
} from './utils';
import type { LocalPaymentRow, UnifiedLedgerStore } from './types';

type NotifyFn = (
    message: string,
    variant?: 'success' | 'error' | 'warning' | 'info',
    options?: { decisionsLink?: boolean }
) => void;

export interface UseFocLedgerStoreParams {
    executionId?: string;
    principal_amount: number;
    courtOrderedFeesSafe: number;
    executionExpensesSumSafe: number;
    evictionCaseExpensesSumSafe: number;
    evictionLawyerFeeWaivedAtIntake: boolean;
    isEvictionFundsModule: boolean;
    notify: NotifyFn;
    setDisburseModalOpen: (value: boolean) => void;
    autoOpenLedgerMode?: 'disburse' | null;
    onAutoOpenHandled?: () => void;
}

export interface UseFocLedgerStoreResult {
    store: UnifiedLedgerStore;
    setStore: Dispatch<SetStateAction<UnifiedLedgerStore>>;
    storeRef: MutableRefObject<UnifiedLedgerStore>;
    persist: (next: UnifiedLedgerStore) => void;
    getLatestLedgerStore: () => UnifiedLedgerStore;
    ledgerTotalParams: UnifiedLedgerTotalParams;
    isEvictionCollectionRequested: boolean;
    setIsEvictionCollectionRequested: (value: boolean) => void;
    unifiedCollectionExecutorApproved: boolean;
    unifiedCollectionDecisionState: UnifiedCollectionDecisionState;
}

/**
 * قراءة متزامنة للوعاء من التخزين — تفادي emptyStore flash عند أول paint.
 * لا تُبطِل الكاش (عكس effect الترطيب الذي يعيد الجلب).
 */
export function readInitialFocLedgerStore(
    executionId: string | undefined,
    totals: Omit<UnifiedLedgerHydrateParams, 'executionId' | 'seedLawyerId' | 'seedExpenseId'>,
): UnifiedLedgerStore {
    if (!executionId) return emptyStore();
    try {
        const raw = storageCache.get(storageKey(executionId));
        const hydrateParams: UnifiedLedgerHydrateParams = {
            ...totals,
            seedLawyerId: `seed-lawyer-${executionId}`,
            seedExpenseId: `seed-exp-${executionId}`,
            executionId,
        };
        if (raw) {
            const { store } = hydrateUnifiedLedgerFromRawStorage(
                raw,
                hydrateParams,
                getLatestUnifiedCollectionDecisionState(executionId),
            );
            return store;
        }
        return seedUnifiedLedgerStoreForExecution(hydrateParams);
    } catch {
        return emptyStore();
    }
}

/**
 * الوعاء الموحّد: الحالة + الترطيب من التخزين + المزامنة الخارجية (تسوية/قرارات) —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
 */
export function useFocLedgerStore(params: UseFocLedgerStoreParams): UseFocLedgerStoreResult {
    const {
        executionId,
        principal_amount,
        courtOrderedFeesSafe,
        executionExpensesSumSafe,
        evictionCaseExpensesSumSafe,
        evictionLawyerFeeWaivedAtIntake,
        isEvictionFundsModule,
        notify,
        setDisburseModalOpen,
        autoOpenLedgerMode,
        onAutoOpenHandled,
    } = params;

    const [store, setStore] = useState<UnifiedLedgerStore>(() =>
        readInitialFocLedgerStore(executionId, {
            principal_amount,
            courtOrderedFeesSafe,
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe,
            evictionCaseExpensesSumSafe,
        }),
    );
    const storeRef = useRef(store);
    useEffect(() => {
        storeRef.current = store;
    }, [store]);

    const [isEvictionCollectionRequested, setIsEvictionCollectionRequested] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; mode?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionId ?? '')) return;
            const mode = String(ce.detail?.mode ?? '').trim();
            if (mode === 'disburse') {
                const trustNow = computeTrustBalanceFromPayments(store.payments);
                if (trustNow <= 0) {
                    notify('لا يمكن الصرف: رصيد الأمانات = 0.', 'warning');
                    return;
                }
                setDisburseModalOpen(true);
            }
        };
        window.addEventListener('hami-open-financial-ledger-modal', handler as EventListener);
        return () => window.removeEventListener('hami-open-financial-ledger-modal', handler as EventListener);
    }, [executionId, notify, setDisburseModalOpen, store.payments]);

    useEffect(() => {
        if (autoOpenLedgerMode !== 'disburse') return;
        if (!executionId) {
            if (onAutoOpenHandled) onAutoOpenHandled();
            return;
        }
        const trustNow = computeTrustBalanceFromPayments(store.payments);
        if (trustNow <= 0) {
            notify('لا يمكن الصرف: رصيد الأمانات = 0.', 'warning');
            if (onAutoOpenHandled) onAutoOpenHandled();
            return;
        }
        setDisburseModalOpen(true);
        if (onAutoOpenHandled) onAutoOpenHandled();
    }, [autoOpenLedgerMode, executionId, notify, onAutoOpenHandled, setDisburseModalOpen, store.payments]);

    const [unifiedCollectionExecutorApproved, setUnifiedCollectionExecutorApproved] = useState(() =>
        hasApprovedUnifiedCollection(executionId)
    );
    const [unifiedCollectionDecisionState, setUnifiedCollectionDecisionState] = useState(() =>
        getLatestUnifiedCollectionDecisionState(executionId)
    );
    const [ledgerExternalRevision, setLedgerExternalRevision] = useState(0);

    useEffect(() => {
        const bump = () => {
            setUnifiedCollectionExecutorApproved(hasApprovedUnifiedCollection(executionId));
            setUnifiedCollectionDecisionState(getLatestUnifiedCollectionDecisionState(executionId));
        };
        bump();
        window.addEventListener(DECISIONS_RELOAD_EVENT, bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        window.addEventListener('storage', bump);
        window.addEventListener('focus', bump);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bump);
            window.removeEventListener('hami-execution-decision-outcome', bump);
            window.removeEventListener('storage', bump);
            window.removeEventListener('focus', bump);
        };
    }, [executionId]);

    useEffect(() => {
        const bumpLedger = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string }>;
            const target = String(ce.detail?.executionId ?? '').trim();
            if (target && target !== String(executionId ?? '').trim()) return;
            setLedgerExternalRevision((n) => n + 1);
        };
        window.addEventListener('hami-unified-ledger-updated', bumpLedger);
        window.addEventListener('hami-unified-ledger-payment-undo', bumpLedger);
        return () => {
            window.removeEventListener('hami-unified-ledger-updated', bumpLedger);
            window.removeEventListener('hami-unified-ledger-payment-undo', bumpLedger);
        };
    }, [executionId]);

    const clearCollectionRequestIfUnifiedRejected = useCallback(() => {
        if (!executionId) return;
        if (getLatestUnifiedCollectionDecisionState(executionId) !== 'rejected') return;
        setStore((prev) => {
            if (!prev.collectionRequestActive) return prev;
            const next = { ...prev, collectionRequestActive: false };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
    }, [executionId, isEvictionFundsModule]);

    useEffect(() => {
        clearCollectionRequestIfUnifiedRejected();
        window.addEventListener(DECISIONS_RELOAD_EVENT, clearCollectionRequestIfUnifiedRejected);
        window.addEventListener('hami-execution-decision-outcome', clearCollectionRequestIfUnifiedRejected);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, clearCollectionRequestIfUnifiedRejected);
            window.removeEventListener('hami-execution-decision-outcome', clearCollectionRequestIfUnifiedRejected);
        };
    }, [clearCollectionRequestIfUnifiedRejected]);

    const persist = useCallback(
        (next: UnifiedLedgerStore) => {
            const cached = executionId
                ? parseUnifiedLedgerFromStorage(storageCache.get(storageKey(executionId)))
                : null;
            const resolved = resolvePersistedLedgerStore(storeRef.current, next, cached);
            storeRef.current = resolved;
            setStore(resolved);
            if (executionId) {
                storageCache.set(storageKey(executionId), resolved);
            }
            notifyUnifiedLedgerUpdated(executionId);
        },
        [executionId]
    );

    const ledgerTotalParams = useMemo(
        (): UnifiedLedgerTotalParams => ({
            principal_amount,
            courtOrderedFeesSafe,
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe,
            evictionCaseExpensesSumSafe,
            seedLawyerId: executionId ? `seed-lawyer-${executionId}` : '',
            seedExpenseId: executionId ? `seed-exp-${executionId}` : '',
        }),
        [
            courtOrderedFeesSafe,
            evictionCaseExpensesSumSafe,
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe,
            executionId,
            principal_amount,
        ]
    );

    const getLatestLedgerStore = useCallback((): UnifiedLedgerStore => {
        const stateStore = storeRef.current;
        if (!executionId) return stateStore;
        const cached = parseUnifiedLedgerFromStorage(storageCache.get(storageKey(executionId)));
        if (!cached) return stateStore;
        return pickRicherLedgerStore(stateStore, cached);
    }, [executionId]);

    useEffect(() => {
        setIsEvictionCollectionRequested(false);
    }, [executionId]);

    useEffect(() => {
        if (!executionId) {
            setStore(emptyStore());
            return;
        }
        try {
            storageCache.invalidate(storageKey(executionId));
            const raw = storageCache.get(storageKey(executionId));
            const hydrateParams: UnifiedLedgerHydrateParams = {
                principal_amount,
                courtOrderedFeesSafe,
                evictionLawyerFeeWaivedAtIntake,
                executionExpensesSumSafe,
                evictionCaseExpensesSumSafe,
                seedLawyerId: `seed-lawyer-${executionId}`,
                seedExpenseId: `seed-exp-${executionId}`,
                executionId,
            };
            if (raw) {
                const { store: merged, persistImmediately } = hydrateUnifiedLedgerFromRawStorage(
                    raw,
                    hydrateParams,
                    getLatestUnifiedCollectionDecisionState(executionId)
                );
                setStore(merged);
                if (persistImmediately) {
                    storageCache.set(storageKey(executionId), merged);
                }
                return;
            }

            const next = seedUnifiedLedgerStoreForExecution(hydrateParams);
            setStore(next);
            storageCache.set(storageKey(executionId), next);
        } catch {
            setStore(emptyStore());
        }
    }, [
        evictionCaseExpensesSumSafe,
        executionExpensesSumSafe,
        executionId,
        courtOrderedFeesSafe,
        evictionLawyerFeeWaivedAtIntake,
        principal_amount,
        ledgerExternalRevision,
    ]);

    useEffect(() => {
        if (!executionId) return;
        const principal = Number.isFinite(principal_amount) ? Math.max(0, principal_amount) : 0;
        if (principal <= 0) return;
        setStore((prev) => {
            if (typeof prev.principalSnapshot === 'number' && Math.abs(prev.principalSnapshot - principal) <= 0.001) {
                return prev;
            }
            const next = { ...prev, principalSnapshot: principal };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
    }, [executionId, principal_amount]);

    useEffect(() => {
        if (!executionId) return;
        setStore((prev) => {
            if (
                isUnifiedLedgerLocked(executionId, prev, getLatestUnifiedCollectionDecisionState(executionId))
            ) {
                return prev;
            }
            const { lawyerFees: nextLawyer, expenses: nextExpenses } = reseedDossierBaselineLedgerRows(
                prev.lawyerFees,
                prev.expenses,
                executionId,
                {
                    principal_amount,
                    courtOrderedFeesSafe,
                    evictionLawyerFeeWaivedAtIntake,
                    executionExpensesSumSafe,
                    evictionCaseExpensesSumSafe,
                    seedLawyerId: `seed-lawyer-${executionId}`,
                    seedExpenseId: `seed-exp-${executionId}`,
                }
            );

            const unchangedLawyer =
                nextLawyer.length === prev.lawyerFees.length &&
                nextLawyer.every((r, i) => r.id === prev.lawyerFees[i]?.id && r.amount === prev.lawyerFees[i]?.amount);
            const unchangedExpenses =
                nextExpenses.length === prev.expenses.length &&
                nextExpenses.every((r, i) => r.id === prev.expenses[i]?.id && r.amount === prev.expenses[i]?.amount);
            if (unchangedLawyer && unchangedExpenses) return prev;

            const next = {
                ...prev,
                lawyerFees: nextLawyer,
                expenses: nextExpenses,
                seeded: nextLawyer.length > 0 || nextExpenses.length > 0,
            };
            storageCache.set(storageKey(executionId), next);
            return next;
        });
    }, [
        executionId,
        evictionLawyerFeeWaivedAtIntake,
        courtOrderedFeesSafe,
        executionExpensesSumSafe,
        evictionCaseExpensesSumSafe,
    ]);

    useEffect(() => {
        if (!isEvictionFundsModule) return;
        if (store.collectionRequestActive) {
            setIsEvictionCollectionRequested(true);
        }
    }, [isEvictionFundsModule, store.collectionRequestActive]);

    return {
        store,
        setStore,
        storeRef,
        persist,
        getLatestLedgerStore,
        ledgerTotalParams,
        isEvictionCollectionRequested,
        setIsEvictionCollectionRequested,
        unifiedCollectionExecutorApproved,
        unifiedCollectionDecisionState,
    };
}

export interface UseFocLedgerExternalCollectSyncParams {
    executionId?: string;
    totalOwedUnified: number;
    setStore: Dispatch<SetStateAction<UnifiedLedgerStore>>;
    storeRef: MutableRefObject<UnifiedLedgerStore>;
}

/**
 * استقبال حصيلة تحصيل خارجية (hami-unified-ledger-external-collect) — يُستدعى بعد معرفة
 * totalOwedUnified (من useFocLedgerDerived) لأن حساب الرصيد بعد كل دفعة يعتمد عليه.
 */
export function useFocLedgerExternalCollectSync(params: UseFocLedgerExternalCollectSyncParams): void {
    const { executionId, totalOwedUnified, setStore, storeRef } = params;

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                payment?: { id?: string; amount?: unknown; at?: string };
            }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionId ?? '')) return;
            const p = ce.detail?.payment;
            const amt = typeof p?.amount === 'number' ? p.amount : parseStoredMoney(p?.amount);
            const safeAmt = Number.isFinite(amt) ? Math.max(0, Math.trunc(amt)) : 0;
            if (!safeAmt) return;
            const pid = String(p?.id || `pay-ext-${Date.now()}`);
            const at = String(p?.at || new Date().toISOString());
            setStore((prev) => {
                if (prev.payments.some((x) => String(x.id) === pid)) return prev;
                let debtPaid = 0;
                for (const r of prev.payments) {
                    const a = Number.isFinite(r.amount) ? r.amount : 0;
                    const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
                    if (et === 'disburse') continue;
                    debtPaid += a;
                }
                const nextDebtPaid = Math.min(Math.max(0, debtPaid + safeAmt), Math.max(0, totalOwedUnified));
                const debtAfter = Math.max(0, totalOwedUnified - nextDebtPaid);
                const trustNow = computeTrustBalanceFromPayments(prev.payments);
                const trustAfter = Math.max(0, trustNow + safeAmt);
                const row: LocalPaymentRow = {
                    id: pid,
                    amount: safeAmt,
                    at,
                    kind: 'partial',
                    entryType: 'collect',
                    balanceAfter: debtAfter,
                    debtBalanceAfter: debtAfter,
                    trustBalanceAfter: trustAfter,
                };
                const next = { ...prev, payments: [row, ...prev.payments] };
                if (executionId) {
                    storageCache.set(storageKey(executionId), next);
                    notifyUnifiedLedgerUpdated(executionId);
                }
                storeRef.current = next;
                return next;
            });
        };
        window.addEventListener('hami-unified-ledger-external-collect', handler as EventListener);
        return () =>
            window.removeEventListener('hami-unified-ledger-external-collect', handler as EventListener);
    }, [executionId, totalOwedUnified, setStore, storeRef]);
}
