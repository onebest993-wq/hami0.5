import React, { useLayoutEffect, useRef } from 'react';

import { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import { primeScheduleForBoot, primeScheduleForWarm } from '@/app/runtime/scheduleShellPrime';
import { tearDownCalendarFloatingState } from '@/app/components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState';

type ScheduleTabProps = React.ComponentProps<typeof LawyerDashboardScheduleTab> & {
    keepAlive?: boolean;
};

let scheduleTabBootSessionCounter = 0;
let lastActiveScheduleTabBootId = 0;

/**
 * تبويب التقويم — استيراد ثابت؛ keepAlive يرسم الرادار (ومرساة الإضافة) مخفياً للكشف اللحظي.
 */
export function ScheduleTabHost(props: ScheduleTabProps): React.ReactElement | null {
    const { visible, keepAlive = false, userId, authUserId } = props;
    const bootSessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;

        scheduleTabBootSessionCounter += 1;
        bootSessionIdRef.current = scheduleTabBootSessionCounter;
        const thisBootId = bootSessionIdRef.current;
        activeSessionIdRef.current = thisBootId;
        lastActiveScheduleTabBootId = thisBootId;

        if (activeSessionIdRef.current !== thisBootId) return;
        primeScheduleForBoot();
        if (activeSessionIdRef.current !== thisBootId) return;
        primeScheduleForWarm(userId ?? authUserId);

        return () => {
            if (activeSessionIdRef.current === thisBootId) {
                activeSessionIdRef.current = 0;
                tearDownCalendarFloatingState(thisBootId);
            }
        };
    }, [authUserId, keepAlive, userId, visible]);

    if (!visible && !keepAlive) {
        return null;
    }

    return <LawyerDashboardScheduleTab {...props} />;
}
