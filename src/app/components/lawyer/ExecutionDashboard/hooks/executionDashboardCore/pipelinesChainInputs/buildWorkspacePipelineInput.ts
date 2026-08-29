/** Workspace pipeline chain input builder */
import type { AnyRecord } from './types';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from '../executionDashboardCoreWorkspacePipelineInput';

export function buildExecutionDashboardCoreWorkspacePipelineInput(input: {
    boot: AnyRecord;
    executionId: string | undefined;
}): ExecutionDashboardCoreWorkspacePipelineInput {
    const { boot, executionId } = input;

    return {
        modals: boot.modals,
        executionData: boot.executionData,
        executionDataRef: boot.executionDataRef,
        executionFileKey: boot.executionFileKey,
        executionDashboardFileId: boot.executionDashboardFileId,
        executionId,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        executionStorageTick: boot.executionStorageTick,
        setExecutionModal: boot.setExecutionModal,
        showDecisionsModal: boot.showDecisionsModal,
        setShowDecisionsModal: boot.setShowDecisionsModal,
        setShowNotesModal: boot.setShowNotesModal,
        setShowDocumentsModal: boot.setShowDocumentsModal,
        setShowAppointmentModal: boot.setShowAppointmentModal,
        setShowTimelineModal: boot.setShowTimelineModal,
        setShowNotificationModal: boot.setShowNotificationModal,
        setShowCoerciveModal: boot.setShowCoerciveModal,
        subFiles: boot.subFiles,
        activeSubFileId: boot.activeSubFileId,
        isInabaActive: boot.isInabaActive,
        parentDossierId: boot.parentDossierId,
    } as ExecutionDashboardCoreWorkspacePipelineInput;
}
