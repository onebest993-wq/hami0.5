/** Phase C — تفعيل التنفيذ الجبري بعد انتهاء مهلة الرضا */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildEndGracePeriodMergePatch,
    buildGracePeriodEndedTimelineEvent,
    computeForcedDebtorNotificationYmd,
} from './executionDashboardGraceSummoning';

export type UseExecutionDashboardGracePeriodEndHandlerParams = {
    debtorNotificationDate: string | null | undefined;
    executionFeeInjected: boolean;
    calculatedExecutionFee: number;
    pushTimelineEvent: (
        event: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    setGracePeriodActive: Dispatch<SetStateAction<boolean>>;
    setGracePeriodEnded: Dispatch<SetStateAction<boolean>>;
    setDebtorNotificationDate: Dispatch<SetStateAction<string | null | undefined>>;
    setExecutionFeeInjected: Dispatch<SetStateAction<boolean>>;
    setLastActionDate: Dispatch<SetStateAction<string>>;
};

export function useExecutionDashboardGracePeriodEndHandler({
    debtorNotificationDate,
    executionFeeInjected,
    calculatedExecutionFee,
    pushTimelineEvent,
    showToast,
    setGracePeriodActive,
    setGracePeriodEnded,
    setDebtorNotificationDate,
    setExecutionFeeInjected,
    setLastActionDate,
}: UseExecutionDashboardGracePeriodEndHandlerParams) {
    const handleEndGracePeriod = useCallback(() => {
        setGracePeriodActive(false);
        setGracePeriodEnded(true);
        setDebtorNotificationDate(computeForcedDebtorNotificationYmd(debtorNotificationDate));

        const { mergePatch, injectExecutionFee, feeEvent } = buildEndGracePeriodMergePatch(
            executionFeeInjected,
            calculatedExecutionFee,
        );
        if (injectExecutionFee && feeEvent) {
            setExecutionFeeInjected(true);
            pushTimelineEvent(feeEvent);
        }
        pushTimelineEvent(buildGracePeriodEndedTimelineEvent(), { mergePatch });

        showToast('⚠️ تم تفعيل التنفيذ الجبري وإضافة الرسوم المطلوبة', 'warning');
        setLastActionDate(getLocalTodayYmd());
    }, [
        debtorNotificationDate,
        executionFeeInjected,
        calculatedExecutionFee,
        pushTimelineEvent,
        showToast,
        setGracePeriodActive,
        setGracePeriodEnded,
        setDebtorNotificationDate,
        setExecutionFeeInjected,
        setLastActionDate,
    ]);

    return { handleEndGracePeriod };
}
