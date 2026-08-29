import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export type ExecutionFinancialHubFocCenterProps = ExecutionFinancialHubPortalProps & { model: Model };
