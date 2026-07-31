import { buildExecutionDashboardChunkScopeSources } from '../buildExecutionDashboardChunkScopeSources';
import {
    buildExecutionDashboardCoreScopeSourceGroups,
    mergeExecutionDashboardCoreScopeSourceGroups,
    type ExecutionDashboardCoreDeferredChunkScopeSourcesInput,
} from './executionDashboardCoreScopeSourceGroups';

const EXECUTION_DASHBOARD_TERTIARY_OVERLAY_SCOPE_GROUPS = new Set([
    'executorApprovalActions',
    'financialLedgerStateBundle',
    'followupSeizureHandlers',
    'moduleExpenseHandlers',
    'paymentHandlers',
    'realEstateSeizureHandlers',
    'salarySeizurePatch',
    'salarySeizureTabRows',
    'seizureAssetModalHandlers',
    'seizureOrchestrator',
    'seizureReleaseHandlers',
    'thirdPartyReceiveHandlers',
    'thirdPartySeizureHandlers',
    'evictionFinancialHandlers',
]);

export function buildExecutionDashboardCoreDeferredOverlayChunkScopeSources(
    input: ExecutionDashboardCoreDeferredChunkScopeSourcesInput,
): Record<string, unknown> {
    const scopeSourceGroups = buildExecutionDashboardCoreScopeSourceGroups(input);
    return buildExecutionDashboardChunkScopeSources(
        mergeExecutionDashboardCoreScopeSourceGroups(scopeSourceGroups, (groupKey) =>
            EXECUTION_DASHBOARD_TERTIARY_OVERLAY_SCOPE_GROUPS.has(groupKey),
        ),
    );
}
