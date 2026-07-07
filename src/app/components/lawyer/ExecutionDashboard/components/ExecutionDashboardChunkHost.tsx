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
    LazyExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge,
    LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge,
    LazyExecutionDashboardHandlerClusterLightBridge,
    LazyExecutionDashboardHandlerClusterSeizureHeavyBridge,
    LazyExecutionDashboardHandlerClusterSeizureLogBridge,
} from '../executionDashboardHandlerClusterBridgeLazy';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import type { ExecutionDashboardCoreHandlerClusterInput } from '../hooks/executionDashboardCore/executionDashboardCoreHandlerClusterTypes';
import type { FollowupAdminSpecialHandlerClusterInput } from '../hooks/executionDashboardCore/followupAdminSpecialHandlerClusterInput';
import type { FollowupOtherPartyHandlerClusterInput } from '../hooks/executionDashboardCore/followupOtherPartyHandlerClusterInput';

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
    loadSeizureRequestsHandlerCluster: boolean;
    loadSeizureLogHandlerCluster: boolean;
    loadCoerciveHeavyHandlerCluster: boolean;
    loadDossierSupportHandlerCluster: boolean;
    lightHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupAdminSpecialHandlerClusterInput: FollowupAdminSpecialHandlerClusterInput;
    followupDossierControlsHandlerClusterInput: ExecutionDashboardCoreHandlerClusterInput;
    followupOtherPartyHandlerClusterInput: FollowupOtherPartyHandlerClusterInput;
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
    loadSeizureRequestsHandlerCluster,
    loadSeizureLogHandlerCluster,
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
            if (loadSeizureRequestsHandlerCluster) {
                prefetchExecutionCoreHandlers('seizure-requests');
            }
            if (loadSeizureLogHandlerCluster) {
                prefetchExecutionCoreHandlers('seizure-log');
            }
        }
        if (loadFollowupHeavyHandlerCluster) {
            if (loadFollowupAdminSpecialHandlerCluster) {
                prefetchExecutionCoreHandlers('followup-admin-special');
            }
            if (loadFollowupDossierControlsHandlerCluster) {
                prefetchExecutionCoreHandlers('followup-dossier-controls');
            }
            if (loadFollowupOtherPartyHandlerCluster) {
                prefetchExecutionCoreHandlers(
                    followupOtherPartyHandlerClusterInput.isRepresentingDebtor
                        ? 'followup-other-party-debtor'
                        : 'followup-other-party-creditor',
                );
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
        followupOtherPartyHandlerClusterInput.isRepresentingDebtor,
        loadCoerciveHeavyHandlerCluster,
        loadDossierSupportHandlerCluster,
        loadLightHandlerCluster,
        loadSeizureLogHandlerCluster,
        loadSeizureRequestsHandlerCluster,
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
                    <>
                        {loadSeizureRequestsHandlerCluster ? (
                            <LazyExecutionDashboardHandlerClusterSeizureHeavyBridge
                                key={`${handlerClusterMountKey}:heavy-seizure-requests`}
                                input={seizureHeavyHandlerClusterInput}
                                onCluster={onSeizureHeavyHandlerClusterReady}
                            />
                        ) : null}
                        {loadSeizureLogHandlerCluster ? (
                            <LazyExecutionDashboardHandlerClusterSeizureLogBridge
                                key={`${handlerClusterMountKey}:heavy-seizure-log`}
                                input={seizureHeavyHandlerClusterInput}
                                onCluster={onSeizureHeavyHandlerClusterReady}
                            />
                        ) : null}
                    </>
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
                    {followupOtherPartyHandlerClusterInput.isRepresentingDebtor ? (
                        <LazyExecutionDashboardHandlerClusterFollowupOtherPartyDebtorBridge
                            key={`${handlerClusterMountKey}:followup-other-party-debtor`}
                            input={followupOtherPartyHandlerClusterInput}
                            onCluster={onFollowupOtherPartyHandlerClusterReady}
                        />
                    ) : (
                        <LazyExecutionDashboardHandlerClusterFollowupOtherPartyBridge
                            key={`${handlerClusterMountKey}:followup-other-party-creditor`}
                            input={followupOtherPartyHandlerClusterInput}
                            onCluster={onFollowupOtherPartyHandlerClusterReady}
                        />
                    )}
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
