// ✅ SECURITY FIX: Using persistenceRepository.load() instead of .get() - v2.0.2-20260306
import React from 'react';
import { markDashboardInteractiveOnce } from '@/app/bootstrap/dashboardInteractiveMark';
import {
    LawyerDashboardQuantumShell,
    type LawyerDashboardShellProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

/**
 * TTFI: mark عند تقييم chunk اللوحة — قبل commit لـ Inner.
 * markDashboardInteractiveOnce آمن للتكرار (Inner يُبقي النداء كشبكة أمان).
 */
if (typeof window !== 'undefined') {
    markDashboardInteractiveOnce();
}

export const LawyerDashboard = React.memo(function LawyerDashboard(props: LawyerDashboardShellProps) {
    return <LawyerDashboardQuantumShell {...props} />;
});
