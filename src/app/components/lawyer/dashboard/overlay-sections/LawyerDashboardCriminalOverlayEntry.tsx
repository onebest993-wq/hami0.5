import React from 'react';
import { CriminalDashboardPortal } from '@/app/components/lawyer/criminal-system/CriminalDashboardPortal';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

export function LawyerDashboardCriminalOverlayEntry({
    overlays,
    criminalBridge,
}: Pick<LawyerDashboardOverlaysBundleProps, 'overlays' | 'criminalBridge'>) {
    const { criminalDashboardCaseId, openCriminalCase, closeCriminalCase, exitToHomeDashboard } = overlays;

    if (!criminalDashboardCaseId) return null;

    return (
        <CriminalDashboardPortal
            caseId={criminalDashboardCaseId}
            onClose={closeCriminalCase}
            onExitToHome={exitToHomeDashboard}
            onOpenCase={(caseId: string) => {
                openCriminalCase(caseId, { keepReturnTarget: true });
            }}
            onRequestNewCaseFromSeverance={() => {
                criminalBridge.resumePendingSeveranceForm();
            }}
        />
    );
}
