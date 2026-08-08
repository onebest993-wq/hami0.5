import React, { useLayoutEffect } from 'react';

import { LawyerDashboardProfileTab } from '@/app/components/lawyer/dashboard/LawyerDashboardProfileTab';
import { primeProfileForBoot } from '@/app/runtime/profileShellPrime';

type ProfileTabProps = React.ComponentProps<typeof LawyerDashboardProfileTab>;

/** تبويب الملف — استيراد ثابت؛ keepAlive يرسم الشجرة مخفياً للكشف اللحظي. */
export function ProfileTabHost(props: ProfileTabProps): React.ReactElement | null {
    const { visible, keepAlive = false } = props;

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;
        primeProfileForBoot();
    }, [keepAlive, visible]);

    if (!visible && !keepAlive) {
        return null;
    }

    return <LawyerDashboardProfileTab {...props} />;
}
