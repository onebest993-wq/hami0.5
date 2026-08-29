import React from 'react';
import { LawyerDashboardInner } from './LawyerDashboardInner';

export type LawyerDashboardShellProps = {
    onLogout: (options?: { skipLocalPurge?: boolean }) => void | Promise<void>;
    onOpenProfile?: () => void;
    onNavigateToCase?: (caseId: string) => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
};

/**
 * غلاف اللوحة الرقيق — بلا QuantumTasksProvider هنا.
 * شارة الدوك من primeQuantumTasksBootMetrics؛ الـ Provider عند فتح ستارة الميدان.
 */
function LawyerDashboardQuantumShell(props: LawyerDashboardShellProps) {
    return <LawyerDashboardInner {...props} />;
}

export { LawyerDashboardQuantumShell };
