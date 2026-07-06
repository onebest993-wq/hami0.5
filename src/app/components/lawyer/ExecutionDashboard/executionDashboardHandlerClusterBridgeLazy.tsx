import { lazy } from 'react';

const executionHandlerClusterLightBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterLightBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterLightBridge,
    }));

const executionHandlerClusterFollowupAdminSpecialBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterFollowupAdminSpecialBridge,
    }));

const executionHandlerClusterFollowupDossierControlsBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterFollowupDossierControlsBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterFollowupDossierControlsBridge,
    }));

const executionHandlerClusterFollowupOtherPartyBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterFollowupOtherPartyBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterFollowupOtherPartyBridge,
    }));

const executionHandlerClusterDossierSupportBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterDossierSupportBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterDossierSupportBridge,
    }));

const executionHandlerClusterSeizureHeavyBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureHeavyBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterSeizureHeavyBridge,
    }));

const executionHandlerClusterCoerciveHeavyBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterCoerciveHeavyBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterCoerciveHeavyBridge,
    }));

export const LazyExecutionDashboardHandlerClusterLightBridge = lazy(executionHandlerClusterLightBridgeImport);
export const LazyExecutionDashboardHandlerClusterFollowupAdminSpecialBridge = lazy(
    executionHandlerClusterFollowupAdminSpecialBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterFollowupDossierControlsBridge = lazy(
    executionHandlerClusterFollowupDossierControlsBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge = lazy(
    executionHandlerClusterFollowupOtherPartyBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterDossierSupportBridge = lazy(
    executionHandlerClusterDossierSupportBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterSeizureHeavyBridge = lazy(
    executionHandlerClusterSeizureHeavyBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterCoerciveHeavyBridge = lazy(
    executionHandlerClusterCoerciveHeavyBridgeImport,
);

export function prefetchExecutionHandlerClusterLightBridge(): void {
    void executionHandlerClusterLightBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterFollowupAdminSpecialBridge(): void {
    void executionHandlerClusterFollowupAdminSpecialBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterFollowupDossierControlsBridge(): void {
    void executionHandlerClusterFollowupDossierControlsBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterFollowupOtherPartyBridge(): void {
    void executionHandlerClusterFollowupOtherPartyBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterDossierSupportBridge(): void {
    void executionHandlerClusterDossierSupportBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterSeizureHeavyBridge(): void {
    void executionHandlerClusterSeizureHeavyBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterCoerciveHeavyBridge(): void {
    void executionHandlerClusterCoerciveHeavyBridgeImport().catch(() => undefined);
}
