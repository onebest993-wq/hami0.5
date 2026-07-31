import { describe, expect, it } from 'vitest';
import { buildExecutionDashboardRuntimeAssemblyResult } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/buildExecutionDashboardRuntimeAssemblyResult';

describe('buildExecutionDashboardRuntimeAssemblyResult', () => {
    it('يحافظ على عقد الخروج كما هو', () => {
        const bag = {
            toastVisible: true,
            toastMessage: 'x',
            toastType: 'info',
            toastEpoch: 1,
            hideToast: () => undefined,
            phoneBodyFingerprint: 'a',
            shellOverlayFingerprint: 'b',
            phoneBodyReady: true,
            shellOverlaysReady: true,
            phoneBodyScopeRef: null,
            shellOverlayScopeRef: null,
            shellOverlayScopeSnapshot: null,
            followupModalSnapshot: null,
            showUnifiedExecutionModal: false,
            unifiedModalTab: null,
            loadLightHandlerCluster: () => undefined,
            loadFollowupHeavyHandlerCluster: () => undefined,
            loadFollowupAdminSpecialHandlerCluster: () => undefined,
            loadFollowupDossierControlsHandlerCluster: () => undefined,
            loadFollowupOtherPartyHandlerCluster: () => undefined,
            loadSeizureRequestsHandlerCluster: () => undefined,
            loadSeizureLogHandlerCluster: () => undefined,
            loadSeizureHeavyHandlerCluster: () => undefined,
            loadCoerciveHeavyHandlerCluster: () => undefined,
            loadPublicationNoticeHandlerCluster: () => undefined,
            loadDossierSupportHandlerCluster: () => undefined,
            lightHandlerClusterInput: null,
            followupAdminSpecialHandlerClusterInput: null,
            followupDossierControlsHandlerClusterInput: null,
            followupOtherPartyHandlerClusterInput: null,
            seizureHeavyHandlerClusterInput: null,
            coerciveHeavyHandlerClusterInput: null,
            publicationNoticeHandlerClusterInput: null,
            dossierSupportHandlerClusterInput: null,
            handlerClusterMountKey: 'k',
            onLightHandlerClusterReady: () => undefined,
            onFollowupAdminSpecialHandlerClusterReady: () => undefined,
            onFollowupDossierControlsHandlerClusterReady: () => undefined,
            onFollowupOtherPartyHandlerClusterReady: () => undefined,
            onSeizureHeavyHandlerClusterReady: () => undefined,
            onCoerciveHeavyHandlerClusterReady: () => undefined,
            onDossierSupportHandlerClusterReady: () => undefined,
        };
        expect(buildExecutionDashboardRuntimeAssemblyResult(bag)).toBe(bag);
    });
});
