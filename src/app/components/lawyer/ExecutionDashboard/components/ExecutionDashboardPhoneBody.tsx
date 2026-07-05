// @ts-nocheck
/** جسم واجهة ExecutionDashboard — chunk lazy منفصل */
import React, { Suspense, startTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, User, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Calendar, FileText, FolderOpen, Scale,
    Clock, AlertCircle, CheckCircle, Users, Bell,
    Activity, Trash2,
    Book, History, Phone, MapPin, Pencil, Bot,
    Wallet, CreditCard, Shield,
    XCircle, Pause, Play, Car, ClipboardList, Building2, Package, AlertTriangle,
    Forward, Shuffle, RefreshCw, MessageSquare,
} from 'lucide-react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { EXECUTION_DOSSIER_TEST_IDS } from '@/app/components/lawyer/ExecutionDashboard/executionDossierTestIds';
import { ExecutionToast } from './ExecutionToast';
import { GuarantorExternalHub } from './GuarantorExternalHub';
import { DossierSwitcher } from './DossierSwitcher';
import { InlineActionGate } from './InlineActionGate';
import { UnifiedSeizureLogHost } from './UnifiedSeizureLogHost';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
} from './ExecutionInlineAccordion';
import { ExecutionPartyInteractiveBadges } from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { dossierLifecycleLabelAr, heirsDetailsIncludeClient } from '../helpers';
import type { VisitationScheduleBundle } from '@/app/types/visitationSchedule';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import {
    LazyActionGridSection,
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDossierControlsTab,
    LazyDossierLifecyclePanel,
    LazyDossierMetaEditSection,
    LazyExecutionFinancialHubPortal,
    LazyFinancialOperationsCenter,
    LazyFinancialTab,
    LazyLawReferencePanel,
    LazyMaritalFurnitureModule,
    LazyOtherPartyTab,
    LazyPartiesSection,
    LazyPartyEditModal,
    LazyPermanentDeleteConfirmDialog,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
    LazyTimelineSection,
    LazyVisitationScheduleModule,
    LazyVisitationCalendarModal,
    LazyPersonalCoerciveFollowupPanel,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyJudicialCustodianCardMenu,
    LazyEvictionFieldProceduresPanel,
    LazyOtherPartyActionsLog,
    LazyExecutionTrashModal,
    LazyTimelineEditModal,
    LazyExecutionHeirsQuickViewModal,
    LazyExecutionTransferFileNumberModal,
    LazyDossierActionsModal,
    LazyLinkedDossierTimelineModal,
    LazySeizureRequestSubjectModal,
    LazyAlimonyBeneficiaryDeathModal,
    LazyExecutorApprovedDateTimeModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    LazyPoliceAssistanceDetailsModal,
    LazyStayOfExecutionModal,
    LazyPartyDeathReportModal,
    LazyRealEstateSeizurePostApprovalModal,
    LazyGuarantorDetailsPostApprovalModal,
    LazyPremiumTimelineAuditLog,
    LazySmartTimelineRadar,
    prefetchExecutionOverlayModals,
} from '../executionDashboardLazyRegistry';
import {
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
    EXEC_SECTION_LAZY_FALLBACK,
    formatUnifiedLedgerDate,
    PartyOverflowToggle,
} from '../executionDashboardLazyShellUi';
import { prefetchExecutionDossierActionsOverlay } from '../executionDashboardOverlayPrefetch';
import {
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from '../helpers';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';
import {
    readExecutionPhoneBodyScope,
    useExecutionPhoneBodyScopeRef,
} from '../hooks/executionPhoneBodyScope';
import { useExecutionDashboardPhoneBodyMountStages } from '../hooks/useExecutionDashboardPhoneBodyMountStages';
import * as PhoneBodyLazyFallback from '../executionDashboardLazyRegistry';

function withPhoneBodyScopeFallback(scope: Record<string, unknown>): Record<string, unknown> {
    const out = { ...scope };
    for (const [key, value] of Object.entries(PhoneBodyLazyFallback)) {
        if ((key.startsWith('Lazy') || key.startsWith('prefetch')) && out[key] == null && value != null) {
            out[key] = value;
        }
    }
    const componentFallbacks: Record<string, unknown> = {
        Bell,
        Calendar,
        DebtorSeizureCategoryBadges,
        ExecutionPartyInteractiveBadges,
        MapPin,
        PartyOverflowToggle,
        Phone,
        X,
    };
    for (const [key, value] of Object.entries(componentFallbacks)) {
        if (out[key] == null && value != null) {
            out[key] = value;
        }
    }
    return out;
}

function DeferredStagePlaceholder({
    className = 'mx-3 mt-3',
}: {
    className?: string;
}) {
    return (
        <div className={className} aria-hidden="true">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="mt-2 h-10 rounded-2xl bg-white/[0.04]" />
            </div>
        </div>
    );
}

export type ExecutionDashboardPhoneBodyProps = Record<string, unknown>;

function phoneBodyPropsEqual(
    prev: ExecutionDashboardPhoneBodyProps,
    next: ExecutionDashboardPhoneBodyProps,
): boolean {
    const a = prev.renderFingerprint;
    const b = next.renderFingerprint;
    if (typeof a === 'string' && typeof b === 'string' && a.length > 0) {
        return a === b;
    }
    return false;
}

export const ExecutionDashboardPhoneBody = React.memo(function ExecutionDashboardPhoneBody({
    renderFingerprint,
}: {
    renderFingerprint?: string;
}) {
    const scopeRef = useExecutionPhoneBodyScopeRef();
    const props = withPhoneBodyScopeFallback({
        ...readExecutionPhoneBodyScope(scopeRef),
        renderFingerprint,
    }) as Record<string, any>;
    const {
        AR_TABLIGH_RAQM,
        Activity: _scopeActivity,
        AlertCircle,
        AlertTriangle,
        AnimatePresence: _scopeAnimatePresence,
        Bell: _scopeBell,
        Book: _scopeBook,
        Bot,
        Building2,
        Calendar: _scopeCalendar,
        CalendarBridge,
        Car,
        CheckCircle,
        ChevronDown,
        ChevronLeft,
        ChevronRight,
        ChevronUp: _scopeChevronUp,
        ClipboardList: _scopeClipboardList,
        Clock,
        ColleagueConsultationProvider: _scopeColleagueConsultationProvider,
        CreditCard: _scopeCreditCard,
        DebtorSeizureCategoryBadges: _scopeDebtorSeizureCategoryBadges,
        DollarSign,
        DossierSwitcher: _scopeDossierSwitcher,
        EVICTION_TIMELINE_ACTION_IDS,
        EVICTION_WORKFLOW_BY_ACTION_ID,
        EXEC_MODAL_BACKDROP_STRONG: _scopeExecModalBackdropStrong,
        EXEC_MODAL_Z: _scopeExecModalZ,
        ExecutionDashboardSkeleton,
        ExecutionInlineAccordion,
        ExecutionInlineExecutorDecisionActions,
        ExecutionPartyInteractiveBadges: _scopeExecutionPartyInteractiveBadges,
        ExecutionToast,
        FileText: _scopeFileText,
        FolderOpen: _scopeFolderOpen,
        FollowupModalContext,
        FollowupSectionLinkCheckbox,
        Forward,
        GuarantorExternalHub: _scopeGuarantorExternalHub,
        HAMI_APPEND_EXECUTION_TIMELINE,
        HAMI_RESIDENTIAL_GRACE_CLEARED,
        History: _scopeHistory,
        InlineActionGate: _scopeInlineActionGate,
        MapPin: _scopeMapPin,
        MessageSquare,
        PUBLICATION_NOTICE_DURATION_DAYS,
        Package,
        PartyOverflowToggle: _scopePartyOverflowToggle,
        Pause,
        Pencil: _scopePencil,
        PerformanceMonitor,
        Phone: _scopePhone,
        Play,
        RefreshCw,
        SPECIAL_REQUEST_MANUAL_MODE,
        Scale: _scopeScale,
        SecureStoreService,
        Shield,
        Shuffle,
        SmartDialog: _scopeSmartDialog,
        Trash2: _scopeTrash2,
        UnifiedSeizureLogHost: _scopeUnifiedSeizureLogHost,
        User,
        Users,
        Wallet,
        X: _scopeX,
        XCircle: _scopeXCircle,
        accumulatedAlimony,
        activeCoerciveActions,
        activeDebtorHeirsForNotification,
        activeDebtorIsDeceased,
        activeFinancialTab,
        activeGraceTasks,
        activeNoticeState,
        activeSubFileId,
        activeTabId,
        activeTimelineEvents,
        activeTimelineEventsDebtorScoped,
        activeTimelineFilter,
        appealPerspective,
        appendGuarantorFollowupRequest,
        archiveAndClearGuarantor,
        assignmentWorkspaceCtx,
        beginThirdPartyReceiveStep,
        buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        buildPartyHeirsRows,
        buildPublicationNoticePatchForDebtorKey,
        calculatedExecutionFee,
        cancelThirdPartyReceiveStep,
        childDossiers,
        claimType,
        claimTypeArabicDisplay,
        classificationDisplay,
        clearActiveSalarySeizurePath,
        clearDebtorSummonsMarker,
        closeUnifiedSeizureLog,
        completeEvictionResidentialGrace,
        completePoliceAssistance,
        computeTaklifDeadlineYmd,
        confirmThirdPartyReceive,
        creditorDeathMenuLabel,
        creditorExtraMinorLabel,
        creditorExtraMinorNames,
        creditorWorkspaceEntries,
        currentFile,
        currentFileId,
        daysRemainingUntilDeadline,
        daysSinceNoticeCalculated,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorBrowserTabsMode,
        debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel,
        debtorForcedToAttend,
        debtorLiabilityGroups,
        debtorSummonsMarkerLocal,
        debtorSummonsProfile,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        debtorsSectionRef,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        dismissDebtorAbsenceBadge,
        docNumber,
        dockPinnedNotes,
        dockPinnedTasks,
        dossierActionModalOpen,
        dossierActionModalSaving,
        dossierActionModalType,
        dossierDateDraft,
        dossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase,
        dossierLifecyclePanelPortalRef,
        dossierLifecyclePopStyle,
        dossierLifecyclePopoverRef,
        dossierPendingStatus,
        dossierReasonDraft,
        dossierStatusDraft,
        effectiveCreditors,
        effectiveDebtors,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        evictionCaseExpensesTotalForFinancial,
        evictionFullAddressField,
        evictionGraceBadgeInfo,
        evictionGraceHidden,
        evictionGracePinned,
        evictionLawyerFeesInTotals,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        executionActionsGridLocked,
        executionAppealBanner,
        executionData,
        executionDebtorTabIndex,
        executionId,
        executionMemoBadgePopoverOpen,
        executionPaused,
        executionStatus,
        executionToolsTimelineLockedUi,
        file,
        fileNumber,
        fileYear,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        financialLawyerFeesAmount,
        financialLedger,
        financialPrincipalAmount,
        financialStatus,
        focusSeizureMovableInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        followupSalarySeizureLabel,
        followupSpecialization,
        forcedAttendanceIssued,
        forcedPathAttendanceSecured,
        getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey,
        getExecutionPartyDisplayName,
        getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey,
        graceHiddenKey,
        gracePeriodEnded,
        guarantorFollowupAwaitingDetailsSave,
        handleCoerciveAction,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        handleDebtorEmploymentToggle,
        handleDossierAction,
        handleDossierLifecycleConfirmDetails,
        handleDossierLifecyclePick,
        handleEvictionLawyerFeeRequest,
        handleEvictionLedgerActivated,
        handleFundsLedgerPayment,
        handleGuarantorRequestFromFollowup,
        handleLiftStayOfExecution,
        handleMemoFollowupClick,
        handleResumeExecution,
        hasChildDossiers,
        hasUnifiedSeizureLogContent,
        headerFields,
        inabaTargets,
        initiator,
        isAlimonyClaim,
        isAssignmentDeadlinePassed,
        isDebtorGovernmentEmployee,
        isDebtorRowEmployee,
        isEvictionExecutionModule,
        isFinancialCenterExpanded,
        isHeaderExpanded,
        isHistoricalMode,
        isInabaActive,
        isMaritalFurnitureClaim,
        isNonFinancialClaim,
        isPaused,
        isRepresentingDebtor,
        isUnifiedTabActive,
        isVisitationClaim,
        judgmentDateDisplay,
        judicialCustodiansResolved,
        lawyerFeePayoutApproved,
        liabilityGroupTabsMode,
        mergedTimelineEvents,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        monthlyAlimony,
        movableSeizureRegistryAssets,
        movableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        moveCaseNoteToTrash,
        moveTimelineEventToTrash,
        multiDebtorMode,
        nextTimelineId,
        noticeVoluntaryPeriodEndOptimistic,
        onClose,
        openDecisionsModalWithBoot,
        openEditDossierMeta,
        openEditParty,
        openEvictionResidentialGraceModal,
        openGuarantorDetailsModal,
        openHeirsNotificationCenter,
        openHeirsQuickView,
        openParentDossierMetaEdit,
        openPoliceAssistanceFromBadge,
        openUnifiedSeizureLog,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        parentClaimTypeArabicDisplay,
        parentClassificationDisplay,
        parentDossierId,
        parentExecutionFile,
        parentHeaderFields,
        parentIsEvictionForExpandedHeader,
        parentJudgmentDateDisplay,
        parentShowJudgmentMeta,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        parsedLawyerFees,
        partyBadgesExecutionId,
        patchSalarySeizureAssetDetails,
        persistExecutionMerge,
        persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo,
        primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        primaryMemoNoticeBadge,
        principalDebtAmount,
        propertyInlineSaveCtx,
        propertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        publicationNoticeDeadlineYmd,
        pushTimelineEvent,
        realEstateSeizureAssets,
        realEstateSeizureRegistryAssets,
        releaseSeizureAssetRow,
        remaining,
        removeJudicialCustodianEntry,
        requestEditTimelineEvent,
        resolveCalendarUserId,
        salarySeizureRegistryAssets,
        salarySeizureTabRows,
        saveSummonsMarkerPurposeEdit,
        seizedAssets,
        seizedMovablesForSeizureLog,
        seizedPropertiesForSeizureLog,
        seizureLogExecutorDecisions,
        seizureMatrixLedgerParamsRef,
        setActiveFinancialTab,
        setActiveTabId,
        setActiveTimelineFilter,
        setCaseTasksPending,
        setDebtorSummonsMarkerLocal,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setDossierDateDraft,
        setDossierLifecyclePanelOpen,
        setDossierLifecyclePanelPhase,
        setDossierPendingStatus,
        setDossierReasonDraft,
        setEmployeeCompulsoryBannerDismissed,
        setEvictionGraceDecisionId,
        setEvictionGraceHidden,
        setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen,
        setExecutionStorageTick,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setIsFinancialCenterExpanded,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setLinkedDossierToView,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        setShowAppointmentModal,
        setShowDecisionsModal,
        setShowDocumentsModal,
        setShowEvictionExpenseModal,
        setShowExecutionFinancialHub,
        setShowExecutionTrashModal,
        setShowExtraCreditors,
        setShowExtraDebtors,
        setShowLedgerModal,
        setShowLinkedDossierTimeline,
        setShowNotesModal,
        setShowOnlyActiveFileTimeline,
        setShowPaymentCalculator,
        setShowSettlementCalculator,
        setShowTimelineModal,
        setShowTransferFileNumberChangeModal,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowVisitationCalendarModal,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft,
        setThirdPartyFundsDraftById,
        setThirdPartySeizuresUi,
        setTimelineAccordionExpanded,
        setTimelineEvents,
        setUnifiedLedgerRevision,
        setUnifiedModalTab,
        setUnifiedSeizureLogTab,
        shouldCalculateExecutionFee,
        shouldShowGuarantorExternalHub,
        showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge,
        showEmployeeCompulsoryProceduresBanner,
        showExecutionFinancialHub,
        showExtraCreditors,
        showExtraDebtors,
        showJudgmentMeta,
        showOnlyActiveFileTimeline,
        showToast,
        showUnifiedSeizureLogModal,
        showVisitationCalendarModal,
        standaloneExecutionMarks,
        statusMetadata,
        statuteStatus,
        stayOfExecutionActive,
        subFiles,
        submitMovableSeizureRequest,
        submitPropertySeizureRequest,
        summonsMarkerPopoverOpen,
        summonsPurposeDraft,
        syncRollingCalendarSessions,
        thirdPartyFundsDraftById,
        thirdPartySeizureAssets,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        timelineAccordionExpanded,
        timelineDebtorMetadata,
        timelineFilterOptions,
        timelineRadarPreviewLimit,
        todayYmd,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        toggleEvictionGracePinned,
        toggleHeaderExpanded,
        toggleTimelineEventPin,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
        trashedCaseNotes,
        trashedCaseTasks,
        trashedTimelineEvents,
        unifiedSeizureLogEntries,
        unifiedSeizureLogTab,
        unifiedSeizureTabCounts,
        updateThirdPartyReceiveDraft,
        useExecutionDashboardStore,
        viewExecutionData,
        visitChildNames,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
    } = props;;

    const { secondaryStageReady, tertiaryStageReady } = useExecutionDashboardPhoneBodyMountStages({
        movableSeizureRequestModalOpen,
        propertySeizureRequestModalOpen,
        showExecutionFinancialHub,
        showUnifiedSeizureLogModal,
    });

    return (
            <div
                className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
            >
                {/* 🆕 V16: PREMIUM DIAMOND GLASS HEADER */}
                <div className="bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 backdrop-blur-xl border-t border-white/10 border-b border-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl mx-2 mt-2">
                    <div className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-1.5 px-2.5 py-2">
                        <button
                            type="button"
                            onClick={onClose}
                            data-testid={EXECUTION_DOSSIER_TEST_IDS.close}
                            className="inline-flex h-9 w-9 items-center justify-center justify-self-start rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            aria-label="إغلاق"
                        >
                            <X size={17} strokeWidth={2} />
                        </button>

                        <div className="relative min-w-0 justify-self-center" ref={dossierLifecyclePopoverRef}>
                            <button
                                type="button"
                                onPointerEnter={() => prefetchExecutionDossierActionsOverlay()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDossierLifecyclePanelOpen((open) => {
                                        const next = !open;
                                        if (next) {
                                            setDossierLifecyclePanelPhase('menu');
                                            setDossierPendingStatus(null);
                                        }
                                        return next;
                                    });
                                }}
                                className={`inline-flex h-9 max-w-full items-center justify-center gap-1.5 rounded-xl px-2 transition-all hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${dossierLifecycleTriggerTextClass(dossierStatusDraft)}`}
                                aria-expanded={dossierLifecyclePanelOpen}
                                aria-haspopup="dialog"
                                aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(dossierStatusDraft)}`}
                                title="تغيير حالة الإضبارة — اضغط للقائمة"
                            >
                                <span className="truncate text-sm font-semibold tracking-tight sm:text-[15px]">
                                    الإضبارة التنفيذية
                                </span>
                                <span
                                    className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)] ${dossierLifecycleTriggerDotClass(dossierStatusDraft)}`}
                                    aria-hidden
                                />
                            </button>
                            {dossierLifecyclePanelOpen && dossierLifecyclePopStyle
                                ? (
                                <LazyDossierLifecyclePanel dossierLifecyclePanelOpen={dossierLifecyclePanelOpen} dossierLifecyclePopStyle={dossierLifecyclePopStyle} dossierLifecyclePanelPhase={dossierLifecyclePanelPhase} setDossierLifecyclePanelPhase={setDossierLifecyclePanelPhase} dossierStatusDraft={dossierStatusDraft} dossierPendingStatus={dossierPendingStatus} setDossierPendingStatus={setDossierPendingStatus} dossierReasonDraft={dossierReasonDraft} setDossierReasonDraft={setDossierReasonDraft} dossierDateDraft={dossierDateDraft} setDossierDateDraft={setDossierDateDraft}
                                    dossierLifecycleLabelAr={dossierLifecycleLabelAr} handleDossierLifecyclePick={handleDossierLifecyclePick} handleDossierLifecycleConfirmDetails={handleDossierLifecycleConfirmDetails} dossierLifecyclePanelPortalRef={dossierLifecyclePanelPortalRef}
                                />
                                )
                                : null}
                        </div>

                        <ColleagueConsultationHeaderButton
                            iconOnly
                            iconSize={15}
                            className="inline-flex h-9 w-9 items-center justify-center justify-self-center rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-0 text-[#E6C673] transition-all hover:bg-[#E6C673]/16"
                        />

                        <button
                            type="button"
                            onPointerEnter={() => prefetchExecutionOverlayModals()}
                            onClick={() => setShowExecutionTrashModal(true)}
                            className="group relative inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-xl border border-white/8 bg-hami-navy/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            title="سلة مهملات الإضبارة (السجل والملاحظات)"
                            aria-label="سلة مهملات الإضبارة"
                        >
                            <Trash2 size={16} strokeWidth={1.75} className="transition-transform duration-200 group-hover:scale-105" />
                            {trashedTimelineEvents.length + trashedCaseNotes.length + trashedCaseTasks.length > 0 ? (
                                <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-amber-500/35 bg-amber-950/90 px-1 text-[9px] font-bold tabular-nums text-amber-200/95 shadow-[0_0_10px_-2px_rgba(230,198,115,0.45)]">
                                    {trashedTimelineEvents.length + trashedCaseNotes.length + trashedCaseTasks.length}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </div>
                {stayOfExecutionActive && (
                    <div className="mx-2 mt-1 rounded-xl border border-amber-500/50 bg-amber-950/85 px-3 py-2">
                        <p className="text-center text-[11px] font-bold text-amber-200 leading-snug">
                            ⏸️ الإضبارة مستأخرة لحين موعد الجلسة القادمة
                        </p>
                    </div>
                )}
                
                {/* 🆕 Delegation Switcher — يُظهر نفسه حسب حالة الـ Store والـ URL */}
                <DossierSwitcher parentFileId={parentDossierId} parentFileSnapshot={file ?? null} />

                {/* 🆕 شريط توحيد الأضابير — مستقل بصرياً عن الإنابة */}
                {hasChildDossiers && !isInabaActive && (
                    <div className="mx-3 mt-2" dir="rtl">
                        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-hami-navy/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            <button
                                type="button"
                                onClick={() => setActiveTabId(String(currentFileId || ''))}
                                className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                                    String(activeTabId) === String(currentFileId)
                                        ? 'bg-amber-500/20 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`}
                                aria-label="الإضبارة الأصلية"
                                title="الإضبارة الأصلية"
                            >
                                <span className="tabular-nums">{currentFile?.fileNumber || 'الإضبارة الأصلية'}</span>
                                <span className="rounded-full border border-amber-500/20 bg-amber-950/25 px-1.5 py-0.5 text-[8px] text-amber-300/90">
                                    أصلية
                                </span>
                            </button>

                            {childDossiers?.map((child) => (
                                <div
                                    key={child.id}
                                    className="shrink-0 inline-flex items-stretch overflow-hidden rounded-lg border border-white/10 bg-black/10"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setActiveTabId(String(child.id))}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold transition-all ${
                                            String(activeTabId) === String(child.id)
                                                ? 'bg-indigo-500/20 text-indigo-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                        }`}
                                        aria-label="إضبارة موحّدة"
                                        title="إضبارة موحّدة"
                                    >
                                        <span className="tabular-nums">{child.fileNumber || child.id}</span>
                                        <span className="rounded-full border border-indigo-500/20 bg-indigo-950/20 px-1.5 py-0.5 text-[8px] text-indigo-300/90">
                                            موحّدة
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const store = useExecutionDashboardStore.getState();
                                            store.setParentIdForDossier(String(child.id), null);
                                            if (String(activeTabId) === String(child.id)) setActiveTabId(String(currentFileId || ''));
                                            setExecutionStorageTick((t) => t + 1);
                                            showToast('تم إلغاء توحيد الإضبارة الموحدة', 'success');
                                        }}
                                        className="inline-flex items-center justify-center border-r border-white/10 px-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200"
                                        aria-label="إلغاء توحيد الإضبارة"
                                        title="إلغاء توحيد الإضبارة"
                                    >
                                        <XCircle size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* CONTENT AREA */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent overscroll-contain"
                    dir="rtl"
                >
                    
                    <LazyDashboardHeaderSection statuteStatus={statuteStatus} isAlimonyClaim={isAlimonyClaim} executionPaused={executionPaused} handleResumeExecution={handleResumeExecution} stayOfExecutionActive={stayOfExecutionActive} viewExecutionData={viewExecutionData} handleLiftStayOfExecution={handleLiftStayOfExecution}
                        XCircle={XCircle} isHeaderExpanded={isHeaderExpanded} toggleHeaderExpanded={toggleHeaderExpanded} headerFields={headerFields} openEditDossierMeta={openEditDossierMeta}
                        Pencil={Pencil} isEvictionExecutionModule={isEvictionExecutionModule} classificationDisplay={classificationDisplay} showJudgmentMeta={showJudgmentMeta} docNumber={docNumber} judgmentDateDisplay={judgmentDateDisplay} claimTypeArabicDisplay={claimTypeArabicDisplay}
                        evictionPropertyNumber={evictionPropertyNumber}
                        evictionPropertyDistrict={evictionPropertyDistrict}
                        evictionPropertyTypeField={evictionPropertyTypeField}
                        evictionFullAddressField={evictionFullAddressField}
                    isSubFile={isInabaActive}
                    hasActiveInaba={!isInabaActive && inabaTargets.length > 0}
                    delegationPurpose={(executionData as any)?.delegationPurpose}
                    linkToken={isInabaActive ? undefined : (executionData as any)?.linkToken}
                    onCopyLinkToken={() => {
                        const token = (executionData as any)?.linkToken;
                        if (token) {
                            navigator.clipboard.writeText(token).catch(() => {});
                            showToast('تم نسخ رمز المشاركة', 'success');
                        }
                    }}
                    linkedDossiers={isInabaActive ? undefined : (executionData as any)?.linkedDossiers}
                    onRemoveLinkedDossier={(linkedId) => {
                        const store = useExecutionDashboardStore.getState();
                        const current = executionData as any;
                        const existing = Array.isArray(current?.linkedDossiers)
                            ? (current.linkedDossiers as any[])
                            : [];
                        const next = existing.filter((d) => String(d?.linkedId || '') !== String(linkedId));
                        const curId = String(current?.id || '').trim();
                        const hasChildren = curId ? store.getChildDossiers(curId).length > 0 : false;
                        const patch: any = { linkedDossiers: next };
                        if (next.length === 0 && !hasChildren) {
                            patch.linkToken = undefined;
                        }
                        if (isUnifiedTabActive) {
                            persistExecutionMerge(patch);
                        } else {
                            store.updateCurrentFile(patch);
                        }
                        showToast('تم إلغاء الربط بنجاح', 'success');
                    }}
                    onOpenLinkedDossier={(dossier) => {
                        if (dossier.type === 'colleague') {
                            setLinkedDossierToView(dossier);
                            setShowLinkedDossierTimeline(true);
                        }
                    }}
                    onRequestTransferFileNumberChange={() => {
                        setShowTransferFileNumberChangeModal(true);
                    }}
                    onSaveSubFileNumber={(fileNumber, fileYear) => {
                        if (!isInabaActive || !activeSubFileId) return;
                        const num = String(fileNumber || '').trim();
                        const year = String(fileYear || '').trim();
                        const st = useExecutionDashboardStore.getState();
                        const cur = st.currentFile
                            ? ({ ...st.currentFile, fileNumber: num, fileYear: year } as ExecutionFile)
                            : null;
                        useExecutionDashboardStore.setState({
                            currentFile: cur,
                            subFiles: st.subFiles.map((f) =>
                                f.id === activeSubFileId ? { ...f, fileNumber: num, fileYear: year } : f
                            ),
                        });
                        persistExecutionMerge({ fileNumber: num, fileYear: year });
                        setExecutionStorageTick((t) => t + 1);
                        showToast('تم حفظ رقم الإضبارة الفرعية', 'success');
                    }}
                    expandedDossierFromParent={
                        isInabaActive && parentExecutionFile
                            ? {
                                  headerFields: parentHeaderFields,
                                  classificationDisplay: parentClassificationDisplay,
                                  claimTypeArabicDisplay: parentClaimTypeArabicDisplay,
                                  showJudgmentMeta: parentShowJudgmentMeta,
                                  judgmentDateDisplay: parentJudgmentDateDisplay,
                                  docNumber: parentHeaderFields.docNumber,
                                  evictionPropertyNumber: String(
                                      (parentExecutionFile as { property_number?: string }).property_number ?? ''
                                  ),
                                  evictionPropertyDistrict: String(
                                      (parentExecutionFile as { district?: string }).district ?? ''
                                  ),
                                  evictionPropertyTypeField: String(
                                      (parentExecutionFile as { property_type?: string }).property_type ?? ''
                                  ),
                                  evictionFullAddressField: String(
                                      (parentExecutionFile as { full_address?: string }).full_address ?? ''
                                  ),
                                  isEvictionExecutionModule: parentIsEvictionForExpandedHeader,
                                  openEditDossierMeta: openParentDossierMetaEdit,
                              }
                            : undefined
                    }
                />

                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyDossierActionsModal
                        open={dossierActionModalOpen}
                        actionType={dossierActionModalType} onClose={() => {
                            setDossierActionModalOpen(false);
                            setDossierActionModalType(null);
                        }}
                        onConfirm={(payload) => {
                            setDossierActionModalSaving(true);
                            handleDossierAction(payload);
                        }}
                        saving={dossierActionModalSaving} currentFileId={currentFileId} inabaTargets={inabaTargets}
                    />
                    </Suspense>

                    {/* Parties / Creditors */}
                    <LazyPartiesSection creditorWorkspaceEntries={creditorWorkspaceEntries} showExtraCreditors={showExtraCreditors} setShowExtraCreditors={setShowExtraCreditors} getExecutionPartyDisplayName={getExecutionPartyDisplayName} viewExecutionData={viewExecutionData} buildPartyHeirsRows={buildPartyHeirsRows} openHeirsQuickView={openHeirsQuickView} effectiveCreditors={effectiveCreditors}
                        heirsDetailsIncludeClient={heirsDetailsIncludeClient} executionAppealBanner={executionAppealBanner}
                        onOpenDecisionsAppealsTab={() => openDecisionsModalWithBoot({ tab: 'appeals' })} partyBadgesExecutionId={partyBadgesExecutionId} activeCoerciveActions={activeCoerciveActions} seizedAssets={seizedAssets} activeTimelineEvents={activeTimelineEvents} decisionsReloadEpoch={decisionsReloadEpoch} isHistoricalMode={isHistoricalMode} creditorDeathMenuLabel={creditorDeathMenuLabel} handleCreditorDeathMenuAction={handleCreditorDeathMenuAction} creditorExtraMinorNames={creditorExtraMinorNames} creditorExtraMinorLabel={creditorExtraMinorLabel} showToast={showToast} decisionsStorageExecutionId={decisionsStorageExecutionId} openEditParty={openEditParty}
                    />

                    <LazyDebtorsSection ref={debtorsSectionRef} {...{
                        Bell,
                        Calendar,
                        DebtorSeizureCategoryBadges,
                        ExecutionPartyInteractiveBadges,
                        MapPin,
                        PartyOverflowToggle,
                        Phone,
                        X,
                        activeCoerciveActions,
                        activeDebtorHeirsForNotification,
                        activeDebtorIsDeceased,
                        activeNoticeState,
                        activeTimelineEvents,
                        activeTimelineEventsDebtorScoped,
                        buildDebtorSummonsMarkerPatchForKey,
                        buildEmployeeAssignmentPatchForDebtorKey,
                        buildPartyHeirsRows,
                        buildPublicationNoticePatchForDebtorKey,
                        claimType,
                        clearDebtorSummonsMarker,
                        completeEvictionResidentialGrace,
                        completePoliceAssistance,
                        computeTaklifDeadlineYmd,
                        daysRemainingUntilDeadline,
                        debtorArrested,
                        debtorAttendedVoluntarily,
                        debtorBrowserTabsMode,
                        liabilityGroupTabsMode,
                        debtorLiabilityGroups,
                        debtorDeathMenuLabel,
                        debtorEmploymentToggleMenuLabel,
                        debtorForcedToAttend,
                        debtorSummonsMarkerLocal,
                        debtorSummonsProfile,
                        debtorWorkspaceChipStripRef,
                        debtorWorkspaceEntries,
                        decisionsReloadEpoch,
                        decisionsStorageExecutionId,
                        dismissDebtorAbsenceBadge,
                        effectiveDebtors,
                        evictionGraceBadgeInfo,
                        evictionGracePinned,
                        executionAppealBanner,
                        executionData,
                        executionDebtorTabIndex,
                        executionMemoBadgePopoverOpen,
                        executionToolsTimelineLockedUi,
                        forcedAttendanceIssued,
                        forcedPathAttendanceSecured,
                        getDebtorSummonsMarkerForKey,
                        getDebtorSummonsProfile,
                        getEmployeeAssignmentForDebtorKey,
                        getExecutionPartyDisplayName,
                        getPersonalCoerciveSubtypeOutcome,
                        getPublicationNoticeForDebtorKey,
                        handleDebtorDeathMenuAction,
                        handleDebtorEmploymentToggle,
                        isAssignmentDeadlinePassed,
                        isDebtorGovernmentEmployee,
                        isDebtorRowEmployee,
                        isEvictionExecutionModule,
                        isHistoricalMode,
                        isNonFinancialClaim,
                        isRepresentingDebtor,
                        multiDebtorMode,
                        nextTimelineId,
                        openEditParty,
                        openEvictionResidentialGraceModal,
                        openHeirsNotificationCenter,
                        openHeirsQuickView,
                        openPoliceAssistanceFromBadge,
                        parsedLawyerFees: financialLawyerFeesAmount,
                        partyBadgesExecutionId,
                        persistExecutionMerge,
                        persistGuarantorFollowupDetails,
                        policeAssistanceBadgeInfo,
                        primaryDebtorAbsenceBadge,
                        primaryDebtorKeyResolved,
                        primaryMemoNoticeBadge,
                        principalDebtAmount: financialPrincipalAmount,
                        publicationNoticeDeadlineYmd,
                        pushTimelineEvent,
                        realEstateSeizureAssets,
                        saveSummonsMarkerPurposeEdit,
                        seizedAssets,
                        setDebtorSummonsMarkerLocal,
                        onOpenDecisionsAppealsTab: () => openDecisionsModalWithBoot({ tab: 'appeals' }),
                        setEvictionGraceDecisionId,
                        setExecutionDebtorTabIndex,
                        setExecutionMemoBadgePopoverOpen,
                        setShowExtraDebtors,
                        setShowUnifiedSummonsModal,
                        setSummonsContextDebtorKey,
                        setSummonsHubInitialMainTab,
                        setSummonsMarkerPopoverOpen,
                        setSummonsPurposeDraft,
                        showDebtorSummonsAttendanceBadge,
                        showDebtorUnservedMemoBadge,
                        showExtraDebtors,
                        showToast,
                        smExecutionTarget: executionData?.executionTarget,
                        smHasGuarantorFile: executionData?.hasGuarantor,
                        hideAllGuarantorPresence: followupSpecialization.hideAllGuarantorPresence,
                        standaloneExecutionMarks,
                        summonsMarkerPopoverOpen,
                        summonsPurposeDraft,
                        thirdPartySeizureAssets,
                        thirdPartySeizures: thirdPartySeizuresUi,
                        timelineDebtorMetadata,
                        toggleEvictionGracePinned,
                        viewExecutionData,
                        voluntaryAttendanceCount,
                        noticeVoluntaryPeriodEndOptimistic,
                        voluntaryEndOptimistic,
                    }} />

                    {shouldShowGuarantorExternalHub(viewExecutionData) &&
                    !followupSpecialization.hideAllGuarantorPresence ? (
                        <div className="mx-3 mt-3.5">
                            <GuarantorExternalHub viewExecutionData={viewExecutionData} openGuarantorDetailsModal={openGuarantorDetailsModal} archiveAndClearGuarantor={archiveAndClearGuarantor} handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup} setSummonsContextDebtorKey={setSummonsContextDebtorKey} setSummonsHubInitialMainTab={setSummonsHubInitialMainTab} setShowUnifiedSummonsModal={setShowUnifiedSummonsModal}
                            />
                        </div>
                    ) : null}

                    {isVisitationClaim && (
                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <LazyVisitationScheduleModule viewExecutionData={viewExecutionData} visitChildNames={visitChildNames} fileNumber={String(executionData?.fileNumber ?? headerFields?.fileNumber ?? '')} todayYmd={todayYmd} persistExecutionMerge={persistExecutionMerge} pushTimelineEvent={pushTimelineEvent} nextTimelineId={nextTimelineId} showToast={showToast}
                            />
                        </Suspense>
                    )}

                    {isMaritalFurnitureClaim && (
                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <LazyMaritalFurnitureModule viewExecutionData={viewExecutionData} persistExecutionMerge={persistExecutionMerge} showToast={showToast}
                                locked={executionToolsTimelineLockedUi}
                            />
                        </Suspense>
                    )}

                    {isVisitationClaim &&
                        showVisitationCalendarModal &&
                        (viewExecutionData as { visitationSchedule?: import('@/app/types/visitationSchedule').VisitationScheduleBundle })
                            ?.visitationSchedule?.config && (
                            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <LazyVisitationCalendarModal
                                open={showVisitationCalendarModal} onClose={() => setShowVisitationCalendarModal(false)}
                                config={
                                    (
                                        viewExecutionData as {
                                            visitationSchedule: import('@/app/types/visitationSchedule').VisitationScheduleBundle;
                                        }
                                    ).visitationSchedule.config
                                }
                                sessions={
                                    (
                                        viewExecutionData as {
                                            visitationSchedule: import('@/app/types/visitationSchedule').VisitationScheduleBundle;
                                        }
                                    ).visitationSchedule.sessions
                                } todayYmd={todayYmd}
                            />
                            </Suspense>
                        )}

                    {isEvictionExecutionModule && (judicialCustodiansResolved?.length ?? 0) > 0 && (
                        <div className="mx-3 mt-1.5 space-y-1">
                            <p className="text-[9px] font-bold text-amber-500/90 text-right px-0.5">
                                {judicialCustodiansResolved.length === 1
                                    ? 'الحارس القضائي'
                                    : 'الحرس القضائيون'}
                            </p>
                            {judicialCustodiansResolved.map((c) => (
                                <div
                                    key={c.id}
                                    dir="rtl"
                                    className="flex w-full items-center gap-2 rounded-lg border border-white/[0.07] bg-gradient-to-l from-[#0c1426]/98 to-[#080d18]/98 py-1.5 ps-1.5 pe-2 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                                >
                                    <div className="min-w-0 flex-1 text-right">
                                        <div className="flex flex-row-reverse flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0">
                                            <span className="inline text-[12px] font-bold leading-tight text-white [overflow-wrap:anywhere]">
                                                {c.fullName}
                                            </span>
                                            <span className="inline shrink-0 rounded bg-amber-500/12 px-1 py-px text-[8px] font-bold tracking-wide text-amber-400/95">
                                                حارس
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[10px] leading-tight text-slate-500">
                                            <span className="text-slate-500/85">راتب</span>{' '}
                                            <span className="font-mono tabular-nums text-slate-300/95">
                                                {c.salary}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="shrink-0 self-center">
                                        <Suspense fallback={null}>
                                            <LazyJudicialCustodianCardMenu
                                                onEdit={() => {
                                                    setJudicialCustodianModalCtx({
                                                        requestTitle:
                                                            judicialCustodiansResolved.length === 1
                                                                ? 'تعديل بيانات الحارس القاضي'
                                                                : 'تعديل بيانات أحد الحرس القضائين',
                                                        initialName: c.fullName,
                                                        initialSalary: c.salary,
                                                        onSaved: (payload) => {
                                                            const savedAt = new Date().toISOString();
                                                            const next = judicialCustodiansResolved.map((row) =>
                                                                String(row.id) === String(c.id)
                                                                    ? {
                                                                          ...row,
                                                                          fullName: payload.name,
                                                                          salary: payload.salary,
                                                                      }
                                                                    : row
                                                            );
                                                            persistExecutionMerge({
                                                                eviction_judicial_custodians: next,
                                                                eviction_judicial_custodian: null,
                                                            });
                                                            showToast('تم تحديث بيانات الحارس', 'success');
                                                        },
                                                    });
                                                    setJudicialCustodianModalOpen(true);
                                                }}
                                                onDelete={() => removeJudicialCustodianEntry(c.id)}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                        
                        {/* 🆕 V17: CLUNKY BROWN BOX DELETED - Status shown as Micro-Tag only */}
                        
                        {/* نقل أزرار محضر المتابعة داخل نافذة «محضر المتابعة» فقط */}
                    
                    {activeGraceTasks.length > 0 && evictionGracePinned && !evictionGraceHidden ? (
                        <div className="mx-3 mt-2 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.03] to-transparent backdrop-blur-3xl shadow-[0_18px_60px_rgba(0,0,0,0.38)]">
                            <div className="flex flex-row-reverse items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0 flex-1 text-right">
                                    <p className="text-[12px] font-black text-white">المهلة</p>
                                </div>
                                <div className="flex flex-row-reverse items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEvictionGraceHidden(true);
                                            if (graceHiddenKey) {
                                                try {
                                                    SecureStoreService.setItemSync(graceHiddenKey, '1');
                                                } catch {
                                                    /* ignore */
                                                }
                                            }
                                        }}
                                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/[0.06]"
                                    >
                                        إخفاء
                                    </button>
                                    <span className="shrink-0 inline-flex items-center justify-center rounded-full border border-amber-400/25 bg-amber-500/[0.10] px-2.5 py-1 text-[10px] font-bold tabular-nums text-amber-200">
                                        {Math.min(1, activeGraceTasks.length)}
                                    </span>
                                </div>
                            </div>
                            <div className="px-3 pb-3" dir="rtl">
                                {activeGraceTasks.slice(0, 1).map((t) => (
                                    <div
                                        key={String(t.id)}
                                        className="rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-white break-words">
                                                {t.title}
                                            </p>
                                            <span className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                                <Clock size={11} className="text-amber-500/90 shrink-0" />
                                                {new Date(t.dueDate).toLocaleDateString('ar-EG', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                        </div>
                                        {t.body ? (
                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-400 whitespace-pre-line break-words">
                                                {t.body}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeGraceTasks.length > 0 && evictionGracePinned && evictionGraceHidden ? (
                        <div className="mx-3 mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2" dir="rtl">
                            <p className="text-[11px] font-bold text-slate-200">المهلة مخفية</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setEvictionGraceHidden(false);
                                    if (graceHiddenKey) {
                                        try {
                                            SecureStoreService.setItemSync(graceHiddenKey, '0');
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                }}
                                className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/15"
                            >
                                إظهار
                            </button>
                        </div>
                    ) : null}

                    {secondaryStageReady ? (
                        <>
                    {/* إدارة الأموال + المحفظة الخاصة: تُعرضان من «المركز المالي» في أدوات الإضبارة */}
                    <LazyActionGridSection
                        Book={Book}
                        Calendar={Calendar}
                        FileText={FileText}
                        FolderOpen={FolderOpen}
                        Scale={Scale}
                        ClipboardList={ClipboardList}
                        CreditCard={CreditCard} showEmployeeCompulsoryProceduresBanner={showEmployeeCompulsoryProceduresBanner} executionToolsTimelineLockedUi={executionToolsTimelineLockedUi} executionActionsGridLocked={executionActionsGridLocked} setEmployeeCompulsoryBannerDismissed={setEmployeeCompulsoryBannerDismissed} setShowUnifiedExecutionModal={setShowUnifiedExecutionModal} setUnifiedModalTab={setUnifiedModalTab} showToast={showToast} setShowAppointmentModal={setShowAppointmentModal} setShowNotesModal={setShowNotesModal} setShowDocumentsModal={setShowDocumentsModal} setShowDecisionsModal={setShowDecisionsModal} onOpenDecisionsModal={() => openDecisionsModalWithBoot({ tab: 'current' })} setIsFinancialCenterExpanded={setIsFinancialCenterExpanded} setShowExecutionFinancialHub={setShowExecutionFinancialHub}
                        onMemoFollowupClick={handleMemoFollowupClick}
                        showSeizureLogButton={
                            hasUnifiedSeizureLogContent &&
                            !isRepresentingDebtor &&
                            !followupSpecialization.hideDossierFinancialTools
                        }
                        onOpenSeizureLog={() => openUnifiedSeizureLog()}
                        pinnedNotes={dockPinnedNotes}
                        pinnedTasks={dockPinnedTasks}
                        onToggleNotePin={toggleCaseNotePin}
                        onToggleTaskPin={toggleCaseTaskPin}
                        onTrashPinnedNote={moveCaseNoteToTrash}
                        showVisitationCalendarButton={isVisitationClaim}
                        onOpenVisitationCalendar={() => {
                            if (executionToolsTimelineLockedUi) {
                                showToast('⚠️ لا يمكن فتح التقويم في الوضع الحالي.', 'warning');
                                return;
                            }
                            const bundle = (viewExecutionData as { visitationSchedule?: VisitationScheduleBundle })
                                ?.visitationSchedule;
                            if (!bundle?.config) {
                                showToast('لم يُأسَّس جدول المواعيد بعد.', 'warning');
                                return;
                            }
                            const rolled = syncRollingCalendarSessions(
                                bundle.config,
                                bundle.sessions,
                                todayYmd
                            );
                            const prevSig = bundle.sessions.map((s) => `${s.id}:${s.status}:${s.documentedAt ?? ''}`).join('|');
                            const nextSig = rolled.map((s) => `${s.id}:${s.status}:${s.documentedAt ?? ''}`).join('|');
                            if (prevSig !== nextSig) {
                                persistExecutionMerge({
                                    visitationSchedule: { config: bundle.config, sessions: rolled },
                                });
                            }
                            setShowVisitationCalendarModal(true);
                        }}
                    />
                    
                    {/* Timeline */}
                    <LazyTimelineSection timelineAccordionExpanded={timelineAccordionExpanded} setTimelineAccordionExpanded={setTimelineAccordionExpanded}
                        startTransition={startTransition}
                        ChevronUp={ChevronUp}
                        Activity={Activity}
                        History={History} debtorBrowserTabsMode={debtorBrowserTabsMode} activeTimelineEventsDebtorScoped={mergedTimelineEventsDebtorScoped} activeTimelineEvents={mergedTimelineEvents}
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                        SmartTimelineRadar={LazySmartTimelineRadar} toggleTimelineEventPin={toggleTimelineEventPin} setShowTimelineModal={setShowTimelineModal} timelineRadarPreviewLimit={mergedTimelineRadarPreviewLimit} isHistoricalMode={isHistoricalMode} activeTimelineFilter={activeTimelineFilter} setActiveTimelineFilter={setActiveTimelineFilter} todayYmd={todayYmd} timelineFilterOptions={timelineFilterOptions}
                        PremiumTimelineAuditLog={LazyPremiumTimelineAuditLog} moveTimelineEventToTrash={moveTimelineEventToTrash}
                        onRequestEditTimelineEvent={requestEditTimelineEvent} showOnlyActiveFileTimeline={showOnlyActiveFileTimeline} setShowOnlyActiveFileTimeline={setShowOnlyActiveFileTimeline}
                        subFilesCount={subFiles.length}
                        calendarUserId={resolveCalendarUserId(null)}
                        executionEntityId={String(currentFileId || '')}
                    />

                <Suspense fallback={null}>
                <LazyLawReferencePanel
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    viewExecutionData={viewExecutionData}
                />
                </Suspense>
                        </>
                    ) : (
                        <DeferredStagePlaceholder />
                    )}

                {tertiaryStageReady ? (
                    <>
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionFinancialHubPortal showExecutionFinancialHub={showExecutionFinancialHub} setShowExecutionFinancialHub={setShowExecutionFinancialHub}
                    onOpenUnifiedSeizureLog={() => openUnifiedSeizureLog()} financialHubAutoOpenMode={financialHubAutoOpenMode} setFinancialHubAutoOpenMode={setFinancialHubAutoOpenMode} financialHubSeizedMovableId={financialHubSeizedMovableId} setFinancialHubSeizedMovableId={setFinancialHubSeizedMovableId} financialHubSeizedPropertyId={financialHubSeizedPropertyId} setFinancialHubSeizedPropertyId={setFinancialHubSeizedPropertyId}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    LazyFinancialOperationsCenter={LazyFinancialOperationsCenter}
                    EXEC_FOC_LAZY_FALLBACK={EXEC_FOC_LAZY_FALLBACK} realEstateSeizureRegistryAssets={realEstateSeizureRegistryAssets} movableSeizureRegistryAssets={movableSeizureRegistryAssets} salarySeizureRegistryAssets={salarySeizureRegistryAssets} thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets} standaloneExecutionMarks={standaloneExecutionMarks} executionData={viewExecutionData} executionId={executionId} isFinancialCenterExpanded={isFinancialCenterExpanded} setIsFinancialCenterExpanded={setIsFinancialCenterExpanded} activeFinancialTab={activeFinancialTab} setActiveFinancialTab={setActiveFinancialTab} principalDebtAmount={financialPrincipalAmount} evictionLawyerFeesInTotals={evictionLawyerFeesInTotals} isEvictionExecutionModule={isEvictionExecutionModule} parsedLawyerFees={financialLawyerFeesAmount} total_execution_expenses={total_execution_expenses}
                    monthlyAlimony={monthlyAlimony} totalOwed={totalOwed} remaining={remaining} parsedCourtFees={parsedCourtFees} parsedDirectorateFees={parsedDirectorateFees} parsedClientFees={parsedClientFees} financialStatus={financialStatus} isNonFinancialClaim={isNonFinancialClaim} isAlimonyClaim={isAlimonyClaim} claimType={claimType} paidDebt={paidDebt} totalWithExecutionFee={totalWithExecutionFee} calculatedExecutionFee={calculatedExecutionFee} shouldCalculateExecutionFee={shouldCalculateExecutionFee} accumulatedAlimony={accumulatedAlimony} paidCourtFees={paidCourtFees} paidDirectorateFees={paidDirectorateFees} paidClientFees={paidClientFees} daysSinceNoticeCalculated={daysSinceNoticeCalculated} gracePeriodEnded={gracePeriodEnded}
                    initiator={initiator} setShowPaymentCalculator={setShowPaymentCalculator} setShowSettlementCalculator={setShowSettlementCalculator} handleCoerciveAction={handleCoerciveAction} executionStatus={executionStatus} statusMetadata={statusMetadata} isPaused={isPaused} setShowLedgerModal={setShowLedgerModal} financialLedger={financialLedger} evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial} evictionCaseExpenses={evictionCaseExpenses} setShowEvictionExpenseModal={setShowEvictionExpenseModal} handleEvictionLawyerFeeRequest={handleEvictionLawyerFeeRequest} lawyerFeePayoutApproved={lawyerFeePayoutApproved} handleFundsLedgerPayment={handleFundsLedgerPayment} setTimelineEvents={setTimelineEvents} nextTimelineId={nextTimelineId} guarantorFollowupAwaitingDetailsSave={guarantorFollowupAwaitingDetailsSave} setShowUnifiedExecutionModal={setShowUnifiedExecutionModal} setExecutionDebtorTabIndex={setExecutionDebtorTabIndex} primaryDebtorWorkspaceKey={primaryDebtorWorkspaceKey}
                    expandDebtor={(debtorKey) => debtorsSectionRef.current?.expandDebtor(debtorKey)} openGuarantorDetailsModal={openGuarantorDetailsModal} appendGuarantorFollowupRequest={appendGuarantorFollowupRequest} decisionsStorageExecutionId={decisionsStorageExecutionId} showToast={showToast} timelineDebtorMetadata={timelineDebtorMetadata} assignmentWorkspaceCtx={assignmentWorkspaceCtx} persistExecutionMerge={persistExecutionMerge} handleEvictionLedgerActivated={handleEvictionLedgerActivated} evictionAssetsTabUnlocked={evictionAssetsTabUnlocked}
                    getLocalTodayYmd={getLocalTodayYmd} setCaseTasksPending={setCaseTasksPending}
                    onClearSalarySeizurePath={clearActiveSalarySeizurePath} isRepresentingDebtor={isRepresentingDebtor} activeDebtorIsDeceased={activeDebtorIsDeceased}
                />

                <UnifiedSeizureLogHost isRepresentingDebtor={isRepresentingDebtor}
                    showModal={showUnifiedSeizureLogModal}
                    hasContent={hasUnifiedSeizureLogContent}
                    activeTab={unifiedSeizureLogTab}
                    onTabChange={setUnifiedSeizureLogTab}
                    counts={unifiedSeizureTabCounts}
                    entries={unifiedSeizureLogEntries} closeUnifiedSeizureLog={closeUnifiedSeizureLog}
                    footer={{
                        seizedPropertiesForSeizureLog,
                        seizedMovablesForSeizureLog,
                        realEstateSeizureRegistryAssets,
                        movableSeizureRegistryAssets,
                        salarySeizureTabRows,
                        thirdPartySeizureRegistryAssets,
                        thirdPartySeizuresUi,
                        thirdPartyFundsDraftById,
                        setThirdPartyFundsDraftById,
                        setThirdPartySeizuresUi,
                        decisionsStorageExecutionId,
                        executionData: executionData ?? null,
                        seizureLogExecutorDecisions,
                        propertyInlineSaveCtx,
                        decisionsReloadEpoch,
                        appealPerspective,
                        showToast,
                        focusSeizurePropertyInlineCompletion,
                        focusSeizureMovableInlineCompletion,
                        followupSalarySeizureLabel,
                        patchSalarySeizureAssetDetails,
                        releaseSeizureAssetRow,
                        persistExecutionMerge,
                        setTimelineEvents,
                        nextTimelineId,
                        getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
                        onLedgerRevision: () => setUnifiedLedgerRevision((v) => v + 1),
                        beginThirdPartyReceiveStep,
                        updateThirdPartyReceiveDraft,
                        cancelThirdPartyReceiveStep,
                        confirmThirdPartyReceive,
                    }}
                />
                </Suspense>


                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazySeizureRequestSubjectModal
                    open={propertySeizureRequestModalOpen}
                    title="طلب حجز عقار"
                    placeholder="اكتب موضوع طلب حجز العقار"
                    subjectDraft={propertySeizureSubjectDraft}
                    tone="amber" onClose={() => setPropertySeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setPropertySeizureSubjectDraft}
                    onSubmit={submitPropertySeizureRequest}
                />
                </Suspense>

                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazySeizureRequestSubjectModal
                    open={movableSeizureRequestModalOpen}
                    title="طلب حجز مال منقول"
                    placeholder="اكتب موضوع طلب حجز المال المنقول"
                    subjectDraft={movableSeizureSubjectDraft}
                    tone="sky" onClose={() => setMovableSeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setMovableSeizureSubjectDraft}
                    onSubmit={submitMovableSeizureRequest}
                />
                </Suspense>
                    </>
                ) : secondaryStageReady ? (
                    <DeferredStagePlaceholder className="mx-3 mt-2" />
                ) : null}
                    {/* BOTTOM SPACER FOR SMOOTH SCROLLING */}
                    <div className="h-6"></div>
                    
                </div>
        </div>
    );
}, phoneBodyPropsEqual);
