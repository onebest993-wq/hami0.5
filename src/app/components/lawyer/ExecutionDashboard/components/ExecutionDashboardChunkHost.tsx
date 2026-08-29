import { useEffect } from 'react';
import { ExecutionPhoneBodyScopeProvider } from '../hooks/executionPhoneBodyScope';
import { ExecutionShellOverlayScopeProvider } from '../hooks/executionShellOverlayScope';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
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
        loadSeizureLogHandlerCluster,
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

        const prefetchSecondaryHandlers = () => {
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
            if (loadSeizureHeavyHandlerCluster) {
                if (loadSeizureLogHandlerCluster) {
                    prefetchExecutionCoreHandlers('seizure-log');
                }
            }
        };

        const cancelIdlePrefetch = scheduleIdleWork(prefetchSecondaryHandlers, 350);
        return cancelIdlePrefetch;
    }, [
        phoneBodyReady,
        loadCoerciveHeavyHandlerCluster,
        loadCoerciveEmployeeAssignmentBridge,
        coerciveInputIsEvictionModule,
        loadSeizureHeavyHandlerCluster,
        loadSeizureLogHandlerCluster,
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
