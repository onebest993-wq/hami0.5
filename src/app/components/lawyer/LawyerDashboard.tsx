// ✅ SECURITY FIX: Using persistenceRepository.load() instead of .get() - v2.0.2-20260306
import React from 'react';
import {
    LawyerDashboardQuantumShell,
    type LawyerDashboardShellProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

export const LawyerDashboard = React.memo(function LawyerDashboard(props: LawyerDashboardShellProps) {
    return <LawyerDashboardQuantumShell {...props} />;
});
