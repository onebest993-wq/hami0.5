import { asHandlerClusterSpreads, collectFullHandlerClusterContext, type HandlerClusterBridgeInput } from './handlerClusterContextShared';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import { useExecutionDashboardCoreHandlerClusterCoerciveFoundation } from './useExecutionDashboardCoreHandlerClusterCoerciveFoundation';
import { useExecutionDashboardPaymentHandlers } from './useExecutionDashboardPaymentHandlers';
import {
    handlerBagKeyFingerprint,
    usePublishHandlerClusterWhenFingerprintChanges,
} from './handlerClusterPublishUtils';

type PaymentHandlersInput = Parameters<typeof useExecutionDashboardPaymentHandlers>[0];

export type ExecutionDashboardHandlerClusterPaymentBridgeProps = {
    input: HandlerClusterBridgeInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

export function ExecutionDashboardHandlerClusterPaymentBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterPaymentBridgeProps) {
    const c = collectFullHandlerClusterContext(asHandlerClusterSpreads(input)) as PaymentHandlersInput &
        ExecutionDashboardCoreHandlerClusterInput;
    const { pushTimelineEvent } = useExecutionDashboardCoreHandlerClusterCoerciveFoundation(c);

    const paymentHandlers = useExecutionDashboardPaymentHandlers({
        executionDataRef: c.executionDataRef,
        executionId: c.executionId,
        executionData: c.executionData,
        paymentAmount: c.paymentAmount,
        paymentDate: c.paymentDate,
        remaining: c.remaining,
        paidDebt: c.paidDebt,
        totalOwed: c.totalOwed,
        totalWithExecutionFee: c.totalWithExecutionFee,
        paidCourtFees: c.paidCourtFees,
        paidDirectorateFees: c.paidDirectorateFees,
        paidClientFees: c.paidClientFees,
        financialLedger: c.financialLedger,
        financialLedgerRef: c.financialLedgerRef,
        paidDebtRef: c.paidDebtRef,
        seizedAssetsSnapshotRef: c.seizedAssetsSnapshotRef,
        nextTimelineId: c.nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge: c.persistExecutionMerge,
        showToast: c.showToast,
        setPaidDebt: c.setPaidDebt,
        setFinancialLedger: c.setFinancialLedger,
        setPaymentAmount: c.setPaymentAmount,
        setPaymentDate: c.setPaymentDate,
        setShowPaymentModal: c.setShowPaymentModal,
        isRepresentingDebtor: Boolean(
            (c as { isRepresentingDebtor?: boolean }).isRepresentingDebtor,
        ),
    });

    const cluster: Record<string, unknown> = { paymentHandlers };

    usePublishHandlerClusterWhenFingerprintChanges(
        cluster,
        handlerBagKeyFingerprint(paymentHandlers as Record<string, unknown>),
        onCluster,
    );

    return null;
}
