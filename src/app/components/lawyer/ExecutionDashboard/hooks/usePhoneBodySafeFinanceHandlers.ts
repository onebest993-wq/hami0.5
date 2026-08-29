import React from 'react';
import { flushSync } from 'react-dom';
import { prefetchExecutionFinanceOverlay } from '../executionDashboardOverlayPrefetch';
import type { PhoneBodySafeHandlersInput } from './useExecutionDashboardPhoneBodySafeHandlers.types';

export function usePhoneBodySafeFinanceHandlers(p: {
    readLatestPhoneBodyScope: () => Record<string, unknown>;
    showToast: PhoneBodySafeHandlersInput['showToast'];
    openFinancialHubLedger: PhoneBodySafeHandlersInput['openFinancialHubLedger'];
    setIsFinancialCenterExpanded: PhoneBodySafeHandlersInput['setIsFinancialCenterExpanded'];
    setShowExecutionFinancialHub: PhoneBodySafeHandlersInput['setShowExecutionFinancialHub'];
    setShowLedgerModal: PhoneBodySafeHandlersInput['setShowLedgerModal'];
    setShowUnifiedExecutionModal: PhoneBodySafeHandlersInput['setShowUnifiedExecutionModal'];
    setFinancialHubAutoOpenMode: PhoneBodySafeHandlersInput['setFinancialHubAutoOpenMode'];
    setFinancialHubSeizedMovableId: PhoneBodySafeHandlersInput['setFinancialHubSeizedMovableId'];
    setFinancialHubSeizedPropertyId: PhoneBodySafeHandlersInput['setFinancialHubSeizedPropertyId'];
    setExecutionDebtorTabIndex: PhoneBodySafeHandlersInput['setExecutionDebtorTabIndex'];
    openGuarantorDetailsModal: PhoneBodySafeHandlersInput['openGuarantorDetailsModal'];
    primaryDebtorWorkspaceKey: PhoneBodySafeHandlersInput['primaryDebtorWorkspaceKey'];
    debtorsSectionRef: PhoneBodySafeHandlersInput['debtorsSectionRef'];
}) {
    const directOpenFinancialCenter = React.useCallback(() => {
        prefetchExecutionFinanceOverlay({ force: true });

        const openHub = () => {
            const latest = p.readLatestPhoneBodyScope();
            const setHub =
                typeof p.setShowExecutionFinancialHub === 'function'
                    ? p.setShowExecutionFinancialHub
                    : typeof latest.setShowExecutionFinancialHub === 'function'
                      ? (latest.setShowExecutionFinancialHub as (v: boolean) => void)
                      : null;
            const setExpanded =
                typeof p.setIsFinancialCenterExpanded === 'function'
                    ? p.setIsFinancialCenterExpanded
                    : typeof latest.setIsFinancialCenterExpanded === 'function'
                      ? (latest.setIsFinancialCenterExpanded as (v: boolean) => void)
                      : null;
            const setUnified =
                typeof p.setShowUnifiedExecutionModal === 'function'
                    ? p.setShowUnifiedExecutionModal
                    : typeof latest.setShowUnifiedExecutionModal === 'function'
                      ? (latest.setShowUnifiedExecutionModal as (v: boolean) => void)
                      : null;
            const openLedger =
                typeof p.openFinancialHubLedger === 'function'
                    ? p.openFinancialHubLedger
                    : typeof latest.openFinancialHubLedger === 'function'
                      ? (latest.openFinancialHubLedger as () => void)
                      : null;

            if (setUnified) setUnified(false);
            if (setExpanded) setExpanded(true);
            if (openLedger) {
                openLedger();
                return true;
            }
            if (setHub) {
                setHub(true);
                return true;
            }
            return false;
        };

        let opened = false;
        flushSync(() => {
            opened = openHub();
        });
        if (!opened) {
            if (typeof p.setShowLedgerModal === 'function') {
                p.setShowLedgerModal(true);
            } else {
                p.showToast('تعذر فتح المركز المالي حالياً.', 'error');
            }
        }

        void import('../executionDashboardLazyRegistryOverlays')
            .then((m) => {
                const hubReady =
                    typeof m.LazyExecutionFinancialHubPortal.isPreloaded === 'function' &&
                    m.LazyExecutionFinancialHubPortal.isPreloaded();
                const focReady =
                    typeof m.LazyFinancialOperationsCenter.isPreloaded === 'function' &&
                    m.LazyFinancialOperationsCenter.isPreloaded();
                if (!hubReady || !focReady) {
                    return Promise.all([
                        m.LazyExecutionFinancialHubPortal.preload(),
                        m.LazyFinancialOperationsCenter.preload(),
                    ]);
                }
                return undefined;
            })
            .catch(() => undefined);
    }, [
        p.openFinancialHubLedger,
        p.readLatestPhoneBodyScope,
        p.setIsFinancialCenterExpanded,
        p.setShowExecutionFinancialHub,
        p.setShowLedgerModal,
        p.setShowUnifiedExecutionModal,
        p.showToast,
    ]);
    const closeFinancialHubPortal = React.useCallback(() => {
        if (typeof p.setFinancialHubAutoOpenMode === 'function') {
            p.setFinancialHubAutoOpenMode(null);
        }
        if (typeof p.setFinancialHubSeizedMovableId === 'function') {
            p.setFinancialHubSeizedMovableId(null);
        }
        if (typeof p.setFinancialHubSeizedPropertyId === 'function') {
            p.setFinancialHubSeizedPropertyId(null);
        }
        if (typeof p.setShowExecutionFinancialHub === 'function') {
            p.setShowExecutionFinancialHub(false);
        }
    }, [
        p.setFinancialHubAutoOpenMode,
        p.setFinancialHubSeizedMovableId,
        p.setFinancialHubSeizedPropertyId,
        p.setShowExecutionFinancialHub,
    ]);
    const toggleFinancialCenterExpanded = React.useCallback(() => {
        if (typeof p.setIsFinancialCenterExpanded === 'function') {
            p.setIsFinancialCenterExpanded((prev: boolean) => !prev);
            return;
        }
        p.showToast('تعذر فتح المركز المالي لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [p.setIsFinancialCenterExpanded, p.showToast]);
    const openGuarantorFollowupDetails = React.useCallback(() => {
        if (
            typeof p.setExecutionDebtorTabIndex !== 'function' ||
            typeof p.openGuarantorDetailsModal !== 'function'
        ) {
            p.showToast('تعذر فتح بيانات الكفيل لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
            return;
        }
        if (typeof p.setShowUnifiedExecutionModal === 'function') {
            p.setShowUnifiedExecutionModal(false);
        }
        p.setExecutionDebtorTabIndex(0);
        if (p.primaryDebtorWorkspaceKey) {
            p.debtorsSectionRef.current?.expandDebtor?.(p.primaryDebtorWorkspaceKey);
        }
        p.openGuarantorDetailsModal();
    }, [
        p.openGuarantorDetailsModal,
        p.primaryDebtorWorkspaceKey,
        p.setExecutionDebtorTabIndex,
        p.setShowUnifiedExecutionModal,
        p.showToast,
        p.debtorsSectionRef,
    ]);

    return {
        directOpenFinancialCenter,
        closeFinancialHubPortal,
        toggleFinancialCenterExpanded,
        openGuarantorFollowupDetails,
    };
}
