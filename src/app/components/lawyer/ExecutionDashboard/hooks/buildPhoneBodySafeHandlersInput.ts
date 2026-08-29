import type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';

export function buildPhoneBodySafeHandlersInput(
    scope: Record<string, unknown> & {
        scopeRef: PhoneBodySafeHandlersInput['scopeRef'];
        debtorsSectionRef: PhoneBodySafeHandlersInput['debtorsSectionRef'];
        showToast: PhoneBodySafeHandlersInput['showToast'];
    },
    local: {
        createModalSetterFallback: PhoneBodySafeHandlersInput['createModalSetterFallback'];
        safeSetShowAppointmentModal: PhoneBodySafeHandlersInput['safeSetShowAppointmentModal'];
        safeSetShowNotesModal: PhoneBodySafeHandlersInput['safeSetShowNotesModal'];
        safeSetShowDocumentsModal: PhoneBodySafeHandlersInput['safeSetShowDocumentsModal'];
        timelineAccordionExpandedFallback: PhoneBodySafeHandlersInput['timelineAccordionExpandedFallback'];
        setTimelineAccordionExpandedFallback: PhoneBodySafeHandlersInput['setTimelineAccordionExpandedFallback'];
    },
): PhoneBodySafeHandlersInput {
    return {
        scopeRef: scope.scopeRef,
        debtorsSectionRef: scope.debtorsSectionRef,
        handleDebtorEmploymentToggle: scope.handleDebtorEmploymentToggle as PhoneBodySafeHandlersInput['handleDebtorEmploymentToggle'],
        handleMemoFollowupClick: scope.handleMemoFollowupClick as PhoneBodySafeHandlersInput['handleMemoFollowupClick'],
        openDecisionsModalWithBoot: scope.openDecisionsModalWithBoot as PhoneBodySafeHandlersInput['openDecisionsModalWithBoot'],
        openFinancialHubLedger: scope.openFinancialHubLedger as PhoneBodySafeHandlersInput['openFinancialHubLedger'],
        openGuarantorDetailsModal: scope.openGuarantorDetailsModal as PhoneBodySafeHandlersInput['openGuarantorDetailsModal'],
        primaryDebtorWorkspaceKey: scope.primaryDebtorWorkspaceKey as PhoneBodySafeHandlersInput['primaryDebtorWorkspaceKey'],
        setExecutionDebtorTabIndex: scope.setExecutionDebtorTabIndex as PhoneBodySafeHandlersInput['setExecutionDebtorTabIndex'],
        setFinancialHubAutoOpenMode: scope.setFinancialHubAutoOpenMode as PhoneBodySafeHandlersInput['setFinancialHubAutoOpenMode'],
        setFinancialHubSeizedMovableId: scope.setFinancialHubSeizedMovableId as PhoneBodySafeHandlersInput['setFinancialHubSeizedMovableId'],
        setFinancialHubSeizedPropertyId: scope.setFinancialHubSeizedPropertyId as PhoneBodySafeHandlersInput['setFinancialHubSeizedPropertyId'],
        setIsFinancialCenterExpanded: scope.setIsFinancialCenterExpanded as PhoneBodySafeHandlersInput['setIsFinancialCenterExpanded'],
        setShowAppointmentModal: scope.setShowAppointmentModal as PhoneBodySafeHandlersInput['setShowAppointmentModal'],
        _setShowDecisionsModal: scope.setShowDecisionsModal as PhoneBodySafeHandlersInput['_setShowDecisionsModal'],
        setShowEvictionExpenseModal: scope.setShowEvictionExpenseModal as PhoneBodySafeHandlersInput['setShowEvictionExpenseModal'],
        setShowExecutionFinancialHub: scope.setShowExecutionFinancialHub as PhoneBodySafeHandlersInput['setShowExecutionFinancialHub'],
        setShowLedgerModal: scope.setShowLedgerModal as PhoneBodySafeHandlersInput['setShowLedgerModal'],
        setShowNotesModal: scope.setShowNotesModal as PhoneBodySafeHandlersInput['setShowNotesModal'],
        setShowPaymentCalculator: scope.setShowPaymentCalculator as PhoneBodySafeHandlersInput['setShowPaymentCalculator'],
        setShowSettlementCalculator: scope.setShowSettlementCalculator as PhoneBodySafeHandlersInput['setShowSettlementCalculator'],
        setShowTimelineModal: scope.setShowTimelineModal as PhoneBodySafeHandlersInput['setShowTimelineModal'],
        setShowUnifiedExecutionModal: scope.setShowUnifiedExecutionModal as PhoneBodySafeHandlersInput['setShowUnifiedExecutionModal'],
        setShowUnifiedSummonsModal: scope.setShowUnifiedSummonsModal as PhoneBodySafeHandlersInput['setShowUnifiedSummonsModal'],
        setSummonsContextDebtorKey: scope.setSummonsContextDebtorKey as PhoneBodySafeHandlersInput['setSummonsContextDebtorKey'],
        setSummonsHubInitialMainTab: scope.setSummonsHubInitialMainTab as PhoneBodySafeHandlersInput['setSummonsHubInitialMainTab'],
        setTimelineAccordionExpanded: scope.setTimelineAccordionExpanded as PhoneBodySafeHandlersInput['setTimelineAccordionExpanded'],
        showToast: scope.showToast,
        timelineAccordionExpanded: scope.timelineAccordionExpanded as PhoneBodySafeHandlersInput['timelineAccordionExpanded'],
        createModalSetterFallback: local.createModalSetterFallback,
        safeSetShowAppointmentModal: local.safeSetShowAppointmentModal,
        safeSetShowNotesModal: local.safeSetShowNotesModal,
        safeSetShowDocumentsModal: local.safeSetShowDocumentsModal,
        timelineAccordionExpandedFallback: local.timelineAccordionExpandedFallback,
        setTimelineAccordionExpandedFallback: local.setTimelineAccordionExpandedFallback,
    };
}
