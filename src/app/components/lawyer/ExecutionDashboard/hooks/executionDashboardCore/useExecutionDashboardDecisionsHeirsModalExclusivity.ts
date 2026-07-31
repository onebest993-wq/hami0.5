import { useEffect } from 'react';

export function useExecutionDashboardDecisionsHeirsModalExclusivity(
    showDecisionsModal: boolean,
    showHeirsNotificationModal: boolean,
    setShowHeirsNotificationModal: (v: boolean) => void,
) {
    useEffect(() => {
        if (!showDecisionsModal) return;
        if (showHeirsNotificationModal) setShowHeirsNotificationModal(false);
    }, [showDecisionsModal, showHeirsNotificationModal, setShowHeirsNotificationModal]);
}
