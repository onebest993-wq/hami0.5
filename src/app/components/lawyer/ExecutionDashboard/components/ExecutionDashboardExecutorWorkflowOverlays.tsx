import React, { Suspense } from 'react';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyExecutorWorkflowPortalModals,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';
import type { ExecutorWorkflowPortalModalsProps } from './ExecutorWorkflowPortalModals.types';

export type ExecutionDashboardExecutorWorkflowOverlaysProps = Record<string, unknown> & {
    executorScheduleModalOpen?: boolean;
    policeAssistanceModalOpen?: boolean;
    breakInventoryFurnitureModalOpen?: boolean;
    judicialCustodianModalOpen?: boolean;
    executionReportPrompt?: { onConfirm: () => void } | null;
    onCloseDecisionsModal?: () => void;
};

/** نوافذ سير عمل المنفّذ — chunk lazy منفصل */
export function ExecutionDashboardExecutorWorkflowOverlays(
    props: ExecutionDashboardExecutorWorkflowOverlaysProps,
) {
    const {
        executorScheduleModalOpen,
        policeAssistanceModalOpen,
        breakInventoryFurnitureModalOpen,
        judicialCustodianModalOpen,
        executionReportPrompt,
    } = props;

    if (
        !executorScheduleModalOpen &&
        !policeAssistanceModalOpen &&
        !breakInventoryFurnitureModalOpen &&
        !judicialCustodianModalOpen &&
        !executionReportPrompt
    ) {
        return null;
    }

    return (
        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutorWorkflowPortalModals
                {...(props as unknown as ExecutorWorkflowPortalModalsProps)}
            />
        </Suspense>
    );
}
