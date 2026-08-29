import React from 'react';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';
import { ExecutionFinancialHubFocCenter } from './ExecutionFinancialHubFocCenter';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export function ExecutionFinancialHubFocBody(
    props: ExecutionFinancialHubPortalProps & { model: Model },
) {
    return (
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-1">
            <ExecutionFinancialHubFocCenter {...props} />
        </div>
    );
}
