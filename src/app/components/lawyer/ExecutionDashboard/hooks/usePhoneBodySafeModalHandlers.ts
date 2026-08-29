import React from 'react';
import { flushSync } from 'react-dom';
import {
    openPhoneBodyModalWithBridge,
} from '../components/executionDashboardPhoneBodyBridges';
import {
    prefetchExecutionDocumentsOverlay,
    prefetchExecutionNotesOverlay,
} from '../executionDashboardOverlayPrefetch';
import type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';

export function usePhoneBodySafeModalHandlers(p: {
    readLatestPhoneBodyScope: () => Record<string, unknown>;
    schedulePhoneBodyScopeBridge: (task: () => void) => void;
    showToast: PhoneBodySafeHandlersInput['showToast'];
    createModalSetterFallback: PhoneBodySafeHandlersInput['createModalSetterFallback'];
    safeSetShowAppointmentModal: PhoneBodySafeHandlersInput['safeSetShowAppointmentModal'];
    safeSetShowNotesModal: PhoneBodySafeHandlersInput['safeSetShowNotesModal'];
    safeSetShowDocumentsModal: PhoneBodySafeHandlersInput['safeSetShowDocumentsModal'];
    setShowTimelineModal: PhoneBodySafeHandlersInput['setShowTimelineModal'];
    setShowLedgerModal: PhoneBodySafeHandlersInput['setShowLedgerModal'];
    setShowEvictionExpenseModal: PhoneBodySafeHandlersInput['setShowEvictionExpenseModal'];
    setShowPaymentCalculator: PhoneBodySafeHandlersInput['setShowPaymentCalculator'];
    setShowSettlementCalculator: PhoneBodySafeHandlersInput['setShowSettlementCalculator'];
    setShowUnifiedSummonsModal: PhoneBodySafeHandlersInput['setShowUnifiedSummonsModal'];
    setSummonsContextDebtorKey: PhoneBodySafeHandlersInput['setSummonsContextDebtorKey'];
    setSummonsHubInitialMainTab: PhoneBodySafeHandlersInput['setSummonsHubInitialMainTab'];
}) {
    const safeOpenAppointmentModal = React.useCallback(() => {
        prefetchExecutionNotesOverlay();
        openPhoneBodyModalWithBridge({
            readLatestScope: p.readLatestPhoneBodyScope,
            scheduleBridge: p.schedulePhoneBodyScopeBridge,
            commitBridge: (task) => flushSync(task),
            modalFlagKey: 'showAppointmentModal',
            modalSetterKey: 'setShowAppointmentModal',
            fallbackSetter: p.createModalSetterFallback('showAppointmentModal'),
            directSetter: p.safeSetShowAppointmentModal,
        });
    }, [
        p.createModalSetterFallback,
        p.readLatestPhoneBodyScope,
        p.safeSetShowAppointmentModal,
        p.schedulePhoneBodyScopeBridge,
    ]);
    const directOpenNotesModal = React.useCallback(() => {
        prefetchExecutionNotesOverlay();
        openPhoneBodyModalWithBridge({
            readLatestScope: p.readLatestPhoneBodyScope,
            scheduleBridge: p.schedulePhoneBodyScopeBridge,
            commitBridge: (task) => flushSync(task),
            modalFlagKey: 'showNotesModal',
            modalSetterKey: 'setShowNotesModal',
            fallbackSetter: p.createModalSetterFallback('showNotesModal'),
            directSetter: p.safeSetShowNotesModal,
        });
    }, [
        p.createModalSetterFallback,
        p.readLatestPhoneBodyScope,
        p.safeSetShowNotesModal,
        p.schedulePhoneBodyScopeBridge,
    ]);
    const directOpenDocumentsModal = React.useCallback(() => {
        prefetchExecutionDocumentsOverlay();
        p.safeSetShowDocumentsModal(true);
    }, [p.safeSetShowDocumentsModal]);
    const directOpenTimelineModal = React.useCallback(() => {
        if (typeof p.setShowTimelineModal === 'function') {
            p.setShowTimelineModal(true);
            return;
        }
        p.showToast('تعذر فتح السجل الكامل لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setShowTimelineModal, p.showToast]);
    const directOpenLedgerModal = React.useCallback(() => {
        if (typeof p.setShowLedgerModal === 'function') {
            p.setShowLedgerModal(true);
            return;
        }
        p.showToast('تعذر فتح دفتر الأستاذ لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setShowLedgerModal, p.showToast]);
    const directOpenEvictionExpenseModal = React.useCallback(() => {
        if (typeof p.setShowEvictionExpenseModal === 'function') {
            p.setShowEvictionExpenseModal(true);
            return;
        }
        p.showToast('تعذر فتح مصاريف الإخلاء لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setShowEvictionExpenseModal, p.showToast]);
    const directOpenPaymentCalculator = React.useCallback(() => {
        if (typeof p.setShowPaymentCalculator === 'function') {
            p.setShowPaymentCalculator(true);
            return;
        }
        p.showToast('تعذر فتح حاسبة الدفع لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setShowPaymentCalculator, p.showToast]);
    const directOpenSettlementCalculator = React.useCallback(() => {
        if (typeof p.setShowSettlementCalculator === 'function') {
            p.setShowSettlementCalculator(true);
            return;
        }
        p.showToast('تعذر فتح حاسبة التسوية لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setShowSettlementCalculator, p.showToast]);
    const directOpenUnifiedSummonsHub = React.useCallback(
        (
            options: {
                debtorKey?: string | null;
                initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
            } = {},
        ) => {
            if (
                typeof p.setSummonsContextDebtorKey === 'function' &&
                typeof p.setSummonsHubInitialMainTab === 'function' &&
                typeof p.setShowUnifiedSummonsModal === 'function'
            ) {
                p.setSummonsContextDebtorKey(options.debtorKey ?? null);
                p.setSummonsHubInitialMainTab(options.initialMainTab ?? null);
                p.setShowUnifiedSummonsModal(true);
                return;
            }
            p.showToast('تعذر فتح مركز التبليغات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        },
        [
            p.setShowUnifiedSummonsModal,
            p.setSummonsContextDebtorKey,
            p.setSummonsHubInitialMainTab,
            p.showToast,
        ],
    );

    return {
        safeOpenAppointmentModal,
        directOpenNotesModal,
        directOpenDocumentsModal,
        directOpenTimelineModal,
        directOpenLedgerModal,
        directOpenEvictionExpenseModal,
        directOpenPaymentCalculator,
        directOpenSettlementCalculator,
        directOpenUnifiedSummonsHub,
    };
}
