import React from 'react';
import type { ExecutionFinancialHubPortalProps } from './executionFinancialHub/ExecutionFinancialHubPortalProps';
import { useExecutionFinancialHubModel } from './executionFinancialHub/useExecutionFinancialHubModel';
import { ExecutionFinancialHubPortalDialog } from './executionFinancialHub/ExecutionFinancialHubPortalDialog';

export type { ExecutionFinancialHubPortalProps } from './executionFinancialHub/ExecutionFinancialHubPortalProps';

export const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = (props) => {
    const model = useExecutionFinancialHubModel(props);
    if (!props.showExecutionFinancialHub || typeof document === 'undefined') return null;
    return <ExecutionFinancialHubPortalDialog {...props} model={model} />;
};
