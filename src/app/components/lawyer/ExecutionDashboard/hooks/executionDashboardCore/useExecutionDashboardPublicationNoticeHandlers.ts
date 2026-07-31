// @ts-nocheck
/** التبليغ بالنشر — handlers محضر المتابعة والتبليغ الموحّد */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    markPublicationNoticeDebtorAttended,
    registerPublicationNoticeForDebtor,
    terminatePublicationNoticeForDebtor,
} from '@/app/utils/publicationNoticeRegistration';

export type UseExecutionDashboardPublicationNoticeHandlersParams = {
    executionActionsGridLocked: boolean;
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function useExecutionDashboardPublicationNoticeHandlers({
    executionActionsGridLocked,
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
}: UseExecutionDashboardPublicationNoticeHandlersParams) {
    const lockedToast = useCallback(() => {
        showToast(
            '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
            'warning',
        );
    }, [showToast]);

    const publicationNoticeDeps = useCallback(
        () => ({
            executionData,
            debtorKey: unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            pushTimelineEvent: (event: TimelineEvent) => {
                setTimelineEvents((prev) => {
                    const next = [event, ...prev];
                    persistExecutionMerge({ timelineEvents: next });
                    return next;
                });
            },
        }),
        [
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
        ],
    );

    const handlePublicationNoticeRegister = useCallback(
        (p: { publicationDateYmd: string; newspaper1: string; newspaper2: string }) => {
            if (executionActionsGridLocked) {
                lockedToast();
                return;
            }
            registerPublicationNoticeForDebtor(publicationNoticeDeps(), p);
        },
        [executionActionsGridLocked, lockedToast, publicationNoticeDeps],
    );

    const handlePublicationNoticeTerminate = useCallback(() => {
        if (executionActionsGridLocked) {
            lockedToast();
            return;
        }
        terminatePublicationNoticeForDebtor(publicationNoticeDeps());
    }, [executionActionsGridLocked, lockedToast, publicationNoticeDeps]);

    const handlePublicationNoticeDebtorAttended = useCallback(() => {
        if (executionActionsGridLocked) {
            lockedToast();
            return;
        }
        markPublicationNoticeDebtorAttended(publicationNoticeDeps());
    }, [executionActionsGridLocked, lockedToast, publicationNoticeDeps]);

    return {
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
    };
}
