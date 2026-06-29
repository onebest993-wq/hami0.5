// @ts-nocheck
import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionDashboardProps } from '../../types';

/** Phase C Slice 31 — typed input for workspace pipeline */
export type ExecutionDashboardCoreWorkspacePipelineInput = {
    modals: {
        showUnifiedExecutionModal: boolean;
        showUnifiedSummonsModal: boolean;
        showLedgerModal: boolean;
    };
    executionData: ExecutionFile | null | undefined;
    executionDataRef: { current: ExecutionFile | null | undefined };
    executionFileKey: string;
    executionDashboardFileId: string | null;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    executionStorageTick: number;
    setExecutionModal: (key: string, show: boolean) => void;
    showDecisionsModal: boolean;
    setShowDecisionsModal: (show: boolean) => void;
    setShowNotesModal: (show: boolean) => void;
    setShowDocumentsModal: (show: boolean) => void;
    setShowAppointmentModal: (show: boolean) => void;
    setShowTimelineModal: (show: boolean) => void;
    setShowNotificationModal: (show: boolean) => void;
    setShowCoerciveModal: (show: boolean) => void;
    subFiles: unknown[];
    activeSubFileId: string | null;
    isInabaActive: boolean;
    parentDossierId: string;
};
