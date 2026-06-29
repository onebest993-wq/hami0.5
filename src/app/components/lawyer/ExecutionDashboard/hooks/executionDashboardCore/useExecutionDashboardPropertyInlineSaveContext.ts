// @ts-nocheck
/** Phase C Slice 16 — سياق حفظ inline لحجز العقار + موعد المزاد */
import { useMemo } from 'react';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { PushSeizureAuctionCalendarAppointmentInput } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';

export type UseExecutionDashboardPropertyInlineSaveContextParams = {
    decisionsStorageExecutionId: string;
    executionDataId: string | undefined;
    executionId: string | undefined;
    showToast: (message: string, type?: string) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (event: Record<string, unknown>) => void;
    nextTimelineId: () => string;
    linkSeizureAuctionToAppointments: boolean;
    pushSeizureAuctionCalendarAppointment: (
        input: PushSeizureAuctionCalendarAppointmentInput,
    ) => void;
};

export function useExecutionDashboardPropertyInlineSaveContext(
    params: UseExecutionDashboardPropertyInlineSaveContextParams,
): PropertyInlineSaveContext {
    const {
        decisionsStorageExecutionId,
        executionDataId,
        executionId,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    } = params;

    return useMemo((): PropertyInlineSaveContext => {
        return {
            dossierId: String(decisionsStorageExecutionId ?? executionDataId ?? executionId ?? '').trim(),
            showToast: (msg, type) => showToast(msg, type ?? 'info'),
            persistProperties: (next) => persistExecutionMerge({ seizedProperties: next }),
            pushTimeline: pushTimelineEvent,
            nextTimelineId,
            onAuctionCalendar: ({ dossierId, decisionId, ymd, purpose }) => {
                pushSeizureAuctionCalendarAppointment({
                    dossierId,
                    decisionId,
                    ymd,
                    purpose,
                    linkToAppointments: linkSeizureAuctionToAppointments,
                });
            },
        };
    }, [
        decisionsStorageExecutionId,
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
