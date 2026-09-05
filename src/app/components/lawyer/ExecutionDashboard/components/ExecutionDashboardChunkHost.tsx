import { useEffect } from 'react';
import { ExecutionPhoneBodyScopeProvider } from '../hooks/executionPhoneBodyScope';
import { ExecutionShellOverlayScopeProvider } from '../hooks/executionShellOverlayScope';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import { readHandlerClusterContextValue } from '../hooks/executionDashboardCore/handlerClusterContextShared';
import { shouldLoadExecutionEmployeeAssignmentBridge } from '../hooks/executionHandlerClusterGate';
import { ExecutionDashboardChunkHostClusterTree } from './ExecutionDashboardChunkHostClusters';
import { PhoneBodyLoadingShell } from './ExecutionDashboardPhoneBodyLoadingShell';
import type { ExecutionDashboardChunkHostProps } from './ExecutionDashboardChunkHost.types';

export type { ExecutionDashboardChunkHostProps } from './ExecutionDashboardChunkHost.types';

/** جسم الإضبارة lazy (chunk منفصل) + shell overlays عند الحاجة */
export function ExecutionDashboardChunkHost(props: ExecutionDashboardChunkHostProps) {
    const {
        phoneBodyReady,
        shellOverlaysReady,
        phoneBodyScopeRef,
        shellOverlayScopeRef,
        loadCoerciveHeavyHandlerCluster,
        loadSeizureHeavyHandlerCluster,
        coerciveHeavyHandlerClusterInput,
    } = props;

    const loadCoerciveEmployeeAssignmentBridge = shouldLoadExecutionEmployeeAssignmentBridge(
        loadCoerciveHeavyHandlerCluster,
        coerciveHeavyHandlerClusterInput,
    );
    const coerciveInputIsEvictionModule = Boolean(
        readHandlerClusterContextValue(coerciveHeavyHandlerClusterInput, 'isEvictionExecutionModule'),
    );

    useEffect(() => {
        if (!phoneBodyReady) return;

        prefetchExecutionCoreHandlers('seizure-requests');
        if (loadCoerciveHeavyHandlerCluster) {
            prefetchExecutionCoreHandlers('coercive');
            if (loadCoerciveEmployeeAssignmentBridge) {
                prefetchExecutionCoreHandlers('coercive-employee');
            }
            if (coerciveInputIsEvictionModule) {
                prefetchExecutionCoreHandlers('coercive-eviction');
            }
        }
    }, [
        phoneBodyReady,
        loadCoerciveHeavyHandlerCluster,
        loadCoerciveEmployeeAssignmentBridge,
        coerciveInputIsEvictionModule,
        loadSeizureHeavyHandlerCluster,
    ]);

    if (!phoneBodyReady && !shellOverlaysReady) {
        return <PhoneBodyLoadingShell file={props.paintFile} onExitToHome={props.onExitToHome} />;
    }

    return (
        <ExecutionShellOverlayScopeProvider scopeRef={shellOverlayScopeRef}>
            <ExecutionPhoneBodyScopeProvider scopeRef={phoneBodyScopeRef}>
                <ExecutionDashboardChunkHostClusterTree
                    {...props}
                    loadCoerciveEmployeeAssignmentBridge={loadCoerciveEmployeeAssignmentBridge}
                />
            </ExecutionPhoneBodyScopeProvider>
        </ExecutionShellOverlayScopeProvider>
    );
}
