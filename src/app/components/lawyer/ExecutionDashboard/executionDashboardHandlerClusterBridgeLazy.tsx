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
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterFollowupOtherPartyCreditorBridge,
    }));

const executionHandlerClusterFollowupOtherPartyDebtorBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge,
    }));

const executionHandlerClusterDossierSupportBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterDossierSupportBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterDossierSupportBridge,
    }));

const executionHandlerClusterSeizureHeavyBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureRequestsBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterSeizureRequestsBridge,
    }));

const executionHandlerClusterSeizureLogBridgeImport = () =>
    import('./hooks/executionDashboardCore/ExecutionDashboardHandlerClusterSeizureLogBridge').then((m) => ({
        default: m.ExecutionDashboardHandlerClusterSeizureLogBridge,
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
export const LazyExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge = lazy(
    executionHandlerClusterFollowupOtherPartyDebtorBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterDossierSupportBridge = lazy(
    executionHandlerClusterDossierSupportBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterSeizureHeavyBridge = lazy(
    executionHandlerClusterSeizureHeavyBridgeImport,
);
export const LazyExecutionDashboardHandlerClusterSeizureLogBridge = lazy(
    executionHandlerClusterSeizureLogBridgeImport,
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

export function prefetchExecutionHandlerClusterFollowupOtherPartyDebtorBridge(): void {
    void executionHandlerClusterFollowupOtherPartyDebtorBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterDossierSupportBridge(): void {
    void executionHandlerClusterDossierSupportBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterSeizureHeavyBridge(): void {
    void executionHandlerClusterSeizureHeavyBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterSeizureLogBridge(): void {
    void executionHandlerClusterSeizureLogBridgeImport().catch(() => undefined);
}

export function prefetchExecutionHandlerClusterCoerciveHeavyBridge(): void {
    void executionHandlerClusterCoerciveHeavyBridgeImport().catch(() => undefined);
}
