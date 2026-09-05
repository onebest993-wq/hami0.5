import React from 'react';
import { CRIMINAL_MODAL_Z } from '@/app/components/lawyer/criminal-system/criminalModalPortal';
import { CriminalDashboardInstantFrame } from '@/app/components/lawyer/criminal-system/CriminalDashboardInstantFrame';
import { HAMI_OVERLAY_SAFE_INSETS_CLASS } from '@/app/utils/overlayPortal';

type CriminalDashboardInstantPaintCoverProps = {
    caseId: string;
    headline?: string;
    onClose: () => void;
    onExitToHome?: () => void;
};

/**
 * غطاء Suspense على OverlayHosts — نفس هندسة BootChrome فوراً.
 * بلا lazy متداخل وfallback={null} يترك شاشة كحلية فارغة.
 */
export function CriminalDashboardInstantPaintCover({
    caseId,
    headline,
    onClose,
    onExitToHome,
}: CriminalDashboardInstantPaintCoverProps): React.ReactElement {
    return (
        <div
            className={`fixed inset-0 flex flex-col overflow-hidden bg-slate-900 print:bg-white ${HAMI_OVERLAY_SAFE_INSETS_CLASS}`}
            style={{ zIndex: CRIMINAL_MODAL_Z.shell }}
            data-testid="criminal-dashboard-portal"
            aria-busy="true"
            aria-label="الإضبارة الجزائية"
        >
            <CriminalDashboardInstantFrame
                caseId={caseId}
                headline={headline}
                onClose={onClose}
                onExitToHome={onExitToHome}
            />
        </div>
    );
}
