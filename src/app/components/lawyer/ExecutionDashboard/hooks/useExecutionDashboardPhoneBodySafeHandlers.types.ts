import type { MutableRefObject } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type PhoneBodySafeHandlersInput = {
    scopeRef: { current: unknown };
    debtorsSectionRef: { current: { expandDebtor?: (key: string) => void } | null };
    handleDebtorEmploymentToggle?: (payload: { debtorKey: string; isPrimary: boolean }) => void;
    handleMemoFollowupClick?: () => void;
    openDecisionsModalWithBoot?: (opts: { tab: string }) => void;
    openFinancialHubLedger?: () => void;
    openGuarantorDetailsModal?: () => void;
    primaryDebtorWorkspaceKey?: string | null;
    setExecutionDebtorTabIndex?: (index: number) => void;
    setFinancialHubAutoOpenMode?: (mode: null | string) => void;
    setFinancialHubSeizedMovableId?: (id: string | null) => void;
    setFinancialHubSeizedPropertyId?: (id: string | null) => void;
    setIsFinancialCenterExpanded?: (value: boolean | ((prev: boolean) => boolean)) => void;
    setShowAppointmentModal?: (v: boolean) => void;
    setShowDecisionsModal?: (v: boolean) => void;
    _setShowDecisionsModal?: (v: boolean) => void;
    setShowEvictionExpenseModal?: (v: boolean) => void;
    setShowExecutionFinancialHub?: (v: boolean) => void;
    setShowLedgerModal?: (v: boolean) => void;
    setShowNotesModal?: (v: boolean) => void;
    setShowPaymentCalculator?: (v: boolean) => void;
    setShowSettlementCalculator?: (v: boolean) => void;
    setShowTimelineModal?: (v: boolean) => void;
    setShowUnifiedExecutionModal?: (v: boolean) => void;
    setShowUnifiedSummonsModal?: (v: boolean) => void;
    setSummonsContextDebtorKey?: (key: string | null) => void;
    setSummonsHubInitialMainTab?: (
        tab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null,
    ) => void;
    setTimelineAccordionExpanded?: (v: boolean) => void;
    showToast: (message: string, type?: string) => void;
    timelineAccordionExpanded?: boolean;
    createModalSetterFallback: (modalFlagKey: string) => ((v: boolean) => void) | undefined;
    safeSetShowAppointmentModal: (v: boolean) => void;
    safeSetShowNotesModal: (v: boolean) => void;
    safeSetShowDocumentsModal: (v: boolean) => void;
    timelineAccordionExpandedFallback: boolean;
    setTimelineAccordionExpandedFallback: (v: boolean) => void;
};
