/**
 * Prefetch execution-core-handlers — dynamic import only (no static edge from core chunk).
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchExecutionHandlerClusterDossierSupportBridge,
    prefetchExecutionHandlerClusterCoerciveHeavyBridge,
    prefetchExecutionHandlerClusterFollowupAdminSpecialBridge,
    prefetchExecutionHandlerClusterFollowupDossierControlsBridge,
    prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge,
    prefetchExecutionHandlerClusterFollowupOtherPartyBridge,
    prefetchExecutionHandlerClusterLightBridge,
    prefetchExecutionHandlerClusterSeizureHeavyBridge,
    prefetchExecutionHandlerClusterSeizureLogBridge,
} from './executionDashboardHandlerClusterBridgeLazy';

export function prefetchExecutionCoreHandlers(
    mode:
        | 'light'
        | 'followup-admin-special'
        | 'followup-dossier-controls'
        | 'followup-other-party'
        | 'followup-other-party-debtor'
        | 'followup-other-party-creditor'
        | 'seizure'
        | 'seizure-requests'
        | 'seizure-log'
        | 'coercive'
        | 'coercive-employee'
        | 'coercive-eviction'
        | 'coercive-lifecycle'
        | 'dossier-support' = 'coercive',
): void {
    if (isLitePerformanceActive()) return;
    if (mode === 'light') {
        prefetchExecutionHandlerClusterLightBridge();
        return;
    }
    if (mode === 'followup-admin-special') {
        prefetchExecutionHandlerClusterFollowupAdminSpecialBridge();
        return;
    }
    if (mode === 'followup-dossier-controls') {
        prefetchExecutionHandlerClusterFollowupDossierControlsBridge();
        return;
    }
    if (mode === 'followup-other-party') {
        return;
    }
    if (mode === 'followup-other-party-debtor') {
        prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge();
        return;
    }
    if (mode === 'followup-other-party-creditor') {
        prefetchExecutionHandlerClusterFollowupOtherPartyBridge();
        return;
    }
    if (mode === 'seizure') {
        return;
    }
    if (mode === 'seizure-requests') {
        prefetchExecutionHandlerClusterSeizureHeavyBridge();
        return;
    }
    if (mode === 'seizure-log') {
        prefetchExecutionHandlerClusterSeizureLogBridge();
        return;
    }
    if (mode === 'dossier-support') {
        prefetchExecutionHandlerClusterDossierSupportBridge();
        return;
    }
    prefetchExecutionHandlerClusterCoerciveHeavyBridge();
}
