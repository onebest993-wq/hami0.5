import React from 'react';
import { LazyCriminalDashboard } from '@/app/utils/lazyComponents';
import { CriminalDashboardPortal } from '@/app/components/lawyer/criminal-system/CriminalDashboardPortal';
import DossierOpeningFallbackComponent from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

const DOSSIER_OPENING_FALLBACK = <DossierOpeningFallbackComponent />;

export function LawyerDashboardCriminalOverlayEntry({
    overlays,
    criminalBridge,
}: Pick<LawyerDashboardOverlaysHostProps, 'overlays' | 'criminalBridge'>) {
    const { criminalDashboardCaseId, openCriminalCase, closeCriminalCase } = overlays;

    if (!criminalDashboardCaseId) return null;

    return (
        <CriminalDashboardPortal fallback={DOSSIER_OPENING_FALLBACK}>
            <LazyCriminalDashboard
                key={criminalDashboardCaseId}
                id={criminalDashboardCaseId}
                onClose={closeCriminalCase}
                onOpenCase={(caseId: string) => {
                    openCriminalCase(caseId, { keepReturnTarget: true });
                }}
                onRequestNewCaseFromSeverance={() => {
                    criminalBridge.resumePendingSeveranceForm();
                }}
            />
        </CriminalDashboardPortal>
    );
}
