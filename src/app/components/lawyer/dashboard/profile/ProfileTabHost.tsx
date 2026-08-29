import React, { useLayoutEffect } from 'react';

import { LawyerDashboardProfileTab } from '@/app/components/lawyer/dashboard/LawyerDashboardProfileTab';
import { markRoyalLawyerProfileModuleResolved } from '@/app/runtime/royalLawyerProfileModuleState';

type ProfileTabProps = React.ComponentProps<typeof LawyerDashboardProfileTab>;

/** تبويب الملف — استيراد ثابت؛ keepAlive يرسم الشجرة مخفياً للكشف اللحظي. */
export function ProfileTabHost(props: ProfileTabProps): React.ReactElement | null {
    const { visible, keepAlive = false } = props;

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;
        /* المسار الثابت يحمّل Royal دون dynamic import — طابق علامة الجاهزية */
        markRoyalLawyerProfileModuleResolved();
    }, [keepAlive, visible]);

    if (!visible && !keepAlive) {
        return null;
    }

    return <LawyerDashboardProfileTab {...props} />;
}
