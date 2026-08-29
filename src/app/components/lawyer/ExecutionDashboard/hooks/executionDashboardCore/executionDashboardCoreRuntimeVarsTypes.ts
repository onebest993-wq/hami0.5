import type { useExecutionDashboardCoreDossierAndResidentSegment } from './useExecutionDashboardCoreDossierAndResidentSegment';
import type { useExecutionDashboardClaimFinancials } from './useExecutionDashboardClaimFinancials';
import type { useExecutionDashboardGraceAndSummoning } from './useExecutionDashboardGraceAndSummoning';
import type { useExecutionDashboardDebtorWorkspaceContext } from './useExecutionDashboardDebtorWorkspaceContext';
import type { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';
import type { useExecutionDashboardFollowupTabAssembly } from './useExecutionDashboardFollowupTabAssembly';
import type { useExecutionDashboardFollowupSeizureTabs } from './useExecutionDashboardFollowupSeizureTabs';

/** حقيبة runtime بعد الدمج — آخر انتشار يربح عند تعارض المفاتيح. */
export type ExecutionDashboardCoreRuntimeVars = ReturnType<
    typeof useExecutionDashboardCoreDossierAndResidentSegment
>['coreRuntimeVars'];

export type ExecutionClaimFinancialsSlice = ReturnType<typeof useExecutionDashboardClaimFinancials>;
export type ExecutionGraceAndSummoningSlice = ReturnType<typeof useExecutionDashboardGraceAndSummoning>;
export type ExecutionDebtorWorkspaceSlice = ReturnType<typeof useExecutionDashboardDebtorWorkspaceContext>;
export type ExecutionSubsequentNoticeFlowSlice = ReturnType<typeof useSubsequentNoticeFlow>;
export type ExecutionFollowupTabAssemblySlice = ReturnType<typeof useExecutionDashboardFollowupTabAssembly>;
export type ExecutionFollowupSeizureTabsSlice = ReturnType<typeof useExecutionDashboardFollowupSeizureTabs>;
