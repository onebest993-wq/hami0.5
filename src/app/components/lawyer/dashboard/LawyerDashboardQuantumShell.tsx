// @ts-nocheck
import React from 'react';
import { QuantumTasksProvider } from '@/app/context/QuantumTasksContext';
import { LawyerDashboardInner } from './LawyerDashboardInner';

export type LawyerDashboardShellProps = {
    onLogout: () => void;
    onOpenProfile?: () => void;
    onNavigateToCase?: (caseId: string) => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
};

/** غلاف اللوحة — مهام الحقل تُحمَّل async عبر QuantumTasksProvider (لا JSON.parse متزامن على المسار الحرج). */
function LawyerDashboardQuantumShell(props: LawyerDashboardShellProps) {
    return (
        <QuantumTasksProvider>
            <LawyerDashboardInner {...props} />
        </QuantumTasksProvider>
    );
}

export { LawyerDashboardQuantumShell };
