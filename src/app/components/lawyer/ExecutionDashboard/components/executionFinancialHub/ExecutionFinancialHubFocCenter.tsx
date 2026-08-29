import React from 'react';
import { PreloadableOverlayGate } from '../../preloadableOverlayGate';
import type { ExecutionFinancialHubFocCenterProps } from './ExecutionFinancialHubFocCenterProps';
import { buildExecutionFinancialHubFocCenterValueProps } from './buildExecutionFinancialHubFocCenterValueProps';
import { buildExecutionFinancialHubFocCenterHandlerProps } from './buildExecutionFinancialHubFocCenterHandlerProps';

export type { ExecutionFinancialHubFocCenterProps };

/** Lazy FinancialOperationsCenter mount — thin composer over value + handler bindings */
export function ExecutionFinancialHubFocCenter(props: ExecutionFinancialHubFocCenterProps) {
    const { LazyFinancialOperationsCenter, EXEC_FOC_LAZY_FALLBACK } = props;
    const valueProps = buildExecutionFinancialHubFocCenterValueProps(props);
    const handlerProps = buildExecutionFinancialHubFocCenterHandlerProps(props);
    const { hubKey, ...focValueProps } = valueProps;

    return (
        <PreloadableOverlayGate
            key={hubKey}
            lazy={LazyFinancialOperationsCenter}
            lazyProps={{
                ...focValueProps,
                ...handlerProps,
            }}
            fallback={EXEC_FOC_LAZY_FALLBACK}
        />
    );
}
