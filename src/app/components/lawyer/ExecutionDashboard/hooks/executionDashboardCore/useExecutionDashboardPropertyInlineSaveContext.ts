/** Phase C Slice 16 — سياق حفظ inline لحجز العقار + موعد المزاد */
import { useMemo } from 'react';
import type { PushSeizureAuctionCalendarAppointmentInput } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import { requireDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';

export type UseExecutionDashboardPropertyInlineSaveContextParams = {
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
        executionData,
        executionDataRef,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    } = params;

    return useMemo((): PropertyInlineSaveContext => {
        return {
            dossierId: requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId,
                executionId,
                executionDataId,
                executionData,
            }),
            showToast: (msg, type) => showToast(msg, type ?? 'info'),
            readProperties: () => {
                const fromRef = executionDataRef?.current?.seizedProperties;
                if (Array.isArray(fromRef)) return fromRef as never[];
                const fromData = executionData?.seizedProperties;
                return Array.isArray(fromData) ? (fromData as never[]) : [];
            },
            persistProperties: (next) => {
                const result = persistExecutionMerge({ seizedProperties: next });
                if (result === false) {
                    showToast('تعذّر حفظ التغيير على الإضبارة — أعد المحاولة', 'error');
                    return false;
                }
                return true;
            },
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
