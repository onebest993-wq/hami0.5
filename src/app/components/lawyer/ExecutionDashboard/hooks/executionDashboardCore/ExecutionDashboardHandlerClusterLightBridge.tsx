// @ts-nocheck
/** Loads execution-core-handlers-light for notes/appointment/payment paths only. */
import { useEffect, useRef } from 'react';
import { useExecutionDashboardCoreHandlerClusterLight } from './useExecutionDashboardCoreHandlerClusterLight';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardHandlerClusterLightBridgeProps = {
    input: ExecutionDashboardCoreHandlerClusterInput;
    onCluster: (cluster: Record<string, unknown>) => void;
};

/**
 * بصمة مراجع الدوال — لا كائن الغلاف.
 * يمنع Maximum update depth عندما يُعاد إنشاء bag في كل render بنفس المعالجات.
 */
function lightClusterFingerprint(cluster: Record<string, unknown>): unknown[] {
    const notes = cluster.notesTasksHandlers as Record<string, unknown> | undefined;
    const appointment = cluster.appointmentHandler as Record<string, unknown> | undefined;
    const payment = cluster.paymentHandlers as Record<string, unknown> | undefined;
    const push = cluster.pushTimelineEventBinding as Record<string, unknown> | undefined;
    return [
        push?.pushTimelineEvent,
        notes?.handleSaveNote,
        notes?.handleMemoFollowupClick,
        notes?.handleSaveTask,
        appointment?.handleSaveAppointment,
        payment?.handlePayment,
        payment?.handlePaymentFromCalculator,
        payment?.handleFundsLedgerPayment,
        payment?.handleSettlementFromCalculator,
    ];
}

export function ExecutionDashboardHandlerClusterLightBridge({
    input,
    onCluster,
}: ExecutionDashboardHandlerClusterLightBridgeProps) {
    const cluster = useExecutionDashboardCoreHandlerClusterLight(input);
    const lastFpRef = useRef<unknown[] | null>(null);
    const clusterRef = useRef(cluster);
    clusterRef.current = cluster;

    useEffect(() => {
        const nextFp = lightClusterFingerprint(clusterRef.current);
        const prevFp = lastFpRef.current;
        if (
            prevFp &&
            prevFp.length === nextFp.length &&
            prevFp.every((value, index) => Object.is(value, nextFp[index]))
        ) {
            return;
        }
        lastFpRef.current = nextFp;
        onCluster(clusterRef.current);
    }, [cluster, onCluster]);

    return null;
}
