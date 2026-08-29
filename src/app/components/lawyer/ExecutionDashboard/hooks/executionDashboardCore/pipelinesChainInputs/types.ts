/** Shared types for pipelines chain input builders */
import type { UseExecutionDashboardClaimFinancialsParams } from '../useExecutionDashboardClaimFinancials';

export type { UseExecutionDashboardClaimFinancialsParams };

/** Input shape for useExecutionDashboardCoreFollowupDebtorPipeline (exported locally). */
export type ExecutionDashboardCoreFollowupDebtorPipelineInput = Parameters<
    typeof import('../useExecutionDashboardCoreFollowupDebtorPipeline').useExecutionDashboardCoreFollowupDebtorPipeline
>[0];

export type { ExecutionDashboardCoreClaimFinancialLedgerPipelineInput } from '../useExecutionDashboardCoreClaimFinancialLedgerPipeline';
export type { ExecutionDashboardCoreGraceMasterEvictionPipelineInput } from '../executionDashboardCoreGraceMasterEvictionPipelineInput';
export type { ExecutionDashboardCorePersistHandlerPipelineInput } from '../executionDashboardCorePersistHandlerPipelineInput';

export type AnyRecord = Record<string, unknown>;
