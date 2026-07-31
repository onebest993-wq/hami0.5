import { describe, expect, it } from 'vitest';
import {
    buildExecutionHandlerClusterMountKey,
    resolveExecutionHandlerClusterHeavyMode,
    resolveExecutionHandlerClusterFollowupMode,
    shouldLoadExecutionHandlerCluster,
    shouldLoadExecutionHandlerClusterCoerciveHeavy,
    shouldLoadExecutionHandlerClusterDossierSupport,
    shouldLoadExecutionHandlerClusterFollowupAdminSpecial,
    shouldLoadExecutionHandlerClusterFollowupDossierControls,
    shouldLoadExecutionHandlerClusterFollowupOtherParty,
    shouldLoadExecutionHandlerClusterFollowupHeavy,
    shouldLoadExecutionHandlerClusterHeavy,
    shouldLoadExecutionHandlerClusterLight,
    shouldLoadExecutionHandlerClusterSeizureHeavy,
} from '../executionHandlerClusterGate';

describe('executionHandlerClusterGate', () => {
    it('does not load handlers on idle dossier', () => {
        expect(
            shouldLoadExecutionHandlerCluster({
                showUnifiedExecutionModal: false,
                unifiedModalTab: null,
                showUnifiedSeizureLogModal: false,
                showCoerciveModal: false,
                showAppointmentModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotesModal: false,
                showCoerciveActionForm: false,
                showEditDossierMetaModal: false,
                dossierLifecyclePanelOpen: false,
                isHeaderExpanded: false,
            }),
        ).toBe(false);
    });

    it('loads handlers when followup modal opens', () => {
        expect(
            shouldLoadExecutionHandlerCluster({
                showUnifiedExecutionModal: true,
                unifiedModalTab: 'seizure_requests',
                showUnifiedSeizureLogModal: false,
                showCoerciveModal: false,
                showAppointmentModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotesModal: false,
                showCoerciveActionForm: false,
                showEditDossierMetaModal: false,
                dossierLifecyclePanelOpen: false,
                isHeaderExpanded: false,
            }),
        ).toBe(true);
    });

    it('loads only light cluster for notes and appointment flows', () => {
        const input = {
            showUnifiedExecutionModal: false,
            unifiedModalTab: null,
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: true,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: true,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(shouldLoadExecutionHandlerClusterLight(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerCluster(input)).toBe(true);
    });

    it('loads heavy cluster for seizure and coercive flows', () => {
        const input = {
            showUnifiedExecutionModal: false,
            unifiedModalTab: null,
            showUnifiedSeizureLogModal: true,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: true,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: true,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(shouldLoadExecutionHandlerClusterLight(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerCluster(input)).toBe(true);
    });

    it('resolves seizure heavy mode for unified seizure tab', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'seizure_requests',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('seizure');
        expect(shouldLoadExecutionHandlerClusterSeizureHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterCoerciveHeavy(input)).toBe(false);
    });

    it('does not load seizure heavy cluster for seized assets manager alone', () => {
        const input = {
            showUnifiedExecutionModal: false,
            unifiedModalTab: null,
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: true,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('none');
        expect(shouldLoadExecutionHandlerClusterSeizureHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerCluster(input)).toBe(false);
    });

    it('resolves followup heavy mode for non-seizure unified tabs', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'dossier_controls',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('followup');
        expect(resolveExecutionHandlerClusterFollowupMode(input)).toBe('dossier-controls');
        expect(shouldLoadExecutionHandlerClusterSeizureHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupDossierControls(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupOtherParty(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterFollowupAdminSpecial(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterCoerciveHeavy(input)).toBe(false);
    });

    it('does not load heavy cluster for correspondences tab', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'correspondences',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('none');
        expect(shouldLoadExecutionHandlerClusterHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterFollowupHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterCoerciveHeavy(input)).toBe(false);
    });

    it('resolves followup heavy mode for admin tab because requests rely on dossier handlers only', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'admin',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('followup');
        expect(resolveExecutionHandlerClusterFollowupMode(input)).toBe('admin-special');
        expect(shouldLoadExecutionHandlerClusterFollowupHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupAdminSpecial(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupDossierControls(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterFollowupOtherParty(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterCoerciveHeavy(input)).toBe(false);
    });

    it('resolves controls-other-party followup mode for other party tab', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'other_party',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: false,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('followup');
        expect(resolveExecutionHandlerClusterFollowupMode(input)).toBe('other-party');
        expect(shouldLoadExecutionHandlerClusterFollowupDossierControls(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterFollowupOtherParty(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupAdminSpecial(input)).toBe(false);
    });

    it('resolves coercive heavy mode for coercive flows', () => {
        const input = {
            showUnifiedExecutionModal: true,
            unifiedModalTab: 'coercive',
            showUnifiedSeizureLogModal: false,
            showCoerciveModal: true,
            showAppointmentModal: false,
            showSeizedAssetsModal: false,
            showPaymentModal: false,
            showNotesModal: false,
            showCoerciveActionForm: false,
            showEditDossierMetaModal: false,
            dossierLifecyclePanelOpen: false,
            isHeaderExpanded: false,
        };

        expect(resolveExecutionHandlerClusterHeavyMode(input)).toBe('coercive');
        // محضر مفتوح → جسور الحجز تبقى محمّلة حتى أثناء تبويب/تدفق الجبري
        expect(shouldLoadExecutionHandlerClusterSeizureHeavy(input)).toBe(true);
        expect(shouldLoadExecutionHandlerClusterFollowupHeavy(input)).toBe(false);
        expect(shouldLoadExecutionHandlerClusterCoerciveHeavy(input)).toBe(true);
    });

    it('loads dossier support cluster when header/edit flows become relevant', () => {
        expect(
            shouldLoadExecutionHandlerClusterDossierSupport({
                showUnifiedExecutionModal: false,
                unifiedModalTab: null,
                showUnifiedSeizureLogModal: false,
                showCoerciveModal: false,
                showAppointmentModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotesModal: false,
                showCoerciveActionForm: false,
                showEditDossierMetaModal: false,
                dossierLifecyclePanelOpen: false,
                isHeaderExpanded: true,
            }),
        ).toBe(true);
    });

    it('builds stable mount keys', () => {
        expect(
            buildExecutionHandlerClusterMountKey({
                executionId: 'e1',
                activeTabId: 'home',
                decisionsReloadEpoch: 2,
                activeFollowupDebtorKey: 'd1',
            }),
        ).toBe('e1:d1');
    });
});
