/** Scope + safe handlers for ExecutionDashboardPhoneBody (orchestrator) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requireDecisionsStorageExecutionId } from '../utils/requireDecisionsStorageExecutionId';
import type { ExecutionFile, SeizedMovable } from '@/app/types/execution';
import { useExecutionDashboardPhoneBodyMountStages } from './useExecutionDashboardPhoneBodyMountStages';
import { useExecutionDashboardJudicialCustodianRemove } from './executionDashboardCore/useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPropertyInlineSaveContext } from './executionDashboardCore/useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardMovableInlineSaveContext } from './executionDashboardCore/useExecutionDashboardMovableInlineSaveContext';
import {
    runSaveSeizedMovableInitForDecision,
    type SaveSeizedMovableInitInput,
} from './executionDashboardCore/executionDashboardFollowupSeizureInits';
import { mergeExecutionFileSeizureLists } from '../utils/executionPhoneBodyExecutionDataMerge';
import { isExecutionHandlerStubLeaf } from './executionHandlerClusterStubs';
import { useExecutionDashboardPhoneBodyScopeRead } from './useExecutionDashboardPhoneBodyScopeRead';
import { useExecutionDashboardPhoneBodyLocalState } from './useExecutionDashboardPhoneBodyLocalState';
import { useExecutionDashboardPhoneBodySafeHandlers } from './useExecutionDashboardPhoneBodySafeHandlers';

export function useExecutionDashboardPhoneBodyScope(renderFingerprint?: string) {
    const scope = useExecutionDashboardPhoneBodyScopeRead(renderFingerprint);
    const local = useExecutionDashboardPhoneBodyLocalState(scope, scope.scopeRef);
    const handlers = useExecutionDashboardPhoneBodySafeHandlers({
        scopeRef: scope.scopeRef,
        debtorsSectionRef: scope.debtorsSectionRef,
        handleDebtorEmploymentToggle: scope.handleDebtorEmploymentToggle,
        handleMemoFollowupClick: scope.handleMemoFollowupClick,
        openDecisionsModalWithBoot: scope.openDecisionsModalWithBoot,
        openFinancialHubLedger: scope.openFinancialHubLedger,
        openGuarantorDetailsModal: scope.openGuarantorDetailsModal,
        primaryDebtorWorkspaceKey: scope.primaryDebtorWorkspaceKey,
        setExecutionDebtorTabIndex: scope.setExecutionDebtorTabIndex,
        setFinancialHubAutoOpenMode: scope.setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId: scope.setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId: scope.setFinancialHubSeizedPropertyId,
        setIsFinancialCenterExpanded: scope.setIsFinancialCenterExpanded,
        setShowAppointmentModal: scope.setShowAppointmentModal,
        // المفتاح الحقيقي في الـ scope هو setShowDecisionsModal — الاسم بالشرطة السفلية
        // كان يشير لمفتاح غير موجود فيعطّل fallback فتح القرارات.
        _setShowDecisionsModal: scope.setShowDecisionsModal,
        setShowEvictionExpenseModal: scope.setShowEvictionExpenseModal,
        setShowExecutionFinancialHub: scope.setShowExecutionFinancialHub,
        setShowLedgerModal: scope.setShowLedgerModal,
        setShowNotesModal: scope.setShowNotesModal,
        setShowPaymentCalculator: scope.setShowPaymentCalculator,
        setShowSettlementCalculator: scope.setShowSettlementCalculator,
        setShowTimelineModal: scope.setShowTimelineModal,
        setShowUnifiedExecutionModal: scope.setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal: scope.setShowUnifiedSummonsModal,
        setSummonsContextDebtorKey: scope.setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab: scope.setSummonsHubInitialMainTab,
        setTimelineAccordionExpanded: scope.setTimelineAccordionExpanded,
        showToast: scope.showToast,
        timelineAccordionExpanded: scope.timelineAccordionExpanded,
        createModalSetterFallback: local.createModalSetterFallback,
        safeSetShowAppointmentModal: local.safeSetShowAppointmentModal,
        safeSetShowNotesModal: local.safeSetShowNotesModal,
        safeSetShowDocumentsModal: local.safeSetShowDocumentsModal,
        timelineAccordionExpandedFallback: local.timelineAccordionExpandedFallback,
        setTimelineAccordionExpandedFallback: local.setTimelineAccordionExpandedFallback,
    });

    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData: scope.executionData,
        persistExecutionMerge: scope.persistExecutionMerge,
        showToast: scope.showToast,
    });

    const executionDataRef = useRef<ExecutionFile | null | undefined>(scope.executionData);
    const [localExecutionViewTick, setLocalExecutionViewTick] = useState(0);
    const bumpLocalExecutionView = useCallback(() => {
        setLocalExecutionViewTick((tick) => tick + 1);
    }, []);

    const liveExecutionData = useMemo(() => {
        executionDataRef.current = mergeExecutionFileSeizureLists(
            scope.executionData,
            executionDataRef.current,
        );
        return executionDataRef.current ?? scope.executionData;
    }, [scope.executionData, localExecutionViewTick]);

    useEffect(() => {
        const bump = () => bumpLocalExecutionView();
        window.addEventListener('hami-seized-movable-inline-updated', bump);
        window.addEventListener('hami-seized-movable-init-saved', bump);
        window.addEventListener('hami-seized-property-inline-updated', bump);
        return () => {
            window.removeEventListener('hami-seized-movable-inline-updated', bump);
            window.removeEventListener('hami-seized-movable-init-saved', bump);
            window.removeEventListener('hami-seized-property-inline-updated', bump);
        };
    }, [bumpLocalExecutionView]);

    const persistExecutionMergeLocal = useCallback(
        (patch: Record<string, unknown>): boolean => {
            const data = executionDataRef.current;
            if (!data) {
                scope.showToast('تعذّر الحفظ — بيانات الإضبارة غير جاهزة', 'error');
                return false;
            }
            const upstream = scope.persistExecutionMerge;
            if (typeof upstream !== 'function' || isExecutionHandlerStubLeaf(upstream)) {
                scope.showToast('جاري تجهيز الأدوات — أعد المحاولة بعد لحظة', 'warning');
                return false;
            }
            const result = upstream(patch);
            if (result === false) {
                return false;
            }
            executionDataRef.current = mergeExecutionFileSeizureLists(
                { ...data, ...patch } as ExecutionFile,
                executionDataRef.current,
            );
            bumpLocalExecutionView();
            return true;
        },
        [scope.persistExecutionMerge, scope.showToast, bumpLocalExecutionView],
    );

    const pushTimelineEventLocal = useCallback(
        (ev: Record<string, unknown>) => {
            const fn = scope.pushTimelineEvent;
            if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) {
                fn(ev);
            }
        },
        [scope.pushTimelineEvent],
    );

    const nextTimelineIdLocal = useCallback((): string => {
        const fn = scope.nextTimelineId;
        if (typeof fn === 'function' && !isExecutionHandlerStubLeaf(fn)) {
            return String(fn());
        }
        return `timeline_${Date.now()}`;
    }, [scope.nextTimelineId]);

    const propertyInlineSaveCtx = useExecutionDashboardPropertyInlineSaveContext({
        decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
        executionDataId: scope.executionData?.id,
        executionId: scope.executionId,
        executionData: liveExecutionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast: scope.showToast,
        persistExecutionMerge: persistExecutionMergeLocal,
        pushTimelineEvent: pushTimelineEventLocal,
        nextTimelineId: nextTimelineIdLocal,
        linkSeizureAuctionToAppointments: Boolean(scope.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment: scope.pushSeizureAuctionCalendarAppointment,
    });

    const movableInlineSaveCtx = useExecutionDashboardMovableInlineSaveContext({
        decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
        executionDataId: scope.executionData?.id,
        executionId: scope.executionId,
        executionData: liveExecutionData as Record<string, unknown> | undefined,
        executionDataRef: executionDataRef as { current: Record<string, unknown> | null | undefined },
        showToast: scope.showToast,
        persistExecutionMerge: persistExecutionMergeLocal,
        pushTimelineEvent: pushTimelineEventLocal,
        nextTimelineId: nextTimelineIdLocal,
        linkSeizureAuctionToAppointments: Boolean(scope.linkSeizureAuctionToAppointments),
        pushSeizureAuctionCalendarAppointment: scope.pushSeizureAuctionCalendarAppointment,
    });

    const saveSeizedMovableInitLocal = useCallback(
        (input: SaveSeizedMovableInitInput): SeizedMovable | null => {
            const data = executionDataRef.current;
            const exId = requireDecisionsStorageExecutionId({
                decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
                executionId: scope.executionId,
                executionData: data as Record<string, unknown> | null,
            });
            return runSaveSeizedMovableInitForDecision(input, {
                exId,
                executionDataRef,
                nextTimelineId: nextTimelineIdLocal,
                persistExecutionMerge: persistExecutionMergeLocal,
                pushTimelineEvent: pushTimelineEventLocal,
                showToast: scope.showToast,
            });
        },
        [
            scope.decisionsStorageExecutionId,
            scope.executionId,
            nextTimelineIdLocal,
            persistExecutionMergeLocal,
            pushTimelineEventLocal,
            scope.showToast,
        ],
    );

    const saveSeizedMovableInitForDecision =
        typeof scope.saveSeizedMovableInitForDecision === 'function' &&
        !isExecutionHandlerStubLeaf(scope.saveSeizedMovableInitForDecision)
            ? (scope.saveSeizedMovableInitForDecision as (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void)
            : saveSeizedMovableInitLocal;

    const { secondaryStageReady, tertiaryStageReady, quaternaryStageReady } =
        useExecutionDashboardPhoneBodyMountStages({
            movableSeizureRequestModalOpen: scope.movableSeizureRequestModalOpen,
            propertySeizureRequestModalOpen: scope.propertySeizureRequestModalOpen,
            showExecutionFinancialHub: scope.showExecutionFinancialHub,
            showUnifiedSeizureLogModal: scope.showUnifiedSeizureLogModal,
            showVisitationCalendarModal: scope.showVisitationCalendarModal,
            isVisitationClaim: Boolean(scope.isVisitationClaim),
            isMaritalFurnitureClaim: Boolean(scope.isMaritalFurnitureClaim),
        });

    return {
        scopeRef: scope.scopeRef,
        props: scope.props,
        followupSpec: local.followupSpec,
        safeInabaTargets: local.safeInabaTargets,
        safeSubFiles: local.safeSubFiles,
        safeTrashedTimelineEvents: local.safeTrashedTimelineEvents,
        safeTrashedCaseNotes: local.safeTrashedCaseNotes,
        safeTrashedCaseTasks: local.safeTrashedCaseTasks,
        safeActiveGraceTasks: local.safeActiveGraceTasks,
        localDossierLifecyclePopoverRef: local.localDossierLifecyclePopoverRef,
        localDossierLifecyclePanelPortalRef: local.localDossierLifecyclePanelPortalRef,
        safeShouldShowGuarantorExternalHub: local.safeShouldShowGuarantorExternalHub,
        localDossierStatusDraft: local.localDossierStatusDraft,
        setLocalDossierStatusDraft: local.setLocalDossierStatusDraft,
        localDossierLifecyclePanelOpen: local.localDossierLifecyclePanelOpen,
        setLocalDossierLifecyclePanelOpen: local.setLocalDossierLifecyclePanelOpen,
        localDossierLifecyclePanelPhase: local.localDossierLifecyclePanelPhase,
        setLocalDossierLifecyclePanelPhase: local.setLocalDossierLifecyclePanelPhase,
        localDossierPendingStatus: local.localDossierPendingStatus,
        setLocalDossierPendingStatus: local.setLocalDossierPendingStatus,
        safeApplyDossierLifecycleToFileAndTimeline: local.safeApplyDossierLifecycleToFileAndTimeline,
        safeHandleDossierLifecyclePick: local.safeHandleDossierLifecyclePick,
        safeHandleDossierLifecycleConfirmDetails: local.safeHandleDossierLifecycleConfirmDetails,
        dossierLifecyclePopoverRef:
            scope.dossierLifecyclePopoverRef ?? local.localDossierLifecyclePopoverRef,
        dossierLifecyclePanelPortalRef:
            scope.dossierLifecyclePanelPortalRef ?? local.localDossierLifecyclePanelPortalRef,
        dossierLifecyclePanelOpen:
            scope.dossierLifecyclePanelOpen ?? local.localDossierLifecyclePanelOpen,
        dossierLifecyclePopStyle: scope.dossierLifecyclePopStyle ?? local.safeDossierLifecyclePopStyle,
        dossierLifecyclePanelPhase:
            scope.dossierLifecyclePanelPhase ?? local.localDossierLifecyclePanelPhase,
        dossierStatusDraft: scope.dossierStatusDraft ?? local.localDossierStatusDraft,
        dossierPendingStatus: scope.dossierPendingStatus ?? local.localDossierPendingStatus,
        dossierReasonDraft: scope.dossierReasonDraft ?? local.safeDossierReasonDraft,
        dossierDateDraft: scope.dossierDateDraft ?? local.safeDossierDateDraft,
        setDossierLifecyclePanelOpen:
            scope.setDossierLifecyclePanelOpen ?? local.setLocalDossierLifecyclePanelOpen,
        setDossierLifecyclePanelPhase:
            scope.setDossierLifecyclePanelPhase ?? local.setLocalDossierLifecyclePanelPhase,
        setDossierPendingStatus:
            scope.setDossierPendingStatus ?? local.setLocalDossierPendingStatus,
        setDossierReasonDraft: scope.setDossierReasonDraft ?? local.safeSetDossierReasonDraft,
        setDossierDateDraft: scope.setDossierDateDraft ?? local.safeSetDossierDateDraft,
        localDossierReasonSeed: local.localDossierReasonSeed,
        localDossierDateSeed: local.localDossierDateSeed,
        safeSetShowExecutionTrashModal: local.safeSetShowExecutionTrashModal,
        safeToggleHeaderExpanded: local.safeToggleHeaderExpanded,
        safeResolveCalendarUserId: local.safeResolveCalendarUserId,
        safeOpenEditDossierMeta: handlers.safeOpenEditDossierMeta,
        safeOpenParentDossierMetaEdit: handlers.safeOpenParentDossierMetaEdit,
        safeOpenEditParty: handlers.safeOpenEditParty,
        safeHandleDebtorEmploymentToggle: handlers.safeHandleDebtorEmploymentToggle,
        directHandleMemoFollowupClick: handlers.directHandleMemoFollowupClick,
        directOpenDecisionsModalWithBoot: handlers.directOpenDecisionsModalWithBoot,
        safeOpenAppointmentModal: handlers.safeOpenAppointmentModal,
        directOpenNotesModal: handlers.directOpenNotesModal,
        directOpenDocumentsModal: handlers.directOpenDocumentsModal,
        directOpenTimelineModal: handlers.directOpenTimelineModal,
        directOpenLedgerModal: handlers.directOpenLedgerModal,
        directOpenEvictionExpenseModal: handlers.directOpenEvictionExpenseModal,
        directOpenPaymentCalculator: handlers.directOpenPaymentCalculator,
        directOpenSettlementCalculator: handlers.directOpenSettlementCalculator,
        directOpenUnifiedSummonsHub: handlers.directOpenUnifiedSummonsHub,
        directOpenFinancialCenter: handlers.directOpenFinancialCenter,
        closeFinancialHubPortal: handlers.closeFinancialHubPortal,
        toggleFinancialCenterExpanded: handlers.toggleFinancialCenterExpanded,
        openGuarantorFollowupDetails: handlers.openGuarantorFollowupDetails,
        safeTimelineAccordionExpanded: handlers.safeTimelineAccordionExpanded,
        safeSetTimelineAccordionExpanded: handlers.safeSetTimelineAccordionExpanded,
        removeJudicialCustodianEntry,
        propertyInlineSaveCtx,
        movableInlineSaveCtx,
        saveSeizedMovableInitForDecision,
        secondaryStageReady,
        tertiaryStageReady,
        quaternaryStageReady,
        onClose: scope.onClose,
        stayOfExecutionActive: scope.stayOfExecutionActive,
        parentDossierId: scope.parentDossierId,
        file: scope.file,
        hasChildDossiers: scope.hasChildDossiers,
        isInabaActive: scope.isInabaActive,
        activeTabId: scope.activeTabId,
        currentFileId: scope.currentFileId,
        currentFile: scope.currentFile,
        childDossiers: scope.childDossiers,
        setActiveTabId: scope.setActiveTabId,
        setExecutionStorageTick: scope.setExecutionStorageTick,
        showToast: scope.showToast,
        statuteStatus: scope.statuteStatus,
        isAlimonyClaim: scope.isAlimonyClaim,
        executionPaused: scope.executionPaused,
        handleResumeExecution: scope.handleResumeExecution,
        executionData: liveExecutionData,
        handleLiftStayOfExecution: scope.handleLiftStayOfExecution,
        isHeaderExpanded: scope.isHeaderExpanded,
        headerFields: scope.headerFields,
        isEvictionExecutionModule: scope.isEvictionExecutionModule,
        classificationDisplay: scope.classificationDisplay,
        showJudgmentMeta: scope.showJudgmentMeta,
        docNumber: scope.docNumber,
        judgmentDateDisplay: scope.judgmentDateDisplay,
        claimTypeArabicDisplay: scope.claimTypeArabicDisplay,
        evictionPropertyNumber: scope.evictionPropertyNumber,
        evictionPropertyDistrict: scope.evictionPropertyDistrict,
        evictionPropertyTypeField: scope.evictionPropertyTypeField,
        evictionFullAddressField: scope.evictionFullAddressField,
        persistExecutionMerge: scope.persistExecutionMerge,
        isUnifiedTabActive: scope.isUnifiedTabActive,
        setLinkedDossierToView: scope.setLinkedDossierToView,
        setShowLinkedDossierTimeline: scope.setShowLinkedDossierTimeline,
        setShowTransferFileNumberChangeModal: scope.setShowTransferFileNumberChangeModal,
        activeSubFileId: scope.activeSubFileId,
        parentExecutionFile: scope.parentExecutionFile,
        parentHeaderFields: scope.parentHeaderFields,
        parentClassificationDisplay: scope.parentClassificationDisplay,
        parentClaimTypeArabicDisplay: scope.parentClaimTypeArabicDisplay,
        parentShowJudgmentMeta: scope.parentShowJudgmentMeta,
        parentJudgmentDateDisplay: scope.parentJudgmentDateDisplay,
        parentIsEvictionForExpandedHeader: scope.parentIsEvictionForExpandedHeader,
        dossierActionModalOpen: scope.dossierActionModalOpen,
        dossierActionModalType: scope.dossierActionModalType,
        setDossierActionModalOpen: scope.setDossierActionModalOpen,
        setDossierActionModalType: scope.setDossierActionModalType,
        setDossierActionModalSaving: scope.setDossierActionModalSaving,
        handleDossierAction: scope.handleDossierAction,
        dossierActionModalSaving: scope.dossierActionModalSaving,
        creditorWorkspaceEntries: scope.creditorWorkspaceEntries,
        showExtraCreditors: scope.showExtraCreditors,
        setShowExtraCreditors: scope.setShowExtraCreditors,
        getExecutionPartyDisplayName: scope.getExecutionPartyDisplayName,
        viewExecutionData: scope.viewExecutionData,
        buildPartyHeirsRows: scope.buildPartyHeirsRows,
        openHeirsQuickView: scope.openHeirsQuickView,
        effectiveCreditors: scope.effectiveCreditors,
        executionAppealBanner: scope.executionAppealBanner,
        partyBadgesExecutionId: scope.partyBadgesExecutionId,
        activeCoerciveActions: scope.activeCoerciveActions,
        seizedAssets: scope.seizedAssets,
        activeTimelineEvents: scope.activeTimelineEvents,
        decisionsReloadEpoch: scope.decisionsReloadEpoch,
        isHistoricalMode: scope.isHistoricalMode,
        creditorDeathMenuLabel: scope.creditorDeathMenuLabel,
        handleCreditorDeathMenuAction: scope.handleCreditorDeathMenuAction,
        creditorExtraMinorNames: scope.creditorExtraMinorNames,
        creditorExtraMinorLabel: scope.creditorExtraMinorLabel,
        decisionsStorageExecutionId: scope.decisionsStorageExecutionId,
        debtorsSectionRef: scope.debtorsSectionRef,
        activeDebtorHeirsForNotification: scope.activeDebtorHeirsForNotification,
        activeDebtorIsDeceased: scope.activeDebtorIsDeceased,
        activeNoticeState: scope.activeNoticeState,
        activeTimelineEventsDebtorScoped: scope.activeTimelineEventsDebtorScoped,
        buildDebtorSummonsMarkerPatchForKey: scope.buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey: scope.buildEmployeeAssignmentPatchForDebtorKey,
        buildPublicationNoticePatchForDebtorKey: scope.buildPublicationNoticePatchForDebtorKey,
        claimType: scope.claimType,
        clearDebtorSummonsMarker: scope.clearDebtorSummonsMarker,
        completeEvictionResidentialGrace: scope.completeEvictionResidentialGrace,
        completePoliceAssistance: scope.completePoliceAssistance,
        computeTaklifDeadlineYmd: scope.computeTaklifDeadlineYmd,
        daysRemainingUntilDeadline: scope.daysRemainingUntilDeadline,
        debtorArrested: scope.debtorArrested,
        debtorAttendedVoluntarily: scope.debtorAttendedVoluntarily,
        debtorBrowserTabsMode: scope.debtorBrowserTabsMode,
        liabilityGroupTabsMode: scope.liabilityGroupTabsMode,
        debtorLiabilityGroups: scope.debtorLiabilityGroups,
        debtorDeathMenuLabel: scope.debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel: scope.debtorEmploymentToggleMenuLabel,
        debtorForcedToAttend: scope.debtorForcedToAttend,
        debtorSummonsMarkerLocal: scope.debtorSummonsMarkerLocal,
        debtorSummonsProfile: scope.debtorSummonsProfile,
        debtorWorkspaceChipStripRef: scope.debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries: scope.debtorWorkspaceEntries,
        dismissDebtorAbsenceBadge: scope.dismissDebtorAbsenceBadge,
        effectiveDebtors: scope.effectiveDebtors,
        evictionGraceBadgeInfo: scope.evictionGraceBadgeInfo,
        evictionGracePinned: scope.evictionGracePinned,
        executionDebtorTabIndex: scope.executionDebtorTabIndex,
        executionId: scope.executionId,
        executionMemoBadgePopoverOpen: scope.executionMemoBadgePopoverOpen,
        executionToolsTimelineLockedUi: scope.executionToolsTimelineLockedUi,
        forcedAttendanceIssued: scope.forcedAttendanceIssued,
        forcedPathAttendanceSecured: scope.forcedPathAttendanceSecured,
        getDebtorSummonsMarkerForKey: scope.getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile: scope.getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey: scope.getEmployeeAssignmentForDebtorKey,
        getPersonalCoerciveSubtypeOutcome: scope.getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey: scope.getPublicationNoticeForDebtorKey,
        handleDebtorDeathMenuAction: scope.handleDebtorDeathMenuAction,
        isAssignmentDeadlinePassed: scope.isAssignmentDeadlinePassed,
        isDebtorGovernmentEmployee: scope.isDebtorGovernmentEmployee,
        isDebtorRowEmployee: scope.isDebtorRowEmployee,
        isNonFinancialClaim: scope.isNonFinancialClaim,
        isRepresentingDebtor: scope.isRepresentingDebtor,
        multiDebtorMode: scope.multiDebtorMode,
        nextTimelineId: scope.nextTimelineId,
        openEvictionResidentialGraceModal: scope.openEvictionResidentialGraceModal,
        openHeirsNotificationCenter: scope.openHeirsNotificationCenter,
        openPoliceAssistanceFromBadge: scope.openPoliceAssistanceFromBadge,
        financialLawyerFeesAmount: scope.financialLawyerFeesAmount,
        financialPrincipalAmount: scope.financialPrincipalAmount,
        publicationNoticeDeadlineYmd: scope.publicationNoticeDeadlineYmd,
        pushTimelineEvent: scope.pushTimelineEvent,
        realEstateSeizureAssets: scope.realEstateSeizureAssets,
        saveSummonsMarkerPurposeEdit: scope.saveSummonsMarkerPurposeEdit,
        setDebtorSummonsMarkerLocal: scope.setDebtorSummonsMarkerLocal,
        setEvictionGraceDecisionId: scope.setEvictionGraceDecisionId,
        setExecutionDebtorTabIndex: scope.setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen: scope.setExecutionMemoBadgePopoverOpen,
        setShowExtraDebtors: scope.setShowExtraDebtors,
        setSummonsMarkerPopoverOpen: scope.setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft: scope.setSummonsPurposeDraft,
        showDebtorSummonsAttendanceBadge: scope.showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge: scope.showDebtorUnservedMemoBadge,
        showExtraDebtors: scope.showExtraDebtors,
        standaloneExecutionMarks: scope.standaloneExecutionMarks,
        summonsMarkerPopoverOpen: scope.summonsMarkerPopoverOpen,
        summonsPurposeDraft: scope.summonsPurposeDraft,
        thirdPartySeizureAssets: scope.thirdPartySeizureAssets,
        thirdPartySeizuresUi: scope.thirdPartySeizuresUi,
        timelineDebtorMetadata: scope.timelineDebtorMetadata,
        toggleEvictionGracePinned: scope.toggleEvictionGracePinned,
        voluntaryAttendanceCount: scope.voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic: scope.noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic: scope.voluntaryEndOptimistic,
        persistGuarantorFollowupDetails: scope.persistGuarantorFollowupDetails,
        policeAssistanceBadgeInfo: scope.policeAssistanceBadgeInfo,
        primaryDebtorAbsenceBadge: scope.primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved: scope.primaryDebtorKeyResolved,
        primaryMemoNoticeBadge: scope.primaryMemoNoticeBadge,
        primaryDebtorWorkspaceKey: scope.primaryDebtorWorkspaceKey,
        handleMemoFollowupClick: scope.handleMemoFollowupClick,
        closeUnifiedSeizureLog: scope.closeUnifiedSeizureLog,
        showUnifiedSeizureLogModal: scope.showUnifiedSeizureLogModal,
        showVisitationCalendarModal: scope.showVisitationCalendarModal,
        setShowVisitationCalendarModal: scope.setShowVisitationCalendarModal,
        showExecutionTrashModal: scope.showExecutionTrashModal,
        setShowExecutionTrashModal:
            scope.setShowExecutionTrashModal ?? local.safeSetShowExecutionTrashModal,
        setMovableSeizureRequestModalOpen: scope.setMovableSeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen: scope.setPropertySeizureRequestModalOpen,
        movableSeizureRequestModalOpen: scope.movableSeizureRequestModalOpen,
        propertySeizureRequestModalOpen: scope.propertySeizureRequestModalOpen,
        showExecutionFinancialHub: scope.showExecutionFinancialHub,
        setShowExecutionFinancialHub: scope.setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal: scope.setShowUnifiedExecutionModal,
        remainingBalanceForSeizure: scope.remainingBalanceForSeizure,
        settlementGuarantorGate: scope.settlementGuarantorGate,
        unifiedLedgerRevision: scope.unifiedLedgerRevision,
        subFiles: local.safeSubFiles,
    };
}
