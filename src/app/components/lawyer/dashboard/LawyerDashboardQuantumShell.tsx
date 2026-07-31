// @ts-nocheck
import React from 'react';
import { LawyerDashboardInner } from './LawyerDashboardInner';

export type LawyerDashboardShellProps = {
    onLogout: () => void;
    onOpenProfile?: () => void;
    onNavigateToCase?: (caseId: string) => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
};

/**
 * غلاف اللوحة الرقيق — بلا QuantumTasksProvider هنا.
 * الـ Provider داخل InnerRuntime بعد markDashboardInteractiveOnce (لا يمنع TTFI).
 */
function LawyerDashboardQuantumShell(props: LawyerDashboardShellProps) {
    return <LawyerDashboardInner {...props} />;
}

export { LawyerDashboardQuantumShell };
