import React, { useLayoutEffect } from 'react';

import { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import { primeScheduleForBoot, primeScheduleForWarm } from '@/app/runtime/scheduleShellPrime';

type ScheduleTabProps = React.ComponentProps<typeof LawyerDashboardScheduleTab> & {
    keepAlive?: boolean;
};

/**
 * تبويب التقويم — استيراد ثابت؛ keepAlive يرسم الرادار (ومرساة الإضافة) مخفياً للكشف اللحظي.
 */
export function ScheduleTabHost(props: ScheduleTabProps): React.ReactElement | null {
    const { visible, keepAlive = false, userId, authUserId } = props;

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;
        primeScheduleForBoot();
        primeScheduleForWarm(userId ?? authUserId);
    }, [authUserId, keepAlive, userId, visible]);

    if (!visible && !keepAlive) {
        return null;
    }

    return <LawyerDashboardScheduleTab {...props} />;
}
