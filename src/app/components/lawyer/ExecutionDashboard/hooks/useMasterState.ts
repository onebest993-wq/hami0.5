import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { calculateGlobalFileState, getStatusMetadata } from '@/app/utils/executionStateMachine';
import type { ExecutionFileState } from '@/app/utils/executionStateMachine';

export function useMasterState(
    executionData: ExecutionFile | null | undefined,
    executionId: string | undefined,
    debtors: Debtor[],
    debtorNotificationDate: string | null,
    remaining: number,
    isPaused: boolean,
    pauseReason: string | undefined,
    isAlimonyClaim: boolean,
    executionFeeAdded: boolean,
    manualGraceCalendarExtra: boolean,
    summoningRound: number,
    notificationCount: number,
    isEvictionExecutionModule: boolean,
    noticeVoluntaryPeriodEndOptimistic: boolean,
    voluntaryEndOptimistic: boolean,
) {
    const masterState: ExecutionFileState = useMemo(() => {
        const memoAnchorGeneral =
            executionData?.execution_memo_anchor_date ||
            executionData?.debtorNotificationDate ||
            debtorNotificationDate ||
            null;
        const lastNoticeGeneral =
            executionData?.debtorNotificationDate || debtorNotificationDate || null;

        const skipLegalGraceGeneral =
            summoningRound >= 2 ||
            (notificationCount >= 2 && !isEvictionExecutionModule) ||
            Boolean(
                !isEvictionExecutionModule &&
                    (executionData?.notice_voluntary_period_end_declared ||
                        noticeVoluntaryPeriodEndOptimistic)
            );

        const debtorsWithNotification = debtors.map((debtor: Debtor, index: number) => ({
            id: String(debtor.id ?? `debtor_${index}`),
            name: debtor.name || 'مدين غير معروف',
            notificationDate: isEvictionExecutionModule
                ? executionData?.eviction_first_notice_date ||
                  executionData?.debtorNotificationDate ||
                  debtor.notificationDate ||
                  debtorNotificationDate ||
                  null
                : notificationCount === 1 &&
                    !executionData?.notice_voluntary_period_end_declared &&
                    !noticeVoluntaryPeriodEndOptimistic
                  ? memoAnchorGeneral || debtor.notificationDate || lastNoticeGeneral
                  : lastNoticeGeneral || debtor.notificationDate,
        }));

        return calculateGlobalFileState(
            executionData?.id || executionId || 'unknown',
            debtorsWithNotification,
            remaining,
            isPaused,
            pauseReason,
            isAlimonyClaim,
            executionFeeAdded,
            new Date(),
            isEvictionExecutionModule ? false : manualGraceCalendarExtra,
            isEvictionExecutionModule ? summoningRound >= 2 : skipLegalGraceGeneral,
        );
    }, [
        debtors,
        debtorNotificationDate,
        remaining,
        isPaused,
        pauseReason,
        isAlimonyClaim,
        executionFeeAdded,
        manualGraceCalendarExtra,
        executionData?.debtorNotificationDate,
        executionData?.eviction_first_notice_date,
        executionData?.execution_memo_anchor_date,
        executionData?.notice_voluntary_period_end_declared,
        executionData?.id,
        executionId,
        summoningRound,
        isEvictionExecutionModule,
        notificationCount,
        noticeVoluntaryPeriodEndOptimistic,
    ]);

    const executionStatusRaw = masterState.globalStatus;
    const executionStatus = useMemo(() => {
        if (isEvictionExecutionModule && remaining > 0) {
            if (notificationCount >= 2) return executionStatusRaw;
            const hasNotif = Boolean(
                executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate
            );
            if (!hasNotif) return executionStatusRaw;
            if (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) {
                return 'READY_FOR_COERCIVE' as const;
            }
            if (executionStatusRaw === 'READY_FOR_COERCIVE' || executionStatusRaw === 'GRACE_PERIOD') {
                return 'GRACE_PERIOD' as const;
            }
            return executionStatusRaw;
        }
        if (!isEvictionExecutionModule && remaining > 0 && notificationCount === 1) {
            const hasNotif = Boolean(
                executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate
            );
            if (!hasNotif) return executionStatusRaw;
            if (
                executionData?.notice_voluntary_period_end_declared ||
                noticeVoluntaryPeriodEndOptimistic
            ) {
                return 'READY_FOR_COERCIVE' as const;
            }
            if (executionStatusRaw === 'READY_FOR_COERCIVE' || executionStatusRaw === 'GRACE_PERIOD') {
                return 'GRACE_PERIOD' as const;
            }
        }
        return executionStatusRaw;
    }, [
        isEvictionExecutionModule,
        remaining,
        notificationCount,
        executionStatusRaw,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.debtorNotificationDate,
        debtorNotificationDate,
        debtors,
    ]);

    const statusMetadata = getStatusMetadata(executionStatus);

    return {
        masterState,
        executionStatusRaw,
        executionStatus,
        statusMetadata,
    };
}
