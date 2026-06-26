import type { Dispatch, SetStateAction } from 'react';
import type { SeizedAsset } from '@/app/types/execution';
import { storageCache } from '@/app/utils/storageCache';
import {
    emptyStore,
    parseUnifiedLedgerFromStorage,
    storageKey,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import {
    clearSalarySeizureFromStore,
    clearSettlementFromStore,
    releaseSalarySeizedAssets,
} from '@/app/components/lawyer/FinancialOperationsCenter/settlementSalaryExclusion';
import {
    executionGarnishmentDetailsStorageKey,
    executionGarnishmentFlagStorageKey,
} from '@/app/utils/executionStorageKeys';

export function clearSettlementFromLedgerStorage(
    decisionsStorageExecutionId: string | undefined,
    executionId: string | undefined,
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>,
): void {
    const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
    if (!exId) return;
    const key = storageKey(exId);
    const stored = storageCache.get(key);
    const current = parseUnifiedLedgerFromStorage(stored) ?? emptyStore();
    storageCache.set(key, clearSettlementFromStore(current));
    try {
        window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
    } catch {
        /* ignore */
    }
    setUnifiedLedgerRevision((v) => v + 1);
}

export function clearActiveSalarySeizurePathStorage(args: {
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    seizedAssets: SeizedAsset[];
    setSeizedAssets: (next: SeizedAsset[]) => void;
    persistExecutionMerge: (patch: { seizedAssets: SeizedAsset[] }) => void;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
}): void {
    const {
        decisionsStorageExecutionId,
        executionId,
        seizedAssets,
        setSeizedAssets,
        persistExecutionMerge,
        setUnifiedLedgerRevision,
    } = args;
    const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
    const nextAssets = releaseSalarySeizedAssets(
        seizedAssets as Array<Record<string, unknown>>,
    ) as SeizedAsset[];
    setSeizedAssets(nextAssets);
    persistExecutionMerge({ seizedAssets: nextAssets });
    if (exId) {
        const key = storageKey(exId);
        const stored = storageCache.get(key);
        const current = parseUnifiedLedgerFromStorage(stored) ?? emptyStore();
        storageCache.set(key, clearSalarySeizureFromStore(current));
        try {
            storageCache.remove(executionGarnishmentFlagStorageKey(exId));
            storageCache.remove(executionGarnishmentDetailsStorageKey(exId));
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
        } catch {
            /* ignore */
        }
        setUnifiedLedgerRevision((v) => v + 1);
    }
}
