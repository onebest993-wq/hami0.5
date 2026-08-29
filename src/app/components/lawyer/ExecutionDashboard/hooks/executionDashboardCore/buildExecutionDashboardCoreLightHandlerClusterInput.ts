import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';
import type { ExecutionDashboardCorePersistHandlerPipelineValue } from './executionDashboardCorePersistHandlerPipelineTypes';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineValue } from './executionDashboardCoreGraceMasterEvictionPipelineTypes';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type ExecutionDashboardCoreLightHandlersParams = {
    boot: {
        executionData: ExecutionFile | null | undefined;
        executionDataRef: React.MutableRefObject<ExecutionFile | null | undefined>;
        parentDossierId: string;
        currentFileId: string;
        setShowPaymentModal: (show: boolean) => void;
    };
    file: ExecutionFile | null | undefined;
    executionId: string | undefined;
    workspacePipeline: ExecutionDashboardCoreWorkspacePipelineValue;
    persistHandlerPipeline: Pick<
        ExecutionDashboardCorePersistHandlerPipelineValue,
        'persistExecutionMerge' | 'moveCaseTaskToTrash'
    >;
    graceMasterPipeline: Pick<
        ExecutionDashboardCoreGraceMasterEvictionPipelineValue,
        'remaining' | 'totalWithExecutionFee'
    >;
    followupDebtor: {
        closeUnifiedSeizureLog?: () => void;
        openFollowupModalPersisted?: () => void;
    };
    claimFinancialLedger: {
        totalOwed: number;
    };
};

/** حقيبة إدخال light cluster — notes / appointment / payment على Core دون lazy bridge */
export function buildExecutionDashboardCoreLightHandlerClusterInput(
    p: ExecutionDashboardCoreLightHandlersParams,
): ExecutionDashboardCoreHandlerClusterInput {
    const ws = p.workspacePipeline;
    const boot = p.boot;

    return {
        appointmentDateOnly: ws.appointmentDateOnly,
        appointmentPurpose: ws.appointmentPurpose,
        appointmentTimeOptional: ws.appointmentTimeOptional,
        caseNotesLogRef: ws.caseNotesLogRef,
        caseTasksPending: ws.caseTasksPending,
        caseTasksPendingRef: ws.caseTasksPendingRef,
        closeUnifiedSeizureLog: p.followupDebtor.closeUnifiedSeizureLog,
        currentFileId: boot.currentFileId,
        editingAppointmentId: ws.editingAppointmentId,
        editingTaskId: ws.editingTaskId,
        executionData: boot.executionData,
        executionDataRef: boot.executionDataRef,
        executionId: p.executionId,
        file: p.file,
        financialLedger: ws.financialLedger,
        financialLedgerRef: ws.financialLedgerRef,
        isTask: ws.isTask,
        moveCaseTaskToTrash: p.persistHandlerPipeline.moveCaseTaskToTrash,
        nextTimelineId: ws.nextTimelineId,
        noteBody: ws.noteBody,
        noteTitle: ws.noteTitle,
        openFollowupModalPersisted: p.followupDebtor.openFollowupModalPersisted,
        paidClientFees: ws.paidClientFees,
        paidCourtFees: ws.paidCourtFees,
        paidDebt: ws.paidDebt,
        paidDebtRef: ws.paidDebtRef,
        paidDirectorateFees: ws.paidDirectorateFees,
        parentDossierId: boot.parentDossierId,
        paymentAmount: ws.paymentAmount,
        paymentDate: ws.paymentDate,
        persistExecutionMerge: p.persistHandlerPipeline.persistExecutionMerge,
        pushTimelineEventRef: ws.pushTimelineEventRef,
        remaining: p.graceMasterPipeline.remaining,
        seizedAssetsSnapshotRef: ws.seizedAssetsSnapshotRef,
        setAppointmentDateOnly: ws.setAppointmentDateOnly,
        setAppointmentPurpose: ws.setAppointmentPurpose,
        setAppointmentTimeOptional: ws.setAppointmentTimeOptional,
        setCaseNotesLog: ws.setCaseNotesLog,
        setCaseTasksPending: ws.setCaseTasksPending,
        setEditingAppointmentId: ws.setEditingAppointmentId,
        setEditingNoteId: ws.setEditingNoteId,
        setEditingTaskId: ws.setEditingTaskId,
        setFinancialLedger: ws.setFinancialLedger,
        setIsTask: ws.setIsTask,
        setNoteBody: ws.setNoteBody,
        setNoteTitle: ws.setNoteTitle,
        setPaidDebt: ws.setPaidDebt,
        setPaymentAmount: ws.setPaymentAmount,
        setPaymentDate: ws.setPaymentDate,
        setShowNotesModal: ws.setShowNotesModal,
        setShowPaymentModal: boot.setShowPaymentModal,
        setTaskDueDate: ws.setTaskDueDate,
        setTaskStatus: ws.setTaskStatus,
        setTimelineEvents: ws.setTimelineEvents,
        showToast: ws.showToast,
        taskDueDate: ws.taskDueDate,
        taskStatus: ws.taskStatus,
        timelineEventsRef: ws.timelineEventsRef,
        totalOwed: p.claimFinancialLedger.totalOwed,
        totalWithExecutionFee: p.graceMasterPipeline.totalWithExecutionFee,
    } as unknown as ExecutionDashboardCoreHandlerClusterInput;
}
