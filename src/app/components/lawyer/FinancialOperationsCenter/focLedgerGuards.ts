import type { UnifiedCollectionDecisionState } from '@/app/utils/executorSeizureDecisionQueue';
import type { UnifiedLedgerStore } from './types';
import {
    computeTotalOwedUnifiedFromStore,
    hasFrozenLedgerRows,
    type UnifiedLedgerTotalParams,
} from './utils';
import { isUnifiedLedgerLocked } from './unifiedLedgerLock';

function asUnifiedCollectionDecisionState(
    value: UnifiedCollectionDecisionState | string | null | undefined,
): UnifiedCollectionDecisionState | undefined {
    if (value === 'none' || value === 'pending' || value === 'approved' || value === 'rejected') return value;
    return undefined;
}

export function resolveDebtEditLockReason(args: {
    executionId?: string;
    store: UnifiedLedgerStore;
    unifiedCollectionDecisionState: UnifiedCollectionDecisionState | string | null | undefined;
}): string | null {
    const { executionId, store, unifiedCollectionDecisionState } = args;
    if (!executionId) return 'لا يمكن التعديل بدون رقم إضبارة.';
    if (isUnifiedLedgerLocked(executionId, store, asUnifiedCollectionDecisionState(unifiedCollectionDecisionState))) {
        if (store.collectionRequestActive || hasFrozenLedgerRows(store, executionId)) {
            return 'الوعاء مجمّد بعد طلب الاستحصال — لا يمكن تعديل الدين حالياً.';
        }
        return 'الوعاء مقفل — لا يمكن تعديل الدين حالياً.';
    }
    return null;
}

export function patchClearCollectionOnRejection(args: {
    store: UnifiedLedgerStore;
    decisionState: UnifiedCollectionDecisionState | string | null | undefined;
}): UnifiedLedgerStore | null {
    if (args.decisionState !== 'rejected') return null;
    if (!args.store.collectionRequestActive) return null;
    return { ...args.store, collectionRequestActive: false };
}

export function resolveCanApplySettlementAmount(args: {
    settlementAmount: number;
    remainingUnified: number;
    isAlimonyClaim: boolean;
    ongoingMonthlyAlimonyEffective: number;
}): boolean {
    const { settlementAmount, remainingUnified, isAlimonyClaim, ongoingMonthlyAlimonyEffective } = args;
    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) return false;
    if (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0) return true;
    return settlementAmount <= remainingUnified;
}

export type CollectionVesselMismatchPatch = {
    store: UnifiedLedgerStore;
    noticeKey: string;
};

/** يُرجع تصحيح الوعاء عند تغيّر الإجمالي بعد موافقة استحصال سابقة */
export function resolveCollectionVesselMismatchPatch(args: {
    executionId: string;
    store: UnifiedLedgerStore;
    ledgerTotalParams: UnifiedLedgerTotalParams;
    unifiedCollectionExecutorApproved: boolean;
    currentTotal: number;
    handledNoticeKey: string | null;
}): CollectionVesselMismatchPatch | null {
    if (!args.unifiedCollectionExecutorApproved) return null;
    if (!args.store.collectionRequestActive) return null;
    if (args.store.collectionRequestedTotal === null) return null;

    const recomputed = computeTotalOwedUnifiedFromStore(args.store, args.ledgerTotalParams);
    if (Math.abs(recomputed - args.store.collectionRequestedTotal) <= 0.001) return null;

    const noticeKey = `${args.executionId}:${args.store.collectionRequestedTotal}:${recomputed}`;
    if (args.handledNoticeKey === noticeKey) return null;

    return {
        noticeKey,
        store: {
            ...args.store,
            collectionRequestActive: false,
            collectionRequestedTotal: recomputed,
        },
    };
}
