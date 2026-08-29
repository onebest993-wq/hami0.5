/** Lazy/prefetch للجسم والأقسام الأولى — بلا overlays (قانون/مالية/نوافذ). */
import {
    LazyActionGridSection,
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierControlsTab,
    LazyDossierLifecyclePanel,
    LazyFinancialTab,
    LazyMaritalFurnitureModule,
    LazyOtherPartyTab,
    LazyPartiesSection,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
    LazyTimelineSection,
    LazyVisitationScheduleModule,
    LazyPersonalCoerciveFollowupPanel,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    prefetchExecutionDashboardShell,
} from '../executionDashboardLazyRegistryShell';
import { SPECIAL_REQUEST_MANUAL_MODE } from '../components/requestsTabConstants';
import {
    prefetchExecutionFollowupModalPortal,
    LazyExecutionFollowupModalPortal,
} from '../executionFollowupModalLazy';
import * as LazyRegistryShellNamespace from '../executionDashboardLazyRegistryShell';
import * as FollowupModalLazyNamespace from '../executionFollowupModalLazy';

export const EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL = {
    LazyActionGridSection,
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierControlsTab,
    LazyDossierLifecyclePanel,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyFinancialTab,
    LazyMaritalFurnitureModule,
    LazyOtherPartyTab,
    LazyPartiesSection,
    LazyPersonalCoerciveFollowupPanel,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
    LazyTimelineSection,
    LazyVisitationScheduleModule,
    LazyExecutionFollowupModalPortal,
    prefetchExecutionDashboardShell,
    prefetchExecutionFollowupModalPortal,
    SPECIAL_REQUEST_MANUAL_MODE,
} as const;

export function spreadExecutionDashboardLazyChunkScopeShell(): Record<string, unknown> {
    const out: Record<string, unknown> = {
        ...(EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL as unknown as Record<string, unknown>),
    };
    for (const ns of [LazyRegistryShellNamespace, FollowupModalLazyNamespace]) {
        for (const [key, value] of Object.entries(ns)) {
            if (out[key] == null && value != null) {
                out[key] = value;
            }
        }
    }
    return out;
}
