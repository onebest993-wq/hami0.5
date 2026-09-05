import React from 'react';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';
import { ExecutionFinancialHubFocCenter } from './ExecutionFinancialHubFocCenter';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export function ExecutionFinancialHubFocBody(
    props: ExecutionFinancialHubPortalProps & { model: Model },
) {
    return (
        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-3 pt-1 sm:px-3">
            <ExecutionFinancialHubFocCenter {...props} />
        </div>
    );
}
