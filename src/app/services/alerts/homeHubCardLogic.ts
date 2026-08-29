/** واجهة منطق بطاقة المركز — إعادة تصدير المجالات المنفصلة. */
export { HOME_HUB_CARD_FEATURE, guardedHomeHubNavigateRoute, isSafeHomeHubNavigateRoute, openHomeHubCardInteraction } from './homeHubNavigateGuard';
export type { HomeHubPanel } from './homeHubPanelModel';
export {
    HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT,
    HOME_HUB_PANEL_LABELS,
    countHomeHubDossierPins,
    formatHomeHubTabBadgeCount,
    reconcileHomeHubPanelAfterCounts,
    resolveDefaultHomeHubPanel,
    resolveHomeHubTabAriaLabel,
    resolveNextHomeHubPanel,
    shouldShowHomeHubTabBadge,
} from './homeHubPanelModel';
export type { HomeHubPanelReconcileInput, HomeHubPanelReconcileResult } from './homeHubPanelModel';
export {
    computeHomeHubAlertsTabBadgeOffPanel,
    computeHomeHubAlertsTabCount,
    computeHomeHubHorizonTabCounts,
    countUniqueHomeHubUrgentItems,
    filterHomeHubUrgentRadarEvents,
} from './homeHubRadarCounts';
export {
    HOME_HUB_RADAR_WARM_WAIT_MS,
    resolveHomeHubLiveRadarEnabled,
    shouldArmHomeHubLiveRadar,
} from './homeHubRadarArm';
export type { HomeHubAlertsEmptyState } from './homeHubEmptyState';
export {
    HOME_HUB_ALERTS_EMPTY_COPY,
    HOME_HUB_ALERTS_ERROR_COPY,
    HOME_HUB_FULLY_EMPTY_COPY,
    isHomeHubFullyEmpty,
    resolveHomeHubAlertsEmptyState,
    resolveHomeHubInitialPending,
    resolveHomeHubShowInitialLoad,
    resolveHomeHubShellReady,
} from './homeHubEmptyState';
export {
    resolveHomeHubPinNavigateAriaLabel,
    resolveHomeHubPinUnpinAriaLabel,
    resolveHomeHubRadarDismissAriaLabel,
    resolveHomeHubRadarItemAriaLabel,
} from './homeHubAriaLabels';
