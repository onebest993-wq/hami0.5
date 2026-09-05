/** Lazy/prefetch لأول viewport والجسم المتأخر — بلا تبويبات المحضر ولا بوابة المتابعة. */
import {
    LazyActionGridSection,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierLifecyclePanel,
    LazyMaritalFurnitureModule,
    LazyPartiesSection,
    LazyTimelineSection,
    LazyVisitationScheduleModule,
    prefetchExecutionDashboardShell,
} from '../executionDashboardLazyRegistryShell';
import { SPECIAL_REQUEST_MANUAL_MODE } from '../components/requestsTabConstants';
import * as LazyRegistryShellNamespace from '../executionDashboardLazyRegistryShell';

export const EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL = {
    LazyActionGridSection,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierLifecyclePanel,
    LazyMaritalFurnitureModule,
    LazyPartiesSection,
    LazyTimelineSection,
    LazyVisitationScheduleModule,
    prefetchExecutionDashboardShell,
    SPECIAL_REQUEST_MANUAL_MODE,
} as const;

export function spreadExecutionDashboardLazyChunkScopeShell(): Record<string, unknown> {
    const out: Record<string, unknown> = {
        ...(EXECUTION_DASHBOARD_LAZY_CHUNK_SCOPE_SHELL as unknown as Record<string, unknown>),
    };
    for (const [key, value] of Object.entries(LazyRegistryShellNamespace)) {
        if (out[key] == null && value != null) {
            out[key] = value;
        }
    }
    return out;
}
