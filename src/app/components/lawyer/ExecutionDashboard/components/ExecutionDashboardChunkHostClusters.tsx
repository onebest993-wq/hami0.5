import React, { Suspense } from 'react';
import { LazyExecutionDashboardHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';
import { LazyExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';
import type { ExecutionDashboardChunkHostProps } from './ExecutionDashboardChunkHost.types';
import { PhoneBodyLoadingShell } from './ExecutionDashboardPhoneBodyLoadingShell';
import { ExecutionFollowupOverlayEntry } from './ExecutionFollowupOverlayEntry';
import { ExecutionShellOverlaysEntry } from './ExecutionShellOverlaysEntry';
import type { FollowupModalSnapshot } from '../followupModalContext';

const LazyExecutionDashboardCoerciveHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardCoerciveHandlerClusterGroup,
    })),
);

const LazyExecutionDashboardSeizureHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardSeizureHandlerClusterGroup,
    })),
);

const LazyExecutionDashboardFollowupHandlerClusterGroup = React.lazy(() =>
    import('./ExecutionDashboardHandlerClusterGroups').then((m) => ({
        default: m.ExecutionDashboardFollowupHandlerClusterGroup,
    })),
);

type ClusterTreeProps = ExecutionDashboardChunkHostProps & {
    loadCoerciveEmployeeAssignmentBridge: boolean;
};

export function ExecutionDashboardChunkHostClusterTree({
    phoneBodyReady,
    shellOverlaysReady,
    showUnifiedExecutionModal,
    unifiedModalTab,
    loadLightHandlerCluster,
    loadFollowupHeavyHandlerCluster,
    loadFollowupAdminSpecialHandlerCluster,
    loadFollowupDossierControlsHandlerCluster,
    loadFollowupOtherPartyHandlerCluster,
    loadSeizureHeavyHandlerCluster,
    loadSeizureRequestsHandlerCluster,
    loadSeizureLogHandlerCluster,
    loadCoerciveHeavyHandlerCluster,
    loadPublicationNoticeHandlerCluster,
    loadDossierSupportHandlerCluster,
    loadPartyDeathHandlerCluster,
    lightHandlerClusterInput,
    followupAdminSpecialHandlerClusterInput,
    followupDossierControlsHandlerClusterInput,
    followupOtherPartyHandlerClusterInput,
    seizureHeavyHandlerClusterInput,
    coerciveHeavyHandlerClusterInput,
    publicationNoticeHandlerClusterInput,
    dossierSupportHandlerClusterInput,
    partyDeathHandlerClusterInput,
    handlerClusterMountKey,
    onLightHandlerClusterReady,
    onFollowupAdminSpecialHandlerClusterReady,
    onFollowupDossierControlsHandlerClusterReady,
    onFollowupOtherPartyHandlerClusterReady,
    onSeizureHeavyHandlerClusterReady,
    onCoerciveHeavyHandlerClusterReady,
    onDossierSupportHandlerClusterReady,
    onPartyDeathHandlerClusterReady,
    loadCoerciveEmployeeAssignmentBridge,
    phoneBodyFingerprint,
    shellOverlayScopeSnapshot,
    followupModalSnapshot,
    paintFile,
    onExitToHome,
}: ClusterTreeProps) {
    return (
        <>
            {loadPartyDeathHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardHandlerClusterPartyDeathBridge
                        key={`${handlerClusterMountKey}:party-death`}
                        input={partyDeathHandlerClusterInput}
                        onCluster={onPartyDeathHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadCoerciveHeavyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardCoerciveHandlerClusterGroup
                        key={`${handlerClusterMountKey}:heavy-coercive-group`}
                        mountKey={handlerClusterMountKey}
                        input={coerciveHeavyHandlerClusterInput}
                        loadBaseCoerciveBridges
                        loadEmployeeAssignmentBridge={loadCoerciveEmployeeAssignmentBridge}
                        loadPublicationNoticeHandlerCluster={loadPublicationNoticeHandlerCluster}
                        onCluster={onCoerciveHeavyHandlerClusterReady}
                    />
                </Suspense>
            ) : loadPublicationNoticeHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardCoerciveHandlerClusterGroup
                        key={`${handlerClusterMountKey}:heavy-publication-group`}
                        mountKey={handlerClusterMountKey}
                        input={publicationNoticeHandlerClusterInput}
                        loadBaseCoerciveBridges={false}
                        loadEmployeeAssignmentBridge={false}
                        loadPublicationNoticeHandlerCluster
                        onCluster={onCoerciveHeavyHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {loadSeizureHeavyHandlerCluster ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardSeizureHandlerClusterGroup
                        key={`${handlerClusterMountKey}:heavy-seizure-group`}
                        mountKey={handlerClusterMountKey}
                        input={seizureHeavyHandlerClusterInput}
                        loadSeizureRequestsHandlerCluster={loadSeizureRequestsHandlerCluster}
                        loadSeizureLogHandlerCluster={loadSeizureLogHandlerCluster}
                        onCluster={onSeizureHeavyHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {(loadFollowupAdminSpecialHandlerCluster ||
                loadFollowupDossierControlsHandlerCluster ||
                loadFollowupOtherPartyHandlerCluster ||
                loadDossierSupportHandlerCluster ||
                (loadLightHandlerCluster &&
                    !loadCoerciveHeavyHandlerCluster &&
                    !loadSeizureHeavyHandlerCluster &&
                    !loadFollowupHeavyHandlerCluster)) ? (
                <Suspense fallback={null}>
                    <LazyExecutionDashboardFollowupHandlerClusterGroup
                        key={`${handlerClusterMountKey}:followup-group`}
                        mountKey={handlerClusterMountKey}
                        lightHandlerClusterInput={lightHandlerClusterInput}
                        followupAdminSpecialHandlerClusterInput={followupAdminSpecialHandlerClusterInput}
                        followupDossierControlsHandlerClusterInput={
                            followupDossierControlsHandlerClusterInput
                        }
                        followupOtherPartyHandlerClusterInput={followupOtherPartyHandlerClusterInput}
                        dossierSupportHandlerClusterInput={dossierSupportHandlerClusterInput}
                        loadFollowupAdminSpecialHandlerCluster={
                            loadFollowupAdminSpecialHandlerCluster
                        }
                        loadFollowupDossierControlsHandlerCluster={
                            loadFollowupDossierControlsHandlerCluster
                        }
                        loadFollowupOtherPartyHandlerCluster={loadFollowupOtherPartyHandlerCluster}
                        loadDossierSupportHandlerCluster={loadDossierSupportHandlerCluster}
                        loadLightOnlyCluster={
                            loadLightHandlerCluster &&
                            !loadCoerciveHeavyHandlerCluster &&
                            !loadSeizureHeavyHandlerCluster &&
                            !loadFollowupHeavyHandlerCluster
                        }
                        onLightHandlerClusterReady={onLightHandlerClusterReady}
                        onFollowupAdminSpecialHandlerClusterReady={
                            onFollowupAdminSpecialHandlerClusterReady
                        }
                        onFollowupDossierControlsHandlerClusterReady={
                            onFollowupDossierControlsHandlerClusterReady
                        }
                        onFollowupOtherPartyHandlerClusterReady={
                            onFollowupOtherPartyHandlerClusterReady
                        }
                        onDossierSupportHandlerClusterReady={onDossierSupportHandlerClusterReady}
                    />
                </Suspense>
            ) : null}
            {showUnifiedExecutionModal ? (
                <ExecutionFollowupOverlayEntry
                    open
                    snapshot={followupModalSnapshot as FollowupModalSnapshot}
                />
            ) : null}
            <ExecutionShellOverlaysEntry
                open={shellOverlaysReady}
                showUnifiedExecutionModal={showUnifiedExecutionModal}
                unifiedModalTab={unifiedModalTab}
                scope={shellOverlayScopeSnapshot}
                followupSnapshot={followupModalSnapshot}
            />
            {phoneBodyReady ? (
                <Suspense fallback={<PhoneBodyLoadingShell file={paintFile} onExitToHome={onExitToHome} />}>
                    <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
                </Suspense>
            ) : (
                <PhoneBodyLoadingShell file={paintFile} onExitToHome={onExitToHome} />
            )}
        </>
    );
}
