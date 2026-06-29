import React, { Suspense, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import {
    EXEC_SECTION_LAZY_FALLBACK,
    LazyExecutionDashboardPhoneBody,
    LazyExecutionDashboardShellOverlays,
} from '../executionDashboardLazyShell';
import { ExecutionDashboardChunkScopeProvider } from '../hooks/executionDashboardChunkScope';
import { LazyExecutionDashboardHandlerClusterBridge } from '../executionDashboardHandlerClusterBridgeLazy';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import type { ExecutionDashboardCoreHandlerClusterInput } from '../hooks/executionDashboardCore/executionDashboardCoreHandlerClusterTypes';

const PHONE_BODY_PLACEHOLDER_CLASS =
    'bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30';

function PhoneBodyLoadingShell() {
    return (
        <div className={PHONE_BODY_PLACEHOLDER_CLASS} dir="rtl" aria-busy="true" aria-label="جاري تحميل الإضبارة">
            <div className="flex flex-1 flex-col gap-3 p-4">{EXEC_SECTION_LAZY_FALLBACK}</div>
        </div>
    );
}

export type ExecutionDashboardChunkHostProps = {
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    chunkScopeRef: MutableRefObject<Record<string, unknown>>;
    phoneBodyFingerprint: string;
    showUnifiedExecutionModal: boolean;
    loadHandlerCluster: boolean;
    handlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    handlerClusterMountKey: string;
    onHandlerClusterReady: (cluster: Record<string, unknown>) => void;
};

/** جسم الإضبارة lazy + shell overlays عند الحاجة */
export function ExecutionDashboardChunkHost({
    phoneBodyReady,
    shellOverlaysReady,
    chunkScopeRef,
    phoneBodyFingerprint,
    showUnifiedExecutionModal,
    loadHandlerCluster,
    handlerClusterInput,
    handlerClusterMountKey,
    onHandlerClusterReady,
}: ExecutionDashboardChunkHostProps) {
    useEffect(() => {
        if (loadHandlerCluster) prefetchExecutionCoreHandlers();
    }, [loadHandlerCluster]);

    if (!phoneBodyReady && !shellOverlaysReady) {
        return <PhoneBodyLoadingShell />;
    }

    return (
        <ExecutionDashboardChunkScopeProvider scopeRef={chunkScopeRef}>
            {loadHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterBridge
                        key={handlerClusterMountKey}
                        input={handlerClusterInput}
                        mountKey={handlerClusterMountKey}
                        onCluster={onHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {shellOverlaysReady ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardShellOverlays
                        showUnifiedExecutionModal={showUnifiedExecutionModal}
                    />
                </Suspense>
            ) : null}
            {phoneBodyReady ? (
                <Suspense fallback={<PhoneBodyLoadingShell />}>
                    <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
                </Suspense>
            ) : (
                <PhoneBodyLoadingShell />
            )}
        </ExecutionDashboardChunkScopeProvider>
    );
}