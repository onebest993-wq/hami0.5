// @ts-nocheck
/** Phase C Slice 16 — ربط موعد مزاد الحجز بالتقويم عبر executorApprovalActions */
import { useCallback } from 'react';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';

export type PushSeizureAuctionCalendarAppointmentInput = {
    dossierId: string;
    decisionId: string;
    ymd: string;
    purpose: string;
    linkToAppointments: boolean;
};

export function useExecutionDashboardPushSeizureAuctionCalendarAppointment(
    executorApprovalActions: ExecutorApprovalActions,
) {
    return useCallback(
        (input: PushSeizureAuctionCalendarAppointmentInput) => {
            if (!input.linkToAppointments) return;
            const dossierId = String(input.dossierId || '').trim();
            const decisionId = String(input.decisionId || '').trim();
            const ymd = String(input.ymd || '').trim();
            if (!dossierId || !decisionId || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
            executorApprovalActions.pushCalendarAppointment({
                dossierId,
                decisionId,
                purpose: input.purpose,
                eventIso: `${ymd}T12:00:00`,
                recordedAt: new Date().toISOString(),
            });
        },
        [executorApprovalActions],
    );
}
