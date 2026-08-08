/**
 * معالجات مقيمة على Core — light (notes/payment/appointment) + foundation (appeals/custodian/property inline).
 * تُستبدل جسور lazy المكررة لـ followup/dossier-support.
 */
import { useCallback, useMemo } from 'react';
import { useExecutionAICopilot } from '../useExecutionAICopilot';
import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardMovableInlineSaveContext } from './useExecutionDashboardMovableInlineSaveContext';
import { useExecutionDashboardPropertyInlineSaveContext } from './useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardCoreLightHandlers } from './useExecutionDashboardCoreLightHandlers';
import type { ExecutionDashboardCoreLightHandlersParams } from './buildExecutionDashboardCoreLightHandlerClusterInput';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';

export type ExecutionDashboardCoreResidentHandlersParams = ExecutionDashboardCoreLightHandlersParams & {
    decisionsStorageExecutionId: string | undefined;
    decisionsReloadEpoch?: number;
    linkSeizureAuctionToAppointments?: boolean;
    pushSeizureAuctionCalendarAppointment: (
        input: PushSeizureAuctionCalendarAppointmentInput,
    ) => void;
};

export function useExecutionDashboardCoreResidentHandlers(
    p: ExecutionDashboardCoreResidentHandlersParams,
) {
    const lightHandlers = useExecutionDashboardCoreLightHandlers(p);
    const { pushTimelineEventBinding, notesTasksHandlers, appointmentHandler, paymentHandlers } =
        lightHandlers;
    const { pushTimelineEvent } = pushTimelineEventBinding;
    const { showToast } = p.workspacePipeline;

    const showToastForPropertyInline = useCallback(
        (message: string, type?: string) => showToast(message, type as Parameters<typeof showToast>[1]),
        [showToast],
    );

    const resolvedDecisionsStorageExecutionId = requireDecisionsStorageExecutionId({
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionId: p.executionId,
        executionData: p.boot.executionData as Record<string, unknown> | null,
    });

    const { firstActiveAppealDecisionId } = useExecutionAICopilot({
        decisionsStorageExecutionId: resolvedDecisionsStorageExecutionId,
        decisionsReloadEpoch: p.decisionsReloadEpoch ?? 0,
    });

    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData: p.boot.executionData,
        persistExecutionMerge: p.persistHandlerPipeline.persistExecutionMerge,
        showToast: showToastForPropertyInline,
    });

    const inlineSaveCommon = {
        decisionsStorageExecutionId: resolvedDecisionsStorageExecutionId,
        executionDataId: p.boot.executionData?.id,
        executionId: p.executionId,
        executionData: p.boot.executionData as Record<string, unknown> | null | undefined,
        executionDataRef: p.boot.executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast: showToastForPropertyInline,
        persistExecutionMerge: p.persistHandlerPipeline.persistExecutionMerge,
        pushTimelineEvent: (event: Record<string, unknown>) =>
            pushTimelineEvent(event as unknown as Parameters<typeof pushTimelineEvent>[0]),
        nextTimelineId: p.workspacePipeline.nextTimelineId,
        linkSeizureAuctionToAppointments: Boolean(p.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment: p.pushSeizureAuctionCalendarAppointment,
    };

    const propertyInlineSaveCtx = useExecutionDashboardPropertyInlineSaveContext(inlineSaveCommon);
    const movableInlineSaveCtx = useExecutionDashboardMovableInlineSaveContext(inlineSaveCommon);

    return useMemo(
        () => ({
            pushTimelineEventBinding,
            notesTasksHandlers,
            appointmentHandler,
            paymentHandlers,
            ...(notesTasksHandlers && typeof notesTasksHandlers === 'object' ? notesTasksHandlers : {}),
            ...(appointmentHandler && typeof appointmentHandler === 'object' ? appointmentHandler : {}),
            ...(paymentHandlers && typeof paymentHandlers === 'object' ? paymentHandlers : {}),
            firstActiveAppealDecisionId,
            removeJudicialCustodianEntry,
            propertyInlineSaveCtx,
            movableInlineSaveCtx,
        }),
        [
            pushTimelineEventBinding,
            notesTasksHandlers,
            appointmentHandler,
            paymentHandlers,
            firstActiveAppealDecisionId,
            removeJudicialCustodianEntry,
            propertyInlineSaveCtx,
            movableInlineSaveCtx,
        ],
    );
}
