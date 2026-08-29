import { useMemo } from 'react';
import {
    getResidentialVacateDeadlineMaxIso,
    isVacateDeadlinePassed,
} from '@/app/utils/executionModuleStrategies';
import { useEvictionProcedureLockHint } from '../useEvictionProcedureLockHint';
import { useEvictionBadges } from '../useEvictionBadges';
import { useExecutionDashboardGraceLifecycleEffects } from './useExecutionDashboardTimelineAndGraceSync';
import type { ExecutionFile } from '@/app/types/execution';

export function useGraceMasterEvictionVacateTail(input: {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    debtorNotificationDate: string | null | undefined;
    debtors: Array<{ notificationDate?: string }>;
    manualGraceCalendarExtra: boolean;
    debtorNotifiedForEvictionGrace: boolean;
    isEvictionGraceExpiredNow: boolean;
    evictionPremisesUseResolved: string | null | undefined;
    followupOrchestrator: {
        evictionVacateDeadlineLocal?: string | null;
        evictionExecutorVacateGrantApproved?: boolean;
        evictionResidentialGracePeriodStart?: string | null;
        evictionResidentialGraceManuallyEndedAt?: string | null;
    };
    coerciveUiLocked: boolean;
    coerciveDossierLocked: boolean;
    notificationCount: number;
    isEvictionGraceEffectivelyExpired: boolean;
    isEvictionGraceExpiredCalendar: boolean;
    daysRemainingInEvictionGrace: number;
    isEvictionExecutionModule: boolean;
    executionStatus: string;
    gracePeriodEnded: boolean;
    setGracePeriodEnded: (v: boolean) => void;
    setGracePeriodActive: (v: boolean) => void;
    timelineEventsRef: { current: unknown };
    todayYmd: string;
    showToastRef: { current: unknown };
    showToast: (message: string, type?: string) => void;
}) {
    const {
        executionData,
        executionId,
        debtorNotificationDate,
        debtors,
        manualGraceCalendarExtra,
        followupOrchestrator,
        evictionPremisesUseResolved,
    } = input;

    const notifDateForEvictionVacate =
        executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate;

    const residentialVacateDeadlineMaxIso = useMemo(() => {
        if (!notifDateForEvictionVacate) return '';
        return getResidentialVacateDeadlineMaxIso(
            String(notifDateForEvictionVacate),
            manualGraceCalendarExtra ? 1 : 0,
        );
    }, [notifDateForEvictionVacate, manualGraceCalendarExtra]);

    const notificationLayerOkEviction =
        input.debtorNotifiedForEvictionGrace && input.isEvictionGraceExpiredNow;

    const isResidentialVacateGraceFinished = useMemo(() => {
        if (evictionPremisesUseResolved !== 'residential') return false;
        if (
            followupOrchestrator.evictionVacateDeadlineLocal &&
            isVacateDeadlinePassed(followupOrchestrator.evictionVacateDeadlineLocal)
        ) {
            return true;
        }
        return false;
    }, [evictionPremisesUseResolved, followupOrchestrator.evictionVacateDeadlineLocal]);

    const evictionVacateLayerOk = useMemo(() => {
        if (evictionPremisesUseResolved === 'commercial') return true;
        return Boolean(
            followupOrchestrator.evictionExecutorVacateGrantApproved &&
                followupOrchestrator.evictionVacateDeadlineLocal &&
                isResidentialVacateGraceFinished,
        );
    }, [
        evictionPremisesUseResolved,
        followupOrchestrator.evictionVacateDeadlineLocal,
        followupOrchestrator.evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);

    const evictionProcedureLockHint = useEvictionProcedureLockHint(
        input.coerciveUiLocked,
        input.coerciveDossierLocked,
        input.debtorNotifiedForEvictionGrace,
        input.notificationCount,
        input.isEvictionGraceEffectivelyExpired,
        input.isEvictionGraceExpiredCalendar,
        input.daysRemainingInEvictionGrace,
        evictionPremisesUseResolved,
        followupOrchestrator.evictionVacateDeadlineLocal,
        residentialVacateDeadlineMaxIso,
        followupOrchestrator.evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    );

    const { evictionGraceBadgeInfo, policeAssistanceBadgeInfo } = useEvictionBadges(
        input.isEvictionExecutionModule,
        evictionPremisesUseResolved,
        followupOrchestrator.evictionResidentialGracePeriodStart,
        followupOrchestrator.evictionVacateDeadlineLocal,
        followupOrchestrator.evictionResidentialGraceManuallyEndedAt,
        executionData,
    );

    useExecutionDashboardGraceLifecycleEffects({
        executionStatus: input.executionStatus,
        gracePeriodEnded: input.gracePeriodEnded,
        setGracePeriodEnded: input.setGracePeriodEnded,
        setGracePeriodActive: input.setGracePeriodActive,
        timelineEventsRef: input.timelineEventsRef as never,
        todayYmd: input.todayYmd,
        executionData,
        executionId,
        showToastRef: input.showToastRef as never,
        evictionGraceBadgeInfo,
        showToast: input.showToast as never,
    });

    return {
        notifDateForEvictionVacate,
        residentialVacateDeadlineMaxIso,
        notificationLayerOkEviction,
        isResidentialVacateGraceFinished,
        evictionVacateLayerOk,
        evictionProcedureLockHint,
        evictionGraceBadgeInfo,
        policeAssistanceBadgeInfo,
    };
}
