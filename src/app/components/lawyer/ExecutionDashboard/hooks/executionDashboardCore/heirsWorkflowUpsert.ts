import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    formatDateToLocalYmd,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';

export function normalizeHeirWorkflowKey(name: string) {
    const raw = String(name || '').trim();
    return raw
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, '');
}

export function computeDeadlineYmd(fromYmd: string, daysWindow: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return '';
    const d = parseLocalNotificationDate(fromYmd);
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + daysWindow);
    return formatDateToLocalYmd(d);
}

export function computeDaysRemaining(fromYmd: string, daysWindow: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return null;
    const notif = parseLocalNotificationDate(fromYmd);
    if (Number.isNaN(notif.getTime())) return null;
    const startFromNextDay = new Date(notif);
    startFromNextDay.setDate(startFromNextDay.getDate() + 1);
    startFromNextDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - startFromNextDay.getTime()) / 86400000);
    const elapsed = diff >= 0 ? diff + 1 : 0;
    return Math.max(daysWindow - elapsed, 0);
}

export type UpsertHeirWorkflowFn = (
    heirName: string,
    updater: (prev: Record<string, unknown>) => Record<string, unknown>,
    timelineEvent?: TimelineEvent,
) => void;

export function useUpsertHeirWorkflow(
    executionData: ExecutionFile | null | undefined,
    persistExecutionMerge: (patch: Record<string, unknown>) => void,
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>,
): UpsertHeirWorkflowFn {
    return useCallback(
        (
            heirName: string,
            updater: (prev: Record<string, unknown>) => Record<string, unknown>,
            timelineEvent?: TimelineEvent,
        ) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prevAll = executionData?.heirs_notification_workflow?.byHeir || {};
            const prevOne = prevAll[key] || {
                heirName,
                memoStatus: 'none',
                summonStatus: 'none',
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
            };
            const updatedOne = updater(prevOne);
            const updatedAll = {
                ...prevAll,
                [key]: {
                    ...updatedOne,
                    heirName,
                    lastActionAt: new Date().toISOString(),
                },
            };
            if (timelineEvent) {
                setTimelineEvents((prevTl) => {
                    const nextTl = [timelineEvent, ...prevTl];
                    persistExecutionMerge({
                        heirs_notification_workflow: {
                            hasReceivedInitialNotice: true,
                            byHeir: updatedAll,
                        },
                        timelineEvents: nextTl,
                    });
                    return nextTl;
                });
                return;
            }
            persistExecutionMerge({
                heirs_notification_workflow: {
                    hasReceivedInitialNotice: true,
                    byHeir: updatedAll,
                },
            });
        },
        [
            executionData?.heirs_notification_workflow?.byHeir,
            persistExecutionMerge,
            setTimelineEvents,
        ],
    );
}
