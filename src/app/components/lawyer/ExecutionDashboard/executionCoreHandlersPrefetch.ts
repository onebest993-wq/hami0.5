/**
 * Prefetch execution-core-handlers — dynamic import only (no static edge from core chunk).
 *
 * داخل الإضبارة أو نية المستخدم: يُحمَّل حتى على الوضع الخفيف.
 * الخمول بعد المنزل فقط يمرّر `{ background: true }` فيُلغى على lite.
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
    prefetchExecutionHandlerClusterPartyDeathBridge,
} from './executionDashboardHandlerClusterBridgeLazy';

export type PrefetchExecutionCoreHandlersOptions = {
    /** تسخين خامل — لا ينافس طلاء المنزل على جهاز خفيف */
    background?: boolean;
};

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
        | 'coercive'
        | 'coercive-employee'
        | 'coercive-eviction'
        | 'coercive-lifecycle'
        | 'dossier-support'
        | 'party-death' = 'coercive',
    options?: PrefetchExecutionCoreHandlersOptions,
): void {
    if (options?.background && isLitePerformanceActive()) return;
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
        prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge();
        prefetchExecutionHandlerClusterFollowupOtherPartyBridge();
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
    if (mode === 'dossier-support') {
        prefetchExecutionHandlerClusterDossierSupportBridge();
        return;
    }
    if (mode === 'party-death') {
        prefetchExecutionHandlerClusterPartyDeathBridge();
        return;
    }
    prefetchExecutionHandlerClusterCoerciveHeavyBridge();
}
