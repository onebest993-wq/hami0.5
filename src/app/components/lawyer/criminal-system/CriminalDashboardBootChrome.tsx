import React from 'react';
import {
    CriminalDashboardInstantFrame,
    type CriminalDashboardInstantFrameProps,
} from './CriminalDashboardInstantFrame';

/** غلاف Instant داخل البوابة — نفس الإطار المستخدم كغطاء Suspense على OverlayHosts */
export function CriminalDashboardBootChrome(props: CriminalDashboardInstantFrameProps) {
    return <CriminalDashboardInstantFrame {...props} />;
}
