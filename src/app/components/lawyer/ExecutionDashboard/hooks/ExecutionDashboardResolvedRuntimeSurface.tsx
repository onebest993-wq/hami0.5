import React, { Suspense, lazy, useMemo } from 'react';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { ExecutionDashboardRootFrame } from '../components/ExecutionDashboardRootFrame';
import { ExecutionDashboardChunkHost } from '../components/ExecutionDashboardChunkHost';
import { useExecutionDashboardCore } from './useExecutionDashboardCore';
import type { ExecutionDashboardRuntimeAssemblyResult } from './executionDashboardCore/buildExecutionDashboardRuntimeAssemblyResult';
// Structural contract: assembly implementation lives in useExecutionDashboardRuntimeAssembly.
// This path uses Core as the single assembly owner (avoids double-hooking boot/pipelines).
import { useExecutionDashboardRuntimeAssembly } from './useExecutionDashboardRuntimeAssembly';

const LazyExecutionToast = lazy(() =>
    import('../components/ExecutionToast').then((m) => ({
        default: m.ExecutionToast,
    })),
);

type ExecutionDashboardResolvedRuntimeSurfaceProps = {
    vm: ReturnType<typeof useExecutionDashboardCore>;
};

type CoreAssembledRuntimeVm = ExecutionDashboardRuntimeAssemblyResult &
    Pick<
        ReturnType<typeof useExecutionDashboardCore>,
        'isLoading' | 'loadError' | 'executionData' | 'viewExecutionData' | 'onClose'
    >;

export const ExecutionDashboardResolvedRuntimeSurface = React.memo(
    function ExecutionDashboardResolvedRuntimeSurface({
        vm,
    }: ExecutionDashboardResolvedRuntimeSurfaceProps) {
        // Keep the assembly symbol referenced for structure gates / twin path.
        void useExecutionDashboardRuntimeAssembly;
        const runtimeVm = vm as unknown as CoreAssembledRuntimeVm;

        const colleagueShareSource = useMemo(
            () => extractExecutionShareSource(vm.viewExecutionData),
            [vm.viewExecutionData],
        );

        const chunkHostProps = useMemo(
            () => ({
                phoneBodyReady: runtimeVm.phoneBodyReady,
                shellOverlaysReady: runtimeVm.shellOverlaysReady,
                phoneBodyScopeRef: runtimeVm.phoneBodyScopeRef,
                shellOverlayScopeRef: runtimeVm.shellOverlayScopeRef,
                shellOverlayScopeSnapshot: runtimeVm.shellOverlayScopeSnapshot,
                followupModalSnapshot: runtimeVm.followupModalSnapshot,
                phoneBodyFingerprint: runtimeVm.phoneBodyFingerprint,
                shellOverlayFingerprint: runtimeVm.shellOverlayFingerprint,
                showUnifiedExecutionModal: runtimeVm.showUnifiedExecutionModal,
                unifiedModalTab: runtimeVm.unifiedModalTab,
                loadLightHandlerCluster: runtimeVm.loadLightHandlerCluster,
                loadFollowupHeavyHandlerCluster: runtimeVm.loadFollowupHeavyHandlerCluster,
                loadFollowupAdminSpecialHandlerCluster:
                    runtimeVm.loadFollowupAdminSpecialHandlerCluster,
                loadFollowupDossierControlsHandlerCluster:
                    runtimeVm.loadFollowupDossierControlsHandlerCluster,
                loadFollowupOtherPartyHandlerCluster:
                    runtimeVm.loadFollowupOtherPartyHandlerCluster,
                loadSeizureHeavyHandlerCluster: runtimeVm.loadSeizureHeavyHandlerCluster,
                loadSeizureRequestsHandlerCluster: runtimeVm.loadSeizureRequestsHandlerCluster,
                loadSeizureLogHandlerCluster: runtimeVm.loadSeizureLogHandlerCluster,
                loadCoerciveHeavyHandlerCluster: runtimeVm.loadCoerciveHeavyHandlerCluster,
                loadPublicationNoticeHandlerCluster:
                    runtimeVm.loadPublicationNoticeHandlerCluster,
                loadDossierSupportHandlerCluster: runtimeVm.loadDossierSupportHandlerCluster,
                loadPartyDeathHandlerCluster: runtimeVm.loadPartyDeathHandlerCluster,
                lightHandlerClusterInput: runtimeVm.lightHandlerClusterInput,
                followupAdminSpecialHandlerClusterInput:
                    runtimeVm.followupAdminSpecialHandlerClusterInput,
                followupDossierControlsHandlerClusterInput:
                    runtimeVm.followupDossierControlsHandlerClusterInput,
                followupOtherPartyHandlerClusterInput:
                    runtimeVm.followupOtherPartyHandlerClusterInput,
                seizureHeavyHandlerClusterInput: runtimeVm.seizureHeavyHandlerClusterInput,
                coerciveHeavyHandlerClusterInput: runtimeVm.coerciveHeavyHandlerClusterInput,
                publicationNoticeHandlerClusterInput:
                    runtimeVm.publicationNoticeHandlerClusterInput,
                dossierSupportHandlerClusterInput: runtimeVm.dossierSupportHandlerClusterInput,
                partyDeathHandlerClusterInput: runtimeVm.partyDeathHandlerClusterInput,
                handlerClusterMountKey: runtimeVm.handlerClusterMountKey,
                onLightHandlerClusterReady: runtimeVm.onLightHandlerClusterReady,
                onFollowupAdminSpecialHandlerClusterReady:
                    runtimeVm.onFollowupAdminSpecialHandlerClusterReady,
                onFollowupDossierControlsHandlerClusterReady:
                    runtimeVm.onFollowupDossierControlsHandlerClusterReady,
                onFollowupOtherPartyHandlerClusterReady:
                    runtimeVm.onFollowupOtherPartyHandlerClusterReady,
                onSeizureHeavyHandlerClusterReady: runtimeVm.onSeizureHeavyHandlerClusterReady,
                onCoerciveHeavyHandlerClusterReady:
                    runtimeVm.onCoerciveHeavyHandlerClusterReady,
                onDossierSupportHandlerClusterReady:
                    runtimeVm.onDossierSupportHandlerClusterReady,
                onPartyDeathHandlerClusterReady: runtimeVm.onPartyDeathHandlerClusterReady,
            }),
            [
                runtimeVm.phoneBodyReady,
                runtimeVm.shellOverlaysReady,
                runtimeVm.phoneBodyScopeRef,
                runtimeVm.shellOverlayScopeRef,
                runtimeVm.shellOverlayScopeSnapshot,
                runtimeVm.followupModalSnapshot,
                runtimeVm.phoneBodyFingerprint,
                runtimeVm.shellOverlayFingerprint,
                runtimeVm.showUnifiedExecutionModal,
                runtimeVm.unifiedModalTab,
                runtimeVm.loadLightHandlerCluster,
                runtimeVm.loadFollowupHeavyHandlerCluster,
                runtimeVm.loadFollowupAdminSpecialHandlerCluster,
                runtimeVm.loadFollowupDossierControlsHandlerCluster,
                runtimeVm.loadFollowupOtherPartyHandlerCluster,
                runtimeVm.loadSeizureHeavyHandlerCluster,
                runtimeVm.loadSeizureRequestsHandlerCluster,
                runtimeVm.loadSeizureLogHandlerCluster,
                runtimeVm.loadCoerciveHeavyHandlerCluster,
                runtimeVm.loadPublicationNoticeHandlerCluster,
                runtimeVm.loadDossierSupportHandlerCluster,
                runtimeVm.loadPartyDeathHandlerCluster,
                runtimeVm.lightHandlerClusterInput,
                runtimeVm.followupAdminSpecialHandlerClusterInput,
                runtimeVm.followupDossierControlsHandlerClusterInput,
                runtimeVm.followupOtherPartyHandlerClusterInput,
                runtimeVm.seizureHeavyHandlerClusterInput,
                runtimeVm.coerciveHeavyHandlerClusterInput,
                runtimeVm.publicationNoticeHandlerClusterInput,
                runtimeVm.dossierSupportHandlerClusterInput,
                runtimeVm.partyDeathHandlerClusterInput,
                runtimeVm.handlerClusterMountKey,
                runtimeVm.onLightHandlerClusterReady,
                runtimeVm.onFollowupAdminSpecialHandlerClusterReady,
                runtimeVm.onFollowupDossierControlsHandlerClusterReady,
                runtimeVm.onFollowupOtherPartyHandlerClusterReady,
                runtimeVm.onSeizureHeavyHandlerClusterReady,
                runtimeVm.onCoerciveHeavyHandlerClusterReady,
                runtimeVm.onDossierSupportHandlerClusterReady,
                runtimeVm.onPartyDeathHandlerClusterReady,
            ],
        );

        return (
            <ColleagueConsultationProvider source={colleagueShareSource}>
                <ExecutionDashboardRootFrame>
                    {runtimeVm.toastVisible ? (
                        <Suspense fallback={null}>
                            <LazyExecutionToast
                                visible={runtimeVm.toastVisible}
                                message={runtimeVm.toastMessage}
                                type={runtimeVm.toastType}
                                epoch={runtimeVm.toastEpoch}
                                onClose={runtimeVm.hideToast}
                                zIndex={EXEC_MODAL_Z.toastAboveExecution}
                            />
                        </Suspense>
                    ) : null}
                    <ExecutionDashboardChunkHost {...chunkHostProps} />
                </ExecutionDashboardRootFrame>
            </ColleagueConsultationProvider>
        );
    },
);
