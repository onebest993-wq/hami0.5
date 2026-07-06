import React, { Suspense, useEffect } from 'react';
import type { MutableRefObject } from 'react';
import {
    EXEC_SECTION_LAZY_FALLBACK,
    LazyExecutionDashboardPhoneBody,
    LazyExecutionDashboardShellOverlays,
} from '../executionDashboardLazyShell';
import { ExecutionDashboardChunkScopeProvider } from '../hooks/executionDashboardChunkScope';
import {
    LazyExecutionDashboardHandlerClusterDossierSupportBridge,
    LazyExecutionDashboardHandlerClusterCoerciveHeavyBridge,
    LazyExecutionDashboardHandlerClusterFollowupAdminSpecialBridge,
    LazyExecutionDashboardHandlerClusterFollowupDossierControlsBridge,
    LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge,
    LazyExecutionDashboardHandlerClusterLightBridge,
    LazyExecutionDashboardHandlerClusterSeizureHeavyBridge,
} from '../executionDashboardHandlerClusterBridgeLazy';
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
    loadLightHandlerCluster: boolean;
    loadFollowupHeavyHandlerCluster: boolean;
    loadFollowupAdminSpecialHandlerCluster: boolean;
    loadFollowupDossierControlsHandlerCluster: boolean;
    loadFollowupOtherPartyHandlerCluster: boolean;
    loadSeizureHeavyHandlerCluster: boolean;
    loadCoerciveHeavyHandlerCluster: boolean;
    loadDossierSupportHandlerCluster: boolean;
    lightHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupAdminSpecialHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupDossierControlsHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupOtherPartyHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    seizureHeavyHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    coerciveHeavyHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    dossierSupportHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    handlerClusterMountKey: string;
    onLightHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupAdminSpecialHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupDossierControlsHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onFollowupOtherPartyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onSeizureHeavyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onCoerciveHeavyHandlerClusterReady: (cluster: Record<string, unknown>) => void;
    onDossierSupportHandlerClusterReady: (cluster: Record<string, unknown>) => void;
};

/** جسم الإضبارة lazy + shell overlays عند الحاجة */
export function ExecutionDashboardChunkHost({
    phoneBodyReady,
    shellOverlaysReady,
    chunkScopeRef,
    phoneBodyFingerprint,
    showUnifiedExecutionModal,
    loadLightHandlerCluster,
    loadFollowupHeavyHandlerCluster,
    loadFollowupAdminSpecialHandlerCluster,
    loadFollowupDossierControlsHandlerCluster,
    loadFollowupOtherPartyHandlerCluster,
    loadSeizureHeavyHandlerCluster,
    loadCoerciveHeavyHandlerCluster,
    loadDossierSupportHandlerCluster,
    lightHandlerClusterInput,
    followupAdminSpecialHandlerClusterInput,
    followupDossierControlsHandlerClusterInput,
    followupOtherPartyHandlerClusterInput,
    seizureHeavyHandlerClusterInput,
    coerciveHeavyHandlerClusterInput,
    dossierSupportHandlerClusterInput,
    handlerClusterMountKey,
    onLightHandlerClusterReady,
    onFollowupAdminSpecialHandlerClusterReady,
    onFollowupDossierControlsHandlerClusterReady,
    onFollowupOtherPartyHandlerClusterReady,
    onSeizureHeavyHandlerClusterReady,
    onCoerciveHeavyHandlerClusterReady,
    onDossierSupportHandlerClusterReady,
}: ExecutionDashboardChunkHostProps) {
    useEffect(() => {
        if (loadCoerciveHeavyHandlerCluster) {
            prefetchExecutionCoreHandlers('coercive');
        }
        if (loadSeizureHeavyHandlerCluster) {
            prefetchExecutionCoreHandlers('seizure');
        }
        if (loadFollowupHeavyHandlerCluster) {
            if (loadFollowupAdminSpecialHandlerCluster) {
                prefetchExecutionCoreHandlers('followup-admin-special');
            }
            if (loadFollowupDossierControlsHandlerCluster) {
                prefetchExecutionCoreHandlers('followup-dossier-controls');
            }
            if (loadFollowupOtherPartyHandlerCluster) {
                prefetchExecutionCoreHandlers('followup-other-party');
            }
        }
        if (loadLightHandlerCluster) {
            prefetchExecutionCoreHandlers('light');
        }
        if (loadDossierSupportHandlerCluster) {
            prefetchExecutionCoreHandlers('dossier-support');
        }
    }, [
        loadFollowupHeavyHandlerCluster,
        loadFollowupAdminSpecialHandlerCluster,
        loadFollowupDossierControlsHandlerCluster,
        loadFollowupOtherPartyHandlerCluster,
        loadCoerciveHeavyHandlerCluster,
        loadDossierSupportHandlerCluster,
        loadLightHandlerCluster,
        loadSeizureHeavyHandlerCluster,
    ]);

    if (!phoneBodyReady && !shellOverlaysReady) {
        return <PhoneBodyLoadingShell />;
    }

    return (
        <ExecutionDashboardChunkScopeProvider scopeRef={chunkScopeRef}>
            {loadCoerciveHeavyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterCoerciveHeavyBridge
                        key={`${handlerClusterMountKey}:heavy-coercive`}
                        input={coerciveHeavyHandlerClusterInput}
                        onCluster={onCoerciveHeavyHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadSeizureHeavyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterSeizureHeavyBridge
                        key={`${handlerClusterMountKey}:heavy-seizure`}
                        input={seizureHeavyHandlerClusterInput}
                        onCluster={onSeizureHeavyHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadFollowupAdminSpecialHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterFollowupAdminSpecialBridge
                        key={`${handlerClusterMountKey}:followup-admin-special`}
                        input={followupAdminSpecialHandlerClusterInput}
                        onCluster={onFollowupAdminSpecialHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadFollowupDossierControlsHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterFollowupDossierControlsBridge
                        key={`${handlerClusterMountKey}:followup-dossier-controls`}
                        input={followupDossierControlsHandlerClusterInput}
                        onCluster={onFollowupDossierControlsHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadFollowupOtherPartyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge
                        key={`${handlerClusterMountKey}:followup-other-party`}
                        input={followupOtherPartyHandlerClusterInput}
                        onCluster={onFollowupOtherPartyHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadDossierSupportHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterDossierSupportBridge
                        key={`${handlerClusterMountKey}:dossier-support`}
                        input={dossierSupportHandlerClusterInput}
                        onCluster={onDossierSupportHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadLightHandlerCluster &&
            !loadCoerciveHeavyHandlerCluster &&
            !loadSeizureHeavyHandlerCluster &&
            !loadFollowupHeavyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterLightBridge
                        key={`${handlerClusterMountKey}:light`}
                        input={lightHandlerClusterInput}
                        onCluster={onLightHandlerClusterReady}
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
