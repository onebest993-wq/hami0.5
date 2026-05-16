import { useMemo } from 'react';
import { evictionInclusiveCalendarDays } from '@/app/components/lawyer/ExecutionDashboard/helpers/dateUtils';
import { isVacateDeadlinePassed } from '@/app/utils/executionModuleStrategies';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { EvictionGraceBadgeInfo, PoliceAssistanceBadgeInfo } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';

export function useEvictionBadges(
    isEvictionExecutionModule: boolean,
    evictionPremisesUseResolved: string | null,
    evictionResidentialGracePeriodStart: string | null,
    evictionVacateDeadlineLocal: string | null,
    evictionResidentialGraceManuallyEndedAt: string | null,
    executionData: unknown,
) {
    const ed = executionData as Record<string, unknown> | null | undefined;

    const evictionGraceBadgeInfo: EvictionGraceBadgeInfo | null = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        if (evictionPremisesUseResolved !== 'residential') return null;
        const start = evictionResidentialGracePeriodStart;
        const end = evictionVacateDeadlineLocal;
        if (!start || !end) return null;
        if (evictionResidentialGraceManuallyEndedAt) return null;
        if (isVacateDeadlinePassed(end)) return null;
        const daysTotal = evictionInclusiveCalendarDays(start, end);
        const remainingDays = evictionInclusiveCalendarDays(getLocalTodayYmd(), end);
        return {
            startYmd: start,
            endYmd: end,
            daysTotal: Math.max(0, daysTotal || 0),
            remainingDays: Math.max(0, remainingDays || 0),
        };
    }, [
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        evictionResidentialGraceManuallyEndedAt,
    ]);

    const policeAssistanceBadgeInfo: PoliceAssistanceBadgeInfo | null = useMemo(() => {
        if (!isEvictionExecutionModule) return null;
        const st = ed?.eviction_police_assistance as Record<string, unknown> | undefined;
        if (!st || st.completedAt) return null;
        const remainingDays = st.dueYmd
            ? evictionInclusiveCalendarDays(getLocalTodayYmd(), st.dueYmd as string)
            : null;
        return {
            agencyName: st.agencyName as string | undefined,
            dueYmd: st.dueYmd as string | undefined,
            remainingDays:
                typeof remainingDays === 'number' ? Math.max(0, remainingDays) : undefined,
        };
    }, [
        isEvictionExecutionModule,
        ed?.eviction_police_assistance,
    ]);

    return {
        evictionGraceBadgeInfo,
        policeAssistanceBadgeInfo,
    };
}
