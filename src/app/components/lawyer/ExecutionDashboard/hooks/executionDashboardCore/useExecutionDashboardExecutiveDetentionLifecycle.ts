/** انتهاء الحبس التنفيذي + تنبيه ما قبل الانتهاء */
import { useEffect, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutiveDetentionExpiryPatch,
    EXECUTIVE_DETENTION_REMINDER_MESSAGE,
    isExecutiveDetentionExpired,
    shouldSendExecutiveDetentionReminder,
} from './executionDashboardPersonalCoerciveDecisionSync';

export type UseExecutionDashboardExecutiveDetentionLifecycleParams = {
    executionData: ExecutionFile | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
};

export function useExecutionDashboardExecutiveDetentionLifecycle({
    executionData,
    persistExecutionMerge,
    showToast,
}: UseExecutionDashboardExecutiveDetentionLifecycleParams) {
    const reminderFiredRef = useRef(false);

    useEffect(() => {
        if (!executionData?.executive_detention_reminder_sent) {
            reminderFiredRef.current = false;
        }
    }, [executionData?.executive_detention_reminder_sent]);

    useEffect(() => {
        const until = executionData?.executive_detention_until;
        if (!executionData?.debtor_executive_detention_active) return;

        if (isExecutiveDetentionExpired(until)) {
            persistExecutionMerge(buildExecutiveDetentionExpiryPatch());
            return;
        }

        if (
            shouldSendExecutiveDetentionReminder(
                until,
                executionData.executive_detention_reminder_sent,
                reminderFiredRef.current,
            )
        ) {
            reminderFiredRef.current = true;
            showToast(EXECUTIVE_DETENTION_REMINDER_MESSAGE, 'warning');
            persistExecutionMerge({ executive_detention_reminder_sent: true });
        }
    }, [
        executionData?.executive_detention_until,
        executionData?.debtor_executive_detention_active,
        executionData?.executive_detention_reminder_sent,
        persistExecutionMerge,
        showToast,
    ]);
}
