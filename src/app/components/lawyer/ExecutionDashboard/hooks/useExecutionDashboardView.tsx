// @ts-nocheck
/** عرض رفيع — chunk execution-dashboard-core */
import React from 'react';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { ExecutionToast } from '../components/ExecutionToast';
import { ExecutionDashboardChunkHost } from '../components/ExecutionDashboardChunkHost';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from '../components/ExecutionDashboardStatusViews';
import { ExecutionDashboardRootFrame } from '../components/ExecutionDashboardRootFrame';
import { useExecutionDashboardCore } from './useExecutionDashboardCore';
import type { ExecutionDashboardProps } from '../types';

export const ExecutionDashboardView = React.memo(function ExecutionDashboardView({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps) {
    const vm = useExecutionDashboardCore({ file, executionId, onClose, onUpdate });

    if (vm.isLoading) {
        return <ExecutionDashboardLoadingView />;
    }

    if (vm.loadError || !vm.executionData) {
        return (
            <ExecutionDashboardErrorView
                message={vm.loadError || 'لم يتم العثور على بيانات التنفيذ'}
                onClose={vm.onClose}
            />
        );
    }

    return (
        <ColleagueConsultationProvider source={extractExecutionShareSource(vm.viewExecutionData)}>
            <ExecutionDashboardRootFrame>
                <ExecutionToast
                    visible={vm.toastVisible}
                    message={vm.toastMessage}
                    type={vm.toastType}
                    epoch={vm.toastEpoch}
                    onClose={vm.hideToast}
                    zIndex={EXEC_MODAL_Z.toastAboveExecution}
                />
                <ExecutionDashboardChunkHost
                    phoneBodyReady={vm.phoneBodyReady}
                    shellOverlaysReady={vm.shellOverlaysReady}
                    chunkScopeRef={vm.chunkScopeRef}
                    phoneBodyFingerprint={vm.phoneBodyFingerprint}
                    showUnifiedExecutionModal={vm.showUnifiedExecutionModal}
                    loadLightHandlerCluster={vm.loadLightHandlerCluster}
                    loadFollowupHeavyHandlerCluster={vm.loadFollowupHeavyHandlerCluster}
                    loadFollowupAdminSpecialHandlerCluster={vm.loadFollowupAdminSpecialHandlerCluster}
                    loadFollowupDossierControlsHandlerCluster={vm.loadFollowupDossierControlsHandlerCluster}
                    loadFollowupOtherPartyHandlerCluster={vm.loadFollowupOtherPartyHandlerCluster}
                    loadSeizureHeavyHandlerCluster={vm.loadSeizureHeavyHandlerCluster}
                    loadCoerciveHeavyHandlerCluster={vm.loadCoerciveHeavyHandlerCluster}
                    loadDossierSupportHandlerCluster={vm.loadDossierSupportHandlerCluster}
                    lightHandlerClusterInput={vm.lightHandlerClusterInput}
                    followupAdminSpecialHandlerClusterInput={vm.followupAdminSpecialHandlerClusterInput}
                    followupDossierControlsHandlerClusterInput={vm.followupDossierControlsHandlerClusterInput}
                    followupOtherPartyHandlerClusterInput={vm.followupOtherPartyHandlerClusterInput}
                    seizureHeavyHandlerClusterInput={vm.seizureHeavyHandlerClusterInput}
                    coerciveHeavyHandlerClusterInput={vm.coerciveHeavyHandlerClusterInput}
                    dossierSupportHandlerClusterInput={vm.dossierSupportHandlerClusterInput}
                    handlerClusterMountKey={vm.handlerClusterMountKey}
                    onLightHandlerClusterReady={vm.onLightHandlerClusterReady}
                    onFollowupAdminSpecialHandlerClusterReady={vm.onFollowupAdminSpecialHandlerClusterReady}
                    onFollowupDossierControlsHandlerClusterReady={
                        vm.onFollowupDossierControlsHandlerClusterReady
                    }
                    onFollowupOtherPartyHandlerClusterReady={vm.onFollowupOtherPartyHandlerClusterReady}
                    onSeizureHeavyHandlerClusterReady={vm.onSeizureHeavyHandlerClusterReady}
                    onCoerciveHeavyHandlerClusterReady={vm.onCoerciveHeavyHandlerClusterReady}
                    onDossierSupportHandlerClusterReady={vm.onDossierSupportHandlerClusterReady}
                />
            </ExecutionDashboardRootFrame>
        </ColleagueConsultationProvider>
    );
});
