import React from 'react';

import { LawyerDashboard } from '@/app/components/lawyer/LawyerDashboard';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

/** Dev: static import — يحافظ على HMR بدون dynamic import stale */
export function LawyerDashboardGate(props: LawyerDashboardShellProps) {
    return <LawyerDashboard {...props} />;
}
