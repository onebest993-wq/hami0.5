import React, { Suspense } from 'react';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import type { Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
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
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyExecutorApprovedDateTimeModal: React.ComponentType<ExecutorApprovedDateTimeModalProps>;
    PoliceAssistanceDetailsModal: React.ComponentType<PoliceAssistanceDetailsModalProps>;
    LazyExecutorBreakInventoryFurnitureModal: React.ComponentType<ExecutorBreakInventoryFurnitureModalProps>;
    LazyExecutorJudicialCustodianModal: React.ComponentType<ExecutorJudicialCustodianModalProps>;
    LazyExecutorWorkflowConfirmModal: React.ComponentType<ExecutorWorkflowConfirmModalProps>;

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
    judicialCustodianExistingNames?: string[];

    executionReportPrompt: { onConfirm: () => void } | null;
    setExecutionReportPrompt: Dispatch<SetStateAction<{ onConfirm: () => void } | null>>;
    setShowDecisionsModal?: (show: boolean) => void;
    onCloseDecisionsModal?: () => void;
    openExecutionSeizuresTab: () => void;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
}

export const ExecutorWorkflowPortalModals: React.FC<ExecutorWorkflowPortalModalsProps> = ({
    EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
    LazyExecutorApprovedDateTimeModal,
    PoliceAssistanceDetailsModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    executorScheduleModalOpen,
    setExecutorScheduleModalOpen,
    executorScheduleContext,
    setExecutorScheduleContext,
    policeAssistanceModalOpen,
    setPoliceAssistanceModalOpen,
    setPoliceAssistanceDecisionId,
    setPoliceAssistanceRequestTitle,
    setPoliceAssistanceAgencyDraft,
    policeAssistanceRequestTitle,
    policeAssistanceAgencyDraft,
    savePoliceAssistanceFromModal,
    breakInventoryFurnitureModalOpen,
    setBreakInventoryFurnitureModalOpen,
    breakInventoryFurnitureModalCtx,
    setBreakInventoryFurnitureModalCtx,
    judicialCustodianModalOpen,
    setJudicialCustodianModalOpen,
    judicialCustodianModalCtx,
    setJudicialCustodianModalCtx,
    judicialCustodianExistingNames = [],
    executionReportPrompt,
    setExecutionReportPrompt,
    setShowDecisionsModal,
    onCloseDecisionsModal,
    openExecutionSeizuresTab,
    showToast,
}) => {
    return (
        <>
            {typeof document !== 'undefined' &&
                executorScheduleModalOpen &&
                createPortal(
                    <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                        <LazyExecutorApprovedDateTimeModal
                            open
                            requestTitle={executorScheduleContext?.requestTitle ?? ''}
                            onClose={() => {
                                setExecutorScheduleModalOpen(false);
                                setExecutorScheduleContext(null);
                            }}
                            onConfirm={(payload) => {
                                executorScheduleContext?.onSaved(payload);
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                policeAssistanceModalOpen &&
                createPortal(
                    <PoliceAssistanceDetailsModal
                        open
                        requestTitle={policeAssistanceRequestTitle || 'القوة الجبرية'}
                        initialAgencyName={policeAssistanceAgencyDraft}
                        onClose={() => {
                            setPoliceAssistanceModalOpen(false);
                            setPoliceAssistanceDecisionId(null);
                            setPoliceAssistanceRequestTitle('');
                            setPoliceAssistanceAgencyDraft('');
                        }}
                        onConfirm={({ agencyName, linkToTasks }) => {
                            savePoliceAssistanceFromModal(agencyName, { linkToTasks });
                        }}
                    />,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                breakInventoryFurnitureModalOpen &&
                createPortal(
                    <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                        <LazyExecutorBreakInventoryFurnitureModal
                            open
                            requestTitle={breakInventoryFurnitureModalCtx?.requestTitle ?? ''}
                            onClose={() => {
                                setBreakInventoryFurnitureModalOpen(false);
                                setBreakInventoryFurnitureModalCtx(null);
                            }}
                            onConfirm={(payload) => {
                                breakInventoryFurnitureModalCtx?.onSaved(payload);
                            }}
                            onFinalize={() => {
                                breakInventoryFurnitureModalCtx?.onFinalize();
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                judicialCustodianModalOpen &&
                createPortal(
                    <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                        <LazyExecutorJudicialCustodianModal
                            open
                            requestTitle={judicialCustodianModalCtx?.requestTitle ?? ''}
                            initialName={judicialCustodianModalCtx?.initialName}
                            initialSalary={judicialCustodianModalCtx?.initialSalary}
                            existingCustodianNames={judicialCustodianExistingNames}
                            onClose={() => {
                                setJudicialCustodianModalOpen(false);
                                setJudicialCustodianModalCtx(null);
                            }}
                            onConfirm={(payload) => {
                                judicialCustodianModalCtx?.onSaved(payload);
                            }}
                        />
                    </Suspense>,
                    document.body
                )}

            {typeof document !== 'undefined' &&
                executionReportPrompt !== null &&
                createPortal(
                    <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
                        <LazyExecutorWorkflowConfirmModal
                            open
                            message="هل تريد الانتقال لفتح محضر الجرد/التخلية الآن؟"
                            onClose={() => setExecutionReportPrompt(null)}
                            onConfirm={() => {
                                executionReportPrompt?.onConfirm();
                                if (typeof onCloseDecisionsModal === 'function') {
                                    onCloseDecisionsModal();
                                } else {
                                    setShowDecisionsModal?.(false);
                                }
                                openExecutionSeizuresTab();
                                showToast(
                                    'تم فتح «محضر المتابعة». أكمل الإجراءات من التبويب المناسب؛ للحجز المالي استخدم «الحجز المالي».',
                                    'info'
                                );
                            }}
                        />
                    </Suspense>,
                    document.body
                )}
        </>
    );
};
