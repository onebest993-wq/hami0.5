import { getLatestUnifiedCollectionDecisionState } from '@/app/utils/executorDecisionReadQueries';
import { storageCache } from '@/app/utils/storageCache';
import {
    hydrateUnifiedLedgerFromRawStorage,
    seedUnifiedLedgerStoreForExecution,
    type UnifiedLedgerHydrateParams,
} from './unifiedLedgerHydrate';
import { emptyStore, storageKey } from './utils';
import type { UnifiedLedgerStore } from './types';

/**
 * قراءة متزامنة للوعاء من التخزين — تفادي emptyStore flash عند أول paint.
 * (المسار الحيّ في FinancialOperationsCenter.tsx؛ أُخرجت من hook ميت.)
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
