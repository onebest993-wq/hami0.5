/** Phone-body bridge / safe modal + edit handlers */
import React from 'react';
import { flushSync } from 'react-dom';
import { readExecutionPhoneBodyScope } from './executionPhoneBodyScope';
import {
    bridgeOpenEditDossierMeta,
    bridgeOpenEditParty,
    bridgeOpenParentDossierMetaEdit,
    buildFallbackDossierMetaDraftFromScope,
    openPhoneBodyModalWithBridge,
} from '../components/executionDashboardPhoneBodyBridges';
import {
    prefetchExecutionDocumentsOverlay,
    prefetchExecutionFinanceOverlay,
    prefetchExecutionNotesOverlay,
} from '../executionDashboardOverlayPrefetch';
import { runDebtorEmploymentToggle } from './executionDashboardCore/executionDashboardDebtorEmploymentToggle';
import {
    LazyExecutionFinancialHubPortal,
    LazyFinancialOperationsCenter,
} from '../executionDashboardLazyRegistry';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';

export function useExecutionDashboardPhoneBodySafeHandlers(
    input: Record<string, any>,
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
        setShowAppointmentModal,
        setShowDecisionsModal: _setShowDecisionsModal,
        setShowEvictionExpenseModal,
        setShowExecutionFinancialHub,
        setShowLedgerModal,
        setShowNotesModal,
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
    } = input;

    const readLatestPhoneBodyScope = React.useCallback(
        () => readExecutionPhoneBodyScope(scopeRef) as Record<string, any>,
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
    const safeOpenEditDossierMeta = React.useCallback(() => {
        if (
            bridgeOpenEditDossierMeta({
                readLatestScope: readLatestPhoneBodyScope,
                scheduleBridge: schedulePhoneBodyScopeBridge,
                buildFallbackDraft: buildFallbackDossierMetaDraftFromScope,
            })
        ) {
            return;
        }
        showToast('تعذر فتح تعديل بيانات الإضبارة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [
        readLatestPhoneBodyScope,
        schedulePhoneBodyScopeBridge,
        showToast,
    ]);
    const safeOpenParentDossierMetaEdit = React.useCallback(() => {
        if (
            bridgeOpenParentDossierMetaEdit({
                readLatestScope: readLatestPhoneBodyScope,
                scheduleBridge: schedulePhoneBodyScopeBridge,
            })
        ) {
            return;
        }
        showToast('تعذر فتح تعديل بيانات الحاوية الأبوية لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [readLatestPhoneBodyScope, schedulePhoneBodyScopeBridge, showToast]);
    const safeOpenEditParty = React.useCallback(
        (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: unknown },
        ) => {
            if (
                bridgeOpenEditParty({
                    kind,
                    index,
                    opts,
                    readLatestScope: readLatestPhoneBodyScope,
                    scheduleBridge: schedulePhoneBodyScopeBridge,
                })
            ) {
                return;
            }
            showToast(
                kind === 'debtor'
                    ? 'تعذر فتح تعديل بيانات المدين لأن الربط الحقيقي لم يصل إلى الواجهة بعد.'
                    : 'تعذر فتح تعديل بيانات الدائن لأن الربط الحقيقي لم يصل إلى الواجهة بعد.',
                'error',
            );
        },
        [readLatestPhoneBodyScope, schedulePhoneBodyScopeBridge, showToast],
    );
    const safeHandleDebtorEmploymentToggle = React.useCallback(
        (payload: { debtorKey: string; isPrimary: boolean }) => {
            const latest = readLatestPhoneBodyScope();
            const fromScope = latest?.handleDebtorEmploymentToggle;
            const candidates = [fromScope, handleDebtorEmploymentToggle];
            for (const candidate of candidates) {
                if (typeof candidate !== 'function') continue;
                if (isExecutionHandlerStubLeaf(candidate)) continue;
                candidate(payload);
                return;
            }
            runDebtorEmploymentToggle({
                base: (latest?.executionData ?? latest?.viewExecutionData) as
                    | import('@/app/types/execution').ExecutionFile
                    | null
                    | undefined,
                debtorWorkspaceEntries: Array.isArray(latest?.debtorWorkspaceEntries)
                    ? latest.debtorWorkspaceEntries
                    : [],
                ctx: payload,
                nextTimelineId:
                    typeof latest?.nextTimelineId === 'function'
                        ? latest.nextTimelineId
                        : () => `timeline-${Date.now()}`,
                persistExecutionMerge:
                    typeof latest?.persistExecutionMerge === 'function'
                        ? latest.persistExecutionMerge
                        : () => false,
                showToast,
                setTimelineEvents:
                    typeof latest?.setTimelineEvents === 'function'
                        ? latest.setTimelineEvents
                        : undefined,
            });
        },
        [handleDebtorEmploymentToggle, readLatestPhoneBodyScope, showToast],
    );
    const directHandleMemoFollowupClick = React.useCallback(() => {
        const latest = readLatestPhoneBodyScope();
        const fromScope = latest?.handleMemoFollowupClick;
        const openPersisted = latest?.openFollowupModalPersisted;
        const candidates = [fromScope, handleMemoFollowupClick, openPersisted];
        for (const candidate of candidates) {
            if (typeof candidate !== 'function') continue;
            if (isExecutionHandlerStubLeaf(candidate)) continue;
            candidate();
            return;
        }
        try {
            useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
        } catch {
            showToast('تعذر فتح محضر المتابعة لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        }
    }, [handleMemoFollowupClick, readLatestPhoneBodyScope, showToast]);
    const directOpenDecisionsModalWithBoot = React.useCallback(
        (opts: { tab: string }) => {
            if (typeof openDecisionsModalWithBoot === 'function') {
                openDecisionsModalWithBoot(opts);
                return;
            }
            if (typeof _setShowDecisionsModal === 'function') {
                flushSync(() => {
                    _setShowDecisionsModal(true);
                });
                return;
            }
            showToast('تعذر فتح القرارات والطعون حالياً.', 'error');
        },
        [_setShowDecisionsModal, openDecisionsModalWithBoot, showToast],
    );
    const safeOpenAppointmentModal = React.useCallback(() => {
        prefetchExecutionNotesOverlay();
        openPhoneBodyModalWithBridge({
            readLatestScope: readLatestPhoneBodyScope,
            scheduleBridge: schedulePhoneBodyScopeBridge,
            commitBridge: (task) => flushSync(task),
            modalFlagKey: 'showAppointmentModal',
            modalSetterKey: 'setShowAppointmentModal',
            fallbackSetter: createModalSetterFallback('showAppointmentModal'),
            directSetter: safeSetShowAppointmentModal,
        });
    }, [
        createModalSetterFallback,
        readLatestPhoneBodyScope,
        safeSetShowAppointmentModal,
        schedulePhoneBodyScopeBridge,
    ]);
    const directOpenNotesModal = React.useCallback(() => {
        prefetchExecutionNotesOverlay();
        openPhoneBodyModalWithBridge({
            readLatestScope: readLatestPhoneBodyScope,
            scheduleBridge: schedulePhoneBodyScopeBridge,
            commitBridge: (task) => flushSync(task),
            modalFlagKey: 'showNotesModal',
            modalSetterKey: 'setShowNotesModal',
            fallbackSetter: createModalSetterFallback('showNotesModal'),
            directSetter: safeSetShowNotesModal,
        });
    }, [
        createModalSetterFallback,
        readLatestPhoneBodyScope,
        safeSetShowNotesModal,
        schedulePhoneBodyScopeBridge,
    ]);
    const directOpenDocumentsModal = React.useCallback(() => {
        prefetchExecutionDocumentsOverlay();
        safeSetShowDocumentsModal(true);
    }, [safeSetShowDocumentsModal]);
    const directOpenTimelineModal = React.useCallback(() => {
        if (typeof setShowTimelineModal === 'function') {
            setShowTimelineModal(true);
            return;
        }
        showToast('تعذر فتح السجل الكامل لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setShowTimelineModal, showToast]);
    const directOpenLedgerModal = React.useCallback(() => {
        if (typeof setShowLedgerModal === 'function') {
            setShowLedgerModal(true);
            return;
        }
        showToast('تعذر فتح دفتر الأستاذ لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setShowLedgerModal, showToast]);
    const directOpenEvictionExpenseModal = React.useCallback(() => {
        if (typeof setShowEvictionExpenseModal === 'function') {
            setShowEvictionExpenseModal(true);
            return;
        }
        showToast('تعذر فتح مصاريف الإخلاء لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setShowEvictionExpenseModal, showToast]);
    const directOpenPaymentCalculator = React.useCallback(() => {
        if (typeof setShowPaymentCalculator === 'function') {
            setShowPaymentCalculator(true);
            return;
        }
        showToast('تعذر فتح حاسبة الدفع لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setShowPaymentCalculator, showToast]);
    const directOpenSettlementCalculator = React.useCallback(() => {
        if (typeof setShowSettlementCalculator === 'function') {
            setShowSettlementCalculator(true);
            return;
        }
        showToast('تعذر فتح حاسبة التسوية لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setShowSettlementCalculator, showToast]);
    const directOpenUnifiedSummonsHub = React.useCallback(
        (
            options: {
                debtorKey?: string | null;
                initialMainTab?: 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;
            } = {},
        ) => {
            if (
                typeof setSummonsContextDebtorKey === 'function' &&
                typeof setSummonsHubInitialMainTab === 'function' &&
                typeof setShowUnifiedSummonsModal === 'function'
            ) {
                setSummonsContextDebtorKey(options.debtorKey ?? null);
                setSummonsHubInitialMainTab(options.initialMainTab ?? null);
                setShowUnifiedSummonsModal(true);
                return;
            }
            showToast('تعذر فتح مركز التبليغات لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
        },
        [
            setShowUnifiedSummonsModal,
            setSummonsContextDebtorKey,
            setSummonsHubInitialMainTab,
            showToast,
        ],
    );
    const directOpenFinancialCenter = React.useCallback(() => {
        prefetchExecutionFinanceOverlay({ force: true });

        const openHub = () => {
            const latest = readLatestPhoneBodyScope();
            const setHub =
                typeof setShowExecutionFinancialHub === 'function'
                    ? setShowExecutionFinancialHub
                    : typeof latest.setShowExecutionFinancialHub === 'function'
                      ? (latest.setShowExecutionFinancialHub as (v: boolean) => void)
                      : null;
            const setExpanded =
                typeof setIsFinancialCenterExpanded === 'function'
                    ? setIsFinancialCenterExpanded
                    : typeof latest.setIsFinancialCenterExpanded === 'function'
                      ? (latest.setIsFinancialCenterExpanded as (v: boolean) => void)
                      : null;
            const setUnified =
                typeof setShowUnifiedExecutionModal === 'function'
                    ? setShowUnifiedExecutionModal
                    : typeof latest.setShowUnifiedExecutionModal === 'function'
                      ? (latest.setShowUnifiedExecutionModal as (v: boolean) => void)
                      : null;
            const openLedger =
                typeof openFinancialHubLedger === 'function'
                    ? openFinancialHubLedger
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

        // فتح فوري — لا حجب النقرة بانتظار preload (FocInstantShell يملأ الفجوة إن لزم)
        let opened = false;
        flushSync(() => {
            opened = openHub();
        });
        if (!opened) {
            if (typeof setShowLedgerModal === 'function') {
                setShowLedgerModal(true);
            } else {
                showToast('تعذر فتح المركز المالي حالياً.', 'error');
            }
        }

        const hubReady =
            typeof LazyExecutionFinancialHubPortal.isPreloaded === 'function' &&
            LazyExecutionFinancialHubPortal.isPreloaded();
        const focReady =
            typeof LazyFinancialOperationsCenter.isPreloaded === 'function' &&
            LazyFinancialOperationsCenter.isPreloaded();
        if (!hubReady || !focReady) {
            void Promise.all([
                LazyExecutionFinancialHubPortal.preload(),
                LazyFinancialOperationsCenter.preload(),
            ]).catch(() => undefined);
        }
    }, [
        openFinancialHubLedger,
        readLatestPhoneBodyScope,
        setIsFinancialCenterExpanded,
        setShowExecutionFinancialHub,
        setShowLedgerModal,
        setShowUnifiedExecutionModal,
        showToast,
    ]);
    const closeFinancialHubPortal = React.useCallback(() => {
        if (typeof setFinancialHubAutoOpenMode === 'function') {
            setFinancialHubAutoOpenMode(null);
        }
        if (typeof setFinancialHubSeizedMovableId === 'function') {
            setFinancialHubSeizedMovableId(null);
        }
        if (typeof setFinancialHubSeizedPropertyId === 'function') {
            setFinancialHubSeizedPropertyId(null);
        }
        if (typeof setShowExecutionFinancialHub === 'function') {
            setShowExecutionFinancialHub(false);
        }
    }, [
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setShowExecutionFinancialHub,
    ]);
    const toggleFinancialCenterExpanded = React.useCallback(() => {
        if (typeof setIsFinancialCenterExpanded === 'function') {
            setIsFinancialCenterExpanded((prev: boolean) => !prev);
            return;
        }
        showToast('تعذر فتح المركز المالي لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
    }, [setIsFinancialCenterExpanded, showToast]);
    const openGuarantorFollowupDetails = React.useCallback(() => {
        if (
            typeof setExecutionDebtorTabIndex !== 'function' ||
            typeof openGuarantorDetailsModal !== 'function'
        ) {
            showToast('تعذر فتح بيانات الكفيل لأن الربط الحقيقي لم يصل إلى الواجهة بعد.', 'error');
            return;
        }
        if (typeof setShowUnifiedExecutionModal === 'function') {
            setShowUnifiedExecutionModal(false);
        }
        setExecutionDebtorTabIndex(0);
        if (primaryDebtorWorkspaceKey) {
            debtorsSectionRef.current?.expandDebtor(primaryDebtorWorkspaceKey);
        }
        openGuarantorDetailsModal();
    }, [
        openGuarantorDetailsModal,
        primaryDebtorWorkspaceKey,
        setExecutionDebtorTabIndex,
        setShowUnifiedExecutionModal,
        showToast,
    ]);
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
