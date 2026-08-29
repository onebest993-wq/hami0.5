/** Heavy overlay modals — chunk منفصل */
import React from 'react';
import { ExecutionDashboardHeavyModalsEarlyCluster } from './ExecutionDashboardHeavyModalsEarlyCluster';
import { ExecutionDashboardHeavyModalsLateCluster } from './ExecutionDashboardHeavyModalsLateCluster';

/** حقيبة props من الـ shell — مفاتيح كثيرة؛ نفس نمط SeizedPropertyPortals */
export type ExecutionDashboardHeavyModalsProps = Record<string, unknown>;

export function ExecutionDashboardHeavyModals(props: ExecutionDashboardHeavyModalsProps) {
    const s = props;
    const showAnyHeavyModal = Boolean(
        s.showDocumentsModal ||
            s.showRealEstateSeizureModal ||
            s.showDecisionsModal ||
            s.showSeizedAssetsModal ||
            s.showPaymentModal ||
            s.showTimelineModal ||
            s.showNotificationModal ||
            s.showCoerciveModal ||
            s.showHeirsNotificationModal ||
            s.showGuarantorDetailsModal ||
            s.showStayOfExecutionModal ||
            s.partyDeathModalParty ||
            s.showPauseModal ||
            s.alimonyBeneficiaryDeathModalOpen ||
            s.showUnifiedSummonsModal ||
            s.showPaymentCalculator ||
            s.showSettlementCalculator ||
            s.showLedgerModal ||
            s.showTransferFileNumberChangeModal ||
            (s.showLinkedDossierTimeline && s.linkedDossierToView),
    );

    if (!showAnyHeavyModal) {
        return null;
    }

    return (
        <>
            <ExecutionDashboardHeavyModalsEarlyCluster s={s} />
            <ExecutionDashboardHeavyModalsLateCluster s={s} />
        </>
    );
}
