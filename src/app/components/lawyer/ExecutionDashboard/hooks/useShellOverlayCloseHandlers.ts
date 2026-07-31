/** Stable-identity close handlers for ExecutionDashboardShellOverlays (propsRef pattern). */
import React from 'react';
import type { ExecutionShellOverlayPropKey } from './executionShellOverlayPropKeys';

type ShellOverlayProps = Record<ExecutionShellOverlayPropKey, unknown> & Record<string, unknown>;

export function useShellOverlayCloseHandlers(
    propsRef: React.MutableRefObject<ShellOverlayProps>,
    setShowEvictionExpenseModalRef: React.MutableRefObject<((open: boolean) => void) | null>,
) {
    /** إغلاقات ثابتة الهوية — [props] كان يُعيد إنشاء ~25 callback كل render */
    const closeDocumentsModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowDocumentsModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeNotesModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowNotesModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeAppointmentModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowAppointmentModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeDecisionsModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowDecisionsModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeTimelineModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowTimelineModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeRealEstateSeizureModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setShowRealEstateSeizureModal === 'function') {
            p.setShowRealEstateSeizureModal(false);
        }
        if (typeof p.setRealEstateSeizureModalDecisionId === 'function') {
            p.setRealEstateSeizureModalDecisionId(null);
        }
    }, []);
    const closeSeizedAssetsModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowSeizedAssetsModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closePaymentModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowPaymentModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeNotificationModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowNotificationModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeCoerciveModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowCoerciveModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeHeirsNotificationModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowHeirsNotificationModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeGuarantorDetailsModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setShowGuarantorDetailsModal === 'function') {
            p.setShowGuarantorDetailsModal(false);
        }
        if (typeof p.setGuarantorDetailsDecisionId === 'function') {
            p.setGuarantorDetailsDecisionId(null);
        }
    }, []);
    const closeStayOfExecutionModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowStayOfExecutionModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closePartyDeathModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setPartyDeathModalParty === 'function') {
            p.setPartyDeathModalParty(null);
        }
        if (typeof p.setPartyDeathModalDecisionId === 'function') {
            p.setPartyDeathModalDecisionId(null);
        }
    }, []);
    const closePauseModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowPauseModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closePaymentCalculator = React.useCallback(() => {
        const setShow = propsRef.current.setShowPaymentCalculator;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeSettlementCalculator = React.useCallback(() => {
        const setShow = propsRef.current.setShowSettlementCalculator;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeLedgerModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowLedgerModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeUnifiedSummonsModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setSummonsHubInitialMainTab === 'function') {
            p.setSummonsHubInitialMainTab(null);
        }
        if (typeof p.setSummonsContextDebtorKey === 'function') {
            p.setSummonsContextDebtorKey(null);
        }
        if (typeof p.setShowUnifiedSummonsModal === 'function') {
            p.setShowUnifiedSummonsModal(false);
        }
    }, []);
    const closeSolidaryCoerciveTargetModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setShowSolidaryCoerciveTargetModal === 'function') {
            p.setShowSolidaryCoerciveTargetModal(false);
        }
        if (typeof p.setSolidaryCoerciveActionPending === 'function') {
            p.setSolidaryCoerciveActionPending(null);
        }
    }, []);
    const closeEvictionExpenseModal = React.useCallback(() => {
        const setShow = setShowEvictionExpenseModalRef.current;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeEvictionLawyerFeeModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowEvictionLawyerFeeModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeEvictionResidentialGraceModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowEvictionResidentialGraceModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeAlimonyBeneficiaryDeathModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setAlimonyBeneficiaryDeathModalOpen === 'function') {
            p.setAlimonyBeneficiaryDeathModalOpen(false);
        }
        if (typeof p.setAlimonyBeneficiaryDeathModalProfile === 'function') {
            p.setAlimonyBeneficiaryDeathModalProfile(null);
        }
    }, []);
    const closeTransferFileNumberChangeModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowTransferFileNumberChangeModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeLinkedDossierTimeline = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setShowLinkedDossierTimeline === 'function') {
            p.setShowLinkedDossierTimeline(false);
        }
        if (typeof p.setLinkedDossierToView === 'function') {
            p.setLinkedDossierToView(null);
        }
    }, []);
    const closeExecutionTrashModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowExecutionTrashModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeTimelineEditModal = React.useCallback(() => {
        const setDraft = propsRef.current.setTimelineEditDraft;
        if (typeof setDraft === 'function') setDraft(null);
    }, []);
    const closeEditDossierMetaModal = React.useCallback(() => {
        const setShow = propsRef.current.setShowEditDossierMetaModal;
        if (typeof setShow === 'function') setShow(false);
    }, []);
    const closeEditPartyModal = React.useCallback(() => {
        const p = propsRef.current;
        if (typeof p.setEditPartyTarget === 'function') {
            p.setEditPartyTarget(null);
        }
        if (typeof p.setPartyEditDraft === 'function') {
            p.setPartyEditDraft(null);
        }
    }, []);
    const closeHeirsQuickViewModal = React.useCallback(() => {
        const setView = propsRef.current.setHeirsQuickView;
        if (typeof setView === 'function') setView(null);
    }, []);
    const closePermanentDeleteTimelineConfirm = React.useCallback(() => {
        const setId = propsRef.current.setPermanentDeleteTimelineId;
        if (typeof setId === 'function') setId(null);
    }, []);

    return {
        closeDocumentsModal,
        closeNotesModal,
        closeAppointmentModal,
        closeDecisionsModal,
        closeTimelineModal,
        closeRealEstateSeizureModal,
        closeSeizedAssetsModal,
        closePaymentModal,
        closeNotificationModal,
        closeCoerciveModal,
        closeHeirsNotificationModal,
        closeGuarantorDetailsModal,
        closeStayOfExecutionModal,
        closePartyDeathModal,
        closePauseModal,
        closePaymentCalculator,
        closeSettlementCalculator,
        closeLedgerModal,
        closeUnifiedSummonsModal,
        closeSolidaryCoerciveTargetModal,
        closeEvictionExpenseModal,
        closeEvictionLawyerFeeModal,
        closeEvictionResidentialGraceModal,
        closeAlimonyBeneficiaryDeathModal,
        closeTransferFileNumberChangeModal,
        closeLinkedDossierTimeline,
        closeExecutionTrashModal,
        closeTimelineEditModal,
        closeEditDossierMetaModal,
        closeEditPartyModal,
        closeHeirsQuickViewModal,
        closePermanentDeleteTimelineConfirm,
    };
}
