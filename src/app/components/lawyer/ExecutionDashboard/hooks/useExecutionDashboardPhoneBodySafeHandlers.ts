/** Phone-body bridge / safe modal + edit handlers */
import React from 'react';
import { readExecutionPhoneBodyScope } from './executionPhoneBodyScope';
import { usePhoneBodySafeOpeners } from './usePhoneBodySafeOpeners';
import { usePhoneBodySafeModalHandlers } from './usePhoneBodySafeModalHandlers';
import { usePhoneBodySafeFinanceHandlers } from './usePhoneBodySafeFinanceHandlers';
import { usePhoneBodySafeActionHandlers } from './usePhoneBodySafeActionHandlers';

import type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';
export type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';

export function useExecutionDashboardPhoneBodySafeHandlers(
    input: Record<string, unknown> | PhoneBodySafeHandlersInput,
) {
    const {
        scopeRef,
        debtorsSectionRef,
        handleDebtorEmploymentToggle,
        handleMemoFollowupClick,
        openDecisionsModalWithBoot,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        primaryDebtorWorkspaceKey,
        setExecutionDebtorTabIndex,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setIsFinancialCenterExpanded,
        setShowDecisionsModal,
        _setShowDecisionsModal: _setShowDecisionsModalFromInput,
        setShowEvictionExpenseModal,
        setShowExecutionFinancialHub,
        setShowLedgerModal,
        setShowPaymentCalculator,
        setShowSettlementCalculator,
        setShowTimelineModal,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setTimelineAccordionExpanded,
        showToast,
        timelineAccordionExpanded,
        createModalSetterFallback,
        safeSetShowAppointmentModal,
        safeSetShowNotesModal,
        safeSetShowDocumentsModal,
        timelineAccordionExpandedFallback,
        setTimelineAccordionExpandedFallback,
    } = input as PhoneBodySafeHandlersInput;

    const _setShowDecisionsModal = _setShowDecisionsModalFromInput ?? setShowDecisionsModal;

    const readLatestPhoneBodyScope = React.useCallback(
        () => readExecutionPhoneBodyScope(scopeRef) as Record<string, unknown>,
        [scopeRef],
    );
    const schedulePhoneBodyScopeBridge = React.useCallback((task: () => void) => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                task();
            });
            return;
        }
        window.setTimeout(task, 0);
    }, []);
    const { safeOpenEditDossierMeta, safeOpenParentDossierMetaEdit, safeOpenEditParty } =
        usePhoneBodySafeOpeners({
            readLatestPhoneBodyScope,
            schedulePhoneBodyScopeBridge,
            showToast,
        });
    const {
        safeHandleDebtorEmploymentToggle,
        directHandleMemoFollowupClick,
        directOpenDecisionsModalWithBoot,
    } = usePhoneBodySafeActionHandlers({
        readLatestPhoneBodyScope,
        showToast,
        handleDebtorEmploymentToggle,
        handleMemoFollowupClick,
        openDecisionsModalWithBoot,
        setShowDecisionsModal: _setShowDecisionsModal,
    });
    const {
        safeOpenAppointmentModal,
        directOpenNotesModal,
        directOpenDocumentsModal,
        directOpenTimelineModal,
        directOpenLedgerModal,
        directOpenEvictionExpenseModal,
        directOpenPaymentCalculator,
        directOpenSettlementCalculator,
        directOpenUnifiedSummonsHub,
    } = usePhoneBodySafeModalHandlers({
        readLatestPhoneBodyScope,
        schedulePhoneBodyScopeBridge,
        showToast,
        createModalSetterFallback,
        safeSetShowAppointmentModal,
        safeSetShowNotesModal,
        safeSetShowDocumentsModal,
        setShowTimelineModal,
        setShowLedgerModal,
        setShowEvictionExpenseModal,
        setShowPaymentCalculator,
        setShowSettlementCalculator,
        setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
    });
    const {
        directOpenFinancialCenter,
        closeFinancialHubPortal,
        toggleFinancialCenterExpanded,
        openGuarantorFollowupDetails,
    } = usePhoneBodySafeFinanceHandlers({
        readLatestPhoneBodyScope,
        showToast,
        openFinancialHubLedger,
        setIsFinancialCenterExpanded,
        setShowExecutionFinancialHub,
        setShowLedgerModal,
        setShowUnifiedExecutionModal,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setExecutionDebtorTabIndex,
        openGuarantorDetailsModal,
        primaryDebtorWorkspaceKey,
        debtorsSectionRef,
    });
    const safeTimelineAccordionExpanded =
        typeof timelineAccordionExpanded === 'boolean'
            ? timelineAccordionExpanded
            : timelineAccordionExpandedFallback;
    const safeSetTimelineAccordionExpanded =
        typeof setTimelineAccordionExpanded === 'function'
            ? setTimelineAccordionExpanded
            : setTimelineAccordionExpandedFallback;

    return {
        readLatestPhoneBodyScope,
        schedulePhoneBodyScopeBridge,
        safeOpenEditDossierMeta,
        safeOpenParentDossierMetaEdit,
        safeOpenEditParty,
        safeHandleDebtorEmploymentToggle,
        directHandleMemoFollowupClick,
        directOpenDecisionsModalWithBoot,
        safeOpenAppointmentModal,
        directOpenNotesModal,
        directOpenDocumentsModal,
        directOpenTimelineModal,
        directOpenLedgerModal,
        directOpenEvictionExpenseModal,
        directOpenPaymentCalculator,
        directOpenSettlementCalculator,
        directOpenUnifiedSummonsHub,
        directOpenFinancialCenter,
        closeFinancialHubPortal,
        toggleFinancialCenterExpanded,
        openGuarantorFollowupDetails,
        safeTimelineAccordionExpanded,
        safeSetTimelineAccordionExpanded,
    };
}
