import type { useExecutionDashboardClaimFinancials } from './useExecutionDashboardClaimFinancials';
import type { useExecutionDashboardGraceAndSummoning } from './useExecutionDashboardGraceAndSummoning';
import type { useExecutionDashboardDebtorWorkspaceContext } from './useExecutionDashboardDebtorWorkspaceContext';
import type { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';
import type { useExecutionDashboardFollowupTabAssembly } from './useExecutionDashboardFollowupTabAssembly';
import type { useExecutionDashboardFollowupSeizureTabs } from './useExecutionDashboardFollowupSeizureTabs';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';
import type { ExecutionDashboardCoreGraceMasterEvictionPipelineValue } from './executionDashboardCoreGraceMasterEvictionPipelineTypes';
import type { ExecutionDashboardCorePersistHandlerPipelineValue } from './executionDashboardCorePersistHandlerPipelineTypes';
import type { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import type { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import type { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import type { buildExecutionDashboardCoreRuntimeTailInput } from './buildExecutionDashboardCoreRuntimeTailInput';

/** آخر انتشار يربح — بلا تقاطع يحوّل المفاتيح المتعارضة إلى never. */
export type MergeLast<A, B> = Omit<A, keyof B> & B;

export type ExecutionClaimFinancialsSlice = ReturnType<typeof useExecutionDashboardClaimFinancials>;
export type ExecutionGraceAndSummoningSlice = ReturnType<typeof useExecutionDashboardGraceAndSummoning>;
export type ExecutionDebtorWorkspaceSlice = ReturnType<typeof useExecutionDashboardDebtorWorkspaceContext>;
export type ExecutionSubsequentNoticeFlowSlice = ReturnType<typeof useSubsequentNoticeFlow>;
export type ExecutionFollowupTabAssemblySlice = ReturnType<typeof useExecutionDashboardFollowupTabAssembly>;
export type ExecutionFollowupSeizureTabsSlice = ReturnType<typeof useExecutionDashboardFollowupSeizureTabs>;

type FollowupDebtorPipelineValue = ReturnType<typeof useExecutionDashboardCoreFollowupDebtorPipeline>;
type ClaimLedgerPipelineValue = ReturnType<typeof useExecutionDashboardCoreClaimFinancialLedgerPipeline>;
type FileMetadataBindingValue = ReturnType<typeof useExecutionDashboardCoreFileMetadataBinding>;
type CoreRuntimeTailValue = ReturnType<typeof buildExecutionDashboardCoreRuntimeTailInput>;

/**
 * حقيبة runtime بعد دمج خطوط الأنابيب (ترتيب dossier segment).
 * لا تُشتق من ReturnType لذلك المقطع حتى لا تُغلق دائرة الأنواع مع HandlerClusterInput.
 */
export type ExecutionDashboardCoreRuntimeVars = MergeLast<
    MergeLast<
        MergeLast<
            MergeLast<
                MergeLast<
                    MergeLast<ExecutionDashboardCoreWorkspacePipelineValue, FollowupDebtorPipelineValue>,
                    ClaimLedgerPipelineValue
                >,
                ExecutionDashboardCoreGraceMasterEvictionPipelineValue
            >,
            ExecutionDashboardCorePersistHandlerPipelineValue
        >,
        FileMetadataBindingValue
    >,
    CoreRuntimeTailValue
>;
