import { useMemo, useRef } from 'react';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';

export type UseExecutionDashboardMovableInlineSaveContextParams = {
    decisionsStorageExecutionId: string;
    executionDataId: string | undefined;
    executionId: string | undefined;
    executionData?: Record<string, unknown> | null;
    executionDataRef?: { current: Record<string, unknown> | null | undefined };
    showToast: (message: string, type?: string) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean;
    pushTimelineEvent: (event: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    linkSeizureAuctionToAppointments: boolean;
    pushSeizureAuctionCalendarAppointment: (
        input: import('./useExecutionDashboardPushSeizureAuctionCalendarAppointment').PushSeizureAuctionCalendarAppointmentInput,
    ) => void;
};

export function useExecutionDashboardMovableInlineSaveContext(
    params: UseExecutionDashboardMovableInlineSaveContextParams,
): MovableInlineSaveContext {
    const {
        decisionsStorageExecutionId,
        executionDataId,
        executionId,
        executionData,
        executionDataRef,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    } = params;

    return useMemo((): MovableInlineSaveContext => {
        const dossierId = requireDecisionsStorageExecutionId({
            decisionsStorageExecutionId,
            executionId,
            executionDataId,
            executionData,
        });
        return {
            dossierId,
            showToast: (msg, type) => showToast(msg, type ?? 'info'),
            readMovables: () => {
                const fromRef = executionDataRef?.current?.seizedMovables;
                if (Array.isArray(fromRef)) return fromRef as never[];
                const fromData = executionData?.seizedMovables;
                return Array.isArray(fromData) ? (fromData as never[]) : [];
            },
            persistMovables: (next) => {
                const result = persistExecutionMerge({ seizedMovables: next });
                if (result === false) {
                    showToast('تعذّر حفظ التغيير على الإضبارة — أعد المحاولة', 'error');
                    return false;
                }
                return true;
            },
            pushTimeline: pushTimelineEvent,
            nextTimelineId,
            onAuctionCalendar: linkSeizureAuctionToAppointments
                ? (input) =>
                      pushSeizureAuctionCalendarAppointment({
                          dossierId: input.dossierId,
                          decisionId: input.decisionId,
                          ymd: input.ymd,
                          purpose: input.purpose,
                      })
                : undefined,
        };
    }, [
        decisionsStorageExecutionId,
        executionDataRef,
        executionDataId,
        executionId,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    ]);
}
