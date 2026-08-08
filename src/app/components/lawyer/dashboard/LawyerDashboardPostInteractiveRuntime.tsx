import { useEffect, useState } from 'react';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { useLawyerDashboardCalendarCluster } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarCluster';
import {
    useLawyerDashboardRuntimeEffects,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects';
import { CalendarReminderHost } from '@/app/components/lawyer/SmartLegalRadar/CalendarReminderHost';
import type { LawyerDashboardPostInteractiveRuntimeProps } from '@/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime.types';

/**
 * مزامنة تقويم + cluster extras + runtime effects بعد dashboard-interactive.
 * يغذي onClusterScanSources حتى يرى HomeHub urgent/threading دون سحب DB على stem.
 */
function LawyerDashboardPostInteractiveRuntimeInner(
    props: LawyerDashboardPostInteractiveRuntimeProps,
) {
    const { onClusterScanSources, ...rest } = props;
    const { calendarUserId } = useLawyerDashboardCalendarCluster({
        ...rest,
        onClusterScanSources,
    });
    useLawyerDashboardRuntimeEffects(rest);
    return <CalendarReminderHost userId={calendarUserId} enabled={rest.enabled} />;
}

/** hooks خلفية — بعد interactive + idle قصير حتى لا تُسحق اللوحة عند أول إطار */
export function LawyerDashboardPostInteractiveRuntime(
    props: LawyerDashboardPostInteractiveRuntimeProps,
) {
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        let cancelIdle = () => undefined;
        let delayTimer: number | null = null;
        const unbind = onDashboardInteractive(() => {
            const delayMs = isCapacitorNativePlatform() ? 450 : 700;
            delayTimer = window.setTimeout(() => {
                delayTimer = null;
                const ric =
                    typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : null;
                if (ric) {
                    const id = ric(() => setArmed(true), { timeout: 1_200 });
                    cancelIdle = () => cancelIdleCallback(id);
                } else {
                    setArmed(true);
                }
            }, delayMs);
        });
        return () => {
            unbind();
            if (delayTimer != null) window.clearTimeout(delayTimer);
            cancelIdle();
        };
    }, []);

    if (!armed) return null;

    return <LawyerDashboardPostInteractiveRuntimeInner {...props} />;
}
