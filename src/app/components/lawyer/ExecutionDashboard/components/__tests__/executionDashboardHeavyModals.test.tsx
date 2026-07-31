import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell', () => ({
    EXEC_OVERLAY_LAZY_FALLBACK: <div>lazy fallback</div>,
    LazyAlimonyBeneficiaryDeathModal: () => null,
    LazyDocumentVault: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close documents
        </button>
    ),
    LazyExecutionCoerciveActionsModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseCoerciveModal as (() => void) | undefined}
        >
            close coercive
        </button>
    ),
    LazyExecutionDebtorNotificationMemoModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseNotificationModal as (() => void) | undefined}
        >
            close notification
        </button>
    ),
    LazyExecutionDecisionsModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseDecisionsModal as (() => void) | undefined}
        >
            close decisions
        </button>
    ),
    LazyExecutionFinancialLedgerPortalContainer: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close ledger
        </button>
    ),
    LazyExecutionFullTimelineModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseTimelineModal as (() => void) | undefined}
        >
            close timeline
        </button>
    ),
    LazyExecutionHeirsNotificationModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseHeirsNotificationModal as (() => void) | undefined}
        >
            close heirs notification
        </button>
    ),
    LazyExecutionModalsContainer: (props: Record<string, unknown>) => (
        <div>
            <button
                type="button"
                onClick={props.onCloseGuarantorDetailsModal as (() => void) | undefined}
            >
                close guarantor details
            </button>
            <button
                type="button"
                onClick={props.onCloseStayOfExecutionModal as (() => void) | undefined}
            >
                close stay of execution
            </button>
            <button
                type="button"
                onClick={props.onClosePartyDeathModal as (() => void) | undefined}
            >
                close party death
            </button>
            <button
                type="button"
                onClick={props.onClosePauseModal as (() => void) | undefined}
            >
                close pause
            </button>
        </div>
    ),
    LazyExecutionPaymentModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onClosePaymentModal as (() => void) | undefined}
        >
            close payment
        </button>
    ),
    LazyExecutionSeizedAssetsModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseSeizedAssetsModal as (() => void) | undefined}
        >
            close seized assets
        </button>
    ),
    LazyExecutionTransferFileNumberModal: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close transfer file number
        </button>
    ),
    LazyGuarantorDetailsPostApprovalModal: () => null,
    LazyLinkedDossierTimelineModal: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close linked dossier timeline
        </button>
    ),
    LazyPaymentCalculator: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close payment calculator
        </button>
    ),
    LazyRealEstateSeizurePostApprovalModal: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={() =>
                (props.onOpenChange as ((open: boolean) => void) | undefined)?.(false)
            }
        >
            close real estate seizure
        </button>
    ),
    LazySettlementCalculator: (props: Record<string, unknown>) => (
        <button type="button" onClick={props.onClose as (() => void) | undefined}>
            close settlement calculator
        </button>
    ),
    LazyStayOfExecutionModal: () => null,
    LazyPartyDeathReportModal: () => null,
    LazyUnifiedSummonsModalContainer: (props: Record<string, unknown>) => (
        <button
            type="button"
            onClick={props.onCloseUnifiedSummonsModal as (() => void) | undefined}
        >
            close unified summons
        </button>
    ),
    LazyDecisionsAndAppealsEngine: () => null,
    LazyModalSeizedAssetsManager: () => null,
    LazyPremiumTimelineAuditLog: () => null,
    LazyUnifiedSummonsHub: () => null,
}));

import { ExecutionDashboardHeavyModals } from '../ExecutionDashboardHeavyModals';

function createBaseProps(overrides: Record<string, unknown> = {}) {
    return {
        showDocumentsModal: false,
        showRealEstateSeizureModal: false,
        showDecisionsModal: false,
        showSeizedAssetsModal: false,
        showPaymentModal: false,
        showTimelineModal: false,
        showNotificationModal: false,
        showCoerciveModal: false,
        showHeirsNotificationModal: false,
        showGuarantorDetailsModal: false,
        showStayOfExecutionModal: false,
        partyDeathModalParty: null,
        showPauseModal: false,
        alimonyBeneficiaryDeathModalOpen: false,
        showUnifiedSummonsModal: false,
        showPaymentCalculator: false,
        showSettlementCalculator: false,
        showLedgerModal: false,
        showTransferFileNumberChangeModal: false,
        showLinkedDossierTimeline: false,
        linkedDossierToView: null,
        setShowDocumentsModal: vi.fn(),
        setShowRealEstateSeizureModal: vi.fn(),
        setRealEstateSeizureModalDecisionId: vi.fn(),
        setShowDecisionsModal: vi.fn(),
        setShowTimelineModal: vi.fn(),
        setShowSeizedAssetsModal: vi.fn(),
        setShowPaymentModal: vi.fn(),
        setShowNotificationModal: vi.fn(),
        setShowCoerciveModal: vi.fn(),
        setShowHeirsNotificationModal: vi.fn(),
        setShowPaymentCalculator: vi.fn(),
        setShowSettlementCalculator: vi.fn(),
        setShowLedgerModal: vi.fn(),
        setShowUnifiedSummonsModal: vi.fn(),
        setAlimonyBeneficiaryDeathModalOpen: vi.fn(),
        setAlimonyBeneficiaryDeathModalProfile: vi.fn(),
        setShowTransferFileNumberChangeModal: vi.fn(),
        setShowLinkedDossierTimeline: vi.fn(),
        setLinkedDossierToView: vi.fn(),
        onCloseDocumentsModal: vi.fn(),
        onCloseRealEstateSeizureModal: vi.fn(),
        onCloseDecisionsModal: vi.fn(),
        onCloseTimelineModal: vi.fn(),
        onCloseSeizedAssetsModal: vi.fn(),
        onClosePaymentModal: vi.fn(),
        onCloseNotificationModal: vi.fn(),
        onCloseCoerciveModal: vi.fn(),
        onCloseHeirsNotificationModal: vi.fn(),
        onCloseGuarantorDetailsModal: vi.fn(),
        onCloseStayOfExecutionModal: vi.fn(),
        onClosePartyDeathModal: vi.fn(),
        onClosePauseModal: vi.fn(),
        onClosePaymentCalculator: vi.fn(),
        onCloseSettlementCalculator: vi.fn(),
        onCloseLedgerModal: vi.fn(),
        onCloseUnifiedSummonsModal: vi.fn(),
        onCloseAlimonyBeneficiaryDeathModal: vi.fn(),
        onCloseTransferFileNumberChangeModal: vi.fn(),
        onCloseLinkedDossierTimeline: vi.fn(),
        executionId: 'ex-1',
        file: { id: 'file-1' },
        nextTimelineId: vi.fn(() => 't-1'),
        setTimelineEvents: vi.fn(),
        mergeSimilarRecentTimelineEvent: vi.fn((prev) => prev),
        persistExecutionMerge: vi.fn(),
        executionDataRef: { current: { id: 'ex-1' } },
        decisionsStorageExecutionId: 'ex-1',
        executionData: {},
        viewExecutionData: {},
        isHistoricalMode: false,
        seizedAssets: [],
        seizureDraftsByDecisionId: {},
        pushTimelineEvent: vi.fn(),
        setSeizedAssets: vi.fn(),
        setSeizureDraftsByDecisionId: vi.fn(),
        setActiveCoerciveActions: vi.fn(),
        executorApprovalActions: [],
        ...overrides,
    };
}

describe('ExecutionDashboardHeavyModals', () => {
    it('does not render when all heavy modals are closed', () => {
        render(<ExecutionDashboardHeavyModals {...createBaseProps()} />);

        expect(screen.queryByRole('button', { name: 'close documents' })).toBeNull();
    });

    it('uses explicit close callbacks for heavy modal close flows', () => {
        const onCloseDocumentsModal = vi.fn();
        const onCloseRealEstateSeizureModal = vi.fn();
        const onCloseDecisionsModal = vi.fn();
        const onCloseTimelineModal = vi.fn();
        const onCloseSeizedAssetsModal = vi.fn();
        const onClosePaymentModal = vi.fn();
        const onCloseNotificationModal = vi.fn();
        const onCloseCoerciveModal = vi.fn();
        const onCloseHeirsNotificationModal = vi.fn();
        const onCloseGuarantorDetailsModal = vi.fn();
        const onCloseStayOfExecutionModal = vi.fn();
        const onClosePartyDeathModal = vi.fn();
        const onClosePauseModal = vi.fn();
        const onClosePaymentCalculator = vi.fn();
        const onCloseSettlementCalculator = vi.fn();
        const onCloseLedgerModal = vi.fn();
        const onCloseUnifiedSummonsModal = vi.fn();
        const onCloseTransferFileNumberChangeModal = vi.fn();
        const onCloseLinkedDossierTimeline = vi.fn();

        render(
            <ExecutionDashboardHeavyModals
                {...createBaseProps({
                    showDocumentsModal: true,
                    showRealEstateSeizureModal: true,
                    showDecisionsModal: true,
                    showTimelineModal: true,
                    showSeizedAssetsModal: true,
                    showPaymentModal: true,
                    showNotificationModal: true,
                    showCoerciveModal: true,
                    showHeirsNotificationModal: true,
                    showGuarantorDetailsModal: true,
                    showStayOfExecutionModal: true,
                    partyDeathModalParty: 'debtor',
                    showPauseModal: true,
                    showUnifiedSummonsModal: true,
                    showPaymentCalculator: true,
                    showSettlementCalculator: true,
                    showLedgerModal: true,
                    showTransferFileNumberChangeModal: true,
                    showLinkedDossierTimeline: true,
                    linkedDossierToView: { id: 'ld-1' },
                    onCloseDocumentsModal,
                    onCloseRealEstateSeizureModal,
                    onCloseDecisionsModal,
                    onCloseTimelineModal,
                    onCloseSeizedAssetsModal,
                    onClosePaymentModal,
                    onCloseNotificationModal,
                    onCloseCoerciveModal,
                    onCloseHeirsNotificationModal,
                    onCloseGuarantorDetailsModal,
                    onCloseStayOfExecutionModal,
                    onClosePartyDeathModal,
                    onClosePauseModal,
                    onClosePaymentCalculator,
                    onCloseSettlementCalculator,
                    onCloseLedgerModal,
                    onCloseUnifiedSummonsModal,
                    onCloseTransferFileNumberChangeModal,
                    onCloseLinkedDossierTimeline,
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'close documents' }));
        fireEvent.click(screen.getByRole('button', { name: 'close real estate seizure' }));
        fireEvent.click(screen.getByRole('button', { name: 'close decisions' }));
        fireEvent.click(screen.getByRole('button', { name: 'close timeline' }));
        fireEvent.click(screen.getByRole('button', { name: 'close seized assets' }));
        fireEvent.click(screen.getByRole('button', { name: 'close payment' }));
        fireEvent.click(screen.getByRole('button', { name: 'close notification' }));
        fireEvent.click(screen.getByRole('button', { name: 'close coercive' }));
        fireEvent.click(screen.getByRole('button', { name: 'close heirs notification' }));
        fireEvent.click(screen.getByRole('button', { name: 'close guarantor details' }));
        fireEvent.click(screen.getByRole('button', { name: 'close stay of execution' }));
        fireEvent.click(screen.getByRole('button', { name: 'close party death' }));
        fireEvent.click(screen.getByRole('button', { name: 'close pause' }));
        fireEvent.click(screen.getByRole('button', { name: 'close unified summons' }));
        fireEvent.click(screen.getByRole('button', { name: 'close payment calculator' }));
        fireEvent.click(screen.getByRole('button', { name: 'close settlement calculator' }));
        fireEvent.click(screen.getByRole('button', { name: 'close ledger' }));
        fireEvent.click(screen.getByRole('button', { name: 'close transfer file number' }));
        fireEvent.click(screen.getByRole('button', { name: 'close linked dossier timeline' }));

        expect(onCloseDocumentsModal).toHaveBeenCalledTimes(1);
        expect(onCloseRealEstateSeizureModal).toHaveBeenCalledTimes(1);
        expect(onCloseDecisionsModal).toHaveBeenCalledTimes(1);
        expect(onCloseTimelineModal).toHaveBeenCalledTimes(1);
        expect(onCloseSeizedAssetsModal).toHaveBeenCalledTimes(1);
        expect(onClosePaymentModal).toHaveBeenCalledTimes(1);
        expect(onCloseNotificationModal).toHaveBeenCalledTimes(1);
        expect(onCloseCoerciveModal).toHaveBeenCalledTimes(1);
        expect(onCloseHeirsNotificationModal).toHaveBeenCalledTimes(1);
        expect(onCloseGuarantorDetailsModal).toHaveBeenCalledTimes(1);
        expect(onCloseStayOfExecutionModal).toHaveBeenCalledTimes(1);
        expect(onClosePartyDeathModal).toHaveBeenCalledTimes(1);
        expect(onClosePauseModal).toHaveBeenCalledTimes(1);
        expect(onCloseUnifiedSummonsModal).toHaveBeenCalledTimes(1);
        expect(onClosePaymentCalculator).toHaveBeenCalledTimes(1);
        expect(onCloseSettlementCalculator).toHaveBeenCalledTimes(1);
        expect(onCloseLedgerModal).toHaveBeenCalledTimes(1);
        expect(onCloseTransferFileNumberChangeModal).toHaveBeenCalledTimes(1);
        expect(onCloseLinkedDossierTimeline).toHaveBeenCalledTimes(1);
    });
});
