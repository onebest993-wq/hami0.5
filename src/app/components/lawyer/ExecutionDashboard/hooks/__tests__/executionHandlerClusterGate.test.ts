import { describe, expect, it } from 'vitest';
import {
    buildExecutionHandlerClusterMountKey,
    shouldLoadExecutionHandlerCluster,
} from '../executionHandlerClusterGate';

describe('executionHandlerClusterGate', () => {
    it('does not load handlers on idle dossier', () => {
        expect(
            shouldLoadExecutionHandlerCluster({
                showUnifiedExecutionModal: false,
                showUnifiedSeizureLogModal: false,
                showCoerciveModal: false,
                showAppointmentModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotesModal: false,
                showCoerciveActionForm: false,
            }),
        ).toBe(false);
    });

    it('loads handlers when followup modal opens', () => {
        expect(
            shouldLoadExecutionHandlerCluster({
                showUnifiedExecutionModal: true,
                showUnifiedSeizureLogModal: false,
                showCoerciveModal: false,
                showAppointmentModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotesModal: false,
                showCoerciveActionForm: false,
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
        ).toBe('e1:home:2:d1');
    });
});
