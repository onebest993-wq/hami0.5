import type { ComponentType, Dispatch, ReactNode, SetStateAction } from 'react';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
    ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import type { ExecutorApprovedDateTimeModalProps } from '@/app/components/lawyer/execution/ExecutorApprovedDateTimeModal';
import type { PoliceAssistanceDetailsModalProps } from '@/app/components/lawyer/execution/PoliceAssistanceDetailsModal';
import type { ExecutorBreakInventoryFurnitureModalProps } from '@/app/components/lawyer/execution/ExecutorBreakInventoryFurnitureModal';
import type { ExecutorJudicialCustodianModalProps } from '@/app/components/lawyer/execution/ExecutorJudicialCustodianModal';
import type { ExecutorWorkflowConfirmModalProps } from '@/app/components/lawyer/execution/ExecutorWorkflowConfirmModal';

type ExecutorScheduleContext = {
    requestTitle: string;
    onSaved: (payload: ScheduledDateSavePayload) => void;
} | null;

type BreakInventoryFurnitureModalCtx = {
    decisionId: string;
    requestTitle: string;
    onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
    onFinalize: () => void;
} | null;

type JudicialCustodianModalCtx = {
    requestTitle: string;
    onSaved: (payload: JudicialCustodianSavePayload) => void;
    initialName?: string;
    initialSalary?: string;
} | null;

export interface ExecutorWorkflowPortalModalsProps {
    EXEC_OVERLAY_LAZY_FALLBACK: ReactNode;
    LazyExecutorApprovedDateTimeModal: ComponentType<ExecutorApprovedDateTimeModalProps>;
    PoliceAssistanceDetailsModal: ComponentType<PoliceAssistanceDetailsModalProps>;
    LazyExecutorBreakInventoryFurnitureModal: ComponentType<ExecutorBreakInventoryFurnitureModalProps>;
    LazyExecutorJudicialCustodianModal: ComponentType<ExecutorJudicialCustodianModalProps>;
    LazyExecutorWorkflowConfirmModal: ComponentType<ExecutorWorkflowConfirmModalProps>;

    executorScheduleModalOpen: boolean;
    setExecutorScheduleModalOpen: Dispatch<SetStateAction<boolean>>;
    executorScheduleContext: ExecutorScheduleContext;
    setExecutorScheduleContext: Dispatch<SetStateAction<ExecutorScheduleContext>>;

    policeAssistanceModalOpen: boolean;
    setPoliceAssistanceModalOpen: Dispatch<SetStateAction<boolean>>;
    setPoliceAssistanceDecisionId: Dispatch<SetStateAction<string | null>>;
    setPoliceAssistanceRequestTitle: Dispatch<SetStateAction<string>>;
    setPoliceAssistanceAgencyDraft: Dispatch<SetStateAction<string>>;
    policeAssistanceRequestTitle: string;
    policeAssistanceAgencyDraft: string;
    savePoliceAssistanceFromModal: (agencyName: string, options?: { linkToTasks?: boolean }) => void;

    breakInventoryFurnitureModalOpen: boolean;
    setBreakInventoryFurnitureModalOpen: Dispatch<SetStateAction<boolean>>;
    breakInventoryFurnitureModalCtx: BreakInventoryFurnitureModalCtx;
    setBreakInventoryFurnitureModalCtx: Dispatch<SetStateAction<BreakInventoryFurnitureModalCtx>>;

    judicialCustodianModalOpen: boolean;
    setJudicialCustodianModalOpen: Dispatch<SetStateAction<boolean>>;
    judicialCustodianModalCtx: JudicialCustodianModalCtx;
    setJudicialCustodianModalCtx: Dispatch<SetStateAction<JudicialCustodianModalCtx>>;

    executionReportPrompt: { onConfirm: () => void } | null;
    setExecutionReportPrompt: Dispatch<SetStateAction<{ onConfirm: () => void } | null>>;
    onCloseDecisionsModal: () => void;
    setShowDecisionsModal?: (show: boolean) => void;
    openExecutionSeizuresTab: () => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
}
