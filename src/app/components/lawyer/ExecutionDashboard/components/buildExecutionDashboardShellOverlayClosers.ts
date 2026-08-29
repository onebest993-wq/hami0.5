type OverlaySetters = Record<string, unknown>;

export function buildExecutionDashboardShellOverlayClosers(
    props: OverlaySetters,
    setShowEvictionExpenseModal: ((open: boolean) => void) | null,
) {
    const fn = (key: string) => props[key] as ((...args: never[]) => void) | undefined;

    return {
        closeDocumentsModal: () => fn('setShowDocumentsModal')?.(false as never),
        closeNotesModal: () => fn('setShowNotesModal')?.(false as never),
        closeAppointmentModal: () => fn('setShowAppointmentModal')?.(false as never),
        closeDecisionsModal: () => fn('setShowDecisionsModal')?.(false as never),
        closeTimelineModal: () => fn('setShowTimelineModal')?.(false as never),
        closeRealEstateSeizureModal: () => {
            fn('setShowRealEstateSeizureModal')?.(false as never);
            fn('setRealEstateSeizureModalDecisionId')?.(null as never);
        },
        closeSeizedAssetsModal: () => fn('setShowSeizedAssetsModal')?.(false as never),
        closePaymentModal: () => fn('setShowPaymentModal')?.(false as never),
        closeNotificationModal: () => fn('setShowNotificationModal')?.(false as never),
        closeCoerciveModal: () => fn('setShowCoerciveModal')?.(false as never),
        closeHeirsNotificationModal: () => fn('setShowHeirsNotificationModal')?.(false as never),
        closeGuarantorDetailsModal: () => {
            fn('setShowGuarantorDetailsModal')?.(false as never);
            fn('setGuarantorDetailsDecisionId')?.(null as never);
        },
        closeStayOfExecutionModal: () => fn('setShowStayOfExecutionModal')?.(false as never),
        closePartyDeathModal: () => {
            fn('setPartyDeathModalParty')?.(null as never);
            fn('setPartyDeathModalDecisionId')?.(null as never);
        },
        closePauseModal: () => fn('setShowPauseModal')?.(false as never),
        closePaymentCalculator: () => fn('setShowPaymentCalculator')?.(false as never),
        closeSettlementCalculator: () => fn('setShowSettlementCalculator')?.(false as never),
        closeLedgerModal: () => fn('setShowLedgerModal')?.(false as never),
        closeUnifiedSummonsModal: () => {
            fn('setSummonsHubInitialMainTab')?.(null as never);
            fn('setSummonsContextDebtorKey')?.(null as never);
            fn('setShowUnifiedSummonsModal')?.(false as never);
        },
        closeSolidaryCoerciveTargetModal: () => {
            fn('setShowSolidaryCoerciveTargetModal')?.(false as never);
            fn('setSolidaryCoerciveActionPending')?.(null as never);
        },
        closeEvictionExpenseModal: () => setShowEvictionExpenseModal?.(false),
        closeEvictionLawyerFeeModal: () => fn('setShowEvictionLawyerFeeModal')?.(false as never),
        closeEvictionResidentialGraceModal: () =>
            fn('setShowEvictionResidentialGraceModal')?.(false as never),
        closeAlimonyBeneficiaryDeathModal: () => {
            fn('setAlimonyBeneficiaryDeathModalOpen')?.(false as never);
            fn('setAlimonyBeneficiaryDeathModalProfile')?.(null as never);
        },
        closeTransferFileNumberChangeModal: () =>
            fn('setShowTransferFileNumberChangeModal')?.(false as never),
        closeLinkedDossierTimeline: () => {
            fn('setShowLinkedDossierTimeline')?.(false as never);
            fn('setLinkedDossierToView')?.(null as never);
        },
        closeExecutionTrashModal: () => fn('setShowExecutionTrashModal')?.(false as never),
        closeTimelineEditModal: () => fn('setTimelineEditDraft')?.(null as never),
        closeEditDossierMetaModal: () => fn('setShowEditDossierMetaModal')?.(false as never),
        closeEditPartyModal: () => {
            fn('setEditPartyTarget')?.(null as never);
            fn('setPartyEditDraft')?.(null as never);
        },
        closeHeirsQuickViewModal: () => fn('setHeirsQuickView')?.(null as never),
        closePermanentDeleteTimelineConfirm: () =>
            fn('setPermanentDeleteTimelineId')?.(null as never),
    };
}
