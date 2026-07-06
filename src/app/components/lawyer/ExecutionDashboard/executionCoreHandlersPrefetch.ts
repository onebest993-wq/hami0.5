/**
 * Prefetch execution-core-handlers — dynamic import only (no static edge from core chunk).
 */
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    prefetchExecutionHandlerClusterDossierSupportBridge,
    prefetchExecutionHandlerClusterCoerciveHeavyBridge,
    prefetchExecutionHandlerClusterFollowupAdminSpecialBridge,
    prefetchExecutionHandlerClusterFollowupDossierControlsBridge,
    prefetchExecutionHandlerClusterFollowupOtherPartyBridge,
    prefetchExecutionHandlerClusterLightBridge,
    prefetchExecutionHandlerClusterSeizureHeavyBridge,
} from './executionDashboardHandlerClusterBridgeLazy';

export function prefetchExecutionCoreHandlers(
    mode:
        | 'light'
        | 'followup-admin-special'
        | 'followup-dossier-controls'
        | 'followup-other-party'
        | 'seizure'
        | 'coercive'
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
        prefetchExecutionHandlerClusterFollowupOtherPartyBridge();
        return;
    }
    if (mode === 'seizure') {
        prefetchExecutionHandlerClusterSeizureHeavyBridge();
        return;
    }
    if (mode === 'dossier-support') {
        prefetchExecutionHandlerClusterDossierSupportBridge();
        return;
    }
    prefetchExecutionHandlerClusterCoerciveHeavyBridge();
}
