import React, { Suspense } from 'react';
import { LazyExecutorWorkflowPortalModals } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistryOverlays';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShellUi';
import { ExecutionNamedOverlayInstantFrame } from './executionOverlayInstantPresets';
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
        judicialCustodiansResolved,
    } = props;

    const judicialCustodianExistingNames = Array.isArray(judicialCustodiansResolved)
        ? (judicialCustodiansResolved as Array<{ fullName?: string }>)
              .map((c) => String(c?.fullName || '').trim())
              .filter(Boolean)
        : [];

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
        <Suspense
            fallback={
                <ExecutionNamedOverlayInstantFrame
                    title={
                        executorScheduleModalOpen
                            ? 'موعد المنفّذ'
                            : policeAssistanceModalOpen
                              ? 'مؤازرة الشرطة'
                              : breakInventoryFurnitureModalOpen
                                ? 'جرد الأثاث'
                                : judicialCustodianModalOpen
                                  ? 'الحارس القضائي'
                                  : 'تأكيد محضر التنفيذ'
                    }
                    onClose={() => {
                        if (executorScheduleModalOpen && typeof props.setExecutorScheduleModalOpen === 'function') {
                            (props.setExecutorScheduleModalOpen as (v: boolean) => void)(false);
                        }
                        if (policeAssistanceModalOpen && typeof props.setPoliceAssistanceModalOpen === 'function') {
                            (props.setPoliceAssistanceModalOpen as (v: boolean) => void)(false);
                        }
                        if (
                            breakInventoryFurnitureModalOpen &&
                            typeof props.setBreakInventoryFurnitureModalOpen === 'function'
                        ) {
                            (props.setBreakInventoryFurnitureModalOpen as (v: boolean) => void)(false);
                        }
                        if (judicialCustodianModalOpen && typeof props.setJudicialCustodianModalOpen === 'function') {
                            (props.setJudicialCustodianModalOpen as (v: boolean) => void)(false);
                        }
                        if (executionReportPrompt && typeof props.setExecutionReportPrompt === 'function') {
                            (props.setExecutionReportPrompt as (v: null) => void)(null);
                        }
                    }}
                />
            }
        >
            <LazyExecutorWorkflowPortalModals
                {...(props as unknown as ExecutorWorkflowPortalModalsProps)}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_INNER_SILENT_FALLBACK}
                judicialCustodianExistingNames={judicialCustodianExistingNames}
            />
        </Suspense>
    );
}
