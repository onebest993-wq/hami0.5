// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-dashboard-core */
// ✅ PERFORMANCE OPTIMIZED - v11.1 - Zustand modals + useCallback + optimized useEffect
import React, {
    useState,
    useMemo,
    useEffect,
    useLayoutEffect,
    useCallback,
    useRef,
    startTransition,
} from 'react';
import { debug } from '@/app/utils/debug';
import { CalendarBridge, normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendarBridge';
import {
    syncExecutionTaskDue,
    syncExecutionTimelineAppointment,
} from '@/app/services/calendarDossierSync';
// ✅ NEW: Import fixed calculation functions for 7-day grace period
import {
    formatDateToLocalYmd,
    getLocalTodayYmd,
    isGracePeriodExpired,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import {
    buildDebtorLiabilityGroups,
    isPerDebtorSolidarySplitMode,
    readAllDebtorRowsFromExecution,
    resolveLiabilityGroupLawyerFees,
    resolveLiabilityGroupPrincipal,
    shouldShowDebtorLiabilityGroupTabs,
    type DebtorLiabilityGroup,
} from '@/app/utils/debtorLiabilityGroups';
import { resolveUnifiedVesselPrincipalAmount, hasOngoingAlimonyInExecution, buildExecutionClaimBreakdown, getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { syncRollingCalendarSessions } from '@/app/utils/visitationScheduleEngine';
import type { VisitationScheduleBundle } from '@/app/types/visitationSchedule';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR HELPERS - دوال مساعدة معيارية
// ═══════════════════════════════════════════════════════════════════════════
import {
    // Date Utilities
    evictionLocalYmdToday,
    evictionInclusiveCalendarDays,
    // Seizure Utilities
    isMovablePropertySeizureRow,
    buildSeizureRegistryDraftPatch,
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
    // Heir Utilities
    heirsDetailsIncludeClient,
    heirRowCompletenessScore,
    heirRowHasAnyText,
    // Dossier Lifecycle Utilities
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from '../helpers';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR COMPONENTS - مكونات معيارية
// ═══════════════════════════════════════════════════════════════════════════
import type { DebtorsSectionHandle } from '../components/DebtorsSection';
import { shouldShowGuarantorExternalHub } from '../components/guarantorExternalUtils';
import { useDossierMeta } from './useDossierMeta';
import { useEvictionProcedures } from './useEvictionProcedures';
import { useToastSystem } from './useToastSystem';
import { useStatuteOfLimitations } from './useStatuteOfLimitations';
import { useDynamicExpenses } from './useDynamicExpenses';
import { useTodayYmd } from './useTodayYmd';
import { useFinancialComputed } from './useFinancialComputed';
import { useGracePeriodCalculations } from './useGracePeriodCalculations';
import { useDebtorSummonsProfile } from './useDebtorSummonsProfile';
import { useExecutionFlags } from './useExecutionFlags';
import { useEvictionBadges } from './useEvictionBadges';
import { useFinancialTotals } from './useFinancialTotals';
import { useForcedSummoningAndFees } from './useForcedSummoningAndFees';
import { useExecutionAICopilot } from './useExecutionAICopilot';
import { useSubsequentNoticeFlow } from './useSubsequentNoticeFlow';
import { useMergedTimelineEvents } from './useMergedTimelineEvents';
import { useAllDebtorsUnified } from './useAllDebtorsUnified';
import { useEvictionProcedureLockHint } from './useEvictionProcedureLockHint';
import { useDebtorWorkspaceEntries } from './useDebtorWorkspaceEntries';
import { useMasterState } from './useMasterState';
import { useActiveDebtorProfile } from './useActiveDebtorProfile';
import { useActiveDebtorHeirsForNotification } from './useActiveDebtorHeirsForNotification';
import { useHeirsWorkflowByHeir } from './useHeirsWorkflowByHeir';
import { useCreditorWorkspace } from './useCreditorWorkspace';
import { useDebtorScopedTimeline } from './useDebtorScopedTimeline';
import { useDossierDeathStatus } from './useDossierDeathStatus';
import { useDossierHeaderMetadata } from './useDossierHeaderMetadata';
import {
    executionFileContentSignature,
    useExecutionData,
    useStableExecutionFileForStore,
} from './useExecutionData';
import { useSeizureRegistryAssets, isSalarySeizureAsset } from './useSeizureRegistryAssets';
import { useUnifiedSeizureLog } from './useUnifiedSeizureLog';
import { useThirdPartySeizuresUi } from './useThirdPartySeizuresUi';
import { useSeizureLogEntityData } from './useSeizureLogEntityData';
import { useThirdPartyFundsReceivedOutcome } from './useThirdPartyFundsReceivedOutcome';
import { useSeizureDecisionOutcome } from './useSeizureDecisionOutcome';
import { useSeizureApprovalToast } from './useSeizureApprovalToast';
import { useUnifiedCollectionOutcome } from './useUnifiedCollectionOutcome';
import { useGuarantorRequestOutcome } from './useGuarantorRequestOutcome';
import { useOpenSeizureCompletion } from './useOpenSeizureCompletion';
import { useTrustDisbursedOutcome } from './useTrustDisbursedOutcome';
import { useEvictionLawyerFeeOutcome } from './useEvictionLawyerFeeOutcome';
import { useOpenFinancialHubLedger } from './useOpenFinancialHubLedger';
import { useCaseTasksAndNotes } from './useCaseTasksAndNotes';
import { useExecutionTrashAndPins } from './useExecutionTrashAndPins';
import { usePartyEditWorkflow } from './usePartyEditWorkflow';
import type { PartyEditDraft } from '../components/PartyEditModal';
import { getInabaCorrespondenceLog } from '../utils/inabaCorrespondenceLog';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';

// 🆕 V10.5: ENHANCED UTILITIES
import { storageCache } from '@/app/utils/storageCache';
import {
    formatNumberInput,
    formatStoredAmountForInput,
    parseAmount,
} from '@/app/components/lawyer/ExecutionDashboard/utils/amountInput';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { normalizeExecutionFileRecord } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    executionStorageKey,
} from '@/app/utils/executionStorageKeys';
import { logErrorWithContext } from '@/app/utils/errorHandler';
import { PerformanceMonitor } from '@/app/utils/performanceMonitor';
import { useStandardSubmit } from '@/app/hooks/useStandardSubmit';
import { useExecutionAppealBannerState } from '@/app/hooks/useHasActiveExecutionAppeals';
import { supabase } from '@/app/lib/supabase-client';

import { dedupeTimelineEventsForDisplay, mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import type { TimelineEventDbRow } from '@/app/types/supabase-timeline';
import { useShallow as shallow } from 'zustand/react/shallow';
// ✅ FIXED: Import proper types
import type {
    ExecutionFile,
    TimelineEvent,
    SeizedAsset,
    RealEstateSeizureAsset,
    SeizedProperty,
    SeizedMovable,
    RealEstateGender,
    ThirdPartySeizureAsset,
    ThirdPartySeizure,
    StandaloneExecutionMark,
    Debtor,
    Creditor,
    Party,
    EvictionSubsequentSummonsMeta,
    DossierLifecycleStatus,
    AdditionalExecutionCreditor,
} from '@/app/types/execution';
import {
    guarantorFollowupAwaitingDetailsSave,
    normalizeDossierLifecycleStatus,
} from '@/app/types/execution';
import {
    getDebtorSummonsProfile,
    shouldShowEmployeeSalaryCapture,
} from '@/app/utils/debtorSummonsProfile';
import {
    appendGuarantorFollowupRequest,
    appendTrustDisburseRequest,
    appendPersonalCoerciveExecutorRequest,
    appendPendingExecutorSeizureDecision,
    appendSpecialFollowupRequest,
    hasApprovedUnifiedCollection,
    patchExecutorDecisionRow,
    patchExecutorDecisionRowEverywhere,
    patchExecutorDecisionRowReliable,
    readExecutorDecisionsArray,
    readSeizureRequestTarget,
    getExecutorDecisionRowById,
    mergeExecutorDecisionsInto,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    supersedeGuarantorRequestDecisionsForExecution,
} from '@/app/utils/executorSeizureDecisionQueue';

import {
    getExecutionModuleStrategy,
    isEvictionClaim,
    isEncroachmentRemovalClaim,
    isSpecificDeliveryClaim,
    getResidentialVacateDeadlineMaxIso,
    isVacateDeadlinePassed,
    hasEvictionTimelineAction,
    EVICTION_TIMELINE_ACTION_IDS,
} from '@/app/utils/executionModuleStrategies';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import {
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { ensureDecisionsNamespaceMigrated } from '@/app/utils/executionDecisionsNamespace';
import { resolveDecisionsModalBootState } from '@/app/utils/decisionsModalBoot';
import { reconcileDomainViolatingDecisions } from '@/app/utils/executionDomainReconcile';
import {
    applyDebtorDeathFollowupOverlay,
} from '@/app/utils/partyDeathClaimPolicy';
import { resolveFollowupSpecializationFromExecution } from '@/app/utils/followupSpecializationVisibility';
import {
    isCustodyRemovalExecutionClaim,
    isMaritalFurnitureExecutionClaim,
    isNonFinancialExecutionClaim,
    isVisitationExecutionClaim,
    resolvePrimaryExecutionClaimType,
} from '@/app/utils/executionClaimIsolation';
import {
    buildMaritalFurnitureDeliveryNoteBody,
    furnitureDetailsFromItems,
    normalizeMaritalFurnitureItems,
    readMaritalFurnitureItems,
    resolveMaritalFurnitureFinancialPrincipal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
    isMaritalFurnitureDeliveryStatusRecorded,
} from '@/app/utils/maritalFurniture';
import {
    executionTimelineVisibilityFromFollowup,
    normalizeExecutionTimelineFilter,
    resolveExecutionTimelineFilterOptions,
} from '@/app/utils/timelineCategoryFilter';
import { computeSeizureMatrix, resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import type { UnifiedLedgerTotalParams } from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import {
    HAMI_RESIDENTIAL_GRACE_CLEARED,
    hasActiveResidentialEvictionGrace,
} from '@/app/utils/residentialEvictionGrace';
import { stripResidentialGraceTimelineEvents } from '@/app/utils/residentialGraceTimeline';
import {
    defaultEvictionEarnerFeeCollectionSM,
    reduceEvictionEarnerFeeSm,
    type EarnerFeeSmAction,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import {
    isSalarySeizureLaneOccupied,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import {
    prefetchExecutionDashboardShell,
    prefetchExecutionModalContainers,
    prefetchExecutionOverlayModals,
} from '../executionDashboardLazyRegistry';
import { prefetchExecutionFollowupDefaultTab } from '../executionFollowupTabPrefetch';
import { AR_TABLIGH_RAQM } from '../executionDashboardLazyShellUi';
import { FollowupModalContext } from '../followupModalContext';
import { buildFollowupModalSnapshot } from '../followupModalSnapshot';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    handleExecutorApproval,
    inferExecutorApprovalDecisionType,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
    type BreakInventoryFurnitureSavePayload,
    type ExecutorApprovalActions,
    type JudicialCustodianSavePayload,
    type ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import {
    appendEvictionExecutorRequest,
    findApprovedFieldVisitNeedingSchedule,
    findApprovedBreakInventoryNeedingLedger,
    findApprovedCustodianNeedingDetails,
    getPersonalCoerciveSubtypeOutcome,
    hasApprovedLawyerFeePayout,
} from '@/app/utils/executorSeizureDecisionQueue';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import {
    getExecutionPartyDisplayName,
} from '@/app/utils/partyDisplayName';
import {
    readUnifiedFundsLedger,
    filterUnifiedLawyerFeesHideFileDuplicate,
    filterUnifiedExpensesHideFileDuplicate,
} from '@/app/utils/unifiedFundsLedgerStorage';
import {
    addCalendarDaysYmd,
    buildEmployeeAssignmentPatchForDebtorKey,
    computeTaklifDeadlineYmd,
    daysRemainingUntilDeadline,
    getEmployeeAssignmentForDebtorKey,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import {
    buildPublicationNoticePatchForDebtorKey,
    getPublicationNoticeForDebtorKey,
    publicationNoticeDeadlineYmd,
    PUBLICATION_NOTICE_DURATION_DAYS,
} from '@/app/utils/publicationNoticeDebtor';
import {
    buildDebtorNotificationCountPatchForKey,
    buildDebtorNoticePatchForKey,
    buildDebtorSummonsMarkerPatchForKey,
    getDebtorNotificationCountForKey,
    getDebtorNoticeStateForKey,
    getDebtorSummonsMarkerForKey,
    areDebtorSummonsMarkersEqual,
} from '@/app/utils/noticeDebtorScope';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/coerciveDebtorScope';
import { timelineDebtorMetadata, timelineEventBelongsToDebtorWorkspace } from '@/app/utils/timelineDebtorScope';
import {
    useExecutionDashboardStore,
    isInabaSubFileId,
    resolveParentDossierId,
    inabaSubMetaStorageKey,
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    stampInabaTimelineEventMetadata,
    stampParentTimelineEventMetadata,
    ensureSubDossierOpenedTimelineEvent,
    isDebtorRowEmployee,
    debtorEmploymentToggleMenuLabel,
    buildDebtorEmploymentTogglePatch,
    type ModalStates,
} from '@/app/stores';
import {
    isLegalEntityDebtorKind,
    resolveDebtorEntityKind,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';

import type { UnifiedExecutionDebtorRow, ExecutionDashboardProps, InlineActionGateKey } from '../types';
import type { DebtorWorkspaceEntry } from './useDebtorWorkspaceEntries';
import { bindHorizontalWheelToScroll } from '../helpers';

import { buildExecutionDashboardChunkScopeSources } from './buildExecutionDashboardChunkScopeSources';
import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';
import { useExecutionDashboardLedgerSync } from './executionDashboardCore/useExecutionDashboardLedgerSync';
import { persistExecutionDashboardSnapshot } from './executionDashboardCore/persistExecutionDashboardSnapshot';
import { useExecutionDashboardClaimFinancials } from './executionDashboardCore/useExecutionDashboardClaimFinancials';
import { resolveIsPersonalStatusExecutionClaim } from './executionDashboardCore/executionDashboardClaimFinancials';
import { useExecutionDashboardGraceAndSummoning } from './executionDashboardCore/useExecutionDashboardGraceAndSummoning';
import { useExecutionDashboardFollowupSeizureTabs } from './executionDashboardCore/useExecutionDashboardFollowupSeizureTabs';
import { useExecutionDashboardStatuteWarning } from './executionDashboardCore/useExecutionDashboardStatuteWarning';
import { useExecutionDashboardOtherPartyMirror } from './executionDashboardCore/useExecutionDashboardOtherPartyMirror';
import { buildExecutionCoerciveUiFlags } from './executionDashboardCore/executionDashboardCoerciveUi';
import { useExecutionDashboardSalarySeizureTabRows } from './executionDashboardCore/useExecutionDashboardSalarySeizureTabRows';
import { useExecutionDashboardCoerciveActionBridge } from './executionDashboardCore/useExecutionDashboardCoerciveActionBridge';
import { useExecutionDashboardCoerciveActionHandlers } from './executionDashboardCore/useExecutionDashboardCoerciveActionHandlers';
import { useExecutionDashboardSeizureReleaseHandlers } from './executionDashboardCore/useExecutionDashboardSeizureReleaseHandlers';
import { useExecutionDashboardThirdPartyReceiveHandlers } from './executionDashboardCore/useExecutionDashboardThirdPartyReceiveHandlers';
import { useExecutionDashboardStandaloneMarkHandlers } from './executionDashboardCore/useExecutionDashboardStandaloneMarkHandlers';
import { useExecutionDashboardSalarySeizurePatch } from './executionDashboardCore/useExecutionDashboardSalarySeizurePatch';
import { useExecutionDashboardFollowupSeizureHandlers } from './executionDashboardCore/useExecutionDashboardFollowupSeizureHandlers';
import { useExecutionDashboardPoliceAssistanceHandlers } from './executionDashboardCore/useExecutionDashboardPoliceAssistanceHandlers';
import { useExecutionDashboardThirdPartySeizureHandlers } from './executionDashboardCore/useExecutionDashboardThirdPartySeizureHandlers';
import { useExecutionDashboardBreakInventoryHandlers } from './executionDashboardCore/useExecutionDashboardBreakInventoryHandlers';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './executionDashboardCore/useExecutionDashboardEmployeeAssignmentHandlers';
import { useExecutionDashboardPartyDeathHandlers } from './executionDashboardCore/useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardEmployeeInvestigationSync } from './executionDashboardCore/useExecutionDashboardEmployeeInvestigationSync';
import { useExecutionDashboardEmployeeAssignmentCoerciveState } from './executionDashboardCore/useExecutionDashboardEmployeeAssignmentCoerciveState';
import { useExecutionDashboardPersonalCoerciveDecisionSync } from './executionDashboardCore/useExecutionDashboardPersonalCoerciveDecisionSync';
import {
    useExecutionDashboardEvictionGraceUiState,
    useExecutionDashboardGraceLifecycleEffects,
    useExecutionDashboardTimelineDedupeSync,
} from './executionDashboardCore/useExecutionDashboardTimelineAndGraceSync';
import { useExecutionDashboardExecutiveDetentionLifecycle } from './executionDashboardCore/useExecutionDashboardExecutiveDetentionLifecycle';
import {
    useExecutionDashboardDeceasedDebtorCoerciveReset,
    useExecutionDashboardEvictionLawyerFeeBackfill,
    useExecutionDashboardGuarantorDecisionSync,
    useExecutionDashboardHeirsInvestigationSync,
    useExecutionDashboardSeizureRequestCreatedListener,
    useExecutionDashboardWindowEventListeners,
} from './executionDashboardCore/useExecutionDashboardDecisionAndEventSync';
import { useExecutionDashboardPublicationNoticeHandlers } from './executionDashboardCore/useExecutionDashboardPublicationNoticeHandlers';
import { useExecutionDashboardPaymentHandlers } from './executionDashboardCore/useExecutionDashboardPaymentHandlers';
import { useExecutionDashboardStayHandlers } from './executionDashboardCore/useExecutionDashboardStayHandlers';
import { useExecutionDashboardDossierFollowupHandlers } from './executionDashboardCore/useExecutionDashboardDossierFollowupHandlers';

import { pickExecutionFollowupScopeSlice } from './pickExecutionFollowupScopeSlice';
import { useEarnerFinancialPersonalCoerciveFlags } from './executionDashboardEarnerFinancialCoerciveGate';
import { applyEarnerFinancialPersonalCoerciveOverlay } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import {
    markSpecificDeliveryItemDeclaredDestroyed,
    readSpecificDeliveryItems,
} from '@/app/utils/specificDeliveryItemsUtils';
import {
    buildEndGracePeriodMergePatch,
    buildGracePeriodEndedTimelineEvent,
    computeForcedDebtorNotificationYmd,
} from './executionDashboardCore/executionDashboardGraceSummoning';
import {
    buildInitialExecutorSeizureDetails,
} from './executionDashboardCore/executionDashboardCoerciveAction';
import { saveSeizedPropertyAuctionSessionResult as runSaveSeizedPropertyAuctionSessionResult } from './executionDashboardCore/executionDashboardAuctionSessionResult';
import {
    saveSeizureMarkConfirmation as runSaveSeizureMarkConfirmation,
    saveSeizedPropertyStepDetails as runSaveSeizedPropertyStepDetails,
    savePublicationDetails as runSavePublicationDetails,
} from './executionDashboardCore/executionDashboardSeizedPropertyModals';
import { useExecutionDashboardModalControls } from './useExecutionDashboardModalControls';
import { useFollowupModalPersistNavigation } from './useFollowupModalPersistNavigation';
import {
    useExecutionCoercionOrchestrator,
    useExecutionDecisionsOrchestrator,
    useExecutionFollowupOrchestrator,
    useExecutionSeizureOrchestrator,
    useExecutionDossierLifecycleActionsOrchestrator,
    useExecutionDossierLifecyclePanelOrchestrator,
    useExecutionDossierTabOrchestrator,
    useExecutionFinancialOrchestrator,
    useExecutionPartiesOrchestrator,
} from '../orchestrators';

import type { ExecutionDashboardProps } from '../types';

export function useExecutionDashboardCore({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps) {
    // debug logging moved to mount-only effect for perf
    
    // ===========================
    // EXECUTION DATA - MUST BE FIRST
    // ===========================
    const [executionStorageTick, setExecutionStorageTick] = useState(0);
    /** الإضبارة الأم/الفرعية */
    const currentFile = useExecutionDashboardStore((s) => s.currentFile);
    const activeSubFileId = useExecutionDashboardStore((s) => s.activeSubFileId);
    const allSubFiles = useExecutionDashboardStore((s) => s.subFiles);
    const setActiveSubFileId = useExecutionDashboardStore((s) => s.setActiveSubFileId);
    const delegationParentFileId = useExecutionDashboardStore((s) => s.delegationParentFileId);
    const setDelegationParentFileId = useExecutionDashboardStore((s) => s.setDelegationParentFileId);
    const parentDossierId = useMemo(
        () =>
            resolveParentDossierId(
                { currentFile, delegationParentFileId, activeSubFileId },
                String(executionId ?? file?.id ?? '')
            ),
        [currentFile, delegationParentFileId, activeSubFileId, executionId, file?.id]
    );
    const currentFileId = parentDossierId || executionId || file?.id || '';
    const isInabaActive = isInabaSubFileId(activeSubFileId);
    const preferStoreExecutionView = Boolean(activeSubFileId) || isInabaSubFileId(currentFile?.id);
    const inabaTargets = useMemo(() => {
        return allSubFiles
            .filter((f) => isInabaSubFileId(f.id) && String(f.parentFileId || '') === String(parentDossierId))
            .map((f) => ({
                id: f.id,
                directorate: String((f as any).delegationTargetDirectorate || f.directorate || '').trim() || '---',
            }))
            .filter((x) => x.id);
    }, [allSubFiles, parentDossierId]);

    /** قراءة delegationParentId من الرابط — المصدر الأساسي للحقيقة */
    const urlDelegationParentId = typeof window !== 'undefined'
        ? (() => { try { return new URLSearchParams(window.location.search).get('delegationParentId'); } catch { return null; } })()
        : null;

    const subFiles = useMemo(() =>
        allSubFiles.filter((f) => String(f.parentFileId || '') === String(parentDossierId)),
        [allSubFiles, parentDossierId]
    );
    const hasInabaForThisDossier = allSubFiles.some(
        (f) => isInabaSubFileId(f.id) && String(f.parentFileId || '') === String(parentDossierId)
    );

    /** مزامنة URL → Store عند بدء التشغيل */
    useEffect(() => {
        if (urlDelegationParentId && !delegationParentFileId) {
            setDelegationParentFileId(urlDelegationParentId);
        }
    }, [urlDelegationParentId, delegationParentFileId, setDelegationParentFileId]);

    /** 🆕 التبويبات (Parent-Child) — orchestrator */
    const { activeTabId, setActiveTabId } = useExecutionDossierTabOrchestrator(String(currentFileId || ''));

    const baseExecutionData = useExecutionData(
        currentFile,
        file,
        executionId,
        executionStorageTick,
        preferStoreExecutionView
    );

    const isHistoricalMode = false;

    const isUnifiedTabActive = useMemo(() => {
        if (activeSubFileId) return false;
        const tabId = String(activeTabId || '').trim();
        const baseId = String(currentFileId || '').trim();
        return Boolean(tabId && baseId && tabId !== baseId);
    }, [activeTabId, currentFileId, activeSubFileId]);

    const unifiedTabId = useMemo(() => {
        if (!isUnifiedTabActive) return '';
        return String(activeTabId || '').trim();
    }, [isUnifiedTabActive, activeTabId]);

    const unifiedTabFileRow = useMemo(() => {
        if (!unifiedTabId) return null;
        try {
            const allFiles = loadExecutionFilesRaw();
            const row = allFiles.find((f: unknown) => f && String((f as { id?: unknown }).id) === unifiedTabId);
            return row ? normalizeExecutionFileRecord(row) : null;
        } catch {
            return null;
        }
    }, [unifiedTabId, executionStorageTick]);

    const unifiedTabExecutionData = useExecutionData(null, unifiedTabFileRow, unifiedTabId || undefined, executionStorageTick);

    const executionData = isUnifiedTabActive ? unifiedTabExecutionData : baseExecutionData;

    const parentExecutionFile = useMemo((): ExecutionFile | null => {
        if (!isInabaActive) return null;
        const pid = String(parentDossierId || '').trim();
        if (!pid) return null;
        try {
            const cached = storageCache.get(executionStorageKey(pid));
            if (cached && typeof cached === 'object') return cached as ExecutionFile;
        } catch {
            /* ignore */
        }
        return null;
    }, [isInabaActive, parentDossierId, executionStorageTick]);

    const inabaCorrespondenceLog = useMemo(() => {
        const source =
            isInabaActive && parentExecutionFile
                ? parentExecutionFile
                : !isInabaActive && activeSubFileId === null
                  ? (executionData as ExecutionFile | null)
                  : null;
        return getInabaCorrespondenceLog(source);
    }, [isInabaActive, parentExecutionFile, activeSubFileId, executionData, executionStorageTick]);

    const viewExecutionData = executionData;

    /** أحدث ملف للدمج — يمنع استبدال حقول بسبب إغلاق قديم لـ persistExecutionMerge عند موافقة المنفذ */
    const executionDataRef = useRef<ExecutionFile | null>(null);
    executionDataRef.current = executionData ?? null;

    const partyBadgesExecutionId = String(executionData?.id ?? executionId ?? file?.id ?? 'unknown');

    /** مفتاح موحّد لـ localStorage «execution_*_decisions» — يجب أن يطابق id الملف الأصلي وليس معرّف الإضبارة الفرعية */
    const decisionsStorageExecutionId = useMemo(() => {
        const parent = String(parentDossierId || executionId || file?.id || '').trim();
        if (parent && parent !== 'default' && parent !== 'undefined') return parent;
        return String(executionData?.id ?? 'default');
    }, [parentDossierId, executionId, file?.id, executionData?.id]);
    const executionAppealBanner = useExecutionAppealBannerState(
        decisionsStorageExecutionId !== 'default' ? decisionsStorageExecutionId : undefined
    );

    useEffect(() => {
        if (isHistoricalMode) return;
        const target = String(decisionsStorageExecutionId || '').trim();
        if (!target || target === 'default' || target === 'undefined') return;

        const legacyBase = String(executionId ?? file?.id ?? '').trim();
        const legacySub = activeSubFileId ? `${legacyBase || target}__sub__${activeSubFileId}` : '';
        const tabId = String(activeTabId || '').trim();
        const baseId = String(currentFileId || '').trim();
        const legacyTab = tabId && baseId && tabId !== baseId ? tabId : '';

        const sources = [legacyBase, legacySub, legacyTab]
            .map((x) => String(x || '').trim())
            .filter((x) => x && x !== 'default' && x !== 'undefined' && x !== target);
        if (sources.length === 0) return;

        const markerKey = `decisions-migration:${target}`;
        const markerVal = [...new Set(sources)].sort().join('|');
        try {
            const prev = String(SecureStoreService.getItemSync(markerKey) || '');
            if (prev === markerVal) return;
            mergeExecutorDecisionsInto({
                targetExecutionId: target,
                sourceExecutionIds: sources,
            });
            SecureStoreService.setItemSync(markerKey, markerVal);
        } catch {}
    }, [
        activeSubFileId,
        activeTabId,
        currentFileId,
        decisionsStorageExecutionId,
        executionId,
        file?.id,
        isHistoricalMode,
    ]);

    useEffect(() => {
        if (isHistoricalMode) return;
        const target = String(decisionsStorageExecutionId || '').trim();
        if (!target || target === 'default' || target === 'undefined') return;
        const dataRef = executionDataRef.current as Record<string, unknown> | null | undefined;
        ensureDecisionsNamespaceMigrated(target, dataRef);
        reconcileDomainViolatingDecisions(target, dataRef);
    }, [
        decisionsStorageExecutionId,
        executionData?.claimType,
        executionData?.claimTypes,
        executionData?.representedParty,
        executionData?.debtors,
        executionData?.docType,
        executionData?.classification,
        isHistoricalMode,
    ]);

    const dossierFileKey = String(executionData?.id ?? executionId ?? file?.id ?? '');
    const executionFileKey = String(file?.id ?? executionId ?? '');
    const reconcileDossierLifecycle = useExecutionDashboardStore((s) => s.reconcileDossierLifecycle);
    const dossierLifecycleRow = useExecutionDashboardStore((s) => {
        const k = dossierFileKey;
        if (!k || k === 'undefined') return undefined;
        return s.dossierLifecycleByFileId[k];
    });

    useEffect(() => {
        if (!dossierFileKey || dossierFileKey === 'undefined') return;
        reconcileDossierLifecycle(dossierFileKey, executionData ?? undefined);
    }, [
        dossierFileKey,
        reconcileDossierLifecycle,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_last_action_date,
        executionData?.lastActionDate,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);

    /** يُزامَن مع الملف عبر scopedSummonsMarker + unifiedSummonsTargetDebtorKey (مصدر واحد، بلا تكرار مع الجذر فقط) */
    const [debtorSummonsMarkerLocal, setDebtorSummonsMarkerLocal] = useState<
        ExecutionFile['debtor_summons_marker'] | null
    >(() => (executionData ? (executionData.debtor_summons_marker ?? null) : null));

    const fileForStoreSync = useStableExecutionFileForStore(
        isUnifiedTabActive ? unifiedTabFileRow : (file as ExecutionFile | null | undefined),
    );

    useEffect(() => {
        if (!fileForStoreSync) return;
        const store = useExecutionDashboardStore.getState();
        if (store.activeSubFileId || isInabaSubFileId(store.currentFile?.id)) return;
        if (isUnifiedTabActive) return;
        const prevSig = executionFileContentSignature(store.currentFile);
        const nextSig = executionFileContentSignature(fileForStoreSync);
        if (prevSig === nextSig) return;
        const prevTs = Date.parse(String(store.currentFile?.updatedAt || ''));
        const nextTs = Date.parse(String(fileForStoreSync.updatedAt || ''));
        if (Number.isFinite(prevTs) && Number.isFinite(nextTs) && prevTs > nextTs) return;
        store.setCurrentFile(fileForStoreSync);
    }, [fileForStoreSync, isUnifiedTabActive, activeSubFileId]);

    useEffect(() => {
        setExecutionDebtorTabIndex(0);
    }, [executionData?.id]);
    
    // 🚀 V11.0: OPTIMIZED - Start with false since data is synchronous
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(executionData ? null : 'لم يتم العثور على بيانات التنفيذ');
    
    const debtorsSectionRef = useRef<DebtorsSectionHandle>(null);

    useEffect(() => {
        prefetchExecutionDashboardShell();
        prefetchExecutionFollowupDefaultTab();
        prefetchExecutionModalContainers();
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => prefetchExecutionOverlayModals(), { timeout: 2500 });
        } else {
            window.setTimeout(() => prefetchExecutionOverlayModals(), 800);
        }
    }, []);
    const {
        showExtraCreditors,
        setShowExtraCreditors,
        showExtraDebtors,
        setShowExtraDebtors,
    } = useExecutionPartiesOrchestrator(executionFileKey);

    const executionDashboardFileId = executionData?.id ?? null;
    const {
        modals,
        setExecutionModal,
        activeBottomTab,
        isHeaderExpanded,
        toggleHeaderExpanded,
    } = useExecutionDashboardModalControls(executionDashboardFileId);

    const showNotesModal = modals.showNotesModal;
    const setShowNotesModal = (show: boolean) => setExecutionModal('showNotesModal', show);
    const showAppointmentModal = modals.showAppointmentModal;
    const setShowAppointmentModal = (show: boolean) => setExecutionModal('showAppointmentModal', show);
    const showDocumentsModal = modals.showDocumentsModal;
    const setShowDocumentsModal = (show: boolean) => setExecutionModal('showDocumentsModal', show);
    const showDecisionsModal = modals.showDecisionsModal;
    const setShowDecisionsModal = (show: boolean) => setExecutionModal('showDecisionsModal', show);
    const showSeizedAssetsModal = modals.showSeizedAssetsModal;
    const setShowSeizedAssetsModal = (show: boolean) => setExecutionModal('showSeizedAssetsModal', show);
    const showTimelineModal = modals.showTimelineModal;
    const setShowTimelineModal = (show: boolean) => setExecutionModal('showTimelineModal', show);
    const showPaymentModal = modals.showPaymentModal;
    const setShowPaymentModal = (show: boolean) => setExecutionModal('showPaymentModal', show);
    const showNotificationModal = modals.showNotificationModal;
    const setShowNotificationModal = (show: boolean) => setExecutionModal('showNotificationModal', show);
    const showCoerciveModal = modals.showCoerciveModal;
    const setShowCoerciveModal = (show: boolean) => setExecutionModal('showCoerciveModal', show);
    const showPaymentCalculator = modals.showPaymentCalculator;
    const setShowPaymentCalculator = (show: boolean) => setExecutionModal('showPaymentCalculator', show);
    const showSettlementCalculator = modals.showSettlementCalculator;
    const setShowSettlementCalculator = (show: boolean) => setExecutionModal('showSettlementCalculator', show);
    const showPauseModal = modals.showPauseModal;
    const setShowPauseModal = (show: boolean) => setExecutionModal('showPauseModal', show);

    /** إضبارة زميل موحّدة — عرض السجل الزمني */
    const [showLinkedDossierTimeline, setShowLinkedDossierTimeline] = useState(false);
    const [linkedDossierToView, setLinkedDossierToView] = useState<NonNullable<ExecutionFile['linkedDossiers']>[number] | null>(null);
    const [showTransferFileNumberChangeModal, setShowTransferFileNumberChangeModal] = useState(false);

    const rootFileId = String(currentFileId || '').trim();
    const unificationTick = useExecutionDashboardStore((s) => s.unificationTick);
    const childDossiers = useMemo(() => {
        if (!rootFileId) return [];
        try {
            const store = useExecutionDashboardStore.getState();
            return store.getChildDossiers(rootFileId);
        } catch { return []; }
    }, [rootFileId, currentFile?.updatedAt, unificationTick]);
    const hasChildDossiers = childDossiers.length > 0;

	const todayYmd = useTodayYmd();
    
    // 🆕 V16: TASK ENGINE STATE
    const [noteTitle, setNoteTitle] = useState<string>('');
    const [noteBody, setNoteBody] = useState<string>('');
    const [isTask, setIsTask] = useState<boolean>(false);
    const [taskDueDate, setTaskDueDate] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'done'>('pending');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');
    
    // NEW: Unified Execution & Assets Modal with Tabs
    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const followupOrchestrator = useExecutionFollowupOrchestrator({
        showUnifiedExecutionModal,
        executionData,
        setExecutionModal,
        executionDashboardFileId,
    });
    const {
        showUnifiedExecutionModalRef,
        seizureMatrixRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        specialRequestDate,
        setSpecialRequestDate,
        specialRequestContent,
        setSpecialRequestContent,
        specialRequestTemplatePick,
        setSpecialRequestTemplatePick,
        specialRequestManualTitle,
        setSpecialRequestManualTitle,
        specialRequestTemplateMenuOpen,
        setSpecialRequestTemplateMenuOpen,
        specialRequestTemplateMenuRef,
        showStayOfExecutionModal,
        setShowStayOfExecutionModal,
        inlineActionGateKey,
        setInlineActionGateKey,
        dossierActionModalOpen,
        setDossierActionModalOpen,
        dossierActionModalType,
        setDossierActionModalType,
        dossierActionModalSaving,
        setDossierActionModalSaving,
        executionDebtorTabIndex,
        setExecutionDebtorTabIndex,
        employeeCompulsoryBannerDismissed,
        setEmployeeCompulsoryBannerDismissed,
        showSolidaryCoerciveTargetModal,
        setShowSolidaryCoerciveTargetModal,
        solidaryCoerciveActionPending,
        setSolidaryCoerciveActionPending,
        followupSolidaryDebtorIndex,
        setFollowupSolidaryDebtorIndex,
        coerciveSubjectRef,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalBodyScrollRef,
        followupModalOpenGenerationRef,
        debtorWorkspaceChipStripRef,
        partyDeathModalParty,
        setPartyDeathModalParty,
        partyDeathModalDecisionId,
        setPartyDeathModalDecisionId,
        alimonyBeneficiaryDeathModalOpen,
        setAlimonyBeneficiaryDeathModalOpen,
        alimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalProfile,
        lastHeirSubRequestAtRef,
        evictionVacateDeadlineLocal,
        setEvictionVacateDeadlineLocal,
        evictionAssetsTabUnlocked,
        setEvictionAssetsTabUnlocked,
        evictionCaseExpenses,
        setEvictionCaseExpenses,
        encroachmentCaseExpenses,
        setEncroachmentCaseExpenses,
        specificDeliveryCaseExpenses,
        setSpecificDeliveryCaseExpenses,
        evictionVacateDraft,
        setEvictionVacateDraft,
        showEvictionExpenseModal,
        setShowEvictionExpenseModal,
        evictionExpenseAmount,
        setEvictionExpenseAmount,
        evictionExpenseNote,
        setEvictionExpenseNote,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
        showVisitationCalendarModal,
        setShowVisitationCalendarModal,
        heirNoticeDateDrafts,
        setHeirNoticeDateDrafts,
        heirSummonsDatePickerOpenByHeir,
        setHeirSummonsDatePickerOpenByHeir,
        evictionExpensePayMode,
        setEvictionExpensePayMode,
        showEvictionLawyerFeeModal,
        setShowEvictionLawyerFeeModal,
        lawyerFeeDisburseMode,
        setLawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        setLawyerFeeDisburseNotes,
        evictionExecutorVacateGrantApproved,
        setEvictionExecutorVacateGrantApproved,
        evictionResidentialGracePeriodStart,
        setEvictionResidentialGracePeriodStart,
        showEvictionResidentialGraceModal,
        setShowEvictionResidentialGraceModal,
        evictionGraceDecisionId,
        setEvictionGraceDecisionId,
        graceModalStartYmd,
        setGraceModalStartYmd,
        graceModalEndYmd,
        setGraceModalEndYmd,
        graceModalAllowResave,
        setGraceModalAllowResave,
        evictionResidentialGraceManuallyEndedAt,
        setEvictionResidentialGraceManuallyEndedAt,
        policeAssistanceModalOpen,
        setPoliceAssistanceModalOpen,
        followupExpandProcedureKey,
        setFollowupExpandProcedureKey,
        consumeFollowupExpandProcedure,
        policeAssistanceDecisionId,
        setPoliceAssistanceDecisionId,
        policeAssistanceRequestTitle,
        setPoliceAssistanceRequestTitle,
        policeAssistanceAgencyDraft,
        setPoliceAssistanceAgencyDraft,
        evictionHeirsNotificationDateYmd,
        setEvictionHeirsNotificationDateYmd,
        openEvictionExecutorCompletionRef,
        summonsHubInitialMainTab,
        setSummonsHubInitialMainTab,
        summonsContextDebtorKey,
        setSummonsContextDebtorKey,
        openExecutionSeizuresTab,
    } = followupOrchestrator;

    // NEW: Timeline Accordion    // NEW: Timeline Accordion (Relocated below Tools Grid)
    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState<boolean>(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState<string>('الكل');
    
    // CRITICAL: Grace Period Global State (restored from localStorage if available)
    const [gracePeriodActive, setGracePeriodActive] = useState<boolean>(executionData?.gracePeriodActive ?? true);
    const [gracePeriodEnded, setGracePeriodEnded] = useState<boolean>(executionData?.gracePeriodEnded ?? false);
    
    // 🆕 V8: DEBTOR NOTIFICATION PIPELINE (Initial vs Subsequent)
    const [notificationCount, setNotificationCount] = useState<number>(executionData?.notificationCount || 0);
    const [notificationPurpose, setNotificationPurpose] = useState<string>('');
    /** إعلان انتهاء المدة الرضائية قبل وصول تحديث executionData من الأب */
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    /** مثل أعلاه — لمسار الإضبارات غير التخلية */
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] = useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    useEffect(() => {
        if (!summonsMarkerPopoverOpen && !executionMemoBadgePopoverOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSummonsMarkerPopoverOpen(false);
                setExecutionMemoBadgePopoverOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [summonsMarkerPopoverOpen, executionMemoBadgePopoverOpen]);
    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState<boolean>(executionData?.forcedAttendanceIssued || false);
    const [debtorEvaded, setDebtorEvaded] = useState<boolean>(executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState<boolean>(executionData?.arrestWarrantUnlocked || false);
    
    const [creditorAttended, setCreditorAttended] = useState<boolean>(executionData?.creditorAttended ?? true);
    const [executionPaused, setExecutionPaused] = useState<boolean>(executionData?.executionPaused || false);
    useEffect(() => {
        setExecutionPaused(Boolean(executionData?.executionPaused || false));
    }, [executionData?.id, executionData?.executionPaused]);
    
    // 🆕 V9: UNIFIED SUMMONS HUB STATE
    const showUnifiedSummonsModal = modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) => setExecutionModal('showUnifiedSummonsModal', show);
    
    const coercionOrchestrator = useExecutionCoercionOrchestrator(executionFileKey, executionData);
    const {
        activeNoticeState,
        setActiveNoticeState,
        debtorAttendedVoluntarily,
        setDebtorAttendedVoluntarily,
        debtorForcedToAttend,
        setDebtorForcedToAttend,
        debtorArrested,
        setDebtorArrested,
        nonInterferenceIssued,
        setNonInterferenceIssued,
        summoningRound,
        setSummoningRound,
        voluntaryAttendanceCount,
        setVoluntaryAttendanceCount,
        investigationCourtRequested,
        setInvestigationCourtRequested,
        investigationMemoIssued,
        setInvestigationMemoIssued,
        investigationPathDebtorPresent,
        setInvestigationPathDebtorPresent,
        forcedPathAttendanceSecured,
        setForcedPathAttendanceSecured,
    } = coercionOrchestrator;

    // ===========================
    // 7-YEAR STATUTE OF LIMITATIONS TRACKER
    // ===========================
    const [lastActionDate, setLastActionDate] = useState<string | null>(executionData?.lastActionDate || null);
    const [showStatuteWarning, setShowStatuteWarning] = useState<boolean>(false);

    const {
        dossierStatusDraft,
        setDossierStatusDraft,
        dossierReasonDraft,
        setDossierReasonDraft,
        dossierDateDraft,
        setDossierDateDraft,
        dossierLifecyclePanelOpen,
        setDossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase,
        setDossierLifecyclePanelPhase,
        dossierPendingStatus,
        setDossierPendingStatus,
        dossierLifecyclePopoverRef,
        dossierLifecyclePanelPortalRef,
        dossierLifecyclePopStyle,
        setDossierLifecyclePopStyle,
        closeDossierLifecyclePanel,
    } = useExecutionDossierLifecyclePanelOrchestrator(executionData);

    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [permanentDeleteTimelineId, setPermanentDeleteTimelineId] = useState<string | null>(null);

    const [paidDebt, setPaidDebt] = useState<number>(0);
    const paidDebtRef = useRef<number>(paidDebt);
    paidDebtRef.current = paidDebt;
    const [paidCourtFees, setPaidCourtFees] = useState<number>(0);
    const [paidDirectorateFees, setPaidDirectorateFees] = useState<number>(0);
    const [paidClientFees, setPaidClientFees] = useState<number>(0);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;
        const handler = (e: Event) => {
            queueMicrotask(() => {
                const ce = e as CustomEvent<{
                    executionId?: string;
                    requestKind?: string;
                    outcome?: string;
                    decisionId?: string;
                    personalCoerciveSubtype?: string;
                    suppressNavigatorToast?: boolean;
                }>;
                const evId = String(ce.detail?.executionId ?? '');
                if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
                if (ce.detail?.suppressNavigatorToast === true) return;
                const outcome = String(ce.detail?.outcome ?? '');
                if (outcome !== 'approved' && outcome !== 'rejected' && outcome !== 'alternative') return;
                const decisionId = String(ce.detail?.decisionId ?? '').trim();
                if (!decisionId) return;
                const kind = String(ce.detail?.requestKind ?? '').trim();
                if (!kind) return;
                const pcSubtype = String(ce.detail?.personalCoerciveSubtype ?? '').trim();
                if (kind === 'seizure' || kind === 'unified_collection' || kind === 'guarantor_request' || kind === 'third_party_funds_received') return;
                if (showUnifiedExecutionModalRef.current) return;

                showToastRef.current(
                    outcome === 'approved' || outcome === 'alternative'
                        ? 'تم بتّ الطلب من المنفذ.'
                        : 'تم رفض الطلب من المنفذ.',
                    outcome === 'approved' || outcome === 'alternative' ? 'success' : 'info'
                );
            });
        };
        window.addEventListener('hami-execution-decision-outcome', handler as EventListener);
        return () => window.removeEventListener('hami-execution-decision-outcome', handler as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId]);

    useEffect(() => {
        const onToast = (e: Event) => {
            const ce = e as CustomEvent<{ message: string; type: 'success' | 'warning' | 'info' }>;
            if (ce.detail?.message) {
                showToastRef.current(ce.detail.message, ce.detail.type || 'success');
            }
        };
        window.addEventListener('hami-toast', onToast as EventListener);
        return () => window.removeEventListener('hami-toast', onToast as EventListener);
    }, []);

    useEffect(() => {
        if (!specialRequestTemplateMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            const menu = specialRequestTemplateMenuRef.current;
            const input = document.getElementById('hami-smart-request-template');
            if (menu?.contains(t)) return;
            if (input && input.contains(t)) return;
            setSpecialRequestTemplateMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc, true);
        return () => document.removeEventListener('mousedown', onDoc, true);
    }, [specialRequestTemplateMenuOpen]);

    useEffect(() => {
        const p = executionData?.paidClientFees;
        setPaidClientFees(typeof p === 'number' && p >= 0 ? p : 0);
    }, [executionData?.id, executionData?.paidClientFees]);

    useEffect(() => {
        const s = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
        setDossierStatusDraft(s);
        setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
        setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
    }, [
        executionData?.id,
        executionData?.dossier_lifecycle_status,
        executionData?.dossier_status_reason,
        executionData?.dossier_status_date,
    ]);

    const [noteText, setNoteText] = useState<string>('');
    const [appointmentPurpose, setAppointmentPurpose] = useState<string>('');
    const [appointmentDateOnly, setAppointmentDateOnly] = useState<string>('');
    const [appointmentTimeOptional, setAppointmentTimeOptional] = useState<string>('');
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [appointmentContext, setAppointmentContext] = useState<
        null | { kind: 'police_assistance'; decisionId: string; agencyName: string }
    >(null);
    const [executorScheduleModalOpen, setExecutorScheduleModalOpen] = useState(false);
    const [executorScheduleContext, setExecutorScheduleContext] = useState<null | {
        requestTitle: string;
        onSaved: (payload: ScheduledDateSavePayload) => void;
    }>(null);
    const [breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen] = useState(false);
    const [breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx] = useState<null | {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
        onFinalize: () => void;
    }>(null);
    const [judicialCustodianModalOpen, setJudicialCustodianModalOpen] = useState(false);
    const [judicialCustodianModalCtx, setJudicialCustodianModalCtx] = useState<null | {
        requestTitle: string;
        onSaved: (payload: JudicialCustodianSavePayload) => void;
        initialName?: string;
        initialSalary?: string;
    }>(null);
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | { onConfirm: () => void }>(
        null
    );

    // 🆕 V12: FINANCIAL LEDGER HISTORY
    const [financialLedger, setFinancialLedger] = useState<Array<{
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    }>>(executionData?.financialLedger || []);
    const financialLedgerRef = useRef(financialLedger);
    financialLedgerRef.current = financialLedger;
    const hasFinancialLedger = financialLedger.length > 0;
    const showLedgerModal = modals.showLedgerModal;
    const setShowLedgerModal = (show: boolean) => setExecutionModal('showLedgerModal', show);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(getLocalTodayYmd());
    const [debtorNotificationDate, setDebtorNotificationDate] = useState<string | null>(null);
    /** +يوم تقويمي واحد بقرار المحامي (مربع التمديد) — يُحفظ مع isHolidayExtension في الملف */
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState<boolean>(false);

    useEffect(() => {
        if (!executionData?.id) return;
        const fromFile =
            executionData.debtorNotificationDate ??
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate ??
            null;
        setDebtorNotificationDate(fromFile ?? null);
        setManualGraceCalendarExtra(!!executionData.isHolidayExtension);
    }, [
        executionData?.id,
        executionData?.debtorNotificationDate,
        executionData?.isHolidayExtension,
        (executionData?.debtors?.[0] as Debtor | undefined)?.notificationDate,
    ]);

    /** ملفات قديمة: إخبار مسجّل دون activeNoticeState — إعادة ضبط مسار «بعد الإخبار» */
    useEffect(() => {
        if (!executionData?.id) return;
        const hasNotif = !!(
            executionData.debtorNotificationDate ||
            (executionData.debtors?.[0] as Debtor | undefined)?.notificationDate
        );
        if (!hasNotif) return;
        if (executionData.debtorAttendedVoluntarily || executionData.debtorForcedToAttend) return;
        if (executionData.activeNoticeState) return;
        setActiveNoticeState('initial_notice');
        // eslint-disable-next-line react-hooks/exhaustive-deps -- عند تغيّر ملف التنفيذ فقط
    }, [executionData?.id]);

    // 🆕 V10.5: استبدال Toast القديم بنظام Toast الجديد (سيتم استخدام ExecutionToasts بدلاً من showToast)
    // ✅ FIXED: Proper types
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(executionData?.timelineEvents || []);
    const timelineEventsRef = useRef<TimelineEvent[]>(timelineEvents);
    timelineEventsRef.current = timelineEvents;
    /** يُعبَّأ بعد تعريف `persistExecutionMerge` — لاستدعاء الدمج من `executorApprovalActions` المعرف سابقاً */
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(null);
    const pushTimelineEventRef = useRef<((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null>(
        null
    );
    /** لقطات الملف لدمج قائمة الحراس دون إغلاق قديم على `executionData` */
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    const [earnerFeeCollectionSm, setEarnerFeeCollectionSm] = useState<EvictionEarnerFeeCollectionSM>(() =>
        defaultEvictionEarnerFeeCollectionSM()
    );
    const [caseNotesLog, setCaseNotesLog] = useState<NonNullable<ExecutionFile['caseNotesLog']>>(
        executionData?.caseNotesLog ?? []
    );

    useEffect(() => {
        setEarnerFeeCollectionSm(
            executionData?.eviction_earner_fee_collection_sm ?? defaultEvictionEarnerFeeCollectionSM()
        );
    }, [executionData?.id, executionData?.eviction_earner_fee_collection_sm]);
    const [caseTasksPending, setCaseTasksPending] = useState<NonNullable<ExecutionFile['caseTasksPending']>>(
        executionData?.caseTasksPending ?? []
    );
    const caseNotesLogRef = useRef(caseNotesLog);
    caseNotesLogRef.current = caseNotesLog;
    const caseTasksPendingRef = useRef(caseTasksPending);
    caseTasksPendingRef.current = caseTasksPending;

    const {
        evictionGracePinned,
        setEvictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        toggleEvictionGracePinned,
        gracePinnedKey,
        graceHiddenKey,
    } = useExecutionDashboardEvictionGraceUiState(executionData, executionId);

    const activeTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => !e.trashedAt),
        [timelineEvents]
    );

    /** دمج أحداث الإضبارة الفرعية مع الإضبارة الأم — مع إضافة source badge */
    const [showOnlyActiveFileTimeline, setShowOnlyActiveFileTimeline] = useState(false);
    /** عند التبديل إلى الإضبارة الفرعية، أظهر سجلها الزمني المستقل فقط */
    useEffect(() => {
        if (activeSubFileId) {
            setShowOnlyActiveFileTimeline(true);
        }
    }, [activeSubFileId]);

    const subDossierOpenedBackfillSigRef = useRef('');
    /** ضمان حدث «فتح الإضبارة الفرعية» — مرة واحدة لكل إضبارة فرعية */
    useEffect(() => {
        if (!isInabaActive || !activeSubFileId || !parentDossierId) return;
        const sig = `${activeSubFileId}:${parentDossierId}`;
        const tls = Array.isArray(executionData?.timelineEvents) ? executionData.timelineEvents : [];
        const threadKey = `sub_dossier_opened:${activeSubFileId}`;
        const hasOpen = tls.some(
            (e) =>
                String((e as { metadata?: Record<string, unknown> })?.metadata?.timelineThreadKey || '') ===
                threadKey
        );
        if (hasOpen) {
            subDossierOpenedBackfillSigRef.current = sig;
            return;
        }
        if (subDossierOpenedBackfillSigRef.current === sig) return;
        subDossierOpenedBackfillSigRef.current = sig;
        const next = ensureSubDossierOpenedTimelineEvent(
            tls,
            activeSubFileId,
            parentDossierId,
            String(executionData?.directorate || executionData?.delegationTargetDirectorate || '')
        );
        setTimelineEvents(next);
        queueMicrotask(() => {
            persistExecutionMergeRef.current?.({ timelineEvents: next });
        });
    }, [
        isInabaActive,
        activeSubFileId,
        parentDossierId,
        executionData?.id,
        executionData?.directorate,
        executionData?.delegationTargetDirectorate,
        executionData?.timelineEvents,
    ]);
    const mergedTimelineEvents = useMergedTimelineEvents(
        activeTimelineEvents,
        subFiles as any[],
        showOnlyActiveFileTimeline,
        activeSubFileId,
        parentDossierId,
    );

    const activeCaseNotesLog = useMemo(
        () => caseNotesLog.filter((n) => !n.trashedAt),
        [caseNotesLog]
    );
    const {
        completedTaskTitles,
        savedNotesSplit,
        activeCaseTasksPendingAll,
        activeGraceTasks,
        activeCaseTasksPending,
        trashedTimelineEvents,
        trashedCaseNotes,
        trashedCaseTasks,
    } = useCaseTasksAndNotes(timelineEvents, activeCaseNotesLog, caseTasksPending, caseNotesLog);

    const dockPinnedNotes = useMemo(
        () => activeCaseNotesLog.filter((n) => Boolean(n.pinned)),
        [activeCaseNotesLog]
    );
    const dockPinnedTasks = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt && Boolean(t.pinned)),
        [caseTasksPending]
    );

    /** عند تغيّر ملف التنفيذ: لا يبقى سجل زمني أو ملاحظات أو مهام من إضبارة أخرى في الحالة المحلية */
    useEffect(() => {
        if (!executionData?.id) return;
        const tls = executionData.timelineEvents;
        const raw = Array.isArray(tls) ? tls : [];
        const scoped =
            isInabaSubFileId(executionData.id) && activeSubFileId && parentDossierId
                ? ensureSubDossierOpenedTimelineEvent(
                      filterTimelineEventsForInabaDossier(raw, activeSubFileId),
                      activeSubFileId,
                      parentDossierId,
                      String(
                          executionData.directorate ||
                              (executionData as { delegationTargetDirectorate?: string })
                                  .delegationTargetDirectorate ||
                              ''
                      )
                  )
                : parentDossierId
                  ? filterTimelineEventsForParentDossier(raw, parentDossierId)
                  : raw;
        setTimelineEvents(scoped);
        const notes = executionData.caseNotesLog;
        setCaseNotesLog(Array.isArray(notes) ? notes : []);
        const tasks = executionData.caseTasksPending;
        setCaseTasksPending(Array.isArray(tasks) ? tasks : []);
        setSeizedAssets(Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : []);
        setSeizureDraftsByDecisionId(executionData.seizureDraftsByDecisionId ?? {});
        setActiveCoerciveActions(Array.isArray(executionData.activeCoerciveActions) ? executionData.activeCoerciveActions : []);
        setRealEstateSeizureAssets(
            Array.isArray(executionData.realEstateSeizureAssets) ? executionData.realEstateSeizureAssets : []
        );
    }, [executionDashboardFileId, activeSubFileId, parentDossierId, executionData?.directorate]);

    useEffect(() => {
        subDossierOpenedBackfillSigRef.current = '';
    }, [activeSubFileId, isInabaActive]);

    const nextTimelineId = useCallback(
        () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        []
    );
    
    // 🆕 V7: SEIZED ASSETS & COERCIVE ACTIONS STATE
    // ✅ FIXED: Proper types
    const [seizedAssets, setSeizedAssets] = useState<SeizedAsset[]>(executionData?.seizedAssets || []);
    const seizedAssetsSnapshotRef = useRef<SeizedAsset[]>(seizedAssets);
    seizedAssetsSnapshotRef.current = seizedAssets;

    const [realEstateSeizureAssets, setRealEstateSeizureAssets] = useState<RealEstateSeizureAsset[]>(
        executionData?.realEstateSeizureAssets ?? []
    );
    const realEstateSeizureSnapshotRef = useRef<RealEstateSeizureAsset[]>(realEstateSeizureAssets);
    realEstateSeizureSnapshotRef.current = realEstateSeizureAssets;

    const [thirdPartySeizureAssets, setThirdPartySeizureAssets] = useState<ThirdPartySeizureAsset[]>(
        executionData?.thirdPartySeizureAssets ?? []
    );
    const thirdPartySeizureSnapshotRef = useRef<ThirdPartySeizureAsset[]>(thirdPartySeizureAssets);
    thirdPartySeizureSnapshotRef.current = thirdPartySeizureAssets;

    const [standaloneExecutionMarks, setStandaloneExecutionMarks] = useState<StandaloneExecutionMark[]>(
        executionData?.standaloneExecutionMarks ?? []
    );
    const standaloneExecutionMarksSnapshotRef = useRef<StandaloneExecutionMark[]>(standaloneExecutionMarks);
    standaloneExecutionMarksSnapshotRef.current = standaloneExecutionMarks;
    useEffect(() => {
        const marks = (executionData as ExecutionFile | null | undefined)?.standaloneExecutionMarks;
        if (!Array.isArray(marks)) return;
        setStandaloneExecutionMarks(marks as StandaloneExecutionMark[]);
    }, [executionData?.standaloneExecutionMarks, executionStorageTick]);

    const getMilestoneTimelineSnapshot = useCallback(
        () =>
            buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            }),
        []
    );

    const [seizureDraftsByDecisionId, setSeizureDraftsByDecisionId] = useState<
        Record<string, SeizedAsset>
    >(() => executionData?.seizureDraftsByDecisionId ?? {});

    const seizureDraftsByDecisionIdRef = useRef(seizureDraftsByDecisionId);
    seizureDraftsByDecisionIdRef.current = seizureDraftsByDecisionId;
    const [activeCoerciveActions, setActiveCoerciveActions] = useState<string[]>(executionData?.activeCoerciveActions || []);
    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null); // null | 'salary' | 'property' | 'travel' | 'imprisonment'
    /** بعد موافقة المنفذ على طلب الحجز — إكمال الحقول التفصيلية في النافذة نفسها */
    const [seizureDetailCompletion, setSeizureDetailCompletion] = useState<{
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null>(null);
    const saveCoerciveActionRef = useRef<(actionType: string, details: Record<string, string>) => void>(
        () => {}
    );
    const focusSeizurePropertyInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureMovableInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureThirdPartyInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureNoticeInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});

    const seizureOrchestrator = useExecutionSeizureOrchestrator({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
    });
    const {
        propertySeizureRequestModalOpen,
        setPropertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        setPropertySeizureSubjectDraft,
        movableSeizureRequestModalOpen,
        setMovableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        setMovableSeizureSubjectDraft,
        seizedPropertyStepModalOpen,
        setSeizedPropertyStepModalOpen,
        seizedPropertyStepDecisionId,
        setSeizedPropertyStepDecisionId,
        seizedPropertyStepPropertyId,
        setSeizedPropertyStepPropertyId,
        seizedPropertyStepEntityKind,
        setSeizedPropertyStepEntityKind,
        seizedPropertyStepKind,
        setSeizedPropertyStepKind,
        seizedPropertyExpertsNamesDraft,
        setSeizedPropertyExpertsNamesDraft,
        seizedPropertyExpertReportDateDraft,
        setSeizedPropertyExpertReportDateDraft,
        seizedPropertyExpertPriceDraft,
        setSeizedPropertyExpertPriceDraft,
        seizedPropertyAuctionDateDraft,
        setSeizedPropertyAuctionDateDraft,
        linkSeizureAuctionToAppointments,
        setLinkSeizureAuctionToAppointments,
        seizedPropertyBuyerNameDraft,
        setSeizedPropertyBuyerNameDraft,
        seizedPropertyAwardAmountDraft,
        setSeizedPropertyAwardAmountDraft,
        seizedPropertyStepNotesDraft,
        setSeizedPropertyStepNotesDraft,
        seizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultModalOpen,
        seizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
        seizureMarkModalOpen,
        setSeizureMarkModalOpen,
        seizureMarkModalEntityKind,
        setSeizureMarkModalEntityKind,
        seizureMarkModalEntityId,
        setSeizureMarkModalEntityId,
        seizureMarkLetterNumberDraft,
        setSeizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        setSeizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkEntityDraft,
        publicationModalOpen,
        setPublicationModalOpen,
        publicationModalEntityKind,
        setPublicationModalEntityKind,
        publicationModalEntityId,
        setPublicationModalEntityId,
        publicationNewspaperNameDraft,
        setPublicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationDateYmdDraft,
        showRealEstateSeizureModal,
        setShowRealEstateSeizureModal,
        realEstateSeizureModalDecisionId,
        setRealEstateSeizureModalDecisionId,
        showGuarantorDetailsModal,
        setShowGuarantorDetailsModal,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
        guarantorNameDraft,
        setGuarantorNameDraft,
        guarantorWorkplaceDraft,
        setGuarantorWorkplaceDraft,
        guarantorSalaryDraft,
        setGuarantorSalaryDraft,
        guarantorDeductionDraft,
        setGuarantorDeductionDraft,
        guarantorPanelExpanded,
        setGuarantorPanelExpanded,
        openGuarantorDetailsModal,
    } = seizureOrchestrator;

    const approvedSeizedAssets = useMemo(
        () => (seizedAssets || []).filter((asset) => String(asset?.status || '') !== 'pending'),
        [seizedAssets]
    );
    const movableSeizureRegistryAssets = useMemo(
        () =>
            (seizedAssets || []).filter(
                (a) => String(a?.status || '') !== 'pending' && isMovablePropertySeizureRow(a)
            ),
        [seizedAssets]
    );
    const { salarySeizureRegistryAssets, realEstateSeizureRegistryAssets, thirdPartySeizureRegistryAssets } =
        useSeizureRegistryAssets(seizedAssets, realEstateSeizureAssets, thirdPartySeizureAssets);

    const salarySeizureTabRows = useExecutionDashboardSalarySeizureTabRows({
        salarySeizureRegistryAssets,
        seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
        executionData,
        decisionsStorageExecutionId,
        executionId,
    });

    const [isPaused, setIsPaused] = useState<boolean>(executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState<string>(executionData?.pauseReason ?? '');

    const [executionFeeAdded, setExecutionFeeAdded] = useState<boolean>(executionData?.executionFeeAdded ?? false);

    const {
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
    } = useToastSystem(executionData?.id, executionId);

    const decisionsOrchestrator = useExecutionDecisionsOrchestrator({
        showDecisionsModal,
        setShowDecisionsModal,
    });
    const {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    } = decisionsOrchestrator;

    const forcedBringDecisionState = useMemo(
        () => getPersonalCoerciveSubtypeOutcome(executionData?.id ?? executionId, 'forced_bring_in'),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const employeeForcedBringAwaitingPersonalOutcome = useMemo(
        () =>
            Boolean(
                forcedBringDecisionState.approved &&
                    executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                    executionData?.forced_bring_in_personal_outcome !== 'absconded'
            ),
        [forcedBringDecisionState.approved, executionData?.forced_bring_in_personal_outcome]
    );

    useEffect(() => {
        if (!executionData?.id) return;
        /** منع تسرّب محجوزات/إجراءات إكراهية من إضبارة سابقة عند غياب الحقول في الملف الحالي */
        setSeizedAssets(Array.isArray(executionData.seizedAssets) ? executionData.seizedAssets : []);
        const ac = (executionData as ExecutionFile).activeCoerciveActions;
        setActiveCoerciveActions(Array.isArray(ac) ? [...ac] : []);
        const dr = executionData.seizureDraftsByDecisionId;
        setSeizureDraftsByDecisionId(
            dr && typeof dr === 'object' && !Array.isArray(dr) ? (dr as Record<string, SeizedAsset>) : {}
        );
        setForcedAttendanceIssued(
            typeof executionData.forcedAttendanceIssued === 'boolean'
                ? executionData.forcedAttendanceIssued
                : false
        );
        setActiveNoticeState(executionData.activeNoticeState ?? null);
        setCaseTasksPending(
            Array.isArray(executionData.caseTasksPending) ? executionData.caseTasksPending : []
        );
    }, [
        executionData?.id,
        executionData?.updatedAt,
        executionData?.seizedAssets,
        executionData?.forcedAttendanceIssued,
        executionData?.activeNoticeState,
        (executionData as ExecutionFile)?.activeCoerciveActions,
        executionData?.seizureDraftsByDecisionId,
        executionData?.caseTasksPending,
    ]);
    
    // 🆕 V10.8: EXECUTION FEE INJECTION STATE
    const [executionFeeInjected, setExecutionFeeInjected] = useState<boolean>(executionData?.executionFeeInjected || false);
    
    const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = useExecutionFinancialOrchestrator({ setShowUnifiedExecutionModal });

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; tab?: string }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            setShowExecutionFinancialHub(false);
            setShowUnifiedExecutionModal(false);
            setShowUnifiedSummonsModal(false);
            setShowNotesModal(false);
            setShowDocumentsModal(false);
            setShowAppointmentModal(false);
            setShowTimelineModal(false);
            setShowNotificationModal(false);
            const tabRaw = String(ce.detail?.tab || '').trim();
            const tab =
                tabRaw === 'current' || tabRaw === 'previous' || tabRaw === 'appeals'
                    ? tabRaw
                    : undefined;
            const did = String(ce.detail?.decisionId || '').trim() || null;
            openDecisionsModalWithBoot(
                tab || did ? { tab: tab ?? undefined, decisionId: did } : undefined,
            );
        };
        window.addEventListener('hami-open-decisions-modal', handler as EventListener);
        return () => window.removeEventListener('hami-open-decisions-modal', handler as EventListener);
    }, [
        executionData?.id,
        executionId,
        setShowDecisionsModal,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
    ]);

    const { thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch } =
        useThirdPartySeizuresUi(executionData);

    useSeizureApprovalToast({
        executionDataId: executionData?.id,
        executionId,
        showToast,
    });
    
    // 🆕 V10.5: PERFORMANCE MONITORING
    useEffect(() => {
        PerformanceMonitor.start('ExecutionDashboard');
        return () => {
            PerformanceMonitor.end('ExecutionDashboard');
        };
    }, []);
    
    // 🚀 V11.0: REMOVED - validation moved to initial state for better performance
    
    // ✅ IMPORTANT: Don't use early returns - use conditional rendering in JSX instead
    // This avoids hooks order violations with useMemo calls that come after
    
    // ===========================
    // OMNIBUS 1:1 DATA BINDING - ZERO DATA LOSS
    // ===========================
    
    const {
        // HEADER & METADATA (Exact Binding from Modal)
        directorate = '',
        fileNumber = '',
        fileYear = '',
        executionNumber = fileNumber,
        executionYear = fileYear,
        executionType = '',
        
        // DOCUMENT INFO (Exact Binding)
        docType = '',
        docNumber = '',
        claimType = '',
        judgmentDate = '',
        classification = '',
        
        // PARTIES (Arrays - NO MOCK DATA)
        creditors = [],
        debtors = [],
        
        // FINANCIAL DATA (Exact Binding - STRICT 1:1 FROM CREATION FORM)
        totalAmount = 0,  // From "أصل المبلغ المحكوم به" field
        debtAmount = totalAmount, // Backward compatibility
        
        // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين - تُضاف للتنفيذ)
        lawyerFeesAmount = 0,  // From "أتعاب المحاماة المحكوم بها" checkbox
        executionFee = lawyerFeesAmount || 0,  // Backward compatibility
        
        // 💼 PRIVATE CLIENT FEES (يدفعها الموكل للمحامي - حسابات خاصة)
        clientFeesAmount = 0,  // From "أتعاب المحاماة المتفق عليها مع الموكل" field
        
        courtFees = 0,     // Will be calculated by financial engine
        directorateFees = 0, // Will be calculated by financial engine
        
        // ALIMONY SPECIFIC
        monthlyAlimony = 0,
        alimony = null,
        accumulatedAlimony = alimony?.calculated?.totalAccumulated || 0,
        
        // LEGAL LOGIC FLAGS
        initiator = 'الدائن',
        representedParty = 'creditor',
        daysSinceNotice = 0, // ⚠️ DEPRECATED: استخدم daysSinceNoticeCalculated بدلاً منها
        isAlimonyCase = claimType?.includes('نفقة'),
        lastPaymentDate = null,
        
        // SHARIA DEED DATA (if applicable)
        shariaDeedNumber = '',
        shariaRegisterNumber = '',
        shariaIssueDate = '',
        shariaIssuingCourt = '',
        
        // COMMERCIAL PAPER DATA (if applicable)
        chequeBankName = '',
        chequeIssueDate = '',
        chequeNumber = '',
        
        // OTHER
        status = 'active',
        createdAt = null,
        
        // مشاهدة واستصحاب (من ExecutionCreationView)
        includesSleepover = false,
        visitationChildrenNames,
        custodyWardNames,

        property_number: evictionPropertyNumber = '',
        district: evictionPropertyDistrict = '',
        property_type: evictionPropertyTypeField = '',
        full_address: evictionFullAddressField = '',
        eviction_premises_use: evictionPremisesUseRaw = undefined,

    } = executionData;
    
    const visitChildNames = Array.isArray(visitationChildrenNames) ? visitationChildrenNames : [];
    const custodyWardNamesList = Array.isArray(custodyWardNames) ? custodyWardNames : [];

    const {
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        headerFields,
        showJudgmentMeta,
    } = useDossierHeaderMetadata(
        viewExecutionData,
        classification,
        claimType,
        evictionCaseExpenses,
        visitChildNames,
        custodyWardNamesList,
        evictionPremisesUseRaw,
        evictionPropertyTypeField,
        judgmentDate,
        activeCoerciveActions,
        activeTimelineEvents,
        docType,
        docNumber,
    );

    const parentVisitChildNames = Array.isArray(parentExecutionFile?.visitationChildrenNames)
        ? parentExecutionFile.visitationChildrenNames
        : [];
    const parentCustodyWardNamesList = Array.isArray(parentExecutionFile?.custodyWardNames)
        ? parentExecutionFile.custodyWardNames
        : [];
    const parentEvictionCaseExpenses = Array.isArray(parentExecutionFile?.evictionCaseExpenses)
        ? parentExecutionFile.evictionCaseExpenses
        : [];

    const {
        headerFields: parentHeaderFields,
        classificationDisplay: parentClassificationDisplay,
        claimTypeArabicDisplay: parentClaimTypeArabicDisplay,
        judgmentDateDisplay: parentJudgmentDateDisplay,
        showJudgmentMeta: parentShowJudgmentMeta,
    } = useDossierHeaderMetadata(
        parentExecutionFile ?? undefined,
        parentExecutionFile?.classification,
        String(parentExecutionFile?.claimType ?? ''),
        parentEvictionCaseExpenses,
        parentVisitChildNames,
        parentCustodyWardNamesList,
        (parentExecutionFile as { eviction_premises_use?: string } | null)?.eviction_premises_use,
        String((parentExecutionFile as { property_type?: string } | null)?.property_type ?? ''),
        parentExecutionFile?.judgmentDate,
        activeCoerciveActions,
        activeTimelineEvents,
        String(parentExecutionFile?.docType ?? ''),
        String(parentExecutionFile?.docNumber ?? ''),
    );

    // ===========================
    // Financial debug logging removed from render path for performance
    
    const effectiveCreditors = creditors || [];
    const effectiveDebtors = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors;
        }
        return debtors || [];
    }, [debtors, executionData?.debtors]);

    const partyMultiplicityExec = executionData?.party_multiplicity;
    const legacyGlobalSolidary = partyMultiplicityExec?.isSolidaryLiability ?? false;
    const additionalCreditorsPm = partyMultiplicityExec?.additionalCreditors ?? [];

    /** للعرض فقط: المدين الأساسي ثم الإضافيين — يطابق party_multiplicity */
    const allDebtorsUnified = useAllDebtorsUnified(effectiveDebtors, executionData);

    const resolveDebtorSolidaryFlag = useCallback(
        (row: (typeof allDebtorsUnified)[number]) => {
            const primary = effectiveDebtors[0] as import('@/app/types/execution').Debtor | undefined;
            const perDebtorSolidaryMode =
                allDebtorsUnified.length > 1 &&
                (primary?.isSolidaryLiability !== undefined ||
                    (partyMultiplicityExec?.additionalDebtors ?? []).some(
                        (d) => d.isSolidaryLiability !== undefined,
                    ));
            if (perDebtorSolidaryMode) return Boolean(row.isSolidaryLiability);
            return legacyGlobalSolidary;
        },
        [allDebtorsUnified, effectiveDebtors, partyMultiplicityExec?.additionalDebtors, legacyGlobalSolidary],
    );

    const allDebtorsSolidary = useMemo(
        () =>
            allDebtorsUnified.length > 1 &&
            allDebtorsUnified.every((r) => resolveDebtorSolidaryFlag(r)),
        [allDebtorsUnified, resolveDebtorSolidaryFlag],
    );

    /** توافق مع المنطق السابق — كل المدينين متضامنين */
    const isSolidaryLiability = allDebtorsSolidary;

    /** مدين أساسي + إضافيون — لعرض «نافذة» واحدة في الواجهة الرئيسية */
    const debtorWorkspaceEntries = useDebtorWorkspaceEntries(
        effectiveDebtors,
        executionData?.party_multiplicity?.additionalDebtors,
        allDebtorsUnified,
    );

    const { creditorWorkspaceEntries, creditorNamesTextList } = useCreditorWorkspace(
        effectiveCreditors,
        additionalCreditorsPm,
    );

    useEffect(() => {
        setExecutionDebtorTabIndex((i) => {
            if (allDebtorsUnified.length === 0) return 0;
            const perSplit = isPerDebtorSolidarySplitMode(
                allDebtorsUnified,
                partyMultiplicityExec?.additionalDebtors,
            );
            if (perSplit) {
                const groups = buildDebtorLiabilityGroups(debtorWorkspaceEntries);
                if (groups.length > 0) {
                    return Math.min(Math.max(0, i), groups.length - 1);
                }
            }
            return Math.min(Math.max(0, i), allDebtorsUnified.length - 1);
        });
    }, [allDebtorsUnified.length, executionData?.id, debtorWorkspaceEntries, partyMultiplicityExec?.additionalDebtors]);

    const perDebtorSolidarySplitMode = useMemo(
        () =>
            isPerDebtorSolidarySplitMode(
                allDebtorsUnified,
                partyMultiplicityExec?.additionalDebtors,
            ),
        [allDebtorsUnified, partyMultiplicityExec?.additionalDebtors],
    );

    const debtorLiabilityGroups = useMemo(
        (): DebtorLiabilityGroup[] =>
            perDebtorSolidarySplitMode ? buildDebtorLiabilityGroups(debtorWorkspaceEntries) : [],
        [perDebtorSolidarySplitMode, debtorWorkspaceEntries],
    );

    const liabilityGroupTabsMode = shouldShowDebtorLiabilityGroupTabs(
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
    );

    /** ذمة مقسومة (تبويبات): المدين النشط يحدد مسارات محضر المتابعة والإجراءات الجبرية */
    const multiDebtorMode = allDebtorsUnified.length > 1;
    /** تبويبات الذمة: متضامنون في تبويب / مستقلون في تبويب — أو تبويب لكل مدين (الوضع القديم) */
    const debtorBrowserTabsMode = liabilityGroupTabsMode
        ? liabilityGroupTabsMode
        : multiDebtorMode && !allDebtorsSolidary;

    const activeLiabilityGroup = liabilityGroupTabsMode
        ? (debtorLiabilityGroups[executionDebtorTabIndex] ?? debtorLiabilityGroups[0] ?? null)
        : null;
    const activeGroupEntries = activeLiabilityGroup?.entries ?? [];
    const activeLiabilityGroupId = activeLiabilityGroup?.id ?? null;

    const allDebtorRowsForLiability = useMemo(
        () => readAllDebtorRowsFromExecution(executionData as Record<string, unknown> | null | undefined),
        [executionData],
    );
    const activeDebtorSolidary = useMemo(() => {
        if (liabilityGroupTabsMode && activeLiabilityGroupId) {
            return activeLiabilityGroupId === 'solidary';
        }
        const row = allDebtorsUnified[executionDebtorTabIndex];
        return row ? resolveDebtorSolidaryFlag(row) : legacyGlobalSolidary;
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroupId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        resolveDebtorSolidaryFlag,
        legacyGlobalSolidary,
    ]);
    const activeWorkspaceDebtorForFollowup = useMemo(() => {
        if (!debtorBrowserTabsMode) return null;
        if (liabilityGroupTabsMode) {
            return activeGroupEntries[0] ?? null;
        }
        if (debtorWorkspaceEntries.length === 0) return null;
        return (
            debtorWorkspaceEntries[executionDebtorTabIndex] ??
            debtorWorkspaceEntries[0] ??
            null
        );
    }, [
        debtorBrowserTabsMode,
        liabilityGroupTabsMode,
        activeGroupEntries,
        debtorWorkspaceEntries,
        executionDebtorTabIndex,
    ]);

    const primaryDebtorWorkspaceKey = debtorWorkspaceEntries[0]?.key;
    const primaryDebtorKeyResolved = primaryDebtorWorkspaceKey ?? 'primary_debtor';

    const showFollowupSolidaryDebtorTabs =
        liabilityGroupTabsMode &&
        activeLiabilityGroupId === 'solidary' &&
        activeGroupEntries.length > 1;

    const effectiveFollowupDebtorEntry = useMemo(() => {
        if (showFollowupSolidaryDebtorTabs) {
            return (
                activeGroupEntries[followupSolidaryDebtorIndex] ??
                activeGroupEntries[0] ??
                null
            );
        }
        return activeWorkspaceDebtorForFollowup;
    }, [
        showFollowupSolidaryDebtorTabs,
        activeGroupEntries,
        followupSolidaryDebtorIndex,
        activeWorkspaceDebtorForFollowup,
    ]);

    const followupAssignmentWorkspaceCtx = useMemo(
        () => ({
            splitDebtsTabs: debtorBrowserTabsMode,
            activeDebtorKey:
                effectiveFollowupDebtorEntry?.key ??
                primaryDebtorWorkspaceKey ??
                'primary_debtor',
            activeIsPrimary: Boolean(effectiveFollowupDebtorEntry?.isPrimary),
        }),
        [
            debtorBrowserTabsMode,
            effectiveFollowupDebtorEntry,
            primaryDebtorWorkspaceKey,
        ],
    );



    useEffect(() => {
        setFollowupSolidaryDebtorIndex(0);
    }, [executionDebtorTabIndex, activeLiabilityGroupId]);

    const mergedTimelineEventsDebtorScoped = useMemo(() => {
        if (!debtorBrowserTabsMode || !primaryDebtorWorkspaceKey) {
            return mergedTimelineEvents;
        }
        if (liabilityGroupTabsMode && activeGroupEntries.length > 0) {
            const keys = new Set(activeGroupEntries.map((ent) => ent.key));
            return mergedTimelineEvents.filter((e) => {
                for (const ak of keys) {
                    if (timelineEventBelongsToDebtorWorkspace(e as any, ak, primaryDebtorWorkspaceKey)) {
                        return true;
                    }
                }
                return false;
            });
        }
        if (!activeWorkspaceDebtorForFollowup) {
            return mergedTimelineEvents;
        }
        const ak = activeWorkspaceDebtorForFollowup.key;
        return mergedTimelineEvents.filter((e) =>
            timelineEventBelongsToDebtorWorkspace(e as any, ak, primaryDebtorWorkspaceKey)
        );
    }, [
        debtorBrowserTabsMode,
        liabilityGroupTabsMode,
        activeGroupEntries,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        mergedTimelineEvents,
    ]);

    const mergedTimelineRadarPreviewLimit = useMemo(() => {
        const base = debtorBrowserTabsMode ? mergedTimelineEventsDebtorScoped : mergedTimelineEvents;
        return base.some((e) => Boolean((e as any).isPinned)) ? 5 : 3;
    }, [debtorBrowserTabsMode, mergedTimelineEventsDebtorScoped, mergedTimelineEvents]);

    const assignmentWorkspaceCtx = useMemo(
        () => ({
            splitDebtsTabs: debtorBrowserTabsMode,
            activeDebtorKey:
                debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup
                    ? activeWorkspaceDebtorForFollowup.key
                    : primaryDebtorWorkspaceKey ?? 'primary_debtor',
            activeIsPrimary: !debtorBrowserTabsMode || Boolean(activeWorkspaceDebtorForFollowup?.isPrimary),
        }),
        [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, primaryDebtorWorkspaceKey]
    );

    const unifiedSummonsTargetDebtorKey = useMemo(
        () => summonsContextDebtorKey ?? assignmentWorkspaceCtx.activeDebtorKey,
        [summonsContextDebtorKey, assignmentWorkspaceCtx.activeDebtorKey]
    );
    const activeDebtorNoticeScope = useMemo(
        () =>
            getDebtorNoticeStateForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_notification_date_by_debtor,
            executionData?.execution_memo_anchor_date_by_debtor,
            executionData?.active_notice_state_by_debtor,
            executionData?.notice_voluntary_period_end_declared_by_debtor,
            executionData?.debtor_absence_badge_dismissed_by_debtor,
            executionData?.debtorNotificationDate,
            executionData?.execution_memo_anchor_date,
            executionData?.activeNoticeState,
            executionData?.notice_voluntary_period_end_declared,
            executionData?.debtor_absence_badge_dismissed,
            executionData?.debtors,
        ]
    );
    const scopedNotificationCount = useMemo(
        () =>
            getDebtorNotificationCountForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.notification_count_by_debtor,
            executionData?.notificationCount,
        ]
    );
    const scopedSummonsMarker = useMemo(
        () =>
            getDebtorSummonsMarkerForKey(
                executionData,
                unifiedSummonsTargetDebtorKey,
                primaryDebtorKeyResolved
            ),
        [
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_summons_marker_by_debtor,
            executionData?.debtor_summons_marker,
        ]
    );
    useEffect(() => {
        setNotificationCount((prev) =>
            prev === scopedNotificationCount ? prev : scopedNotificationCount
        );
    }, [scopedNotificationCount, unifiedSummonsTargetDebtorKey]);
    useEffect(() => {
        setDebtorSummonsMarkerLocal((prev) =>
            areDebtorSummonsMarkersEqual(prev, scopedSummonsMarker) ? prev : scopedSummonsMarker
        );
    }, [scopedSummonsMarker, unifiedSummonsTargetDebtorKey]);

    const { activeDebtorIsEmployee, activeDebtorIsDeceased } = useActiveDebtorProfile(
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    );

    const {
        activeDebtorIsEmployee: followupActiveDebtorIsEmployee,
        activeDebtorIsDeceased: followupActiveDebtorIsDeceased,
    } = useActiveDebtorProfile(
        executionData,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        effectiveDebtors,
    );

    const followupActiveDebtorNoticeScope = useMemo(
        () =>
            getDebtorNoticeStateForKey(
                executionData,
                followupAssignmentWorkspaceCtx.activeDebtorKey,
                primaryDebtorKeyResolved,
            ),
        [
            followupAssignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKeyResolved,
            executionData?.debtor_notification_date_by_debtor,
            executionData?.execution_memo_anchor_date_by_debtor,
            executionData?.active_notice_state_by_debtor,
            executionData?.notice_voluntary_period_end_declared_by_debtor,
            executionData?.debtor_absence_badge_dismissed_by_debtor,
            executionData?.debtorNotificationDate,
            executionData?.execution_memo_anchor_date,
            executionData?.activeNoticeState,
            executionData?.notice_voluntary_period_end_declared,
            executionData?.debtor_absence_badge_dismissed,
            executionData?.debtors,
        ],
    );

    const modalActiveDebtorNoticeScope = showFollowupSolidaryDebtorTabs
        ? followupActiveDebtorNoticeScope
        : activeDebtorNoticeScope;
    const followupModalDebtorIsEmployee = debtorBrowserTabsMode
        ? followupActiveDebtorIsEmployee
        : activeDebtorIsEmployee;
    const followupModalDebtorIsDeceased = debtorBrowserTabsMode
        ? followupActiveDebtorIsDeceased
        : activeDebtorIsDeceased;
    const modalKasabTerminationEmphasis = !followupModalDebtorIsEmployee;

    const {
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        employeeAssignmentPhaseForCoercive,
        employeeUnlocksPersonalCoerciveFromAssignment,
    } = useExecutionDashboardEmployeeAssignmentCoerciveState({
        executionData,
        assignmentWorkspaceActiveDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
        followupAssignmentWorkspaceActiveDebtorKey:
            followupAssignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorIsEmployee,
        followupModalDebtorIsEmployee,
    });

    const followupModalEntityKind = useMemo((): DebtorEntityKind => {
        const prim = executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        const entry = effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup;
        if (debtorBrowserTabsMode && entry) {
            if (!entry.isPrimary) {
                const ad = executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === entry.key
                );
                debtor = ad ?? entry.d;
            } else {
                debtor = prim ?? entry.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData,
            debtor,
            debtorKey: followupAssignmentWorkspaceCtx.activeDebtorKey,
        });
    }, [
        executionData,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        followupAssignmentWorkspaceCtx.activeDebtorKey,
    ]);

    const followupModalSpecialization = useMemo(
        () =>
            resolveFollowupSpecializationFromExecution(
                executionData as Record<string, unknown> | null | undefined,
                followupModalDebtorIsEmployee,
                claimType,
                followupModalEntityKind,
            ),
        [executionData, followupModalDebtorIsEmployee, claimType, followupModalEntityKind],
    );

    const followupModalSpecializationEffective = useMemo(
        () =>
            applyDebtorDeathFollowupOverlay(
                followupModalSpecialization,
                Boolean(followupModalDebtorIsDeceased),
            ),
        [followupModalSpecialization, followupModalDebtorIsDeceased],
    );

    const { seizedPropertiesForSeizureLog, seizedMovablesForSeizureLog, seizureLogExecutorDecisions } =
        useSeizureLogEntityData({
            viewExecutionData,
            decisionsStorageExecutionId,
            decisionsReloadEpoch,
        });

    const {
        showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        unifiedSeizureLogTab,
        setUnifiedSeizureLogTab,
        unifiedSeizureLogEntries,
        unifiedSeizureTabCounts,
        hasUnifiedSeizureLogContent,
        openUnifiedSeizureLog,
        thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft,
    } = useUnifiedSeizureLog({
        viewExecutionData,
        decisionsStorageExecutionId,
        executionId,
        activeDebtorIsDeceased,
        realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        movableSeizureRegistryAssets,
        seizedMovablesForSeizureLog,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        decisionsReloadEpoch,
        showToast,
    });

    useExecutionDashboardWindowEventListeners({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        setShowDecisionsModal,
        openExecutionSeizuresTab,
        pushTimelineEventRef,
        nextTimelineId,
        showDecisionsModal,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
    });

    const activeDebtorNameResolved = useMemo(() => {
        const row = allDebtorsUnified[executionDebtorTabIndex];
        return String(row?.name || debtors?.[0]?.name || 'المدين').trim();
    }, [allDebtorsUnified, executionDebtorTabIndex, debtors]);

    /** مسار الإنشاء للمدين النشط في التبويب — لنفس نص زر ⋮ في محضر المتابعة */
    const activeDebtorInitialWasEmployee = useMemo(() => {
        if (!executionData) return undefined;
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                const p = executionData.debtors?.[0] as Debtor | undefined;
                return typeof p?.employmentInitialWasEmployee === 'boolean'
                    ? p.employmentInitialWasEmployee
                    : undefined;
            }
            const ad = executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
            );
            return ad && typeof ad.employmentInitialWasEmployee === 'boolean'
                ? ad.employmentInitialWasEmployee
                : undefined;
        }
        const p = executionData.debtors?.[0] as Debtor | undefined;
        return typeof p?.employmentInitialWasEmployee === 'boolean'
            ? p.employmentInitialWasEmployee
            : undefined;
    }, [executionData, debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup]);

    const { activeTimelineEventsDebtorScoped, timelineRadarPreviewLimit } = useDebtorScopedTimeline(
        activeTimelineEvents,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        timelineEventBelongsToDebtorWorkspace,
    );

    const kasabTerminationEmphasis = !activeDebtorIsEmployee;

    const activeFollowupDebtorKeyForEntity = String(
        assignmentWorkspaceCtx.activeDebtorKey ?? primaryDebtorWorkspaceKey ?? executionId ?? ''
    );
    const activeDebtorEntityKind = useMemo((): DebtorEntityKind => {
        const prim = executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (!activeWorkspaceDebtorForFollowup.isPrimary) {
                const ad = executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key
                );
                debtor = ad ?? activeWorkspaceDebtorForFollowup.d;
            } else {
                debtor = prim ?? activeWorkspaceDebtorForFollowup.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData,
            debtor,
            debtorKey: activeFollowupDebtorKeyForEntity,
        });
    }, [
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeFollowupDebtorKeyForEntity,
    ]);
    const activeDebtorIsLegalEntity = isLegalEntityDebtorKind(activeDebtorEntityKind);
    const isRepresentingDebtor = useMemo(
        () => isLawyerRepresentingDebtor(executionData),
        [executionData]
    );
    const appealPerspective = isRepresentingDebtor ? 'debtor_agent' : 'creditor_agent';
    const hideCoerciveTabsForDebtorAgent = isRepresentingDebtor && !activeDebtorIsLegalEntity;

    const executionDomainContext = useMemo(
        () =>
            resolveExecutionDomainContext(
                executionData as Record<string, unknown> | null | undefined,
                decisionsStorageExecutionId ?? executionId
            ),
        [executionData, decisionsStorageExecutionId, executionId]
    );

    /** مصدر موحّد — نفس أعلام resolveFollowupSpecializationFromExecution عبر طبقة العزل */
    const followupSpecialization = executionDomainContext.flags;

    const followupSpecializationEffective = useMemo(
        () => applyDebtorDeathFollowupOverlay(followupSpecialization, Boolean(activeDebtorIsDeceased)),
        [followupSpecialization, activeDebtorIsDeceased]
    );

    const timelineFilterOptions = useMemo(
        () =>
            resolveExecutionTimelineFilterOptions(
                executionTimelineVisibilityFromFollowup({
                    ...followupSpecialization,
                    showOtherPartyTimelineTab: isRepresentingDebtor,
                    hideCoerciveTimelineTab: hideCoerciveTabsForDebtorAgent,
                })
            ),
        [followupSpecialization, isRepresentingDebtor, hideCoerciveTabsForDebtorAgent]
    );

    useEffect(() => {
        setActiveTimelineFilter((prev) =>
            normalizeExecutionTimelineFilter(prev, timelineFilterOptions)
        );
    }, [timelineFilterOptions]);

    /** وفاة المدين أو استحصال مالي+موظف: إخفاء التبويب؛ الكاسب يعيد الظهور */
    const showPersonalCoerciveFollowupTab =
        !followupSpecializationEffective.hidePersonalCoerciveFollowupTab;
    /** موظف: إظهار حجز الراتب في الحجز المالي — كاسب: إخفاؤه */
    const showSalarySeizureInFollowupModal = followupModalDebtorIsEmployee;
    const followupSalarySeizureLabel =
        followupModalDebtorIsDeceased && followupModalDebtorIsEmployee
            ? 'حجز مستحقات ومكافأة نهاية الخدمة'
            : 'طلب حجز راتب (١/٥)';
    useEffect(() => {
        const ph = employeeAssignmentPhaseForCoercive;
        if (
            ph !== 'absent_declared' &&
            ph !== 'investigation_pending' &&
            ph !== 'warrant_ui'
        ) {
            setEmployeeCompulsoryBannerDismissed(false);
        }
    }, [employeeAssignmentPhaseForCoercive]);

    const showEmployeeCompulsoryProceduresBanner =
        employeeAssignmentPhaseForCoercive === 'absent_declared' && !employeeCompulsoryBannerDismissed;
    const activeFollowupDebtorKey = String(
        followupAssignmentWorkspaceCtx.activeDebtorKey ??
            primaryDebtorWorkspaceKey ??
            executionId ??
            ''
    );
    const [personalTabUnlockByDebtor, setPersonalTabUnlockByDebtor] = useState<Record<string, boolean>>({});
    const employeePersonalTabUnlockStorageKey = useMemo(() => {
        const ex = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
        return ex ? `hami:employee_personal_unlock:${ex}` : '';
    }, [decisionsStorageExecutionId, executionData?.id, executionId]);

    useEffect(() => {
        if (!employeePersonalTabUnlockStorageKey) return;
        try {
            const raw = SecureStoreService.getItemSync(employeePersonalTabUnlockStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Record<string, boolean>;
            if (!parsed || typeof parsed !== 'object') return;
            setPersonalTabUnlockByDebtor((prev) => ({ ...parsed, ...prev }));
        } catch {}
    }, [employeePersonalTabUnlockStorageKey]);
    const custodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                viewExecutionData as Record<string, unknown> | null | undefined,
                String(claimType || '').trim() || undefined
            ),
        [viewExecutionData, claimType]
    );
    const employeeCoerciveDetentionRestricted =
        Boolean(activeDebtorIsEmployee) && !custodyRemovalClaimActive;

    const modalEmployeeCoerciveDetentionRestricted =
        Boolean(followupModalDebtorIsEmployee) && !custodyRemovalClaimActive;

    const modalShowPersonalCoerciveFollowupTab =
        !followupModalSpecializationEffective.hidePersonalCoerciveFollowupTab ||
        modalShowEmployeeAssignmentCoerciveBlock;

    const personalTabLockedForEmployee =
        employeeCoerciveDetentionRestricted &&
        !Boolean(personalTabUnlockByDebtor[activeFollowupDebtorKey]);

    const modalPersonalTabLockedForEmployee =
        modalEmployeeCoerciveDetentionRestricted &&
        !Boolean(personalTabUnlockByDebtor[activeFollowupDebtorKey]) &&
        !followupModalSpecializationEffective.hidePersonalCoerciveFollowupTab;

    const restrictedFollowupTabIds = useMemo(
        () => new Set(['correspondences', 'admin', 'dossier_controls', 'other_party']),
        []
    );
    const followupTabsRestricted =
        activeDebtorIsLegalEntity || hideCoerciveTabsForDebtorAgent;

    const followupSectionTabOrder = useMemo(
        () =>
            [
                ...(showPersonalCoerciveFollowupTab && !followupTabsRestricted
                    ? (['personal'] as const)
                    : []),
                ...(followupSpecialization.hideFollowupCoerciveTab || followupTabsRestricted
                    ? []
                    : (['coercive'] as const)),
                ...(followupTabsRestricted ? [] : (['seizure_requests'] as const)),
                'correspondences',
                'admin',
                'dossier_controls',
                'other_party',
            ] as const,
        [
            showPersonalCoerciveFollowupTab,
            followupSpecialization.hideFollowupCoerciveTab,
            followupTabsRestricted,
        ]
    );

    const {
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    } = useFollowupModalPersistNavigation({
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        followupSectionTabOrder,
        dossierFileKey,
        setShowUnifiedExecutionModal,
        followupModalBodyScrollRef,
        followupModalSectionTabsRef,
        followupModalOpenGenerationRef,
        seizureMatrixRef,
        openSeizureRequestsTabRef,
    });

    const followupModalTabs = useMemo(() => {
        const tabs: Array<{
            id:
                | 'personal'
                | 'coercive'
                | 'seizure_requests'
                | 'correspondences'
                | 'admin'
                | 'dossier_controls'
                | 'other_party';
            label: string;
        }> = [];
        if (modalShowPersonalCoerciveFollowupTab && !followupTabsRestricted) {
            tabs.push({
                id: 'personal',
                label: modalPersonalTabLockedForEmployee
                    ? '🔒 التنفيذ الجبري الشخصي'
                    : 'التنفيذ الجبري الشخصي',
            });
        }
        if (!followupModalSpecializationEffective.hideFollowupCoerciveTab && !followupTabsRestricted) {
            tabs.push({ id: 'coercive', label: 'الإجراءات الجبرية' });
        }
        if (!followupTabsRestricted && !followupModalSpecializationEffective.hideFollowupSeizureRequestsTab) {
            tabs.push({ id: 'seizure_requests', label: 'طلبات الحجز المالية' });
        }
        tabs.push(
            { id: 'correspondences', label: 'المخاطبات' },
            { id: 'admin', label: 'نماذج الطلبات' },
            { id: 'dossier_controls', label: 'التحكم في الإضبارة' },
            { id: 'other_party', label: 'تحركات الطرف الآخر' }
        );
        return tabs;
    }, [
        modalShowPersonalCoerciveFollowupTab,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
        followupModalSpecializationEffective.hideFollowupCoerciveTab,
        followupModalSpecializationEffective.hideFollowupSeizureRequestsTab,
        followupTabsRestricted,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (modalShowPersonalCoerciveFollowupTab) return;
        if (unifiedModalTab !== 'personal') return;
        const nextTab = followupModalSpecializationEffective.hideFollowupSeizureRequestsTab
            ? followupModalSpecializationEffective.hideFollowupCoerciveTab
                ? 'correspondences'
                : 'coercive'
            : 'seizure_requests';
        setUnifiedModalTab(nextTab);
    }, [
        showUnifiedExecutionModal,
        followupSolidaryDebtorIndex,
        executionDebtorTabIndex,
        modalShowPersonalCoerciveFollowupTab,
        followupModalSpecializationEffective.hideFollowupSeizureRequestsTab,
        followupModalSpecializationEffective.hideFollowupCoerciveTab,
        unifiedModalTab,
    ]);

    const isFollowupTabActive = useCallback(
        (tabId: (typeof followupModalTabs)[number]['id']) => {
            if (tabId === 'coercive') {
                if (followupModalSpecializationEffective.hideFollowupCoerciveTab) return false;
                return (
                    unifiedModalTab === 'coercive' ||
                    (unifiedModalTab === 'personal' && !modalShowPersonalCoerciveFollowupTab)
                );
            }
            return unifiedModalTab === tabId;
        },
        [
            unifiedModalTab,
            modalShowPersonalCoerciveFollowupTab,
            followupModalSpecializationEffective.hideFollowupCoerciveTab,
        ]
    );

    useEffect(() => {
        if (!debtorBrowserTabsMode) return;
        const n = debtorWorkspaceEntries.length;
        if (n === 0) return;
        setExecutionDebtorTabIndex((i) => {
            if (i < 0) return 0;
            if (i >= n) return n - 1;
            return i;
        });
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries.length]);

    /** مزامنة لمرة واحدة: إضابر قديمة وافق المنفذ على صرف الأتعاب دون حفظ eviction_lawyer_fee_requested */
    useExecutionDashboardEvictionLawyerFeeBackfill({
        isEvictionExecutionModule,
        executionData,
        executionId,
        executionFileKey,
        decisionsReloadEpoch,
        persistExecutionMerge,
    });

    useEffect(() => {
        setShowExtraCreditors(false);
        setShowExtraDebtors(false);
    }, [executionFileKey]);


    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const onGraceCleared = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string }>;
            if (String(ce.detail?.executionId ?? '').trim() !== myId) return;
            setEvictionVacateDeadlineLocal(null);
            setEvictionVacateDraft('');
            setEvictionResidentialGracePeriodStart(null);
            setEvictionResidentialGraceManuallyEndedAt(null);
            setEvictionExecutorVacateGrantApproved(false);
            setGraceModalAllowResave(false);
            const nextTasks = (caseTasksPendingRef.current || []).filter(
                (t) => !String(t.id || '').startsWith('eviction-residential-grace-')
            );
            setCaseTasksPending(nextTasks);
            setTimelineEvents((prev) => {
                const next = stripResidentialGraceTimelineEvents(prev);
                if (next.length === prev.length) return prev;
                queueMicrotask(() => persistExecutionMergeRef.current?.({ timelineEvents: next }));
                return next;
            });
        };
        window.addEventListener(HAMI_RESIDENTIAL_GRACE_CLEARED, onGraceCleared as EventListener);
        return () =>
            window.removeEventListener(HAMI_RESIDENTIAL_GRACE_CLEARED, onGraceCleared as EventListener);
    }, [executionData?.id, executionId]);

    
    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
    
    // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين)
    const dynamicExpenses = useDynamicExpenses();

    const {
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
    } = useFinancialComputed(
        executionData,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        dynamicExpenses,
    );

    const claimFinancials = useExecutionDashboardClaimFinancials({
        executionData,
        viewExecutionData,
        executionId,
        claimType,
        parsedDebtAmount,
        parsedLawyerFees,
        lawyerFeesAmount,
        executionFee,
        total_execution_expenses,
        evictionCaseExpensesSum,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        activeTimelineEvents,
        decisionsStorageExecutionId,
        debtorNotificationDate,
        effectiveDebtors,
    });

    const {
        isNonFinancialClaim,
        isVisitationClaim,
        isMaritalFurnitureClaim,
        maritalFurnitureItemsForFollowup,
        isAlimonyClaimType,
        principalDebtAmount,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimTypeForExecutionModule,
        executionModuleStrategy,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
        isEvictionExecutionModule,
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
        seizureMatrixLedgerParams,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    } = claimFinancials;

    const seizureMatrixLedgerParamsRef = useRef<UnifiedLedgerTotalParams | null>(null);
    seizureMatrixLedgerParamsRef.current = seizureMatrixLedgerParams;

    useThirdPartyFundsReceivedOutcome({
        executionDataRef,
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft,
        getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMergeRef,
        onLedgerRevision: () => setUnifiedLedgerRevision((v) => v + 1),
        showToast,
    });

    useSeizureDecisionOutcome({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        nextTimelineId,
        applyThirdPartySeizuresFromPatch,
        executionDataRef,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        seizureMatrixLedgerParamsRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal,
        setUnifiedLedgerRevision,
        showToast,
    });

    useUnifiedCollectionOutcome({
        executionDataId: executionData?.id,
        executionId,
        setEvictionAssetsTabUnlocked,
        persistExecutionMergeRef,
        showToast,
    });

    useGuarantorRequestOutcome({
        executionDataId: executionData?.id,
        executionId,
        showToast,
    });

    useOpenSeizureCompletion({
        executionDataId: executionData?.id,
        executionId,
        executionDataRef,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        nextTimelineId,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        seizedAssetsSnapshotRef,
        setSeizedAssets,
        setSeizureDetailCompletion,
    });

    useTrustDisbursedOutcome({
        executionDataId: executionData?.id,
        executionId,
        executionDataRef,
        persistExecutionMergeRef,
    });

    useOpenFinancialHubLedger({
        executionDataId: executionData?.id,
        executionId,
        executionDataRef,
        seizureMatrixLedgerParamsRef,
        pushTimelineEventRef,
        nextTimelineId,
        setUnifiedLedgerRevision,
        showToast,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    });

    const { remainingBalanceForSeizure, settlementGuarantorGate } = useExecutionDashboardLedgerSync({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        seizureMatrixLedgerParams,
        unifiedLedgerRevision,
        setUnifiedLedgerRevision,
    });

    const activeFollowupDebtorForSeizureMatrix = useMemo(() => {
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            return activeWorkspaceDebtorForFollowup.d;
        }
        return executionData?.debtors?.[0];
    }, [debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup, executionData?.debtors]);

    const seizureMatrix = useMemo(
        () =>
            resolveSeizureMatrixFromExecution({
                remainingBalanceIqd: remainingBalanceForSeizure,
                executionData: viewExecutionData ?? executionData,
                activeDebtor: activeFollowupDebtorForSeizureMatrix,
                activeDebtorIsEmployee,
            }),
        [
            remainingBalanceForSeizure,
            viewExecutionData,
            executionData,
            activeFollowupDebtorForSeizureMatrix,
            activeDebtorIsEmployee,
        ],
    );
    seizureMatrixRef.current = seizureMatrix;

    const isPersonalStatusExecutionClaim = useMemo(
        () =>
            resolveIsPersonalStatusExecutionClaim({
                claimType,
                executionData,
                docType,
                classification,
                activeDebtorEntityKind,
            }),
        [claimType, classification, docType, executionData, activeDebtorEntityKind],
    );

    const {
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    } = useExecutionDashboardFollowupSeizureTabs({
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        viewExecutionData,
        followupSpecialization,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        followupSectionTabOrder,
        followupModalTabs,
        seizureMatrix,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        openSeizureRequestsTabRef,
        setUnifiedModalTab,
        showToast,
        showUnifiedExecutionModal,
        unifiedModalTab,
        hideFollowupCoerciveTab: followupSpecialization.hideFollowupCoerciveTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab,
        setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
        isSolidaryLiability,
        solidaryDebtorCount: allDebtorsUnified.length,
    });

    const {
        generalMemoGraceAnchor,
        daysSinceNoticeCalculated,
        daysRemainingInGracePeriod,
        isGracePeriodExpiredNow,
        evictionGraceAnchorDate,
        isEvictionGraceExpiredCalendar,
        isEvictionGraceEffectivelyExpired,
        daysRemainingInEvictionGrace,
        isEvictionGraceExpiredNow,
        forcedSummoningAnalysis,
        shouldCalculateExecutionFee,
        calculatedExecutionFee,
        totalWithExecutionFee,
        remaining,
        isInBreach,
    } = useExecutionDashboardGraceAndSummoning({
        executionData,
        executionId,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEventsDebtorScoped,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        initiator,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerGateIsEmployee: Boolean(activeDebtorIsEmployee),
    });

    const {
        earnerFinancialPersonalCoerciveActive,
        hideExecutiveDetentionJudgeCard,
    } = useEarnerFinancialPersonalCoerciveFlags(Boolean(activeDebtorIsEmployee), remaining);

    const followupSpecializationWithEarnerGate = useMemo(
        () =>
            applyEarnerFinancialPersonalCoerciveOverlay(followupSpecializationEffective, {
                isEmployee: Boolean(activeDebtorIsEmployee),
                financialCenterTotalIqd: remaining,
            }),
        [followupSpecializationEffective, activeDebtorIsEmployee, remaining],
    );

    const followupModalSpecializationEffectiveWithEarnerGate = useMemo(
        () =>
            applyEarnerFinancialPersonalCoerciveOverlay(followupModalSpecializationEffective, {
                isEmployee: Boolean(followupModalDebtorIsEmployee),
                financialCenterTotalIqd: remaining,
            }),
        [followupModalSpecializationEffective, followupModalDebtorIsEmployee, remaining],
    );

    const unifiedCollectionApproved = useMemo(
        () => hasApprovedUnifiedCollection(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const otherPartyCreditorMirrorProps = useExecutionDashboardOtherPartyMirror({
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        executionId,
        claimType,
        followupSpecializationEffective,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        activeDebtorIsEmployee,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        forcedSummoningCanForce: forcedSummoningAnalysis.canForceSummon,
        personalTabLockedForEmployee,
        remaining,
    });

    const statuteStatus = useStatuteOfLimitations(
        isAlimonyClaim,
        lastActionDate,
        dossierLifecycleRow?.lastActionDate,
        debtorNotificationDate
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    const {
        masterState,
        executionStatusRaw,
        executionStatus,
        statusMetadata,
    } = useMasterState(
        executionData,
        executionId,
        debtors,
        debtorNotificationDate,
        remaining,
        isPaused,
        pauseReason,
        isAlimonyClaim,
        executionFeeAdded,
        manualGraceCalendarExtra,
        summoningRound,
        notificationCount,
        isEvictionExecutionModule,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
    );
    const stayOfExecutionActive = Boolean(executionData?.stay_of_execution?.active);
    const {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
    } = useMemo(
        () =>
            buildExecutionCoerciveUiFlags({
                executionPaused,
                isPaused,
                stayOfExecutionActive,
                activeDebtorSolidary,
                allDebtorsUnifiedLength: allDebtorsUnified.length,
                activeDebtorCleared: Boolean(allDebtorsUnified[executionDebtorTabIndex]?.cleared),
                dossierStatus: dossierLifecycleRow?.dossierStatus,
            }),
        [
            executionPaused,
            isPaused,
            stayOfExecutionActive,
            activeDebtorSolidary,
            allDebtorsUnified,
            executionDebtorTabIndex,
            dossierLifecycleRow?.dossierStatus,
        ],
    );
    /**
     * محضر المتابعة والأدوات الجبرية: تُقفَل فقط عند الإيقاف/الاستئخار — لا تُعطَّل لمجرد انتهاء الإضبارة
     * (سياسة Zero-Lock بعد وفاة المدين؛ مسؤولية المحامي).
     */
    /** تعطيل أزرار أدوات الإضبارة (عدا مركز الحالات الخاصة) */
    const executionActionsGridLocked = stayOfExecutionActive;
    const executionToolsTimelineLockedUi = executionActionsGridLocked || isHistoricalMode;
    /** تخلية: إظهار أدوات مذكرة إخبار الورثة عند وفاة المدين */
    const {
        isDebtorDeceasedForEvictionHeirs,
        creditorDeathMarked,
        debtorDeathMarked,
        creditorDeathMenuLabel,
        debtorDeathMenuLabel,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
    } = useDossierDeathStatus(executionData, debtors, claimType);

    const lawyerFeePayoutApproved = useMemo(
        () => hasApprovedLawyerFeePayout(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );


    const notifDateForEvictionVacate =
        executionData?.debtorNotificationDate || debtorNotificationDate || debtors[0]?.notificationDate;

    const residentialVacateDeadlineMaxIso = useMemo(() => {
        if (!notifDateForEvictionVacate) return '';
        return getResidentialVacateDeadlineMaxIso(
            String(notifDateForEvictionVacate),
            manualGraceCalendarExtra ? 1 : 0
        );
    }, [notifDateForEvictionVacate, manualGraceCalendarExtra]);

    const notificationLayerOkEviction = debtorNotifiedForEvictionGrace && isEvictionGraceExpiredNow;

    /** مهلة التخلية السكنية: انتهت بتقويم تاريخ الانتهاء المسجّل */
    const isResidentialVacateGraceFinished = useMemo(() => {
        if (evictionPremisesUseResolved !== 'residential') return false;
        if (evictionVacateDeadlineLocal && isVacateDeadlinePassed(evictionVacateDeadlineLocal)) return true;
        return false;
    }, [evictionPremisesUseResolved, evictionVacateDeadlineLocal]);

    const evictionVacateLayerOk = useMemo(() => {
        if (evictionPremisesUseResolved === 'commercial') return true;
        return Boolean(
            evictionExecutorVacateGrantApproved &&
                evictionVacateDeadlineLocal &&
                isResidentialVacateGraceFinished
        );
    }, [
        evictionPremisesUseResolved,
        evictionVacateDeadlineLocal,
        evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    ]);

    /** التخلية الميدانية: لا تُقفَل لمجرد حالة آلة حياة الإضبارة؛ فقط عند موقف قانوني (إيقاف/استئخار). */
    const evictionProcedureLocked = coerciveUiLocked;

    const evictionProcedureLockHint = useEvictionProcedureLockHint(
        coerciveUiLocked,
        coerciveDossierLocked,
        debtorNotifiedForEvictionGrace,
        notificationCount,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        daysRemainingInEvictionGrace,
        evictionPremisesUseResolved,
        evictionVacateDeadlineLocal,
        residentialVacateDeadlineMaxIso,
        evictionExecutorVacateGrantApproved,
        isResidentialVacateGraceFinished,
    );

    const {
        evictionGraceBadgeInfo,
        policeAssistanceBadgeInfo,
    } = useEvictionBadges(
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        evictionResidentialGraceManuallyEndedAt,
        executionData,
    );

    const openPoliceAssistanceFromBadge = useCallback(() => {
        const st = executionDataRef.current?.eviction_police_assistance;
        if (!st || st.completedAt) return;
        setPoliceAssistanceDecisionId(st.decisionId);
        setPoliceAssistanceRequestTitle('القوة الجبرية');
        setPoliceAssistanceAgencyDraft(st.agencyName);
        setPoliceAssistanceModalOpen(true);
    }, []);
    
    
    useExecutionDashboardGraceLifecycleEffects({
        executionStatus,
        gracePeriodEnded,
        setGracePeriodEnded,
        setGracePeriodActive,
        timelineEventsRef,
        todayYmd,
        executionData,
        executionId,
        showToastRef,
        evictionGraceBadgeInfo,
        showToast,
    });

    
    // 🧠 Development validation (OPTIONAL: Pass uiState to check for actual UI conflicts)
    // This validation is now PASSIVE - it only logs errors if you provide uiState parameter
    // We don't provide uiState here, so it only checks for critical status mismatches
    
    // ===========================
    // FINANCIAL CENTER ACCORDION & TABS STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (lines 190-192)
    
    // ===========================
    // DOCUMENT DETAILS ACCORDION STATE
    // ===========================
    // ✅ V10.8: Moved to top with other useState (line 192)
    
    const financialStatus = useMemo(() => {
        if (remaining <= 0) {
            return { label: 'منتظم', color: 'emerald', pulse: false };
        }
        if (!gracePeriodEnded && daysSinceNoticeCalculated <= 7) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (gracePeriodEnded || daysSinceNoticeCalculated > 7) {
            return { label: 'جاهز للتنفيذ الجبري', color: 'rose', pulse: true };
        }
        return { label: 'إخلال - جاهز للتنفيذ', color: 'rose', pulse: true };
    }, [remaining, gracePeriodEnded, daysSinceNoticeCalculated]);
    
    // ===========================
    // SMART DEMOGRAPHIC ROUTING
    // ===========================
    const {
        debtorOccupation,
        isDebtorGovernmentEmployee,
        isDebtorFreelancer,
        isDebtorRetired,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        showSalaryCaptureForEmployee,
    } = useDebtorSummonsProfile(
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup,
    );

    const {
        earnerForcedActionUnlocked,
        followupEarnerForcedActionUnlocked,
        baseSubsequentNoticeUnlocked,
        evictionSubsequentNoticeUnlocked,
        subsequentNoticeUnlocked,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
        primaryMemoNoticeBadge,
        primaryDebtorNoticeYmdResolved,
        showDebtorUnservedMemoBadge,
        primaryDebtorAbsenceBadge,
        showDebtorSummonsAttendanceBadge,
        noticeKindGoalStrictBinding,
        employeeAssignmentTabEnabled,
        resolvedEmployeeSummonsAssignment,
        showEmployeeAssignmentCoerciveBlock,
        employeeFinancialSalaryOnlyCoercive,
        monetaryCoerciveLimitedOnly,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupMonetaryCoerciveLimitedOnly,
        followupGarnishmentAmountPreview,
    } = useSubsequentNoticeFlow(
        executionData,
        executionId,
        decisionsReloadEpoch,
        debtorSummonsProfile,
        followupDebtorSummonsProfile,
        isEvictionExecutionModule,
        isDebtorGovernmentEmployee,
        isDebtorRetired,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        unifiedCollectionApproved,
        notificationCount,
        forcedAttendanceIssued,
        summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        lawyerStartedPostNoticeExecution,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        isEvictionGraceEffectivelyExpired,
        effectiveDebtors,
        activeCoerciveActions,
        forcedPathAttendanceSecured,
        debtorForcedToAttend,
        investigationMemoIssued,
        debtorArrested,
        activeDebtorNoticeScope,
        debtorSummonsMarkerLocal,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionExtras as unknown as { perDebtorGarnishments?: Record<string, unknown>; [key: string]: unknown },
        unifiedSummonsTargetDebtorKey,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        remaining,
    );

    React.useEffect(() => {
        if (
            debtorNotificationDate &&
            daysSinceNoticeCalculated <= 7 &&
            remaining <= 0 &&
            !executionFeeInjected
        ) {
            showToast('✅ تم دفع كامل الدين خلال المهلة - إعفاء من رسم التحصيل', 'success');
        }
    }, [
        daysSinceNoticeCalculated,
        remaining,
        debtorNotificationDate,
        executionFeeInjected,
        showToast,
    ]);
    
    useExecutionDashboardStatuteWarning(
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        isAlimonyClaim,
    );
    
    // ✅ CRITICAL PERFORMANCE FIX: Removed heavy useEffect that was causing 12s+ render time
    // Instead, save data manually when needed (onClose, on specific actions)
    // This prevents infinite re-renders caused by timeline/state updates
    
    // 🚀 OPTIMIZED: Save data only when closing or on specific actions
    const saveExecutionData = useCallback(() => {
        persistExecutionDashboardSnapshot({
            executionId,
            executionData,
            debtorNotificationDate,
            debtorSummonsMarkerLocal,
            lastActionDate,
            executionFeeInjected,
            timelineEvents,
            caseNotesLog,
            caseTasksPending,
            financialLedger,
            gracePeriodActive,
            gracePeriodEnded,
            seizedAssets,
            seizureDraftsByDecisionId,
            realEstateSeizureAssets,
            activeCoerciveActions,
            notificationCount,
            forcedAttendanceIssued,
            debtorEvaded,
            arrestWarrantUnlocked,
            creditorAttended,
            executionPaused,
            activeNoticeState,
            debtorAttendedVoluntarily,
            debtorForcedToAttend,
            debtorArrested,
            nonInterferenceIssued,
            paidDebt,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            summoningRound,
            voluntaryAttendanceCount,
            investigationCourtRequested,
            investigationMemoIssued,
            investigationPathDebtorPresent,
            forcedPathAttendanceSecured,
            evictionVacateDeadlineLocal,
            evictionResidentialGracePeriodStart,
            evictionExecutorVacateGrantApproved,
            evictionResidentialGraceManuallyEndedAt,
            evictionAssetsTabUnlocked,
            evictionCaseExpenses,
            encroachmentCaseExpenses,
            specificDeliveryCaseExpenses,
            earnerFeeCollectionSm,
        });
    }, [executionId, executionData, debtorNotificationDate, lastActionDate, executionFeeInjected,
        timelineEvents, caseNotesLog, caseTasksPending, financialLedger,
        gracePeriodActive, gracePeriodEnded, seizedAssets, seizureDraftsByDecisionId, realEstateSeizureAssets, activeCoerciveActions,
        notificationCount, forcedAttendanceIssued,
        debtorEvaded, arrestWarrantUnlocked, creditorAttended, executionPaused,
        activeNoticeState, debtorAttendedVoluntarily, debtorForcedToAttend,
        debtorArrested, nonInterferenceIssued, paidDebt, paidCourtFees,
        paidDirectorateFees, paidClientFees,
        summoningRound, voluntaryAttendanceCount, investigationCourtRequested,
        investigationMemoIssued, investigationPathDebtorPresent, forcedPathAttendanceSecured,
        evictionVacateDeadlineLocal,
        evictionResidentialGracePeriodStart,
        evictionExecutorVacateGrantApproved,
        evictionResidentialGraceManuallyEndedAt,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        encroachmentCaseExpenses,
        specificDeliveryCaseExpenses,
        earnerFeeCollectionSm,
        debtorSummonsMarkerLocal]);
    
    // Save on unmount
    useEffect(() => {
        return () => {
            saveExecutionData();
        };
    }, [saveExecutionData]);
    


    const executorApprovalActions: ExecutorApprovalActions = useMemo(
        () => ({
            openScheduledDateModal: ({ requestTitle }) => {
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey(
                    isMaritalFurnitureClaim ? 'marital_furniture_delivery' : 'field_visit'
                );
                showToast(
                    isMaritalFurnitureClaim
                        ? `تمت موافقة المنفذ — ثبّت موعد التسليم من بطاقة «تسليم أثاث».\n(${requestTitle})`
                        : `تمت موافقة المنفذ — أكمل تسجيل الموعد من «الإجراءات الجبرية» داخل نفس البطاقة.\n(${requestTitle})`,
                    'info'
                );
            },
            openPoliceAssistanceModal: ({ decisionId, requestTitle }) => {
                void decisionId;
                void requestTitle;
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey('police');
                showToast(
                    'تمت الموافقة — أكمل بيانات القوة الإجرائية من البطاقة المنسدلة في الإجراءات الجبرية.',
                    'info'
                );
            },
            showToast,
            appendDossierTask: (task) => {
                const now = new Date().toISOString();
                const taskId = nextTimelineId();
                setCaseTasksPending((prev) => [
                    ...prev,
                    {
                        id: taskId,
                        title: task.title,
                        body: task.body,
                        dueDate: task.dueDate,
                        createdAt: now,
                    },
                ]);
                setTimelineEvents((prev) => [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${task.title}`,
                        description: `${task.body}\n\n📅 تاريخ الإنجاز المطلوب: ${new Date(task.dueDate).toLocaleDateString('ar-EG')}`,
                        source: 'القرارات والطعون — قبول المنفذ',
                    },
                    ...prev,
                ]);
            },
            getFieldVisitDeadlineIso: () => {
                const did = String(executionData?.id ?? executionId ?? '');
                try {
                    const v = SecureStoreService.getItemSync(fieldVisitAppointmentStorageKey(did));
                    if (v) return v;
                } catch {
                    /* ignore */
                }
                const hit = timelineEventsRef.current.find(
                    (e) =>
                        e.type === 'appointment' &&
                        typeof e.source === 'string' &&
                        e.source.includes('موعد ميداني')
                );
                return hit?.date ?? null;
            },
            promptOpenExecutionReport: (onConfirm) => {
                setExecutionReportPrompt({ onConfirm });
            },
            pushCalendarAppointment: ({ dossierId, decisionId, purpose, eventIso, recordedAt }) => {
                const newEvent: TimelineEvent = {
                    id: nextTimelineId(),
                    type: 'appointment',
                    date: eventIso,
                    timestamp: recordedAt,
                    title: `📅 ${purpose}`,
                    description: `موعد معتمد من قبول المنفذ — مرجع القرار: ${decisionId}`,
                    source: 'القرارات والطعون — موعد ميداني',
                };
                setTimelineEvents((prev) => [newEvent, ...prev]);
                syncExecutionTimelineAppointment({
                    executionId: currentFileId,
                    event: newEvent,
                    caseNo:
                        String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                        undefined,
                    clientName:
                        String(
                            executionData?.creditors?.[0]?.name ??
                                executionData?.clientName ??
                                file?.creditors?.[0]?.name ??
                                '',
                        ).trim() ||
                        undefined,
                });
                showToast('تم ربط الموعد بالسجل الزمني', 'success');
                void dossierId;
            },
            patchDecision: (decisionId, patch) => {
                patchExecutorDecisionRow(executionData?.id ?? executionId, decisionId, patch);
            },
            openBreakInventoryFurnitureModal: ({ decisionId, requestTitle, onSaved, onFinalize }) => {
                void decisionId;
                void requestTitle;
                void onSaved;
                void onFinalize;
                setShowDecisionsModal(false);
                setShowUnifiedExecutionModal(true);
                setUnifiedModalTab('coercive');
                setFollowupExpandProcedureKey(
                    isMaritalFurnitureClaim ? 'marital_furniture_delivery' : 'break_inventory'
                );
                showToast(
                    isMaritalFurnitureClaim
                        ? 'تمت الموافقة — أكمل جرد التسليم من بطاقة «تسليم أثاث».'
                        : 'تمت الموافقة — أكمل محضر الجرد من البطاقة المنسدلة في الإجراءات الجبرية.',
                    'info'
                );
            },
            openJudicialCustodianModal: ({ decisionId, requestTitle, onSaved }) => {
                void decisionId;
                setShowDecisionsModal(false);
                setJudicialCustodianModalCtx({ requestTitle, onSaved });
                setJudicialCustodianModalOpen(true);
            },
            appendCaseNote: ({ title, body }) => {
                const now = new Date().toISOString();
                const id = `note_${Date.now()}`;
                setCaseNotesLog((prev) => {
                    const next = [{ id, title, body, createdAt: now }, ...prev];
                    queueMicrotask(() => {
                        persistExecutionMergeRef.current?.({ caseNotesLog: next });
                    });
                    return next;
                });
            },
            persistJudicialCustodianDetails: ({ decisionId, fullName, salary, recordId }) => {
                const savedAt = new Date().toISOString();
                queueMicrotask(() => {
                    const file = executionFileSnapshotRef.current;
                    const prevArr = Array.isArray(file?.eviction_judicial_custodians)
                        ? [...(file!.eviction_judicial_custodians as NonNullable<
                              ExecutionFile['eviction_judicial_custodians']
                          >)]
                        : [];
                    const legacy = file?.eviction_judicial_custodian;
                    let list = prevArr;
                    if (!list.length && legacy?.fullName?.trim() && legacy.savedAt) {
                        list = [
                            {
                                id: 'legacy_custodian',
                                fullName: legacy.fullName,
                                salary: legacy.salary,
                                decisionId: legacy.decisionId,
                                savedAt: legacy.savedAt,
                            },
                        ];
                    }
                    let next;
                    if (recordId) {
                        next = list.map((c) =>
                            String(c.id) === String(recordId)
                                ? {
                                      ...c,
                                      fullName,
                                      salary,
                                      decisionId: decisionId || c.decisionId,
                                      savedAt,
                                  }
                                : c
                        );
                    } else {
                        next = [
                            {
                                id: `cust_${Date.now()}`,
                                fullName,
                                salary,
                                decisionId,
                                savedAt,
                            },
                            ...list,
                        ];
                    }
                    persistExecutionMergeRef.current?.({
                        eviction_judicial_custodians: next,
                        eviction_judicial_custodian: null,
                    });
                });
            },
        }),
        [executionData?.id, executionId, isMaritalFurnitureClaim, nextTimelineId, setShowDecisionsModal, showToast]
    );

    const pushSeizureAuctionCalendarAppointment = useCallback(
        (input: {
            dossierId: string;
            decisionId: string;
            ymd: string;
            purpose: string;
            linkToAppointments: boolean;
        }) => {
            if (!input.linkToAppointments) return;
            const dossierId = String(input.dossierId || '').trim();
            const decisionId = String(input.decisionId || '').trim();
            const ymd = String(input.ymd || '').trim();
            if (!dossierId || !decisionId || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return;
            executorApprovalActions.pushCalendarAppointment({
                dossierId,
                decisionId,
                purpose: input.purpose,
                eventIso: `${ymd}T12:00:00`,
                recordedAt: new Date().toISOString(),
            });
        },
        [executorApprovalActions]
    );

    const tryOpenPendingBreakInventoryLedger = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedBreakInventoryNeedingLedger(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedBreakInventoryNeedingLedger(altKey)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openBreakInventoryCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionData?.id,
        executionId,
        executorApprovalActions,
        openBreakInventoryCompletion,
        setShowDecisionsModal,
    ]);

    const tryOpenPendingCustodianDetails = useCallback((): boolean => {
        const primaryKey = String(decisionsStorageExecutionId || '').trim();
        const altKey = String(executionId ?? '').trim();
        const primaryHit = findApprovedCustodianNeedingDetails(primaryKey);
        const altHit =
            !primaryHit && altKey && altKey !== primaryKey
                ? findApprovedCustodianNeedingDetails(altKey)
                : null;
        const hit = primaryHit || altHit;
        if (!hit) return false;
        const dossierId = primaryHit ? primaryKey : altKey;
        if (!dossierId || dossierId === 'undefined') return false;
        setShowDecisionsModal(false);
        void dossierId;
        openJudicialCustodianCompletion(hit.decisionId, executorApprovalActions, hit.requestTitle);
        return true;
    }, [
        executionData?.id,
        executionId,
        executorApprovalActions,
        openJudicialCustodianCompletion,
        setShowDecisionsModal,
    ]);

    const openPoliceAssistanceDetailsForDecision = useCallback(
        (input: { decisionId: string; requestTitle: string }) => {
            void input;
            setShowDecisionsModal(false);
            setShowUnifiedExecutionModal(true);
            setUnifiedModalTab('coercive');
            setFollowupExpandProcedureKey('police');
        },
        [setShowDecisionsModal]
    );

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;
        const onFieldVisitScheduled = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                eventIso?: string;
                purpose?: string;
            }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            if (evId !== myId && evId !== String(decisionsStorageExecutionId ?? '')) return;
            const eventIso = String(ce.detail?.eventIso ?? '').trim();
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            if (!eventIso || !decisionId) return;
            const purpose = String(ce.detail?.purpose || 'موعد الخروج الميداني').trim();
            const linkToAppointments = ce.detail?.linkToAppointments !== false;
            if (linkToAppointments) {
                executorApprovalActions.pushCalendarAppointment({
                    dossierId: evId || myId,
                    decisionId,
                    purpose,
                    eventIso,
                    recordedAt: new Date().toISOString(),
                });
            }
        };
        window.addEventListener('hami-eviction-field-visit-scheduled', onFieldVisitScheduled as EventListener);
        return () =>
            window.removeEventListener('hami-eviction-field-visit-scheduled', onFieldVisitScheduled as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId, executorApprovalActions]);

    const persistExecutionMerge = useCallback(
        (patch: Record<string, unknown>) => {
            const base = executionDataRef.current;
            if (!base) return;
            const storeState = useExecutionDashboardStore.getState();
            if (storeState.activeSubFileId) {
                const subFileId = storeState.activeSubFileId;
                const parentIdForSub = String(
                    storeState.delegationParentFileId || executionId || base.id || ''
                ).trim();
                const subCacheKey = inabaSubMetaStorageKey(parentIdForSub, subFileId);
                const merged = {
                    ...base,
                    seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                    ...patch,
                    id: subFileId,
                    parentId: parentIdForSub,
                    updatedAt: new Date().toISOString(),
                } as ExecutionFile;
                if (patch.timelineEvents !== undefined && isInabaSubFileId(subFileId)) {
                    merged.timelineEvents = filterTimelineEventsForInabaDossier(
                        (patch.timelineEvents as TimelineEvent[]) || [],
                        subFileId
                    );
                }
                storageCache.set(executionStorageKey(String(subCacheKey)), merged);
                useExecutionDashboardStore.setState({
                    subFiles: storeState.subFiles.map((f) =>
                        f.id === subFileId
                            ? {
                                  ...f,
                                  fileNumber: merged.fileNumber ?? f.fileNumber,
                                  fileYear: merged.fileYear ?? (f as { fileYear?: string }).fileYear,
                                  timelineEvents: merged.timelineEvents ?? f.timelineEvents,
                                  decisions: merged.decisions ?? f.decisions,
                                  updatedAt: merged.updatedAt,
                              }
                            : f
                    ),
                    currentFile: merged,
                });
                useExecutionDashboardStore.getState().setCurrentFile(merged);
                setExecutionStorageTick((n) => n + 1);
                return;
            }
            const scopedPersistKey = isUnifiedTabActive
                ? String(unifiedTabId || base.id || '')
                : String(executionId ?? base.id ?? '');
            const persistKey = String(scopedPersistKey || '').trim();
            if (!persistKey || persistKey === 'undefined') return;
            const merged = {
                ...base,
                seizureDraftsByDecisionId: seizureDraftsByDecisionIdRef.current,
                ...patch,
                updatedAt: new Date().toISOString(),
            } as ExecutionFile;
            storageCache.set(executionStorageKey(String(persistKey)), merged);
            try {
                const st = useExecutionDashboardStore.getState();
                if (!st.activeSubFileId) {
                    const same = !st.currentFile || String(st.currentFile.id) === String(merged.id);
                    if (same) st.setCurrentFile(merged);
                }
            } catch {}
            setExecutionStorageTick((n) => n + 1);
            onUpdate?.(merged);
        },
        [executionId, onUpdate, isUnifiedTabActive, unifiedTabId]
    );
    persistExecutionMergeRef.current = persistExecutionMerge;
    executionFileSnapshotRef.current = executionData ?? null;

    const {
        timelineEditDraft,
        setTimelineEditDraft,
        moveTimelineEventToTrash,
        toggleTimelineEventPin,
        requestEditTimelineEvent,
        restoreTimelineEventFromTrash,
        permanentlyDeleteTimelineEvent,
        moveCaseNoteToTrash,
        moveCaseTaskToTrash,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        saveTimelineEditDraft,
        restoreCaseNoteFromTrash,
        permanentlyDeleteCaseNote,
        restoreCaseTaskFromTrash,
        permanentlyDeleteCaseTask,
    } = useExecutionTrashAndPins({
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        timelineEventsRef,
        caseNotesLogRef,
        caseTasksPendingRef,
        setTimelineEvents,
        setCaseNotesLog,
        setCaseTasksPending,
        persistExecutionMerge,
        showToast,
        currentFileId,
        setPermanentDeleteTimelineId,
    });

    const {
        editPartyTarget,
        setEditPartyTarget,
        partyEditDraft,
        setPartyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        setPartyEditHeirDeleteConfirmIdx,
        heirsQuickView,
        setHeirsQuickView,
        openEditParty,
        buildPartyHeirsRows,
        openHeirsQuickView,
        savePartyEditDraft,
        removeHeirFromPartyEditDraftAtIndex,
        togglePartyEditHeirClient,
    } = usePartyEditWorkflow({
        executionData,
        viewExecutionData,
        executionDataRef,
        decisionsStorageExecutionId,
        isHistoricalMode,
        persistExecutionMerge,
        showToast,
    });

    useEffect(() => {
        if (!isMaritalFurnitureClaim || !executionData) return;
        const items = maritalFurnitureItemsForFollowup;
        const deliveryRecorded = isMaritalFurnitureDeliveryStatusRecorded(executionData);
        const expectedFinancial = deliveryRecorded
            ? sumUndeliveredMaritalFurnitureTotal(items)
            : 0;
        const storedDebt = Math.round(Number(executionData.debtAmount) || 0);
        const storedTotal = Math.round(Number(executionData.totalAmount) || 0);
        if (storedDebt === expectedFinancial && storedTotal === expectedFinancial) return;
        persistExecutionMerge({ debtAmount: expectedFinancial, totalAmount: expectedFinancial });
    }, [
        isMaritalFurnitureClaim,
        executionData,
        maritalFurnitureItemsForFollowup,
        persistExecutionMerge,
    ]);

    useExecutionDashboardTimelineDedupeSync({
        executionData,
        timelineEvents,
        activeSubFileId,
        parentDossierId,
        setTimelineEvents,
        persistExecutionMerge,
    });

    useExecutionDashboardSeizureRequestCreatedListener({
        executionData,
        executionId,
        seizureDraftsByDecisionIdRef,
        seizedAssetsSnapshotRef,
        setSeizureDraftsByDecisionId,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
    });

    useExecutionDashboardGuarantorDecisionSync({
        executionData,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        persistExecutionMerge,
    });

    useExecutionDashboardDeceasedDebtorCoerciveReset({
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested,
        investigationPathDebtorPresent,
        executionData,
        setActiveCoerciveActions,
        setDebtorArrested,
        setInvestigationPathDebtorPresent,
        persistExecutionMerge,
    });

    const {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
    } = useExecutionAICopilot({
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
    });

    const hasApprovedCollectionDecision = useMemo(() => {
        if (!Array.isArray(executionCopilotDecisions)) return false;
        return executionCopilotDecisions.some(
            (r: any) => r?.requestKind === 'unified_collection' && r?.executorOutcome === 'approved'
        );
    }, [executionCopilotDecisions]);

    const removeJudicialCustodianEntry = useCallback(
        (recordId: string) => {
            const d = executionData;
            if (!d) return;
            const prevArr = Array.isArray(d.eviction_judicial_custodians)
                ? [...d.eviction_judicial_custodians]
                : [];
            const leg = d.eviction_judicial_custodian;
            let list = prevArr;
            if (!list.length && leg?.fullName?.trim() && leg.savedAt) {
                list = [
                    {
                        id: 'legacy_custodian',
                        fullName: leg.fullName,
                        salary: leg.salary,
                        decisionId: leg.decisionId,
                        savedAt: leg.savedAt,
                    },
                ];
            }
            const next = list.filter((c) => String(c.id) !== String(recordId));
            persistExecutionMerge({
                eviction_judicial_custodians: next,
                eviction_judicial_custodian: null,
            });
            showToast('تم حذف بيانات الحارس', 'info');
        },
        [executionData, persistExecutionMerge, showToast]
    );

    const pushTimelineEvent = useCallback(
        (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => {
            const storeSnap = useExecutionDashboardStore.getState();
            const subId = String(storeSnap.activeSubFileId || '').trim();
            const parentForStamp = String(
                storeSnap.delegationParentFileId || parentDossierId || executionId || ''
            ).trim();
            const eventToApply =
                subId && isInabaSubFileId(subId) && parentForStamp
                    ? stampInabaTimelineEventMetadata(event, subId, parentForStamp)
                    : parentForStamp
                      ? stampParentTimelineEventMetadata(event, parentForStamp)
                      : event;
            setTimelineEvents((prev) => {
                const threadKey =
                    event.metadata &&
                    typeof (event.metadata as Record<string, unknown>).timelineThreadKey === 'string'
                        ? String((event.metadata as Record<string, unknown>).timelineThreadKey)
                        : null;
                let next: TimelineEvent[];
                if (threadKey) {
                    const idx = prev.findIndex(
                        (e) =>
                            e.metadata &&
                            String((e.metadata as Record<string, unknown>).timelineThreadKey ?? '') === threadKey
                    );
                    if (idx >= 0) {
                        const prevRow = prev[idx];
                        next = [...prev];
                        next[idx] = {
                            ...prevRow,
                            ...eventToApply,
                            id: prevRow.id,
                            metadata: { ...prevRow.metadata, ...eventToApply.metadata },
                        };
                    } else {
                        next = mergeSimilarRecentTimelineEvent(prev, eventToApply);
                    }
                } else {
                    next = mergeSimilarRecentTimelineEvent(prev, eventToApply);
                }
                if (subId && isInabaSubFileId(subId)) {
                    next = filterTimelineEventsForInabaDossier(next, subId);
                } else if (parentDossierId) {
                    next = filterTimelineEventsForParentDossier(next, parentDossierId);
                }
                const mergePatch = options?.mergePatch ?? {};
                queueMicrotask(() => {
                    persistExecutionMerge({ ...mergePatch, timelineEvents: next });
                    const execId = String(executionDataRef.current?.id ?? executionId ?? '');
                    if (!execId || execId === 'undefined') return;
                    if (event.snapshot == null) return;
                    const mergedRow =
                        next.find((e) => e.id === event.id) ??
                        next.find((e) => e.snapshot === event.snapshot) ??
                        next[0];
                    const rowForRemote = mergedRow
                        ? { ...mergedRow, id: event.id, snapshot: event.snapshot }
                        : { ...event };
                    void import('@/app/services/timelineEventsSupabase')
                        .then(({ insertTimelineEventToSupabase }) =>
                            insertTimelineEventToSupabase({
                                executionFileId: execId,
                                event: rowForRemote,
                                snapshotData: event.snapshot,
                            })
                        )
                        .catch(() => {});
                });
                return next;
            });
        },
        [executionId, persistExecutionMerge, parentDossierId]
    );
    pushTimelineEventRef.current = pushTimelineEvent;

    const propertyInlineSaveCtx = useMemo((): PropertyInlineSaveContext => {
        return {
            dossierId: String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim(),
            showToast: (msg, type) => showToast(msg, type ?? 'info'),
            persistProperties: (next) => persistExecutionMerge({ seizedProperties: next }),
            pushTimeline: pushTimelineEvent,
            nextTimelineId,
            onAuctionCalendar: ({ dossierId, decisionId, ymd, purpose }) => {
                pushSeizureAuctionCalendarAppointment({
                    dossierId,
                    decisionId,
                    ymd,
                    purpose,
                    linkToAppointments: linkSeizureAuctionToAppointments,
                });
            },
        };
    }, [
        decisionsStorageExecutionId,
        executionData?.id,
        executionId,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    ]);


    const realEstateModalInitial = useMemo(() => {
        const did = String(realEstateSeizureModalDecisionId || '').trim();
        if (!did) return null;
        return (
            realEstateSeizureAssets.find((a) => String(a.decisionRowId || '').trim() === did) || null
        );
    }, [realEstateSeizureAssets, realEstateSeizureModalDecisionId]);

    const saveRealEstateSeizureFromModal = useCallback(
        (draft: {
            propertyNoAndDistrict: string;
            propertyGender: 'دار' | 'شقة' | 'عرصة' | 'بستان';
            deedNotes: string;
        }) => {
            const decisionId = String(realEstateSeizureModalDecisionId || '').trim();
            if (!decisionId) return;
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = realEstateSeizureSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: RealEstateSeizureAsset = {
                id: existing?.id || `re_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                propertyNoAndDistrict: draft.propertyNoAndDistrict,
                propertyGender: draft.propertyGender,
                estimatedPriceIqd: existing?.estimatedPriceIqd ?? null,
                deedNotes: draft.deedNotes,
                status: existing?.status || 'seized',
                record_locked: existing?.record_locked || false,
                auction_date_ymd: existing?.auction_date_ymd ?? null,
                sale_price_iqd: existing?.sale_price_iqd ?? null,
                awaiting_sale_price: false,
                sale_price_draft: undefined,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
            };
            const nextAssets = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setRealEstateSeizureAssets(nextAssets);

            try {
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                });
            } catch {
                /* ignore */
            }

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: 'وضع إشارة حجز عقاري',
                    description: `رقم العقار والمقاطعة: ${nextRow.propertyNoAndDistrict}\nجنس العقار: ${nextRow.propertyGender}${nextRow.deedNotes ? `\nتفاصيل السند/ملاحظات: ${nextRow.deedNotes}` : ''}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — الحجز العقاري',
                    metadata: {
                        timelineThreadKey: `real_estate_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        realEstateAssetId: nextRow.id,
                    },
                },
                { mergePatch: { realEstateSeizureAssets: nextAssets } }
            );
            showToast('تم حفظ بيانات العقار وربطها بالسجل الزمني', 'success');
            setShowRealEstateSeizureModal(false);
        },
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, realEstateSeizureModalDecisionId, showToast]
    );

    const { saveThirdPartySeizureForDecision } = useExecutionDashboardThirdPartySeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
        setThirdPartySeizuresUi,
    });

    useEffect(() => {
        const id = executionData?.id;
        if (!id || id === 'undefined' || isInabaSubFileId(id)) return;
        let cancelled = false;
        void import('@/app/services/timelineEventsSupabase')
            .then(({ fetchTimelineEventsFromSupabase, mergeRemoteSnapshotsIntoTimelineEvents }) =>
                fetchTimelineEventsFromSupabase(String(id)).then((rows: TimelineEventDbRow[]) => {
                    if (cancelled || !rows.length) return;
                    setTimelineEvents((prev) => mergeRemoteSnapshotsIntoTimelineEvents(prev, rows));
                })
            )
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [executionData?.id]);

    const persistGuarantorFollowupDetails = useCallback(
        (
            guarantorName: string,
            guarantorWorkplace: string,
            opts?: { salaryIqd: number | null; deductionIqd: number | null }
        ): boolean => {
            const prev = executionDataRef.current?.guarantor_followup ?? executionData?.guarantor_followup;
            const name = guarantorName.trim();
            const wp = guarantorWorkplace.trim();
            if (!name || !wp) {
                showToast('أدخل اسم الكفيل ومكان العمل قبل الحفظ.', 'warning');
                return false;
            }
            if (!persistExecutionMergeRef.current) {
                showToast('تعذّر الحفظ — أعد فتح ملف التنفيذ.', 'error');
                return false;
            }
            const creditors = executionData?.creditors;
            let patchCreditors: Creditor[] | undefined;
            if (Array.isArray(creditors) && creditors.length > 0) {
                const c0 = creditors[0] as Creditor;
                patchCreditors = [{ ...c0, guarantorExecutionNotation: true }, ...creditors.slice(1)];
            }
            persistExecutionMerge({
                guarantor_followup: {
                    executor_approved: prev?.executor_approved ?? true,
                    channel: 'financial',
                    details_saved: true,
                    guarantee_type: 'amount',
                    guarantor_name: name,
                    guarantor_workplace: wp,
                    guarantor_salary_iqd:
                        opts?.salaryIqd !== undefined
                            ? opts.salaryIqd
                            : (prev?.guarantor_salary_iqd ?? null),
                    guarantor_deduction_iqd:
                        opts?.deductionIqd !== undefined
                            ? opts.deductionIqd
                            : (prev?.guarantor_deduction_iqd ?? null),
                    creditor_notation_registered: true,
                },
                debtor_executive_detention_active: false,
                executive_detention_until: null,
                executive_detention_days_total: null,
                executive_detention_reminder_sent: false,
                executive_detention_judge_outcome: null,
                executive_detention_judge_eligible_decision_id: null,
                executive_detention_judge_decision_id: null,
                executive_detention_request_in_absentia: false,
                debtor_travel_ban_active: false,
                ...(patchCreditors ? { creditors: patchCreditors } : {}),
            });
            const ts = new Date().toISOString();
            const sal = opts?.salaryIqd;
            const ded = opts?.deductionIqd;
            const gt = 'كفالة ضامنة للمبلغ';
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'تثبيت بيانات الكفيل الضامن',
                description: [
                    `نوع الكفالة: ${gt}`,
                    `الاسم: ${name}`,
                    `مكان العمل: ${wp}`,
                    sal != null ? `الراتب: ${sal.toLocaleString('ar-IQ')} د.ع` : null,
                    ded != null ? `الاستقطاع: ${ded.toLocaleString('ar-IQ')} د.ع` : null,
                ]
                    .filter(Boolean)
                    .join('\n'),
                type: 'procedure',
                source: 'محضر المتابعة',
            });
            const did = String(guarantorDetailsDecisionId || '').trim();
            if (did) {
                try {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, did, {
                        guarantorDetailsSavedAt: ts,
                    } as any);
                } catch {
                    /* ignore */
                }
                setGuarantorDetailsDecisionId(null);
            }
            showToast('تم حفظ بيانات الكفيل وتسجيل تعليم الدائن.', 'success');
            try {
                const exId = String(executionDataRef.current?.id ?? executionData?.id ?? executionId ?? '').trim();
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-followup-committed', { detail: { executionId: exId } })
                );
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-external-updated', {
                        detail: { executionId: exId, tab: 'financial' as const },
                    })
                );
            } catch {
                /* ignore */
            }
            return true;
        },
        [
            executionData?.guarantor_followup,
            executionData?.creditors,
            executionData?.id,
            executionId,
            decisionsStorageExecutionId,
            guarantorDetailsDecisionId,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            showToast,
        ]
    );


    const {
        applyDossierLifecycleToFileAndTimeline,
        handleDossierLifecyclePick,
        handleDossierLifecycleConfirmDetails,
    } = useExecutionDossierLifecycleActionsOrchestrator({
        executionData,
        executionId,
        executionDataRef,
        dossierFileKey,
        financialLedgerRef,
        seizedAssetsSnapshotRef,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        reconcileDossierLifecycle,
        showToast,
        dossierPendingStatus,
        dossierReasonDraft,
        dossierDateDraft,
        setDossierReasonDraft,
        setDossierDateDraft,
        setDossierPendingStatus,
        setDossierLifecyclePanelPhase,
        closeDossierLifecyclePanel,
    });

    const {
        showEditDossierMetaModal,
        dossierMetaDraft,
        setShowEditDossierMetaModal,
        setDossierMetaDraft,
        openEditDossierMeta,
        saveDossierMetaDraft,
    } = useDossierMeta(
        executionData,
        directorate,
        fileNumber,
        fileYear,
        docNumber,
        judgmentDate,
        classification,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        isEvictionExecutionModule,
        persistExecutionMerge,
        showToast,
    );

    const persistParentDossierMerge = useCallback(
        (patch: Record<string, unknown>) => {
            const pid = String(parentDossierId || '').trim();
            if (!pid || pid === 'undefined') return;
            const raw = storageCache.get(executionStorageKey(pid));
            const base = ((raw ?? parentExecutionFile) as ExecutionFile | null) ?? null;
            if (!base) return;
            const merged = {
                ...base,
                ...patch,
                updatedAt: new Date().toISOString(),
            } as ExecutionFile;
            storageCache.set(executionStorageKey(pid), merged);
            setExecutionStorageTick((t) => t + 1);
            try {
                const st = useExecutionDashboardStore.getState();
                if (String(st.currentFile?.id) === pid) st.setCurrentFile(merged);
            } catch {
                /* ignore */
            }
            onUpdate?.(merged);
        },
        [parentDossierId, parentExecutionFile, onUpdate]
    );

    const parentIsEvictionForExpandedHeader = String(parentExecutionFile?.claimType ?? '').includes('تخلية');

    const { openEditDossierMeta: openParentDossierMetaEdit } = useDossierMeta(
        parentExecutionFile,
        String(parentExecutionFile?.directorate ?? ''),
        String(parentExecutionFile?.fileNumber ?? ''),
        String(parentExecutionFile?.fileYear ?? ''),
        String(parentExecutionFile?.docNumber ?? ''),
        String(parentExecutionFile?.judgmentDate ?? ''),
        String(parentExecutionFile?.classification ?? ''),
        String((parentExecutionFile as { property_number?: string } | null)?.property_number ?? ''),
        String((parentExecutionFile as { district?: string } | null)?.district ?? ''),
        String((parentExecutionFile as { property_type?: string } | null)?.property_type ?? ''),
        String((parentExecutionFile as { full_address?: string } | null)?.full_address ?? ''),
        (parentExecutionFile as { eviction_premises_use?: string } | null)?.eviction_premises_use,
        parentIsEvictionForExpandedHeader,
        persistParentDossierMerge,
        showToast,
    );

    /** مصدر موحّد لتحديث المدينين — يفضّل البيانات المدمجة في الملف على props المتأخرة */
    const debtorsForPartyPatch = useMemo(() => {
        if (Array.isArray(executionData?.debtors) && executionData.debtors.length > 0) {
            return executionData.debtors as Debtor[];
        }
        return (debtors || []) as Debtor[];
    }, [executionData?.debtors, debtors]);

    const {
        handleDossierAction,
        handleOpenDossierAction,
        runSpecialFollowupSubmit,
        creditorOtherPartyTrackHandlers,
        otherPartyTabSubmitHandler,
        openOtherPartyAppealsModal,
    } = useExecutionDashboardDossierFollowupHandlers({
        executionDataRef,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        parentExecutionFile,
        isInabaActive,
        isUnifiedTabActive,
        isRepresentingDebtor,
        timelineEvents,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestContent,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openDecisionsModalWithBoot,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setExecutionStorageTick,
        setSpecialRequestTemplatePick,
        setSpecialRequestContent,
        setSpecialRequestManualTitle,
        setSpecialRequestDate,
        setTimelineEvents,
    });

    /** تبديل موظف ↔ كاسب — `useExecutionDashboardStore.toggleDebtorEmploymentStatus` + دمج الملف */
    const handleDebtorEmploymentToggle = useCallback(
        (ctx?: { debtorKey: string; isPrimary: boolean }) => {
            const base = executionDataRef.current;
            if (!base?.id) return;
            const primaryK = debtorWorkspaceEntries[0]?.key;
            const debtorKeyRaw = String(ctx?.debtorKey ?? primaryK ?? '').trim();
            const debtorKey = debtorKeyRaw !== '' ? debtorKeyRaw : 'primary_debtor';

            const prim = base.debtors?.[0] as Debtor | undefined;
            const primaryKey =
                prim?.id != null && String(prim.id).trim() !== ''
                    ? String(prim.id)
                    : 'primary_debtor';
            let currentlyEmployee: boolean;
            if (debtorKey === primaryKey) {
                currentlyEmployee = isDebtorRowEmployee(prim);
            } else {
                const ad = base.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === debtorKey
                );
                if (!ad) {
                    showToast(
                        'تعذّر ربط المدين ببيانات تعدّد الخصوم — أعد فتح الإضبارة أو أضف المدين من إعدادات الذمة.',
                        'warning'
                    );
                    return;
                }
                currentlyEmployee = isDebtorRowEmployee(ad);
            }

            const patch = buildDebtorEmploymentTogglePatch(base, debtorKey);
            if (!patch) {
                showToast('تعذّر تبديل الصفة الوظيفية.', 'warning');
                return;
            }

            const iso = getLocalTodayYmd();
            const ts = new Date().toISOString();
            const nextEmp = !currentlyEmployee;
            const event: TimelineEvent = {
                id: nextTimelineId(),
                date: iso,
                timestamp: ts,
                title: nextEmp ? '↩️ إعادة تفعيل الوظيفة' : '📋 تحويل المدين إلى كاسب',
                description: nextEmp
                    ? 'أُعيدت صفة المدين إلى موظف — يُتاح حجز الراتب؛ أُلغيت حالة التنفيذ الجبري الشخصي المرتبطة بمسار الكاسب.'
                    : 'تغيير الحالة الوظيفية — حجز الراتب لا ينطبق؛ يُتاح التنفيذ الجبري الشخصي وفق المسار.',
                type: 'procedure',
                source: 'إدارة التنفيذ',
                metadata: { timelineDebtorKey: debtorKey },
            };
            setTimelineEvents((prev) => {
                const next = [event, ...prev];
                const merged = { ...base, ...patch, timelineEvents: next } as ExecutionFile;
                persistExecutionMerge({ ...patch, timelineEvents: next });
                useExecutionDashboardStore.getState().setCurrentFile(merged);
                return next;
            });
            showToast(nextEmp ? 'تمت إعادة صفة الموظف.' : 'تم التحويل إلى كاسب.', 'success');
        },
        [
            debtorWorkspaceEntries,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
        ]
    );

    const exIdForPersonalDecisions = executionData?.id ?? executionId;

    useExecutionDashboardPersonalCoerciveDecisionSync({
        executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch,
        persistExecutionMerge,
        setTimelineEvents,
        nextTimelineId,
    });

    useExecutionDashboardEmployeeInvestigationSync({
        executionData,
        executionId: exIdForPersonalDecisions,
        decisionsReloadEpoch,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    });

    useExecutionDashboardExecutiveDetentionLifecycle({
        executionData,
        persistExecutionMerge,
        showToast,
    });

    const { handleLiftStayOfExecution, handleSpecialCasesStay, handleResumeExecution } =
        useExecutionDashboardStayHandlers({
            executionData,
            file,
            currentFileId,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
            setCaseTasksPending,
            setExecutionPaused,
        });

    const {
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        debtorSubstitutionRequestStatus,
        creditorSubstitutionRequestStatus,
    } = useExecutionDashboardPartyDeathHandlers({
        executionDataRef,
        executionData,
        executionId,
        claimType,
        creditors,
        debtors,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        partyDeathModalParty,
        setPartyDeathModalParty,
        partyDeathModalDecisionId,
        setPartyDeathModalDecisionId,
        setAlimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalOpen,
        lastHeirSubRequestAtRef,
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

    const dismissDebtorAbsenceBadge = useCallback(() => {
        if (executionData) {
            if (
                getDebtorNoticeStateForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved
                ).absenceBadgeDismissed
            ) {
                return;
            }
        }
        if (executionData?.id) {
            persistExecutionMerge(
                buildDebtorNoticePatchForKey(
                    executionData,
                    unifiedSummonsTargetDebtorKey,
                    primaryDebtorKeyResolved,
                    { absenceBadgeDismissed: true }
                )
            );
        } else {
            persistExecutionMerge({ debtor_absence_badge_dismissed: true });
        }
        showToast('تم إخفاء إشارة عدم الحضور', 'info');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const handleDeclareEvictionVoluntaryPeriodEnd = useCallback(() => {
        if (!isEvictionExecutionModule) return;
        if (!evictionGraceAnchorDate) {
            showToast('لا يوجد تاريخ إخبار/تبليغ مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(evictionGraceAnchorDate, new Date(), 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic) return;
        setVoluntaryEndOptimistic(true);
        const anchor = evictionGraceAnchorDate;
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع التاريخ: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                eviction_voluntary_period_end_declared: true,
                debtor_absence_badge_dismissed: false,
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
    ]);

    const handleDeclareNoticeVoluntaryPeriodEnd = useCallback(() => {
        if (isEvictionExecutionModule) return;
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        const anchor =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            null;
        if (!anchor) {
            showToast('لا يوجد تاريخ مذكرة إخبار مُسجَّل لاحتساب المدة', 'warning');
            return;
        }
        if (!isGracePeriodExpired(anchor, new Date(), manualGraceCalendarExtra ? 1 : 0)) {
            showToast('يُتاح «انتهاء المهلة» بعد انقضاء سبعة أيام تقويمية من اليوم التالي للتبليغ.', 'warning');
            return;
        }
        if (
            activeDebtorNoticeScope.voluntaryPeriodEndDeclared ||
            (targetIsPrimary && noticeVoluntaryPeriodEndOptimistic)
        ) {
            return;
        }
        if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(true);
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '⏱️ انتهاء مهلة الإخبار/التبليغ',
            description: `مرجع تاريخ المذكرة: ${anchor}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              voluntaryPeriodEndDeclared: true,
                              absenceBadgeDismissed: false,
                          }
                      )
                    : {
                          notice_voluntary_period_end_declared: true,
                          debtor_absence_badge_dismissed: false,
                      }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل انتهاء المهلة', 'success');
    }, [
        isEvictionExecutionModule,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        executionData,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        activeDebtorNoticeScope.voluntaryPeriodEndDeclared,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        persistExecutionMerge,
        nextTimelineId,
        showToast,
    ]);

    useLayoutEffect(() => {
        if (!debtorBrowserTabsMode || debtorWorkspaceEntries.length === 0) return;
        const el = debtorWorkspaceChipStripRef.current;
        if (!el) return;
        return bindHorizontalWheelToScroll(el);
    }, [debtorBrowserTabsMode, debtorWorkspaceEntries.length]);

    const registerDebtorVoluntaryAttendance = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        setDebtorSummonsMarkerLocal(null);
        const nd =
            activeDebtorNoticeScope.memoAnchorDate ||
            activeDebtorNoticeScope.notificationDate ||
            (targetIsPrimary ? debtorNotificationDate : null) ||
            getLocalTodayYmd();
        const needsAnchorBackfill =
            !activeDebtorNoticeScope.memoAnchorDate &&
            !activeDebtorNoticeScope.notificationDate &&
            (targetIsPrimary
                ? !debtorNotificationDate && !executionData?.debtorNotificationDate
                : true);
        if (needsAnchorBackfill && targetIsPrimary) {
            setDebtorNotificationDate(nd);
        }
        const nextVac = (voluntaryAttendanceCount ?? 0) + 1;
        const nextRound = (summoningRound ?? 1) + 1;
        if (targetIsPrimary) {
            setDebtorAttendedVoluntarily(true);
            setActiveNoticeState(null);
            setVoluntaryAttendanceCount(nextVac);
            setSummoningRound(nextRound);
        }
        const ndDisplay = parseLocalNotificationDate(String(nd)).toLocaleDateString('ar-EG');
        const attendEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: String(nd),
            timestamp: new Date().toISOString(),
            title: '🟢 تم حضور المدين',
            description: `مرجع تاريخ المذكرة/الإخبار: ${ndDisplay}.`,
            type: 'summons',
            source: 'التبليغ',
            metadata: {
                ...timelineDebtorMetadata(targetDebtorKey),
                timelineExpandedNote:
                    'يُحتسب الحضور في سياق مذكرة الإخبار بالتنفيذ (وليس تاريخ الضغط على الزر). بعده يُتاح تسجيل تبليغ لاحق دون مهلة 7 أيام.',
            },
        };
        setTimelineEvents((prev) => {
            const next = [attendEvent, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              ...(needsAnchorBackfill
                                  ? { memoAnchorDate: nd, notificationDate: nd }
                                  : {}),
                              activeNoticeState: null,
                              voluntaryPeriodEndDeclared: true,
                          }
                      )
                    : needsAnchorBackfill
                      ? { execution_memo_anchor_date: nd, debtorNotificationDate: nd }
                      : {}),
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          null
                      )
                    : { debtor_summons_marker: null }),
                ...(targetIsPrimary
                    ? {
                          debtorAttendedVoluntarily: true,
                          activeNoticeState: null,
                          voluntaryAttendanceCount: nextVac,
                          summoningRound: nextRound,
                      }
                    : {}),
                timelineEvents: next,
            });
            return next;
        });
        showToast('✅ تم تسجيل حضور المدين — يُتاح تبليغ لاحق وفق المسار', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope.memoAnchorDate,
        activeDebtorNoticeScope.notificationDate,
        debtorNotificationDate,
        executionData?.debtorNotificationDate,
        executionData,
        voluntaryAttendanceCount,
        summoningRound,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const {
        handleEmployeeAssignmentConfirm,
        handleEmployeeAssignmentAttend,
        handleEmployeeAssignmentDeclareAbsent,
        handleEmployeeAssignmentTerminate,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEmployeeAssignmentResolveForcedBringOutcome,
    } = useExecutionDashboardEmployeeAssignmentHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        forcedBringDecisionState,
        employeeForcedBringAwaitingPersonalOutcome,
    });

const {
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
    } = useExecutionDashboardPublicationNoticeHandlers({
        executionActionsGridLocked,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

    const noteSuccessMsgRef = useRef('');
    const noteSuccessVariantRef = useRef<'success' | 'info' | 'warning'>('success');
    const { runSubmit: runSaveNoteSubmit } = useStandardSubmit({
        successMessage: 'تم الحفظ',
        validationMessage: '',
        onClose: () => {
            setNoteTitle('');
            setNoteBody('');
            setIsTask(false);
            setTaskDueDate('');
            setTaskStatus('pending');
            setEditingTaskId(null);
        },
        showToast,
        validate: () => {
            if (!noteTitle.trim() || !noteBody.trim()) {
                showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
                return false;
            }
            return true;
        },
        getSuccessMessage: () => noteSuccessMsgRef.current,
        getSuccessVariant: () => noteSuccessVariantRef.current,
        submit: async () => {
            const now = new Date().toISOString();
            const sourceLabel = 'سجل الملاحظات والمهام';
            const titleTrim = noteTitle.trim();
            const bodyTrim = noteBody.trim();
            const curNotes = caseNotesLogRef.current;
            const curTasks = caseTasksPendingRef.current;
            const curTimeline = timelineEventsRef.current;
            if (!isTask) {
                noteSuccessMsgRef.current = 'تم حفظ الملاحظة بنجاح';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [{
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: `📝 إضافة ملاحظة: ${titleTrim}`,
                    description: bodyTrim,
                    source: sourceLabel,
                }, ...curTimeline];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            } else if (taskStatus === 'pending') {
                const effectiveDueDate = taskDueDate || now.slice(0, 10);
                if (editingTaskId) {
                    noteSuccessMsgRef.current = 'تم تعديل المهمة بنجاح';
                    noteSuccessVariantRef.current = 'success';
                    const nextTasks = curTasks.map((task) =>
                        task.id === editingTaskId
                            ? {
                                  ...task,
                                  title: titleTrim,
                                  body: bodyTrim,
                                  dueDate: effectiveDueDate,
                              }
                            : task
                    );
                    const nextTimeline = [{
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `✏️ تعديل مهمة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    }, ...curTimeline];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                } else {
                    noteSuccessMsgRef.current = 'تم إنشاء المهمة — ستظهر في الملاحظات بعد الإنجاز';
                    noteSuccessVariantRef.current = 'info';
                    const taskId = nextTimelineId();
                    const nextTasks = [{
                        id: taskId,
                        title: titleTrim,
                        body: bodyTrim,
                        dueDate: effectiveDueDate,
                        createdAt: now,
                    }, ...curTasks];
                    const nextTimeline = [{
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    }, ...curTimeline];
                    setCaseTasksPending(nextTasks);
                    setTimelineEvents(nextTimeline);
                    persistExecutionMerge({ caseTasksPending: nextTasks, timelineEvents: nextTimeline });
                }
            } else {
                noteSuccessMsgRef.current = 'تم تسجيل إنجاز المهمة';
                noteSuccessVariantRef.current = 'success';
                const entryId = nextTimelineId();
                const nextNotes = [{ id: entryId, title: titleTrim, body: bodyTrim, createdAt: now }, ...curNotes];
                const nextTimeline = [{
                    id: nextTimelineId(),
                    type: 'other',
                    date: now,
                    timestamp: now,
                    title: `✅ إنجاز مهمة: ${titleTrim}`,
                    description: bodyTrim,
                    source: sourceLabel,
                }, ...curTimeline];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
            }
        },
    });
    const handleSaveNote = useCallback(async () => {
        await runSaveNoteSubmit();
    }, [runSaveNoteSubmit]);

    const voiceUserId = useMemo(() => resolveCalendarUserId(null), []);

    const commitDossierNote = useCallback(
        async (payload: { title: string; bodyHtml: string; noteId?: string }) => {
            const titleTrim = String(payload.title || '').trim();
            const bodyTrim = String(payload.bodyHtml || '').trim();
            if (!titleTrim || !bodyTrim) {
                showToast('يرجى تعبئة عنوان الملاحظة والتفاصيل', 'warning');
                return;
            }
            const now = new Date().toISOString();
            const sourceLabel = 'سجل الملاحظات والمهام';
            const curNotes = caseNotesLogRef.current;
            const curTimeline = timelineEventsRef.current;
            const noteId = String(payload.noteId ?? '').trim();

            if (noteId) {
                if (!curNotes.some((n) => n.id === noteId)) {
                    showToast('تعذر العثور على الملاحظة للتعديل', 'error');
                    return;
                }
                const nextNotes = curNotes.map((n) =>
                    n.id === noteId ? { ...n, title: titleTrim, body: bodyTrim } : n,
                );
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other' as const,
                        date: now,
                        timestamp: now,
                        title: `✏️ تعديل ملاحظة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
                showToast('تم حفظ التعديل بنجاح', 'success');
            } else {
                const entryId = nextTimelineId();
                const nextNotes = [
                    { id: entryId, title: titleTrim, body: bodyTrim, createdAt: now },
                    ...curNotes,
                ];
                const nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other' as const,
                        date: now,
                        timestamp: now,
                        title: `📝 إضافة ملاحظة: ${titleTrim}`,
                        description: bodyTrim,
                        source: sourceLabel,
                    },
                    ...curTimeline,
                ];
                setCaseNotesLog(nextNotes);
                setTimelineEvents(nextTimeline);
                persistExecutionMerge({ caseNotesLog: nextNotes, timelineEvents: nextTimeline });
                showToast('تم حفظ الملاحظة بنجاح', 'success');
            }
            setNoteTitle('');
            setNoteBody('');
            setEditingNoteId(null);
        },
        [nextTimelineId, persistExecutionMerge, showToast],
    );
    
    const completePendingTask = useCallback((taskId: string) => {
        const task = caseTasksPending.find(t => t.id === taskId);
        if (!task) return;
        const now = new Date().toISOString();
        const nextTasks = caseTasksPendingRef.current.filter((t) => t.id !== taskId);
        const nextNotes = [{
            id: nextTimelineId(),
            title: task.title,
            body: task.body,
            createdAt: now,
        }, ...caseNotesLogRef.current];
        const nextTimeline = [{
            id: nextTimelineId(),
            type: 'other',
            date: now,
            timestamp: now,
            title: `✅ إنجاز مهمة: ${task.title}`,
            description: task.body,
            source: 'سجل الملاحظات والمهام',
        }, ...timelineEventsRef.current];
        setCaseTasksPending(nextTasks);
        setCaseNotesLog(nextNotes);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({ caseTasksPending: nextTasks, caseNotesLog: nextNotes, timelineEvents: nextTimeline });
        showToast('تم تسجيل إنجاز المهمة', 'success');
    }, [nextTimelineId, persistExecutionMerge, showToast]);

    const beginEditPendingTask = useCallback((taskId: string) => {
        const task = caseTasksPending.find((t) => t.id === taskId);
        if (!task) return;
        setEditingTaskId(task.id);
        setNoteTitle(task.title || '');
        setNoteBody(task.body || '');
        setIsTask(true);
        setTaskStatus('pending');
        setTaskDueDate(task.dueDate || '');
        setShowNotesModal(true);
    }, [caseTasksPending]);

    const handleSaveTask = useCallback((taskData: { title: string; body: string; dueDate: string; steps?: any[] }) => {
        const now = new Date().toISOString();
        const newId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newTask = { id: newId, title: taskData.title, body: taskData.body, dueDate: taskData.dueDate, createdAt: now, steps: taskData.steps };
        const nextTasks = [...caseTasksPendingRef.current, newTask];
        setCaseTasksPending(nextTasks);
        persistExecutionMerge({ caseTasksPending: nextTasks });
        syncExecutionTaskDue({
            executionId: currentFileId,
            task: newTask,
            caseNo:
                String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                undefined,
            clientName:
                String(
                    executionData?.creditors?.[0]?.name ??
                        executionData?.clientName ??
                        file?.creditors?.[0]?.name ??
                        '',
                ).trim() ||
                undefined,
        });
        showToast('تم حفظ المهمة', 'success');
    }, [persistExecutionMerge, showToast, currentFileId, executionData, file]);

    const handleUpdateTask = useCallback((taskId: string, updates: Partial<any>) => {
        const nextTasks = caseTasksPendingRef.current.map(t => t.id === taskId ? { ...t, ...updates } : t);
        setCaseTasksPending(nextTasks);
        persistExecutionMerge({ caseTasksPending: nextTasks });
        const updated = nextTasks.find((t) => t.id === taskId);
        if (updated) {
            syncExecutionTaskDue({
                executionId: currentFileId,
                task: updated,
                caseNo:
                    String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                    undefined,
                clientName:
                    String(
                        executionData?.creditors?.[0]?.name ??
                            executionData?.clientName ??
                            file?.creditors?.[0]?.name ??
                            '',
                    ).trim() ||
                    undefined,
            });
        }
    }, [persistExecutionMerge, currentFileId, executionData, file]);

    const handleDeleteTask = useCallback(
        (taskId: string) => {
            moveCaseTaskToTrash(taskId);
        },
        [moveCaseTaskToTrash]
    );

    const handleAddTimelineEvent = useCallback((event: { title: string; body?: string }) => {
        const newEvent: TimelineEvent = {
            id: `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            date: new Date().toISOString(),
            type: 'note',
            title: event.title,
            description: event.body,
        };
        pushTimelineEvent(newEvent);
    }, [pushTimelineEvent]);

    const handleCompleteTask = useCallback(
        (taskId: string) => {
            completePendingTask(taskId);
        },
        [completePendingTask]
    );

    const handleMemoFollowupClick = useCallback(() => {
        closeUnifiedSeizureLog();
        openFollowupModalPersisted();
    }, [openFollowupModalPersisted, closeUnifiedSeizureLog]);

    // ✅ OPTIMIZED: useCallback
    const handleSaveAppointment = useCallback(() => {
        if (!appointmentPurpose.trim() || !appointmentDateOnly) {
            showToast('يرجى إدخال الغرض وتاريخ الموعد', 'warning');
            return;
        }
        
        const recorded = new Date().toISOString();
        const eventIso = appointmentTimeOptional
            ? `${appointmentDateOnly}T${appointmentTimeOptional}:00`
            : `${appointmentDateOnly}T12:00:00`;
        
        const eventDateLabel = new Date(appointmentDateOnly).toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const timePart = appointmentTimeOptional
            ? new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            : null;

        const title = `📅 ${appointmentPurpose.trim()}`;
        const description = timePart
            ? `موعد في ${eventDateLabel} — الساعة ${timePart}`
            : `موعد بتاريخ ${eventDateLabel} (بدون وقت محدد)`;

        let syncedTimelineId = editingAppointmentId ? String(editingAppointmentId) : nextTimelineId();
        if (editingAppointmentId) {
            const nextTimeline = (timelineEventsRef.current || []).map((ev: any) =>
                String(ev?.id) === String(editingAppointmentId)
                    ? {
                          ...ev,
                          type: 'appointment',
                          date: eventIso,
                          timestamp: recorded,
                          title,
                          description,
                          source: 'تعديل موعد',
                      }
                    : ev
            );
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ timelineEvents: nextTimeline });
            showToast('تم تعديل الموعد بنجاح', 'success');
        } else {
            const newEvent: TimelineEvent = {
                id: syncedTimelineId,
                type: 'appointment',
                date: eventIso,
                timestamp: recorded,
                title,
                description,
                source: 'إضافة موعد',
            };
            const nextTimeline = [newEvent, ...(timelineEventsRef.current || [])];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({ timelineEvents: nextTimeline });
            showToast('تم حفظ الموعد بنجاح', 'success');
        }

        const execYmd = normalizeDateToYmd(appointmentDateOnly) ?? appointmentDateOnly;
        CalendarBridge.syncExecutionAppointment({
            executionId: currentFileId,
            timelineEventId: syncedTimelineId,
            date: execYmd,
            time: appointmentTimeOptional || undefined,
            purpose: appointmentPurpose.trim(),
            description,
            caseNo:
                String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                undefined,
            clientName:
                String(
                    executionData?.creditors?.[0]?.name ??
                        executionData?.clientName ??
                        file?.creditors?.[0]?.name ??
                        '',
                ).trim() ||
                undefined,
        });
        setAppointmentPurpose('');
        setAppointmentDateOnly('');
        setAppointmentTimeOptional('');
        setEditingAppointmentId(null);
    }, [
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
        showToast,
        nextTimelineId,
        persistExecutionMerge,
        currentFileId,
        executionData,
        file,
    ]);
    
    // ✅ OPTIMIZED: useCallback
    const {
        handlePayment,
        handlePaymentFromCalculator,
        handleFundsLedgerPayment,
        handleSettlementFromCalculator,
    } =
        useExecutionDashboardPaymentHandlers({
            executionDataRef,
            executionId,
            executionData,
            paymentAmount,
            paymentDate,
            remaining,
            paidDebt,
            totalOwed,
            totalWithExecutionFee,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            financialLedger,
            financialLedgerRef,
            paidDebtRef,
            seizedAssetsSnapshotRef,
            nextTimelineId,
            pushTimelineEvent,
            persistExecutionMerge,
            showToast,
            setPaidDebt,
            setFinancialLedger,
            setPaymentAmount,
            setPaymentDate,
            setShowPaymentModal,
        });

    const handleNotifyDebtor = (
        explicitNotificationDate?: string | null,
        evictionSubsequentMeta?: EvictionSubsequentSummonsMeta,
        initialNoticeLawyerFeesIncluded?: boolean,
        summonsPurposeFromModal?: string,
        notifyOpts?: { forceExecutionMemo?: boolean }
    ) => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const targetIsPrimary = targetDebtorKey === primaryDebtorKeyResolved;
        const fallbackDay = getLocalTodayYmd();
        const picked =
            typeof explicitNotificationDate === 'string' && explicitNotificationDate.trim() !== ''
                ? explicitNotificationDate.trim()
                : null;
        const dateToUse =
            picked ??
            activeDebtorNoticeScope.notificationDate ??
            (targetIsPrimary ? debtorNotificationDate : null) ??
            fallbackDay;

        const purposeText = String(summonsPurposeFromModal ?? notificationPurpose ?? '').trim();

        const wasInitialNotice = notificationCount === 0;
        const forceMemo = Boolean(notifyOpts?.forceExecutionMemo && notificationCount === 1);

        if (!wasInitialNotice && !subsequentNoticeUnlocked && !forceMemo) {
            showToast(
                'سجّل حضور المدين، أو «انتهاء المهلة» بعد السبعة أيام، أو نفّذ إجراء التنفيذ المناسب قبل تسجيل تبليغ لاحق.',
                'warning'
            );
            return;
        }

        if (targetIsPrimary) setDebtorNotificationDate(dateToUse);
        setLastActionDate(dateToUse);

        const isMemoRegistration = wasInitialNotice || forceMemo;
        const nextCount = isMemoRegistration ? 1 : notificationCount + 1;

        let eventTitle = '';
        let eventDescription = '';

        if (isMemoRegistration) {
            eventTitle = forceMemo ? '📋 إعادة تبليغ بمذكرة الإخبار بالتنفيذ' : '📋 مذكرة الإخبار بالتنفيذ';
            eventDescription = forceMemo
                ? `إعادة مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`
                : `مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`;
            if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                eventDescription += initialNoticeLawyerFeesIncluded
                    ? '\nأتعاب المحاماة مشمولة في المذكرة (تخلية — كاسب).'
                    : '\nأتعاب المحاماة: مسار اعتيادي دون شمول في المذكرة.';
            }
            setActiveNoticeState('initial_notice');
            if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(false);
            setVoluntaryEndOptimistic(false);
        } else {
            const raqm = nextCount - 1;
            const raqmLabel = AR_TABLIGH_RAQM[raqm] ?? String(raqm);
            eventTitle = `🔔 تبليغ رقم ${raqmLabel}${purposeText ? ` — ${purposeText}` : ''}`;
            eventDescription = `الغاية: ${purposeText || '—'}. تاريخ التبليغ: ${dateToUse}`;
        }

        const recorded = new Date().toISOString();
        const eventId = nextTimelineId();
        const newEvent: TimelineEvent = {
            id: eventId,
            date: dateToUse,
            timestamp: recorded,
            title: eventTitle,
            description: eventDescription,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };

        const markerPurpose = purposeText || 'تبليغ';
        const markerTrimmed =
            markerPurpose.length > 280 ? `${markerPurpose.slice(0, 280)}…` : markerPurpose;
        const markerPayload = isMemoRegistration
            ? null
            : {
                  id: eventId,
                  date: dateToUse,
                  purpose: markerTrimmed,
                  recordedAt: new Date().toISOString(),
              };
        const scopedDebtorPatch =
            executionData?.id
                ? {
                      ...buildDebtorNoticePatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          {
                              notificationDate: dateToUse,
                              ...(isMemoRegistration
                                  ? {
                                        memoAnchorDate: dateToUse,
                                        voluntaryPeriodEndDeclared: false,
                                        absenceBadgeDismissed: false,
                                        activeNoticeState: 'initial_notice',
                                    }
                                  : {}),
                          }
                      ),
                      ...buildDebtorNotificationCountPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextCount
                      ),
                      ...buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          markerPayload
                      ),
                  }
                : { debtorNotificationDate: dateToUse };

        const persistPatch: Record<string, unknown> = {
            lastActionDate: dateToUse,
            ...(targetIsPrimary ? { notificationCount: nextCount } : {}),
            ...(targetIsPrimary ? { debtor_summons_marker: markerPayload } : {}),
            ...scopedDebtorPatch,
        };

        if (!isMemoRegistration && executionData?.id) {
            Object.assign(persistPatch, {
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    executionData,
                    targetDebtorKey,
                    null,
                    primaryDebtorKeyResolved
                ),
                ...buildPublicationNoticePatchForDebtorKey(executionData, targetDebtorKey, null),
            });
        }

        if (isMemoRegistration) {
            setNotificationCount(1);
            if (isEvictionExecutionModule) {
                Object.assign(persistPatch, {
                    eviction_first_notice_date: dateToUse,
                    eviction_voluntary_period_end_declared: false,
                    debtor_absence_badge_dismissed: false,
                });
                if (typeof initialNoticeLawyerFeesIncluded === 'boolean') {
                    persistPatch.eviction_initial_notice_lawyer_fees_included = initialNoticeLawyerFeesIncluded;
                    persistPatch.eviction_lawyer_fee_waived_at_intake = !initialNoticeLawyerFeesIncluded;
                    if (initialNoticeLawyerFeesIncluded) {
                        persistPatch.eviction_lawyer_fee_requested = true;
                    }
                }
            } else if (targetIsPrimary) {
                Object.assign(persistPatch, {
                    execution_memo_anchor_date: dateToUse,
                    notice_voluntary_period_end_declared: false,
                    debtor_absence_badge_dismissed: false,
                });
            }
        } else {
            setNotificationCount((p) => p + 1);
            if (isEvictionExecutionModule) {
                const forCol = Boolean(evictionSubsequentMeta?.forCollection);
                const branch = forCol ? evictionSubsequentMeta?.branch ?? null : null;
                Object.assign(persistPatch, {
                    eviction_voluntary_period_end_declared: false,
                    eviction_last_summons_for_collection: forCol,
                    eviction_last_collection_summons_branch: branch,
                });
            }
        }

        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persistExecutionMerge({
                ...persistPatch,
                timelineEvents: next,
            });
            return next;
        });

        if (!isMemoRegistration) {
            setDebtorSummonsMarkerLocal(markerPayload);
        } else {
            setDebtorSummonsMarkerLocal(null);
        }

        setNotificationPurpose('');
        setSummonsMarkerPopoverOpen(false);

        showToast(
            forceMemo
                ? 'تم تسجيل إعادة التبليغ بمذكرة الإخبار بالتنفيذ'
                : wasInitialNotice
                  ? 'تم تسجيل مذكرة الإخبار بالتنفيذ'
                  : 'تم تسجيل التبليغ',
            'success'
        );
    };
    const activeDebtorHeirsForNotification = useActiveDebtorHeirsForNotification(
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
    );

    const normalizeHeirWorkflowKey = useCallback((name: string) => {
        const raw = String(name || '').trim();
        return raw
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N}\s]/gu, '');
    }, []);
    const heirsWorkflowByHeir = useHeirsWorkflowByHeir(
        executionData,
        activeDebtorHeirsForNotification,
        normalizeHeirWorkflowKey,
    );
    const upsertHeirWorkflow = useCallback(
        (
            heirName: string,
            updater: (prev: Record<string, any>) => Record<string, any>,
            timelineEvent?: TimelineEvent
        ) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prevAll = executionData?.heirs_notification_workflow?.byHeir || {};
            const prevOne = prevAll[key] || {
                heirName,
                memoStatus: 'none',
                summonStatus: 'none',
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
            };
            const updatedOne = updater(prevOne);
            const updatedAll = {
                ...prevAll,
                [key]: {
                    ...updatedOne,
                    heirName,
                    lastActionAt: new Date().toISOString(),
                },
            };
            if (timelineEvent) {
                setTimelineEvents((prevTl) => {
                    const nextTl = [timelineEvent, ...prevTl];
                    persistExecutionMerge({
                        heirs_notification_workflow: {
                            hasReceivedInitialNotice: true,
                            byHeir: updatedAll,
                        },
                        timelineEvents: nextTl,
                    });
                    return nextTl;
                });
                return;
            }
            persistExecutionMerge({
                heirs_notification_workflow: {
                    hasReceivedInitialNotice: true,
                    byHeir: updatedAll,
                },
            });
        },
        [executionData?.heirs_notification_workflow?.byHeir, normalizeHeirWorkflowKey, persistExecutionMerge]
    );
    const computeDeadlineYmd = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return '';
        const d = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(d.getTime())) return '';
        d.setDate(d.getDate() + daysWindow);
        return formatDateToLocalYmd(d);
    }, []);
    const computeDaysRemaining = useCallback((fromYmd: string, daysWindow: number) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromYmd)) return null;
        const notif = parseLocalNotificationDate(fromYmd);
        if (Number.isNaN(notif.getTime())) return null;
        const startFromNextDay = new Date(notif);
        startFromNextDay.setDate(startFromNextDay.getDate() + 1);
        startFromNextDay.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((today.getTime() - startFromNextDay.getTime()) / 86400000);
        const elapsed = diff >= 0 ? diff + 1 : 0;
        return Math.max(daysWindow - elapsed, 0);
    }, []);
    const openHeirsNotificationCenter = useCallback(() => {
        if (!activeDebtorIsDeceased || activeDebtorHeirsForNotification.length === 0) return;
        const seeded: Record<string, string> = {};
        activeDebtorHeirsForNotification.forEach((h) => {
            const key = normalizeHeirWorkflowKey(h);
            if (!key) return;
            seeded[key] = '';
        });
        setHeirNoticeDateDrafts(seeded);
        setHeirSummonsDatePickerOpenByHeir({});
        setShowHeirsNotificationModal(true);
    }, [activeDebtorIsDeceased, activeDebtorHeirsForNotification, normalizeHeirWorkflowKey]);
    useEffect(() => {
        if (!showDecisionsModal) return;
        if (showHeirsNotificationModal) setShowHeirsNotificationModal(false);
    }, [showDecisionsModal, showHeirsNotificationModal]);
    const issueHeirMemoNotice = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التبليغ لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: ymd,
                    memoStatus: 'active',
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📋 مذكرة إخبار بالتنفيذ — ${heirName}`,
                    description: `تم إصدار مذكرة الإخبار بالتنفيذ للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                }
            );
            showToast(`تم إصدار مذكرة الإخبار للوريث ${heirName}`, 'success');
        },
        [heirNoticeDateDrafts, normalizeHeirWorkflowKey, nextTimelineId, showToast, upsertHeirWorkflow]
    );
    const markHeirMemoAttended = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'attended' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ تم حضور الوريث — ${heirName}`,
                    description: `سُجّل حضور الوريث ${heirName} ضمن مرحلة مذكرة الإخبار.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const closeHeirMemoManually = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, memoStatus: 'closed_manual' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏳ إنهاء مدة مذكرة الإخبار يدوياً — ${heirName}`,
                    description: `انتهت مدة السبعة أيام وتم إنهاء تبليغ مذكرة الإخبار للوريث ${heirName} يدوياً.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const issueHeirSummons = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('حدد تاريخ التكليف لهذا الوريث أولاً.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: ymd,
                    summonStatus: 'active',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: ymd,
                    timestamp: new Date().toISOString(),
                    title: `📨 تكليف بالحضور — ${heirName}`,
                    description: `تم تسجيل تكليف بالحضور للوريث ${heirName}. تاريخ التبليغ الفعلي: ${ymd}.`,
                    type: 'notification',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [
            heirNoticeDateDrafts,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
            setHeirSummonsDatePickerOpenByHeir,
        ]
    );
    const requestHeirInvestigationCourt = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const row = heirsWorkflowByHeir[key];
            const refDate = row?.summonDate || getLocalTodayYmd();
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: refDate,
                content: `مفاتحة محكمة التحقيق بحق الوريث ${heirName} بعد انتهاء مدة التكليف بالحضور.`,
            });
            if (!decisionId) {
                showToast('تعذر تحويل طلب مفاتحة التحقيق إلى مركز القرارات.', 'warning');
                return;
            }
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonStatus: 'expired',
                    investigationRequestStatus: 'requested',
                    investigationDecisionStatus: 'pending',
                    investigationDecisionId: decisionId,
                }),
                {
                    id: nextTimelineId(),
                    date: refDate,
                    timestamp: new Date().toISOString(),
                    title: `⚖️ مفاتحة محكمة التحقيق — ${heirName}`,
                    description: `تم تحويل طلب مفاتحة محكمة التحقيق بحق الوريث ${heirName} إلى مركز القرارات.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                }
            );
            showToast('تم تحويل الطلب إلى قسم القرارات.', 'success', { decisionsLink: true });
        },
        [
            heirsWorkflowByHeir,
            decisionsStorageExecutionId,
            normalizeHeirWorkflowKey,
            nextTimelineId,
            showToast,
            upsertHeirWorkflow,
        ]
    );
    const markHeirAttendedAfterInvestigation = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    memoDate: null,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                    memoStatus: 'closed_manual',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد مفاتحة التحقيق — ${heirName}`,
                    description: `سُجل حضور الوريث ${heirName} وتمت إعادة فتح دورة التكليف بالحضور له بشكل مستقل.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    useExecutionDashboardHeirsInvestigationSync({
        executionData,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    });

    const issueHeirArrestWarrant = useCallback(
        (heirName: string) => {
            upsertHeirWorkflow(
                heirName,
                (prev) => ({ ...prev, arrestWarrantStatus: 'issued' }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `🚨 صدور مذكرة قبض — ${heirName}`,
                    description: `تم تسجيل صدور مذكرة قبض بحق الوريث ${heirName}.`,
                    type: 'coercive',
                    source: 'مركز تبليغ الورثة',
                }
            );
        },
        [nextTimelineId, upsertHeirWorkflow]
    );
    const markHeirSummonsAttended = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `✅ حضور الوريث بعد التكليف — ${heirName}`,
                    description: `تم تسجيل حضور الوريث ${heirName} ضمن مرحلة التكليف بالحضور.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow]
    );
    const markHeirSummonsPeriodEnded = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            upsertHeirWorkflow(
                heirName,
                (prev) => ({
                    ...prev,
                    summonDate: null,
                    summonStatus: 'none',
                    investigationRequestStatus: 'none',
                    investigationDecisionStatus: 'none',
                    investigationDecisionId: null,
                    arrestWarrantStatus: 'none',
                }),
                {
                    id: nextTimelineId(),
                    date: getLocalTodayYmd(),
                    timestamp: new Date().toISOString(),
                    title: `⏱️ إنهاء مدة التكليف — ${heirName}`,
                    description: `تم إنهاء مدة التكليف بالحضور للوريث ${heirName} وإغلاق هذا التكليف.`,
                    type: 'other',
                    source: 'مركز تبليغ الورثة',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow]
    );

    const clearDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const ts = new Date().toISOString();
        const cur = debtorSummonsMarkerLocal;
        if (!cur?.id) return;
        const nextMarker = {
            ...cur,
            badgeHiddenAt: ts,
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: prev,
            });
            return prev;
        });
        setSummonsMarkerPopoverOpen(false);
        showToast('أُخفيت الإشارة من البطاقة', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const terminateDebtorSummonsMarker = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const marker = debtorSummonsMarkerLocal;
        if (!marker?.id) return;
        const ts = new Date().toISOString();
        const nextMarker = {
            ...marker,
            periodEndedAt: ts,
        };
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: ts.slice(0, 10),
            timestamp: ts,
            title: '⏹ إنهاء التبليغ',
            description: `تم إنهاء التبليغ المسجّل بتاريخ ${marker.date}. الغاية: ${marker.purpose || '—'}.`,
            type: 'notification',
            source: 'التبليغ',
            metadata: timelineDebtorMetadata(targetDebtorKey),
        };
        setDebtorSummonsMarkerLocal(nextMarker);
        setTimelineEvents((prev) => {
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          nextMarker
                      )
                    : { debtor_summons_marker: nextMarker }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ', 'info');
    }, [
        debtorSummonsMarkerLocal,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
        unifiedSummonsTargetDebtorKey,
    ]);

    const saveSummonsMarkerPurposeEdit = useCallback(() => {
        const targetDebtorKey = unifiedSummonsTargetDebtorKey;
        const m = debtorSummonsMarkerLocal;
        if (!m?.id) return;
        const p = summonsPurposeDraft.trim();
        const truncated = p.length > 280 ? `${p.slice(0, 280)}…` : p;
        const marker = {
            id: m.id,
            date: m.date,
            purpose: truncated || 'تبليغ',
        };
        setTimelineEvents((prev) => {
            const next = prev.map((e) => {
                if (String(e.id) !== String(m.id)) return e;
                const title = `🔔 تطلب حضوره${p ? ` — ${p}` : ''}`;
                return {
                    ...e,
                    description: `الغاية: ${p || '—'}. تاريخ التبليغ المُسجَّل: ${m.date}`,
                    title,
                };
            });
            persistExecutionMerge({
                ...(executionData?.id
                    ? buildDebtorSummonsMarkerPatchForKey(
                          executionData,
                          targetDebtorKey,
                          primaryDebtorKeyResolved,
                          marker
                      )
                    : { debtor_summons_marker: marker }),
                timelineEvents: next,
            });
            return next;
        });
        setDebtorSummonsMarkerLocal(marker);
        setSummonsMarkerPopoverOpen(false);
        showToast('تم حفظ الغاية', 'success');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        persistExecutionMerge,
        showToast,
    ]);

    // 🆕 V8: FORCED ATTENDANCE HANDLER (إحضار جبري)
    const handleForcedAttendance = () => {
        if (!forcedSummoningAnalysis.canForceSummon) {
            showToast(forcedSummoningAnalysis.lockReasonAr || 'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.', 'warning');
            return;
        }
        setForcedAttendanceIssued(true);
        setActiveNoticeState('forced_attendance');
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '👮 مذكرة إحضار جبري للمدين',
            description: `تم إصدار مذكرة إحضار جبري للمدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => {
            const next = [newEvent, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إصدار مذكرة الإحضار الجبري', 'success');
    };

    /** مسار الكاسب بعد مذكرة الإحضار: تأمين إحضار مباشر */
    const handleEarnerSecureForcedAttendance = () => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تأمين إحضار المدين',
            description: `تم تأمين إحضار المدين ${activeDebtorNameResolved} تنفيذاً لمذكرة الإحضار الجبري.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل تأمين الإحضار', 'success');
    };

    const handleRequestInvestigationFromForced = () => {
        const now = new Date().toISOString();
        setInvestigationCourtRequested(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⚖️ طلب مفاتحة محكمة التحقيق',
            description: `طلب مفاتحة محكمة التحقيق لمتابعة إحضار المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل طلب المفاتحة', 'info');
    };

    const handleInvestigationDebtorShowed = () => {
        const now = new Date().toISOString();
        setInvestigationPathDebtorPresent(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🟢 حضور المدين — مسار التحقيق',
            description: 'تسجيل حضور المدين في إطار مفاتحة محكمة التحقيق.',
            type: 'summons',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل حضور المدين', 'success');
    };

    const handleInvestigationIssueMemo = () => {
        const now = new Date().toISOString();
        setInvestigationMemoIssued(true);
        setArrestWarrantUnlocked(true);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '📜 إصدار مذكرة قبض — مسار التحقيق',
            description: `إصدار مذكرة قبض بحق المدين ${activeDebtorNameResolved}.`,
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم تسجيل إصدار المذكرة', 'success');
    };

    const handleConfirmSecuredAfterInvestigation = () => {
        const now = new Date().toISOString();
        setForcedPathAttendanceSecured(true);
        setDebtorForcedToAttend(true);
        setActiveNoticeState(null);
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '✅ تم تأمين إحضار المدين — بعد المفاتحة',
            description: 'إكمال تأمين إحضار المدين بعد مسار مفاتحة محكمة التحقيق.',
            type: 'coercive',
            source: 'التبليغ والإحضار',
            metadata: timelineDebtorMetadata(activeFollowupDebtorKey),
        };
        setTimelineEvents((prev) => [newEvent, ...prev]);
        showToast('تم إكمال تأمين الإحضار', 'success');
    };
    
    // 🆕 V8: DEBTOR EVASION HANDLER (المدين تخفى)
    const handleDebtorEvasion = () => {
        setDebtorEvaded(true);
        setArrestWarrantUnlocked(true);
        persistExecutionMerge({ debtorEvaded: true });
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '🚫 المدين تخفى عن الأنظار',
            description: 'لم يُعثر على المدين. تم تفعيل خيار مفاتحة محكمة التحقيق (أمر قبض)',
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم تفعيل خيار أمر القبض', 'warning');
    };

    const applyEarnerFeeSmAction = useCallback(
        (action: EarnerFeeSmAction) => {
            if (action.type === 'B2_FORCED_MEMO' && !forcedSummoningAnalysis.canForceSummon) {
                showToast(
                    forcedSummoningAnalysis.lockReasonAr || 'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                    'warning'
                );
                return;
            }
            const side = {
                force: false,
                evasion: false,
                clearEvasion: false,
                b3: false,
                b4: false,
            };
            setEarnerFeeCollectionSm((prev) => {
                if (action.type === 'B1_PERIOD_DONE' && prev.b1PeriodComplete) return prev;
                if (action.type === 'B2_FORCED_MEMO' && prev.b2ForcedMemoIssued) return prev;
                if (action.type === 'B3_REQUEST' && prev.b3InvestigationRequested) return prev;
                if (action.type === 'B3_CONFIRM_PROCESSED' && prev.b3ProcessedConfirmed) return prev;
                if (action.type === 'B4_WARRANT' && prev.b4WarrantLogged) return prev;

                const next = reduceEvictionEarnerFeeSm(prev, action);
                const merge: Record<string, unknown> = { eviction_earner_fee_collection_sm: next };
                if (action.type === 'PICK_ORDINARY') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'ordinary';
                }
                if (action.type === 'PICK_COERCIVE') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'coercive';
                }
                persistExecutionMerge(merge);

                if (action.type === 'B2_FORCED_MEMO' && !prev.b2ForcedMemoIssued) side.force = true;
                if (action.type === 'B2_EVADING' && action.value && !prev.b2DebtorEvading) side.evasion = true;
                else if (action.type === 'B2_EVADING' && !action.value && prev.b2DebtorEvading)
                    side.clearEvasion = true;
                if (action.type === 'B3_REQUEST' && !prev.b3InvestigationRequested) side.b3 = true;
                if (action.type === 'B4_WARRANT' && !prev.b4WarrantLogged) side.b4 = true;

                return next;
            });
            if (side.force) handleForcedAttendance();
            if (side.evasion) handleDebtorEvasion();
            if (side.clearEvasion) {
                setDebtorEvaded(false);
                persistExecutionMerge({ debtorEvaded: false });
            }
            if (side.b3) handleRequestInvestigationFromForced();
            if (side.b4) handleInvestigationIssueMemo();
        },
        [forcedSummoningAnalysis, persistExecutionMerge, showToast]
    );

    const resetEarnerFeeNotificationCycle = useCallback(() => {
        const fresh = defaultEvictionEarnerFeeCollectionSM();
        setEarnerFeeCollectionSm(fresh);
        setActiveNoticeState(null);
        setForcedAttendanceIssued(false);
        setInvestigationCourtRequested(false);
        setInvestigationMemoIssued(false);
        setInvestigationPathDebtorPresent(false);
        setForcedPathAttendanceSecured(false);
        setDebtorForcedToAttend(false);
        setDebtorArrested(false);
        setArrestWarrantUnlocked(false);
        setDebtorEvaded(false);
        persistExecutionMerge({
            eviction_earner_fee_collection_sm: fresh,
            eviction_last_summons_for_collection: false,
            eviction_last_collection_summons_branch: null,
            activeNoticeState: null,
            forcedAttendanceIssued: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            debtorArrested: false,
            arrestWarrantUnlocked: false,
            debtorEvaded: false,
        });
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '🔄 إعادة ضبط مسار الاستحصال والتبليغ (كاسب — تخلية)',
            description: 'قُطع مسار الإكراه المرتبط بالاستحصال وأُعيدت آلية التبليغ لحالتها الأولية.',
            type: 'summons',
            source: 'التبليغ والإحضار',
        };
        setTimelineEvents((prev) => [ev, ...prev]);
        showToast('أُعيد ضبط مسار التبليغ والاستحصال — توقفت الإجراءات الإكراهية المعلّقة', 'info');
    }, [persistExecutionMerge, nextTimelineId, showToast]);
    
    // 🆕 V8: ARREST WARRANT HANDLER (أمر القبض)
    const handleArrestWarrant = () => {
        const now = new Date().toISOString();
        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: '⛓️ مفاتحة محكمة التحقيق (أمر قبض)',
            description: `تم مفاتحة محكمة التحقيق لإصدار أمر قبض بحق المدين ${activeDebtorNameResolved}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم تسجيل مفاتحة محكمة التحقيق', 'success');
    };
    
    /** مهلة الرضا من آلة الحالة (تاريخ إخبار فعلي + 7 أيام تقويمية ± تمديد يدوي) */
    const notificationModalDaysRemaining = masterState.debtors[0]?.notificationDate != null
        ? masterState.debtors[0].daysRemaining
        : null;
    const notificationModalGraceExpired =
        remaining > 0 &&
        Boolean(masterState.debtors[0]?.notificationDate) &&
        masterState.debtors[0]?.status === 'READY_FOR_COERCIVE';

    // ===========================
    // CRITICAL: END OF GRACE PERIOD TRIGGER
    // ===========================
    const handleEndGracePeriod = () => {
        setGracePeriodActive(false);
        setGracePeriodEnded(true);
        setDebtorNotificationDate(computeForcedDebtorNotificationYmd(debtorNotificationDate));

        const { mergePatch, injectExecutionFee, feeEvent } = buildEndGracePeriodMergePatch(
            executionFeeInjected,
            calculatedExecutionFee,
        );
        if (injectExecutionFee && feeEvent) {
            setExecutionFeeInjected(true);
            pushTimelineEvent(feeEvent);
        }
        pushTimelineEvent(buildGracePeriodEndedTimelineEvent(), { mergePatch });

        showToast('⚠️ تم تفعيل التنفيذ الجبري وإضافة الرسوم المطلوبة', 'warning');
        setLastActionDate(getLocalTodayYmd());
    };

    const { appendEvictionProcedure } = useEvictionProcedures(
        evictionProcedureLocked,
        decisionsStorageExecutionId,
        EVICTION_WORKFLOW_BY_ACTION_ID,
        appendEvictionExecutorRequest,
        showToast,
    );

    const handleEvictionHeirsNotificationDateChange = useCallback(
        (ymd: string) => {
            setEvictionHeirsNotificationDateYmd(ymd);
            persistExecutionMerge({ eviction_heirs_notification_date_ymd: ymd.trim() ? ymd : null });
        },
        [persistExecutionMerge]
    );

    const handleIssueHeirsExecutionNoticeMemo = useCallback(() => {
        const ymd = evictionHeirsNotificationDateYmd.trim();
        const datePart = ymd ? `\nتاريخ تبليغ الورثة المسجَّل: ${ymd}.` : '';
        appendEvictionProcedure({
            actionId: EVICTION_TIMELINE_ACTION_IDS.HEIRS_EXECUTION_NOTICE_MEMO,
            title: '📜 إصدار مذكرة إخبار بالتنفيذ للورثة',
            description: `تم إصدار مذكرة إخبار بالتنفيذ لورثة المدين الشاغلين للعقار.${datePart}`,
        });
    }, [appendEvictionProcedure, evictionHeirsNotificationDateYmd]);

    const showResidentialEvictionGraceControl =
        isEvictionExecutionModule && evictionPremisesUseResolved === 'residential';

    const residentialGracePeriodSaved = useMemo(
        () =>
            hasActiveResidentialEvictionGrace({
                premisesUse: evictionPremisesUseResolved,
                gracePeriodStart: evictionResidentialGracePeriodStart,
                vacateDeadline: evictionVacateDeadlineLocal,
                manuallyEndedAt: evictionResidentialGraceManuallyEndedAt,
            }),
        [
            evictionPremisesUseResolved,
            evictionResidentialGracePeriodStart,
            evictionVacateDeadlineLocal,
            evictionResidentialGraceManuallyEndedAt,
        ]
    );

    /** موافقة إنهاء مبكر سارية — تُلغى عند وجود مهلة نشطة (دورة جديدة بعد التسجيل) */
    const residentialGraceEarlyEndApproved = useMemo(() => {
        if (residentialGracePeriodSaved) return false;
        const exId = String(decisionsStorageExecutionId || executionId || '').trim();
        if (!exId) return false;
        const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
        return rows.some((d) => {
            if (String((d as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
                return false;
            }
            if (String((d as { evictionWorkflowKey?: string }).evictionWorkflowKey || '') !== 'residential_grace_early_end') {
                return false;
            }
            return isExecutorRowEffectivelyApproved(d);
        });
    }, [
        residentialGracePeriodSaved,
        decisionsStorageExecutionId,
        executionId,
        decisionsReloadEpoch,
    ]);

    /** يظهر طلب الإنهاء فقط مع مهلة سكنية مسجّلة وسارية — نفس شرط «تعديل المهلة» */
    const showResidentialGraceEarlyEndRequest = residentialGracePeriodSaved;

    /** إجراءات ميدانية بعد مهلة سكنية: موافقة إنهاء مبكر، انتهاء تقويمي، أو إنهاء يدوي */
    const residentialGraceAllowsFieldwork = useMemo(() => {
        if (!isEvictionExecutionModule) return true;
        if (evictionPremisesUseResolved !== 'residential') return true;
        if (!residentialGracePeriodSaved) return true;
        if (residentialGraceEarlyEndApproved) return true;
        if (isResidentialVacateGraceFinished) return true;
        if (Boolean((executionData as { eviction_residential_grace_manually_ended_at?: string })?.eviction_residential_grace_manually_ended_at)) {
            return true;
        }
        return false;
    }, [
        isEvictionExecutionModule,
        evictionPremisesUseResolved,
        residentialGracePeriodSaved,
        residentialGraceEarlyEndApproved,
        isResidentialVacateGraceFinished,
        executionData,
    ]);

    const showBreakInventoryRequest = residentialGraceAllowsFieldwork;

    const residentialGraceModalShowPrimarySave = useMemo(() => {
        if (graceModalAllowResave) return true;
        return !residentialGracePeriodSaved;
    }, [graceModalAllowResave, residentialGracePeriodSaved]);

    const openEvictionResidentialGraceModal = useCallback((opts?: { edit?: boolean }) => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن فتح المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const endFromState =
            evictionVacateDeadlineLocal && /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal)
                ? evictionVacateDeadlineLocal
                : evictionVacateDraft.trim();
        setGraceModalEndYmd(/^\d{4}-\d{2}-\d{2}$/.test(endFromState) ? endFromState : '');
        setGraceModalStartYmd(evictionResidentialGracePeriodStart || evictionLocalYmdToday());
        setGraceModalAllowResave(Boolean(opts?.edit));
        setShowEvictionResidentialGraceModal(true);
    }, [
        evictionProcedureLocked,
        evictionVacateDeadlineLocal,
        evictionVacateDraft,
        evictionResidentialGracePeriodStart,
        showToast,
    ]);

    const openEvictionExecutorCompletion = useCallback(
        (decisionId: string) => {
            const primaryKey = String(decisionsStorageExecutionId ?? '').trim();
            const altKey = String(executionId ?? '').trim();
            const did = String(decisionId).trim();
            if (!did) return;

            const rowsPrimary = readExecutorDecisionsArray(primaryKey) as Array<Record<string, unknown>>;
            let keyUsed = primaryKey;
            let row = rowsPrimary.find((r) => String((r as any).id || '').trim() === did);
            if (!row && altKey && altKey !== primaryKey) {
                const rowsAlt = readExecutorDecisionsArray(altKey) as Array<Record<string, unknown>>;
                row = rowsAlt.find((r) => String((r as any).id || '').trim() === did);
                if (row) keyUsed = altKey;
            }
            if (!row) return;
            const branch = inferExecutorApprovalDecisionType(row as any);
            const requestTitle = String((row as any).title || '').trim() || 'طلب';
            const dossierId = keyUsed;

			const openDecisionCardFallback = () => {
				setShowDecisionsModal(true);
				setDecisionsModalBootListTab('previous');
				setDecisionsModalScrollToDecisionId(did);
			};

            if (branch === 'Field Visit Date') {
                executorApprovalActions.openScheduledDateModal({
                    decisionId,
                    requestTitle,
                    onSaved: (payload) => {
                        executorApprovalActions.pushCalendarAppointment({
                            dossierId,
                            decisionId,
                            purpose: requestTitle,
                            eventIso: payload.eventIso,
                            recordedAt: new Date().toISOString(),
                        });
                        executorApprovalActions.patchDecision(decisionId, {
                            executorScheduleLabel: `مجدول: ${payload.displayAr}`,
                        });
                        try {
                            SecureStoreService.setItemSync(fieldVisitAppointmentStorageKey(dossierId), payload.eventIso);
                        } catch {
                            /* ignore */
                        }
                    },
                });
                return;
            }

            if (branch === 'Grace Period') {
                setShowDecisionsModal(false);
                setEvictionGraceDecisionId(decisionId);
                openEvictionResidentialGraceModal();
                return;
            }

            if (branch === 'Police Assistance Request') {
                setShowDecisionsModal(false);
                setPoliceAssistanceDecisionId(decisionId);
                setPoliceAssistanceRequestTitle(requestTitle);
                setPoliceAssistanceAgencyDraft(String((row as any).policeAssistanceAgency || '').trim());
                setPoliceAssistanceModalOpen(true);
				return;
            }

			if (branch === 'Lock Breaking & Inventory') {
				setShowDecisionsModal(false);
				openBreakInventoryCompletion(decisionId, executorApprovalActions, requestTitle);
				return;
			}

			if (branch === 'Judicial Custodian') {
				setShowDecisionsModal(false);
				openJudicialCustodianCompletion(decisionId, executorApprovalActions, requestTitle);
				return;
			}

			if (branch === 'Eviction') {
				setShowDecisionsModal(false);
				executorApprovalActions.promptOpenExecutionReport(() => {
					/* handled by confirm modal */
				});
				return;
			}

			if (branch === 'Residential Grace Early End') {
				setShowUnifiedExecutionModal(true);
				setUnifiedModalTab('coercive');
				showToast('تمت موافقة المنفذ — أكمل من بطاقة الطلب في «محضر المتابعة».', 'info', {
					decisionsLink: true,
					decisionId: did,
					decisionsTab: 'previous',
				});
				return;
			}

			openDecisionCardFallback();
        },
        [
            decisionsStorageExecutionId,
            executionId,
            executorApprovalActions,
            openBreakInventoryCompletion,
            openEvictionResidentialGraceModal,
            openJudicialCustodianCompletion,
            setDecisionsModalBootListTab,
            setDecisionsModalScrollToDecisionId,
            setShowDecisionsModal,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            showToast,
        ]
    );

    openEvictionExecutorCompletionRef.current = openEvictionExecutorCompletion;

    const submitEvictionResidentialGraceFromModal = useCallback(() => {
        if (
            !graceModalAllowResave &&
            evictionResidentialGracePeriodStart &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionResidentialGracePeriodStart) &&
            evictionVacateDeadlineLocal &&
            /^\d{4}-\d{2}-\d{2}$/.test(evictionVacateDeadlineLocal) &&
            !isResidentialVacateGraceFinished
        ) {
            showToast(
                'المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة المهلة.',
                'warning'
            );
            return;
        }
        const start = graceModalStartYmd.trim();
        const end = graceModalEndYmd.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
            showToast('اختر تاريخ بداية المهلة وتاريخ انتهائها بشكل صحيح.', 'warning');
            return;
        }
        if (start > end) {
            showToast('تاريخ البداية لا يجوز أن يتأخر عن تاريخ الانتهاء', 'warning');
            return;
        }
        if (residentialVacateDeadlineMaxIso && end > residentialVacateDeadlineMaxIso) {
            showToast(`لا يجوز تجاوز ${residentialVacateDeadlineMaxIso} (أقصى 90 يوماً تقويمياً بعد الإخبار)`, 'warning');
            return;
        }
        const days = evictionInclusiveCalendarDays(start, end);
        if (days <= 0) {
            showToast('تأكد من صحة المدة بين التاريخين', 'warning');
            return;
        }
        setEvictionVacateDeadlineLocal(end);
        setEvictionVacateDraft(end);
        setEvictionResidentialGracePeriodStart(start);
        setEvictionExecutorVacateGrantApproved(false);
        setEvictionResidentialGraceManuallyEndedAt(null);

        const now = new Date().toISOString();
        const day = now.slice(0, 10);
        const fn = executionData?.fileNumber ? String(executionData.fileNumber) : '';
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            title: '🏠 مهلة',
            description: `من ${start} إلى ${end} — ${days} يوماً تقويمياً`,
            date: day,
            timestamp: now,
            source: 'الإجراءات الجبرية — تخلية',
            metadata: {
                evictionResidentialGraceModal: true,
                graceStartYmd: start,
                graceEndYmd: end,
                graceDays: days,
            },
        };
        const appointmentEv: TimelineEvent = {
            id: nextTimelineId(),
            type: 'appointment',
            date: `${end}T12:00:00`,
            timestamp: now,
            title: '⏳ انتهاء المهلة',
            description: `المهلة ${days} يوماً (من ${start} إلى ${end})`,
            source: 'المهلة',
            metadata: {
                residentialGraceDeadlineAppointment: true,
                graceStartYmd: start,
                graceEndYmd: end,
                graceDays: days,
            },
        };
        const nextTimeline = [ev, appointmentEv, ...stripResidentialGraceTimelineEvents(timelineEvents)];
        setTimelineEvents(nextTimeline);
        syncExecutionTimelineAppointment({
            executionId: currentFileId,
            event: appointmentEv,
            caseNo:
                String(executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? '').trim() ||
                undefined,
            clientName:
                String(
                    executionData?.creditors?.[0]?.name ??
                        executionData?.clientName ??
                        file?.creditors?.[0]?.name ??
                        '',
                ).trim() ||
                undefined,
        });

        persistExecutionMerge({
            eviction_vacate_deadline: end,
            eviction_residential_grace_period_start: start,
            eviction_executor_vacate_grant_approved: false,
            eviction_residential_grace_manually_ended_at: null,
            timelineEvents: nextTimeline,
        });

        if (evictionGraceDecisionId) {
            patchExecutorDecisionRow(executionData?.id ?? executionId, evictionGraceDecisionId, {
                evictionGraceSavedAt: now,
                evictionGraceStartYmd: start,
                evictionGraceEndYmd: end,
                evictionGraceDays: days,
            });
            setEvictionGraceDecisionId(null);
        }

        setGraceModalAllowResave(false);
        setShowEvictionResidentialGraceModal(false);
        showToast(
            graceModalAllowResave
                ? 'تم تحديث المهلة.'
                : 'تم تسجيل المهلة — يُحدَّث السجل والمواعيد تلقائياً.',
            'success'
        );
    }, [
        graceModalAllowResave,
        graceModalStartYmd,
        graceModalEndYmd,
        evictionResidentialGracePeriodStart,
        evictionVacateDeadlineLocal,
        isResidentialVacateGraceFinished,
        residentialVacateDeadlineMaxIso,
        showToast,
        nextTimelineId,
        timelineEvents,
        persistExecutionMerge,
        executionData?.fileNumber,
        evictionGraceDecisionId,
        executionData?.id,
        executionId,
    ]);

    const { savePoliceAssistanceEntry, savePoliceAssistanceFromModal } =
        useExecutionDashboardPoliceAssistanceHandlers({
            evictionProcedureLocked,
            decisionsStorageExecutionId,
            executionData,
            executionId,
            executorApprovalActions,
            timelineEventsRef,
            caseTasksPendingRef,
            policeAssistanceDecisionId,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setCaseTasksPending,
            setTimelineEvents,
            setPoliceAssistanceDecisionId,
            setPoliceAssistanceRequestTitle,
            setPoliceAssistanceAgencyDraft,
            setPoliceAssistanceModalOpen,
        });

    const {
        saveBreakInventoryLedgerEntry,
        finalizeBreakInventoryEntry,
        saveMaritalFurnitureDeliveryInventoryEntry,
    } = useExecutionDashboardBreakInventoryHandlers({
        evictionProcedureLocked,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        showToast,
        setCaseNotesLog,
        persistExecutionMergeRef,
        persistExecutionMerge,
    });

    const completeEvictionResidentialGrace = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام المهلة — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => !String(t.id || '').startsWith('eviction-residential-grace-')
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام المهلة',
            description: 'تم إنهاء المهلة وإغلاق شارتها من البطاقة.',
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...timelineEventsRef.current];
        setEvictionResidentialGraceManuallyEndedAt(now);
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_residential_grace_manually_ended_at: now,
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام المهلة', 'success');
    }, [evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast]);

    const completePoliceAssistance = useCallback(() => {
        if (evictionProcedureLocked) {
            showToast('لا يمكن إتمام الطلب — الإضبارة أو الإجراءات مقفلة.', 'warning');
            return;
        }
        const cur = executionDataRef.current?.eviction_police_assistance;
        if (!cur || !cur.decisionId) return;
        const now = new Date().toISOString();
        const nextTasks = (caseTasksPendingRef.current || []).filter(
            (t) => String(t.id || '') !== `eviction-police-assistance-${cur.decisionId}`
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            type: 'eviction',
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ إتمام طلب القوة الجبرية',
            description: `تم إتمام الطلب وإغلاق شارة القوة الجبرية. الجهة: ${cur.agencyName}`,
            source: 'الإجراءات الجبرية — تخلية',
        };
        const nextTimeline = [ev, ...timelineEventsRef.current];
        setCaseTasksPending(nextTasks);
        setTimelineEvents(nextTimeline);
        persistExecutionMerge({
            eviction_police_assistance: { ...cur, completedAt: now },
            caseTasksPending: nextTasks,
            timelineEvents: nextTimeline,
        });
        showToast('تم إتمام طلب القوة الجبرية', 'success');
    }, [evictionProcedureLocked, nextTimelineId, persistExecutionMerge, showToast]);

    const requestFollowupSeizureDecision = useCallback(
        (subtype: 'third_party' | 'notice', title: string, body: string) => {
            const exId = decisionsStorageExecutionId;
            if (!exId || exId === 'undefined') return;
            const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
            const dup = rows.find(
                (r) =>
                    String(r.requestKind || '') === 'seizure' &&
                    String((r as any).seizureSubtype || '') === subtype &&
                    (String((r as any).executorOutcome || '') === 'pending' ||
                        (r as any).executorOutcome === undefined)
            );
            if (dup?.id) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionId: String(dup.id),
                    decisionsTab: 'current',
                });
                return;
            }

            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${title} — قيد البت لدى المنفذ`,
                requestBody: body,
                seizureSubtype: subtype,
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionsTab: 'current',
                });
                return;
            }

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `📋 ${title} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            });

            showToast('تم إرسال الطلب إلى القرارات والطعون.', 'success', {
                decisionsLink: true,
                decisionId,
                decisionsTab: 'current',
            });
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleGuarantorRequestFromFollowup = useCallback(() => {
        if (guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup)) {
            openGuarantorDetailsModal();
            return;
        }
        const gReq = appendGuarantorFollowupRequest({ executionId: decisionsStorageExecutionId });
        if (!gReq.ok) {
            showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                decisionsLink: true,
                decisionsTab: 'current',
            });
            return;
        }
        if (gReq.decisionId) {
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => [
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: 'طلب إدخال كفيل ضامن — قيد البت',
                    type: 'decision',
                    source: 'القرارات والطعون',
                    metadata: {
                        ...timelineDebtorMetadata(assignmentWorkspaceCtx.activeDebtorKey),
                        timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                        decisionRowId: gReq.decisionId,
                    },
                },
                ...prev,
            ]);
        }
        showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: gReq.decisionId,
            decisionsTab: 'current',
        });
    }, [
        assignmentWorkspaceCtx.activeDebtorKey,
        decisionsStorageExecutionId,
        executionData?.guarantor_followup,
        nextTimelineId,
        openGuarantorDetailsModal,
        showToast,
    ]);

    const archiveAndClearGuarantor = useCallback(
        (reason: 'replace' | 'unlink') => {
            const gf = executionData?.guarantor_followup;
            if (!gf) return;
            const archivedAt = new Date().toISOString();
            const prevHist = Array.isArray(executionData?.guarantor_followup_history)
                ? executionData?.guarantor_followup_history
                : [];
            persistExecutionMerge({
                guarantor_followup: null,
                hasGuarantor: false,
                guarantor_followup_history: [{ ...gf, archivedAt }, ...prevHist],
            });
            supersedeGuarantorRequestDecisionsForExecution(decisionsStorageExecutionId);
            pushTimelineEvent({
                id: nextTimelineId(),
                date: archivedAt.slice(0, 10),
                timestamp: archivedAt,
                title: reason === 'replace' ? 'استبدال الكفيل الضامن' : 'فك الكفالة / حذف الكفيل',
                description:
                    reason === 'replace'
                        ? 'تمت أرشفة الكفيل الحالي وفتح مسار تسجيل كفيل جديد.'
                        : 'تم إنهاء ارتباط الكفيل بالإضبارة وأرشفة بياناته.',
                type: 'procedure',
                source: 'محضر المتابعة',
            });
        },
        [
            decisionsStorageExecutionId,
            executionData?.guarantor_followup,
            executionData?.guarantor_followup_history,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
        ]
    );

    const requestGuarantorSeizure = useCallback(
        (subtype: 'salary' | 'movable' | 'property', opts?: { inline?: boolean }) => {
            const inline = Boolean(opts?.inline);
            const gf = executionData?.guarantor_followup;
            if (!gf?.executor_approved) {
                showToast('لا يوجد كفيل معتمد من المنفذ.', 'warning');
                return;
            }
            const hasDetails =
                gf.details_saved === true ||
                (Boolean(String(gf.guarantor_name || '').trim()) &&
                    Boolean(String(gf.guarantor_workplace || '').trim()));
            if (!hasDetails) {
                showToast('أكمل بيانات الكفيل (الاسم وجهة العمل) أولاً.', 'warning');
                return;
            }
            const label =
                subtype === 'salary'
                    ? 'طلب حجز راتب الكفيل'
                    : subtype === 'property'
                      ? 'طلب حجز عقار الكفيل'
                      : 'طلب حجز أموال منقولة للكفيل';
            const body = [
                'طلب اتخاذ إجراءات الحجز على الكفيل الضامن.',
                gf.guarantor_name?.trim() ? `اسم الكفيل: ${gf.guarantor_name.trim()}` : null,
                gf.guarantor_workplace?.trim() ? `عنوان العمل: ${gf.guarantor_workplace.trim()}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const subtypeStored =
                subtype === 'movable' ? ('movable_auction' as const) : subtype;
            const did = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: label,
                requestBody: body,
                seizureSubtype: subtypeStored,
                seizureTarget: 'guarantor',
            });
            if (!did) {
                showToast('يوجد طلب مماثل قيد المعالجة.', 'warning', { decisionsLink: true });
                return;
            }
            const ts = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: `📌 ${label} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
            });
            if (!inline) {
                setShowCoerciveActionForm(null);
                setSeizureDetailCompletion(null);
                openSeizureRequestsTabRef.current();
                setShowUnifiedExecutionModal(true);
                try {
                    const exId = String(
                        decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? ''
                    ).trim();
                    window.dispatchEvent(
                        new CustomEvent('hami-focus-guarantor-seizure-inline', {
                            detail: { executionId: exId, decisionId: did, kind: subtype },
                        })
                    );
                    window.dispatchEvent(
                        new CustomEvent('hami-guarantor-seizure-request-created', {
                            detail: { executionId: exId, decisionId: did },
                        })
                    );
                } catch {
                    /* ignore */
                }
            }
            showToast(
                inline
                    ? 'تم إرسال طلب حجز الكفيل — تابع الإكمال أدناه.'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
                'success',
                {
                    decisionsLink: true,
                    decisionId: did,
                    decisionsTab: 'current',
                }
            );
        },
        [
            decisionsStorageExecutionId,
            executionData?.guarantor_followup,
            executionData?.id,
            executionId,
            nextTimelineId,
            pushTimelineEvent,
            setShowCoerciveActionForm,
            setSeizureDetailCompletion,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            showToast,
        ]
    );

    const handleEvictionUnlockAssetsTab = useCallback(() => {
        setEvictionAssetsTabUnlocked(true);
        persistExecutionMerge({ eviction_assets_tab_unlocked: true });
        openFinancialHubLedger();
        showToast('تم فتح تبويب الحجز المالي', 'success');
    }, [openFinancialHubLedger, persistExecutionMerge, showToast]);

    const handleEvictionLedgerActivated = useCallback(() => {
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '📁 تم فتح وعاء المطالبة بالأتعاب والمصاريف',
            description:
                'فعّل المحامي مسار المطالبة بالأتعاب والمصاريف التنفيذية من المركز المالي (تخلية).',
            type: 'action',
            source: 'إدارة الأموال والمصاريف',
        };
        const next = [ev, ...timelineEvents];
        setTimelineEvents(next);
        persistExecutionMerge({
            timelineEvents: next,
            eviction_assets_tab_unlocked: true,
        });
        showToast('تم فتح مسار المطالبة وتسجيله في السجل الزمني.', 'success');
    }, [nextTimelineId, timelineEvents, persistExecutionMerge, showToast]);

    const { runSubmit: runEvictionLawyerFeeSubmit } = useStandardSubmit({
        validationMessage: '',
        validate: () => {
            const exId = decisionsStorageExecutionId;
            if (hasApprovedLawyerFeePayout(exId)) {
                showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
                return false;
            }
            return true;
        },
        submit: () => {
            const exId = decisionsStorageExecutionId;
            const amt = parsedLawyerFees > 0 ? parsedLawyerFees.toLocaleString('ar-IQ') : '—';
            const modeAr =
                lawyerFeeDisburseMode === 'salary_fifth'
                    ? 'صرف من خُمس الراتب (المدين موظف)'
                    : lawyerFeeDisburseMode === 'settlement'
                      ? 'تسوية / أقساط باتفاق'
                      : 'دفعة واحدة / صفقة';
            const notes = lawyerFeeDisburseNotes.trim();
            const ok = appendEvictionExecutorRequest({
                executionId: exId,
                title: 'طلب صرف أتعاب محكومة للمحامي',
                body: `طلب صرف أتعاب محكومة يتحمّلها المدين.\nالمبلغ التقريبي: ${amt} د.ع.\nأسلوب الصرف المطلوب: ${modeAr}.${notes ? `\nملاحظات: ${notes}` : ''}`,
                requestKind: 'lawyer_fee_payout',
            });
            if (!ok) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            setEvictionAssetsTabUnlocked(true);
            persistExecutionMerge({
                eviction_assets_tab_unlocked: true,
                eviction_lawyer_fee_requested: true,
            });
        },
        onClose: () => {
            setShowEvictionLawyerFeeModal(false);
            setLawyerFeeDisburseNotes('');
        },
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ',
        showToast,
    });

    const handleEvictionLawyerFeeRequest = useCallback(() => {
        const exId = decisionsStorageExecutionId;
        if (hasApprovedLawyerFeePayout(exId)) {
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
            return;
        }
        setShowEvictionLawyerFeeModal(true);
    }, [decisionsStorageExecutionId, showToast]);

    const { runSubmit: runEvictionExpenseSubmit } = useStandardSubmit({
        validate: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            return Number.isFinite(n) && n > 0;
        },
        validationMessage: 'أدخل مبلغاً صحيحاً',
        submit: () => {
            const raw = evictionExpenseAmount.replace(/,/g, '').trim();
            const n = parseFloat(raw);
            const row = {
                id: `evx_${Date.now()}`,
                amount: n,
                note: evictionExpenseNote.trim() || 'مصاريف إضبارة تخلية',
                date: getLocalTodayYmd(),
            };
            const nextExp = [row, ...evictionCaseExpenses];
            const tNow = new Date().toISOString();
            const payModeAr =
                evictionExpensePayMode === 'salary_fifth'
                    ? 'التحصيل من خُمس راتب المدين (موظف)'
                    : evictionExpensePayMode === 'installments'
                      ? 'أقساط / تسوية'
                      : 'دفعة واحدة';
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف إضبارة تخلية: ${n.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — أسلوب التحصيل المقترح: ${payModeAr}`,
                date: getLocalTodayYmd(),
                timestamp: tNow,
                source: 'إدارة الأموال — تخلية',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setEvictionCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            setEvictionAssetsTabUnlocked(true);
            setEvictionExpenseAmount('');
            setEvictionExpenseNote('');
            setEvictionExpensePayMode('lump_sum');
            persistExecutionMerge({
                eviction_case_expenses: nextExp,
                eviction_assets_tab_unlocked: true,
                timelineEvents: nextTimeline,
            });
            appendEvictionExecutorRequest({
                executionId: decisionsStorageExecutionId,
                title: `طلب تثبيت مصاريف إضبارة: ${n.toLocaleString('ar-IQ')} د.ع`,
                body: `تثبيت مصاريف إضبارة يتحمّلها المدين: ${row.note}.\nأسلوب التحصيل المقترح: ${payModeAr}.`,
                requestKind: 'case_expense',
            });
        },
        onClose: () => setShowEvictionExpenseModal(false),
        successMessage: 'تم التسجيل — راجع قرار المنفذ',
        showToast,
    });

    const handleEncroachmentExpenseRecorded = useCallback(
        (row: import('@/app/utils/unifiedFundsLedgerStorage').EncroachmentCaseExpenseRow) => {
            const nextExp = [row, ...encroachmentCaseExpenses];
            const tNow = new Date().toISOString();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف إزالة تجاوز: ${row.amount.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                date: row.date,
                timestamp: tNow,
                source: 'إدارة الأموال — إزالة تجاوز',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setEncroachmentCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                encroachment_case_expenses: nextExp,
                timelineEvents: nextTimeline,
            });
        },
        [encroachmentCaseExpenses, nextTimelineId, persistExecutionMerge, timelineEvents]
    );

    const handleSpecificDeliveryExpenseRecorded = useCallback(
        (
            row: import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow
        ) => {
            const nextExp = [row, ...specificDeliveryCaseExpenses];
            const tNow = new Date().toISOString();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💸 مصاريف تسليم شيء معين: ${row.amount.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                date: row.date,
                timestamp: tNow,
                source: 'إدارة الأموال — تسليم شيء معين',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setSpecificDeliveryCaseExpenses(nextExp);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                specific_delivery_case_expenses: nextExp,
                timelineEvents: nextTimeline,
            });
            try {
                window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
            } catch {
                /* ignore */
            }
        },
        [nextTimelineId, persistExecutionMerge, specificDeliveryCaseExpenses, timelineEvents]
    );

    const handleSpecificDeliveryFinancialized = useCallback(
        (amount: number) => {
            const trimmed = Math.max(0, Math.trunc(amount));
            if (trimmed <= 0) return;
            const tNow = new Date().toISOString();
            const itemName = String(
                (executionData as { specificDeliveryItemName?: string } | undefined)
                    ?.specificDeliveryItemName || ''
            ).trim();
            const evLine: TimelineEvent = {
                id: nextTimelineId(),
                type: 'payment',
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description:
                    (itemName ? `الشيء: ${itemName} — ` : '') +
                    'تحويل المطالبة لتعذر التسليم / هلاك الشيء — حقن الدين الأصلي في المركز المالي',
                date: getLocalTodayYmd(),
                timestamp: tNow,
                source: 'تسليم شيء معين — تحويل مالي',
            };
            const nextTimeline = [evLine, ...timelineEvents];
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                debtAmount: trimmed,
                totalAmount: trimmed,
                specificDeliveryFinancialized: true,
                specificDeliveryConvertedAmount: trimmed,
                specificDeliveryFinancializedAt: tNow,
                timelineEvents: nextTimeline,
            });
            try {
                window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
            } catch {
                /* ignore */
            }
        },
        [executionData, nextTimelineId, persistExecutionMerge, timelineEvents]
    );

    const handleSpecificDeliveryItemDeclaredDestroyed = useCallback(
        (itemId: string) => {
            const ed = executionData as {
                specificDeliveryItemName?: string;
                specificDeliveryItems?: import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[];
            } | null | undefined;
            const currentItems = readSpecificDeliveryItems({
                specificDeliveryItemName: ed?.specificDeliveryItemName,
                specificDeliveryItems: ed?.specificDeliveryItems,
            });
            const nextItems = markSpecificDeliveryItemDeclaredDestroyed(currentItems, itemId);
            persistExecutionMerge({ specificDeliveryItems: nextItems });
        },
        [executionData, persistExecutionMerge],
    );

    useEvictionLawyerFeeOutcome({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        parsedLawyerFees,
        evictionCaseExpenses,
        setEvictionAssetsTabUnlocked,
        setSeizedAssets,
        persistExecutionMerge,
        showToast,
    });

    const {
        submitPropertySeizureRequest,
        submitMovableSeizureRequest,
        saveSeizedPropertyInitForDecision,
        saveSeizedMovableInitForDecision,
    } = useExecutionDashboardFollowupSeizureHandlers({
        decisionsStorageExecutionId,
        executionDataRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
        propertySeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        movableSeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
    });

    const focusSeizurePropertyInlineCompletion = useCallback(
        (decisionId: string, subject?: string) => {
            const exId = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
            if (!exId || !decisionId) return;
            setShowCoerciveActionForm(null);
            setSeizureDetailCompletion(null);
            setShowUnifiedExecutionModal(true);
            openSeizureRequestsTabRef.current();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-focus-seizure-property-inline', {
                        detail: { executionId: exId, decisionId, subject: subject || '' },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsStorageExecutionId, executionData?.id, executionId]
    );
    focusSeizurePropertyInlineRef.current = focusSeizurePropertyInlineCompletion;

    const focusSeizureMovableInlineCompletion = useCallback(
        (decisionId: string, subject?: string) => {
            const exId = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
            if (!exId || !decisionId) return;
            setShowCoerciveActionForm(null);
            setSeizureDetailCompletion(null);
            setShowUnifiedExecutionModal(true);
            openSeizureRequestsTabRef.current();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-focus-seizure-movable-inline', {
                        detail: { executionId: exId, decisionId, subject: subject || '' },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsStorageExecutionId, executionData?.id, executionId]
    );
    focusSeizureMovableInlineRef.current = focusSeizureMovableInlineCompletion;

    const focusSeizureThirdPartyInlineCompletion = useCallback(
        (decisionId: string, subject?: string) => {
            const exId = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
            if (!exId || !decisionId) return;
            setShowCoerciveActionForm(null);
            setSeizureDetailCompletion(null);
            setShowUnifiedExecutionModal(true);
            openSeizureRequestsTabRef.current();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-focus-seizure-third-party-inline', {
                        detail: { executionId: exId, decisionId, subject: subject || '' },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsStorageExecutionId, executionData?.id, executionId]
    );
    focusSeizureThirdPartyInlineRef.current = focusSeizureThirdPartyInlineCompletion;

    const focusSeizureNoticeInlineCompletion = useCallback(
        (decisionId: string, subject?: string) => {
            const exId = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
            if (!exId || !decisionId) return;
            setShowCoerciveActionForm(null);
            setSeizureDetailCompletion(null);
            setShowUnifiedExecutionModal(true);
            openSeizureRequestsTabRef.current();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-focus-seizure-notice-inline', {
                        detail: { executionId: exId, decisionId, subject: subject || '' },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsStorageExecutionId, executionData?.id, executionId]
    );
    focusSeizureNoticeInlineRef.current = focusSeizureNoticeInlineCompletion;

    const openSeizureMarkModal = useCallback((entityKind: 'property' | 'movable', entityId: string) => {
        const id = String(entityId || '').trim();
        if (!id) return;
        if (entityKind === 'movable') {
            const exId = String(decisionsStorageExecutionId ?? executionDataRef.current?.id ?? executionId ?? '').trim();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: { executionId: exId, movableId: id, step: 'mark' },
                    })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        setSeizureMarkModalEntityKind(entityKind);
        setSeizureMarkModalEntityId(id);
        const list =
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
        const hit = (list as any[]).find((x) => String((x as any).id) === id) as any;
        const letter = String(hit?.seizureMarkLetterNumber || '').trim();
        const ymd = String(hit?.seizureMarkDate || '').trim();
        const ent = String(hit?.seizureMarkEntity || '').trim();
        setSeizureMarkLetterNumberDraft(letter);
        setSeizureMarkDateDraft(ymd);
        setSeizureMarkEntityDraft(ent);
        setSeizureMarkModalOpen(true);
    }, [decisionsStorageExecutionId, executionId]);

    const openPublicationModal = useCallback((entityKind: 'property' | 'movable', entityId: string) => {
        const id = String(entityId || '').trim();
        if (!id) return;
        if (entityKind === 'movable') {
            const exId = String(decisionsStorageExecutionId ?? executionDataRef.current?.id ?? executionId ?? '').trim();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: { executionId: exId, movableId: id, step: 'publication' },
                    })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        setPublicationModalEntityKind(entityKind);
        setPublicationModalEntityId(id);
        const list =
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
        const hit = (list as any[]).find((x) => String((x as any).id) === id) as any;
        setPublicationNewspaperNameDraft(String(hit?.newspaperName || '').trim());
        setPublicationDateYmdDraft(String(hit?.publicationDateYmd || '').trim());
        setPublicationModalOpen(true);
    }, [decisionsStorageExecutionId, executionId]);

    const openAuctionResultModal = useCallback((entityKind: 'property' | 'movable', entityId: string) => {
        const id = String(entityId || '').trim();
        if (!id) return;
        if (entityKind === 'movable') {
            const exId = String(decisionsStorageExecutionId ?? executionDataRef.current?.id ?? executionId ?? '').trim();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: { executionId: exId, movableId: id, step: 'auction_result' },
                    })
                );
            } catch {
                /* ignore */
            }
            return;
        }
        setSeizedPropertyAuctionResultEntityKind(entityKind);
        setSeizedPropertyAuctionResultPropertyId(id);
        setSeizedPropertyAuctionResultOutcome('initial_award');
        const list =
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
        const hit = (list as any[]).find((x) => String((x as any).id) === id) as any;
        setSeizedPropertyAuctionResultBuyerNameDraft(String(hit?.initialAwardBuyerName || '').trim());
        setSeizedPropertyAuctionResultAmountDraft(
            hit?.initialAwardAmountIqd != null && Number.isFinite(Number(hit.initialAwardAmountIqd)) && Number(hit.initialAwardAmountIqd) > 0
                ? String(hit.initialAwardAmountIqd)
                : ''
        );
        setSeizedPropertyAuctionDepositAmountDraft(
            hit?.auctionDepositAmountIqd != null &&
            Number.isFinite(Number(hit.auctionDepositAmountIqd)) &&
            Number(hit.auctionDepositAmountIqd) > 0
                ? String(hit.auctionDepositAmountIqd)
                : ''
        );
        setSeizedPropertyAuctionResultModalOpen(true);
    }, [decisionsStorageExecutionId, executionId]);

    const saveSeizureMarkConfirmation = useCallback(() => {
        runSaveSeizureMarkConfirmation({
            seizureMarkModalEntityId,
            seizureMarkModalEntityKind,
            seizureMarkLetterNumberDraft,
            seizureMarkDateDraft,
            seizureMarkEntityDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setSeizureMarkModalOpen,
            setSeizureMarkModalEntityId,
            setSeizureMarkLetterNumberDraft,
            setSeizureMarkDateDraft,
            setSeizureMarkEntityDraft,
            showToast,
        });
    }, [
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        seizureMarkLetterNumberDraft,
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind,
        showToast,
    ]);

    const savePublicationDetails = useCallback(() => {
        runSavePublicationDetails({
            publicationModalEntityId,
            publicationModalEntityKind,
            publicationNewspaperNameDraft,
            publicationDateYmdDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setPublicationModalOpen,
            setPublicationModalEntityId,
            setPublicationNewspaperNameDraft,
            setPublicationDateYmdDraft,
            showToast,
        });
    }, [
        nextTimelineId,
        persistExecutionMerge,
        publicationDateYmdDraft,
        publicationModalEntityId,
        publicationModalEntityKind,
        publicationNewspaperNameDraft,
        pushTimelineEvent,
        showToast,
    ]);

    const saveSeizedPropertyStepDetails = useCallback(() => {
        runSaveSeizedPropertyStepDetails({
            decisionsStorageExecutionId,
            seizedPropertyStepDecisionId,
            seizedPropertyStepEntityKind,
            seizedPropertyStepPropertyId,
            seizedPropertyStepKind,
            seizedPropertyExpertsNamesDraft,
            seizedPropertyExpertReportDateDraft,
            seizedPropertyExpertPriceDraft,
            seizedPropertyAuctionDateDraft,
            seizedPropertyBuyerNameDraft,
            seizedPropertyAwardAmountDraft,
            seizedPropertyStepNotesDraft,
            linkSeizureAuctionToAppointments,
            executionDataRef,
            seizureMatrixLedgerParamsRef,
            setUnifiedLedgerRevision,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            pushSeizureAuctionCalendarAppointment,
            setSeizedPropertyStepModalOpen,
            setSeizedPropertyStepDecisionId,
            setSeizedPropertyStepPropertyId,
            setSeizedPropertyStepEntityKind,
            setSeizedPropertyStepKind,
            setSeizedPropertyExpertsNamesDraft,
            setSeizedPropertyExpertReportDateDraft,
            setSeizedPropertyExpertPriceDraft,
            setSeizedPropertyAuctionDateDraft,
            setSeizedPropertyBuyerNameDraft,
            setSeizedPropertyAwardAmountDraft,
            setSeizedPropertyStepNotesDraft,
            showToast,
        });
    }, [
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        seizedPropertyStepEntityKind,
        seizedPropertyAwardAmountDraft,
        seizedPropertyBuyerNameDraft,
        seizedPropertyExpertPriceDraft,
        seizedPropertyExpertReportDateDraft,
        seizedPropertyExpertsNamesDraft,
        seizedPropertyAuctionDateDraft,
        seizedPropertyStepDecisionId,
        seizedPropertyStepKind,
        seizedPropertyStepNotesDraft,
        seizedPropertyStepPropertyId,
        showToast,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    ]);

    const saveSeizedPropertyAuctionSessionResult = useCallback(() => {
        runSaveSeizedPropertyAuctionSessionResult({
            seizedPropertyAuctionResultPropertyId,
            seizedPropertyAuctionResultEntityKind,
            seizedPropertyAuctionResultOutcome,
            seizedPropertyAuctionResultBuyerNameDraft,
            seizedPropertyAuctionResultAmountDraft,
            seizedPropertyAuctionDepositAmountDraft,
            executionDataRef,
            persistExecutionMerge,
            pushTimelineEvent,
            nextTimelineId,
            setSeizedPropertyAuctionResultModalOpen,
            setSeizedPropertyAuctionResultPropertyId,
            setSeizedPropertyAuctionResultEntityKind,
            setSeizedPropertyAuctionResultOutcome,
            setSeizedPropertyAuctionResultBuyerNameDraft,
            setSeizedPropertyAuctionResultAmountDraft,
            setSeizedPropertyAuctionDepositAmountDraft,
            showToast,
        });
    }, [
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        seizedPropertyAuctionDepositAmountDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultPropertyId,
        showToast,
    ]);

    const { saveCoerciveAction, clearActiveSalarySeizurePath } = useExecutionDashboardCoerciveActionBridge({
        saveCoerciveActionRef,
        setShowCoerciveActionForm,
        settlementGuarantorGate,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        activeWorkspaceDebtorForFollowup,
        persistExecutionMerge,
        nextTimelineId,
        timelineEvents,
        setTimelineEvents,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        coerciveSubjectRef,
        showToast,
        setLastActionDate,
        setUnifiedLedgerRevision,
    });

    const { handleCoerciveAction } = useExecutionDashboardCoerciveActionHandlers({
        coerciveUiLocked,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        decisionsStorageExecutionId,
        allDebtorsUnified,
        executionDebtorTabIndex,
        isSolidaryLiability,
        resolveDebtorSolidaryFlag,
        effectiveDebtors,
        coerciveSubjectRef,
        openSeizureRequestsTabRef,
        setShowUnifiedExecutionModal,
        showToast,
        saveCoerciveAction,
    });

    const { patchSeizedRowAndTimeline, releaseSeizureAssetRow } =
        useExecutionDashboardSeizureReleaseHandlers({
            seizedAssets,
            activeCoerciveActions,
            setSeizedAssets,
            setTimelineEvents,
            setActiveCoerciveActions,
            persistExecutionMerge,
            nextTimelineId,
            showToast,
        });

    const {
        beginThirdPartyReceiveStep,
        updateThirdPartyReceiveDraft,
        cancelThirdPartyReceiveStep,
        confirmThirdPartyReceive,
    } = useExecutionDashboardThirdPartyReceiveHandlers({
        thirdPartySeizureSnapshotRef,
        setThirdPartySeizureAssets,
        persistExecutionMerge,
        showToast,
        decisionsStorageExecutionId,
        executionData,
        executionId,
        seizureMatrixLedgerParamsRef,
        pushTimelineEvent,
        nextTimelineId,
        setUnifiedLedgerRevision,
    });

    const { saveStandaloneExecutionMarkForDecision } = useExecutionDashboardStandaloneMarkHandlers({
        standaloneExecutionMarksSnapshotRef,
        setStandaloneExecutionMarks,
        decisionsStorageExecutionId,
        executionId,
        executionDataRef,
        getLocalTodayYmd,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
    });

    const { patchSalarySeizureAssetDetails } = useExecutionDashboardSalarySeizurePatch({
        seizedAssets,
        setSeizedAssets,
        activeDebtorIsDeceased,
        executionData,
        decisionsStorageExecutionId,
        executionId,
        persistExecutionMerge,
    });

    const specificDeliveryConvertedAmount =
        (executionData as { specificDeliveryConvertedAmount?: number | null } | null | undefined)
            ?.specificDeliveryConvertedAmount ?? null;
    const specificDeliveryFinancialized = Boolean(
        (executionData as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized,
    );

    const insertTimelineEventToSupabase = useCallback(
        (params: {
            executionFileId: string;
            event: TimelineEvent;
            snapshotData?: unknown;
        }) => {
            void import('@/app/services/timelineEventsSupabase')
                .then(({ insertTimelineEventToSupabase: insert }) => insert(params))
                .catch(() => {});
        },
        [],
    );

    const followupScopeBag = {
        activeCoerciveActions,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeDebtorNoticeScope,
        activeFollowupDebtorKey,
        activeGroupEntries,
        activeNoticeState,
        activeSubFileId,
        activeTimelineEvents,
        allDebtorsUnified,
        appealPerspective,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
        assignmentWorkspaceCtx,
        claimType,
        claimTypeForExecutionModule,
        closeFollowupModalPersisted,
        coerciveUiLocked,
        consumeFollowupExpandProcedure,
        creditorOtherPartyTrackHandlers,
        custodyRemovalClaimActive,
        daysRemainingInGracePeriod,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorForcedToAttend,
        debtorSummonsProfile,
        debtorsSectionRef,
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        dossierActionModalSaving,
        effectiveFollowupModalTabs,
        employeeForcedBringAwaitingPersonalOutcome,
        employeePersonalTabUnlockStorageKey,
        evictionHeirsNotificationDateYmd,
        evictionPremisesUseResolved,
        evictionProcedureLockHint,
        evictionProcedureLocked,
        executionCoerciveButtonDisabled,
        executionData,
        executionDataRef,
        executionDomainContext,
        executionDebtorTabIndex,
        executionId,
        executionPaused,
        executionStatus,
        finalizeBreakInventoryEntry,
        followupAssignmentWorkspaceCtx,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupExpandProcedureKey,
        followupGarnishmentAmountPreview,
        followupModalBodyScrollRef,
        followupModalChipTablistRef,
        followupModalDebtorIsDeceased,
        followupModalDebtorIsEmployee,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalSpecializationEffective: followupModalSpecializationEffectiveWithEarnerGate,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        followupSolidaryDebtorIndex,
        followupSpecialization: followupSpecializationWithEarnerGate,
        forcedBringDecisionState,
        forcedSummoningAnalysis,
        getLocalTodayYmd,
        goFollowupSectionTabByDelta,
        gracePeriodEnded,
        handleCoerciveAction,
        handleDossierAction,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentResolveForcedBringOutcome,
        handleEmployeeAssignmentTerminate,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEncroachmentExpenseRecorded,
        handleEndGracePeriod,
        handleEvictionHeirsNotificationDateChange,
        handleGuarantorRequestFromFollowup,
        handleIssueHeirsExecutionNoticeMemo,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
        headerFields,
        hideCoerciveTabsForDebtorAgent,
        hideExecutiveDetentionJudgeCard,
        earnerFinancialPersonalCoerciveActive,
        inabaCorrespondenceLog,
        inabaTargets,
        inlineActionGateKey,
        insertTimelineEventToSupabase,
        isAlimonyClaimType,
        isEvictionExecutionModule,
        isFollowupTabActive,
        isHistoricalMode,
        isInabaActive,
        isMaritalFurnitureClaim,
        isPersonalStatusExecutionClaim,
        isRepresentingDebtor,
        isSolidaryLiability,
        kasabTerminationEmphasis,
        lawyerStartedPostNoticeExecution,
        maritalFurnitureItemsForFollowup,
        mergeSimilarRecentTimelineEvent,
        modalActiveDebtorNoticeScope,
        modalEmployeeCoerciveDetentionRestricted,
        modalKasabTerminationEmphasis,
        modalPersonalTabLockedForEmployee,
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        modalShowPersonalCoerciveFollowupTab,
        nextTimelineId,
        noticeVoluntaryPeriodEndOptimistic,
        openDecisionsModalWithBoot,
        openEvictionResidentialGraceModal,
        openExecutionSeizuresTab,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        openOtherPartyAppealsModal,
        openPoliceAssistanceDetailsForDecision,
        openSeizureRequestsTab,
        otherPartyCreditorMirrorProps,
        otherPartyTabSubmitHandler,
        parentDossierId,
        paidDebt,
        persistExecutionMerge,
        persistFollowupModalViewport,
        persistGuarantorFollowupDetails,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        pushTimelineEvent,
        queueMicrotask,
        registerDebtorVoluntaryAttendance,
        resolvedEmployeeSummonsAssignment,
        remaining,
        remainingBalanceForSeizure,
        requestFollowupSeizureDecision,
        requestGuarantorSeizure,
        residentialGraceAllowsFieldwork,
        residentialGracePeriodSaved,
        runSpecialFollowupSubmit,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePoliceAssistanceEntry,
        saveSeizedMovableInitForDecision,
        saveSeizedPropertyInitForDecision,
        saveStandaloneExecutionMarkForDecision,
        saveThirdPartySeizureForDecision,
        seizureDetailCompletion,
        seizureMatrix,
        setActiveNoticeState,
        setDebtorArrested,
        setDebtorForcedToAttend,
        setDossierActionModalSaving,
        setEncroachmentCaseExpenses,
        setExecutionDebtorTabIndex,
        setExecutionStorageTick,
        setFollowupSolidaryDebtorIndex,
        setInlineActionGateKey,
        setNonInterferenceIssued,
        setPersonalTabUnlockByDebtor,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setTimelineEvents,
        setUnifiedModalTab,
        settlementGuarantorGate,
        showBreakInventoryRequest,
        showEmployeeAssignmentCoerciveBlock,
        showFollowupSolidaryDebtorTabs,
        showGuarantorInSeizureFollowupTab,
        showPersonalCoerciveFollowupTab,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        showToast,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestTemplatePick,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        stayOfExecutionActive,
        totalOwed,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        unifiedModalTab,
        viewExecutionData,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
    };

    const syncSeizedAssets = useCallback((next: SeizedAsset[]) => setSeizedAssets(next), []);
    const syncSeizureDrafts = useCallback(
        (next: typeof seizureDraftsByDecisionId) => setSeizureDraftsByDecisionId(next),
        [],
    );
    const syncActiveCoerciveActions = useCallback(
        (next: typeof activeCoerciveActions) => setActiveCoerciveActions(next),
        [],
    );
    const evictionExecutorWorkflow = useMemo(
        () =>
            isEvictionExecutionModule
                ? {
                      dossierId: String(
                          executionData?.id ?? executionId ?? file?.id ?? 'default',
                      ),
                      actions: executorApprovalActions,
                  }
                : undefined,
        [
            isEvictionExecutionModule,
            executionData?.id,
            executionId,
            file?.id,
            executorApprovalActions,
        ],
    );
    const seizedAssetsModalExecutionId = executionId || file?.id;
    const totalExecutionExpenses = total_execution_expenses;
    const initialFileNumber = String(executionData?.fileNumber || '').trim();

    const executionModalFlags = {
        showUnifiedExecutionModal,
        showDecisionsModal,
        showDocumentsModal,
        showTimelineModal,
        showCoerciveModal,
        showNotificationModal,
        showUnifiedSummonsModal,
        showPaymentModal,
        showSeizedAssetsModal,
        showNotesModal,
        showAppointmentModal,
        showPaymentCalculator,
        showSettlementCalculator,
        showPauseModal,
        showLedgerModal,
        showEditDossierMetaModal,
        showEvictionExpenseModal,
        showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal,
        showGuarantorDetailsModal,
        showHeirsNotificationModal,
        showLinkedDossierTimeline,
        showRealEstateSeizureModal,
        showSolidaryCoerciveTargetModal,
        showStayOfExecutionModal,
        showTransferFileNumberChangeModal,
    };

    const executionModalSetters = {
        setShowUnifiedExecutionModal,
        setShowDecisionsModal,
        setShowDocumentsModal,
        setShowTimelineModal,
        setShowCoerciveModal,
        setShowNotificationModal,
        setShowUnifiedSummonsModal,
        setShowPaymentModal,
        setShowSeizedAssetsModal,
        setShowNotesModal,
        setShowAppointmentModal,
        setShowPaymentCalculator,
        setShowSettlementCalculator,
        setShowPauseModal,
        setShowLedgerModal,
        setShowEditDossierMetaModal,
        setShowEvictionExpenseModal,
        setShowEvictionLawyerFeeModal,
        setShowEvictionResidentialGraceModal,
        setShowGuarantorDetailsModal,
        setShowHeirsNotificationModal,
        setShowLinkedDossierTimeline,
        setShowRealEstateSeizureModal,
        setShowSolidaryCoerciveTargetModal,
        setShowStayOfExecutionModal,
        setShowTransferFileNumberChangeModal,
        setEditingNoteId,
    };

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardLazyChunkSetup({
        fingerprintInput: {
            executionId,
            activeTabId,
            activeFinancialTab,
            activeTimelineFilter,
            executionPaused,
            dossierLifecyclePanelOpen,
            dossierLifecyclePanelPhase,
            dossierLifecyclePopStyle,
            toastEpoch,
            dataRevision: unifiedLedgerRevision,
            executionDebtorTabIndex,
            showUnifiedSeizureLogModal,
            timelineAccordionExpanded,
            isFinancialCenterExpanded,
            isHeaderExpanded,
            debtorAttendedVoluntarily,
            voluntaryAttendanceCount,
            noticeVoluntaryPeriodEndOptimistic,
            voluntaryEndOptimistic,
            notificationCount,
            showExecutionFinancialHub,
        },
        modalFlags: executionModalFlags,
        chunkDataReady: Boolean(executionData),
        getScopeSources: () => buildExecutionDashboardChunkScopeSources({
            ...executionModalFlags,
            ...executionModalSetters,
            activeDebtorIsEmployee,
            activeDebtorNoticeScope,
            alimonyBeneficiaryDeathModalOpen,
            alimonyBeneficiaryDeathModalProfile,
            alimonyBeneficiaryProfile,
            appealsModalScrollToDecisionId,
            clearDecisionsModalBootState,
            coerciveUiLocked,
            decisionsModalBootHubTab,
            decisionsModalBootListTab,
            decisionsModalScrollToDecisionId,
            earnerForcedActionUnlocked,
            employeeForcedBringAwaitingPersonalOutcome,
            executionCoerciveButtonDisabled,
            executionDataRef,
            firstActiveAppealDecisionId,
            followupEmployeeFinancialSalaryOnlyCoercive,
            followupMonetaryCoerciveLimitedOnly,
            forcedBringDecisionState,
            forcedSummoningAnalysis,
            handleEmployeeAssignmentRequestForcedBring,
            handleEmployeeAssignmentRequestInvestigation,
            handleEmployeeAssignmentResolveForcedBringOutcome,
            handleEmployeeAssignmentTerminate,
            handleEmployeeRegisterArrestOrder,
            handleEmployeeWarrantOutcome,
            lawyerStartedPostNoticeExecution,
            onUpdate,
            openExecutionSeizuresTab,
            realEstateModalInitial,
            realEstateSeizureModalDecisionId,
            registerDebtorVoluntaryAttendance,
            resolvedEmployeeSummonsAssignment,
            saveRealEstateSeizureFromModal,
            setAlimonyBeneficiaryDeathModalOpen,
            setAlimonyBeneficiaryDeathModalProfile,
            setRealEstateSeizureModalDecisionId,
            setShowCoerciveModal,
            setShowGuarantorDetailsModal,
            setShowHeirsNotificationModal,
            setShowNotificationModal,
            setShowPauseModal,
            setShowPaymentModal,
            setShowRealEstateSeizureModal,
            setShowSeizedAssetsModal,
            setShowStayOfExecutionModal,
            showCoerciveModal,
            showDecisionsModal,
            showDocumentsModal,
            showGuarantorDetailsModal,
            showHeirsNotificationModal,
            showLedgerModal,
            showNotificationModal,
            showPauseModal,
            showPaymentCalculator,
            showPaymentModal,
            showRealEstateSeizureModal,
            showSeizedAssetsModal,
            showSettlementCalculator,
            showStayOfExecutionModal,
            showTimelineModal,
            showUnifiedSummonsModal,
            commitDossierNote,
            creditorSubstitutionRequestStatus,
            debtorSubstitutionRequestStatus,
            editingNoteId,
            evictionExecutorWorkflow,
            executorApprovalActions,
            linkedDossierToView,
            initialFileNumber,
            seizedAssetsModalExecutionId,
            syncActiveCoerciveActions,
            syncSeizedAssets,
            syncSeizureDrafts,
            totalExecutionExpenses,
            voiceUserId,
            appointmentDateOnly,
            appointmentPurpose,
            breakInventoryFurnitureModalCtx,
            breakInventoryFurnitureModalOpen,
            caseTasksPending,
            closeHeirMemoManually,
            coerciveSubjectRef,
            computeDaysRemaining,
            computeDeadlineYmd,
            debtorEvaded,
            debtorNotificationDate,
            debtorNotifiedForEvictionGrace,
            dossierMetaDraft,
            editPartyTarget,
            editingAppointmentId,
            editingTaskId,
            employeeAssignmentTabEnabled,
            evictionExpenseAmount,
            evictionExpenseNote,
            evictionExpensePayMode,
            executionReportPrompt,
            executorScheduleContext,
            executorScheduleModalOpen,
            followupDebtorSummonsProfile,
            followupEarnerForcedActionUnlocked,
            followupIsDebtorGovernmentEmployee,
            followupIsDebtorRetired,
            getMilestoneTimelineSnapshot,
            graceModalEndYmd,
            graceModalStartYmd,
            guarantorDeductionDraft,
            guarantorNameDraft,
            guarantorSalaryDraft,
            guarantorWorkplaceDraft,
            handleAddTimelineEvent,
            handleCompleteTask,
            handleDebtorEvasion,
            handleDeclareEvictionVoluntaryPeriodEnd,
            handleDeclareNoticeVoluntaryPeriodEnd,
            handleDeleteTask,
            handleEmployeeAssignmentAttend,
            handleEmployeeAssignmentConfirm,
            handleEmployeeAssignmentDeclareAbsent,
            handleForcedAttendance,
            handleNotifyDebtor,
            handleSaveAppointment,
            handleSaveTask,
            handleSpecialCasesStay,
            handleUpdateTask,
            hasFinancialLedger,
            heirNoticeDateDrafts,
            heirSummonsDatePickerOpenByHeir,
            heirsQuickView,
            heirsWorkflowByHeir,
            isDebtorFreelancer,
            isEvictionGraceEffectivelyExpired,
            isEvictionGraceExpiredCalendar,
            isGracePeriodExpiredNow,
            isTask,
            issueHeirMemoNotice,
            issueHeirSummons,
            judicialCustodianModalCtx,
            judicialCustodianModalOpen,
            judicialCustodianSalariesExpenseIqd,
            lawyerFeeDisburseMode,
            lawyerFeeDisburseNotes,
            linkSeizureAuctionToAppointments,
            markHeirSummonsAttended,
            markHeirSummonsPeriodEnded,
            normalizeHeirWorkflowKey,
            noteBody,
            noteTitle,
            noticeKindGoalStrictBinding,
            notificationCount,
            partyDeathModalParty,
            partyEditDraft,
            partyEditHeirDeleteConfirmIdx,
            pauseReason,
            permanentDeleteTimelineId,
            permanentlyDeleteCaseNote,
            permanentlyDeleteCaseTask,
            permanentlyDeleteTimelineEvent,
            policeAssistanceAgencyDraft,
            policeAssistanceModalOpen,
            policeAssistanceRequestTitle,
            publicationDateYmdDraft,
            publicationModalEntityKind,
            publicationModalOpen,
            publicationNewspaperNameDraft,
            removeHeirFromPartyEditDraftAtIndex,
            residentialGraceModalShowPrimarySave,
            residentialVacateDeadlineMaxIso,
            runEvictionExpenseSubmit,
            runEvictionLawyerFeeSubmit,
            saveCoerciveActionRef,
            saveDossierMetaDraft,
            savePartyEditDraft,
            savePoliceAssistanceFromModal,
            savePublicationDetails,
            saveSeizedPropertyAuctionSessionResult,
            saveSeizedPropertyStepDetails,
            saveSeizureMarkConfirmation,
            savedNotesSplit,
            savedNotesView,
            scopedSummonsMarker,
            seizedPropertyAuctionDateDraft,
            seizedPropertyAuctionDepositAmountDraft,
            seizedPropertyAuctionResultAmountDraft,
            seizedPropertyAuctionResultBuyerNameDraft,
            seizedPropertyAuctionResultEntityKind,
            seizedPropertyAuctionResultModalOpen,
            seizedPropertyAuctionResultOutcome,
            seizedPropertyAwardAmountDraft,
            seizedPropertyBuyerNameDraft,
            seizedPropertyExpertPriceDraft,
            seizedPropertyExpertReportDateDraft,
            seizedPropertyExpertsNamesDraft,
            seizedPropertyStepEntityKind,
            seizedPropertyStepKind,
            seizedPropertyStepModalOpen,
            seizedPropertyStepNotesDraft,
            seizedPropertyStepPropertyId,
            seizureDraftsByDecisionId,
            seizureMarkDateDraft,
            seizureMarkEntityDraft,
            seizureMarkLetterNumberDraft,
            seizureMarkModalEntityKind,
            seizureMarkModalOpen,
            setAppointmentDateOnly,
            setAppointmentPurpose,
            setAppointmentTimeOptional,
            setBreakInventoryFurnitureModalCtx,
            setBreakInventoryFurnitureModalOpen,
            setDebtorNotificationDate,
            setDossierMetaDraft,
            setEditPartyTarget,
            setEditingAppointmentId,
            setEditingTaskId,
            setEvictionExpenseAmount,
            setEvictionExpenseNote,
            setEvictionExpensePayMode,
            setExecutionReportPrompt,
            setExecutorScheduleContext,
            setExecutorScheduleModalOpen,
            setGraceModalEndYmd,
            setGraceModalStartYmd,
            setGuarantorDeductionDraft,
            setGuarantorDetailsDecisionId,
            setGuarantorNameDraft,
            setGuarantorSalaryDraft,
            setGuarantorWorkplaceDraft,
            setHeirNoticeDateDrafts,
            setHeirSummonsDatePickerOpenByHeir,
            setHeirsQuickView,
            setIsPaused,
            setIsTask,
            setLawyerFeeDisburseMode,
            setLawyerFeeDisburseNotes,
            setLinkSeizureAuctionToAppointments,
            setManualGraceCalendarExtra,
            setNoteBody,
            setNoteTitle,
            setPartyDeathModalDecisionId,
            setPartyDeathModalParty,
            setPartyEditDraft,
            setPartyEditHeirDeleteConfirmIdx,
            setPauseReason,
            setPermanentDeleteTimelineId,
            setPoliceAssistanceAgencyDraft,
            setPoliceAssistanceDecisionId,
            setPoliceAssistanceModalOpen,
            setPoliceAssistanceRequestTitle,
            setPublicationDateYmdDraft,
            setPublicationModalEntityId,
            setPublicationModalOpen,
            setPublicationNewspaperNameDraft,
            setSeizedPropertyAuctionDateDraft,
            setSeizedPropertyAuctionDepositAmountDraft,
            setSeizedPropertyAuctionResultAmountDraft,
            setSeizedPropertyAuctionResultBuyerNameDraft,
            setSeizedPropertyAuctionResultEntityKind,
            setSeizedPropertyAuctionResultModalOpen,
            setSeizedPropertyAuctionResultOutcome,
            setSeizedPropertyAuctionResultPropertyId,
            setSeizedPropertyAwardAmountDraft,
            setSeizedPropertyBuyerNameDraft,
            setSeizedPropertyExpertPriceDraft,
            setSeizedPropertyExpertReportDateDraft,
            setSeizedPropertyExpertsNamesDraft,
            setSeizedPropertyStepModalOpen,
            setSeizedPropertyStepNotesDraft,
            setSavedNotesView,
            setSeizureMarkDateDraft,
            setSeizureMarkEntityDraft,
            setSeizureMarkLetterNumberDraft,
            setSeizureMarkModalEntityId,
            setSeizureMarkModalOpen,
            setShowCoerciveActionForm,
            setSolidaryCoerciveActionPending,
            setTaskDueDate,
            setTaskStatus,
            solidaryCoerciveActionPending,
            submitEvictionResidentialGraceFromModal,
            subsequentNoticeUnlocked,
            summoningRound,
            summonsHubInitialMainTab,
            terminateDebtorSummonsMarker,
            timelineEvents,
            togglePartyEditHeirClient,
            unifiedCollectionApproved,
            unifiedSummonsTargetDebtorKey,
            FollowupModalContext,
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
            handleAlimonyBeneficiaryDeathConfirm,
            handleGuarantorRequestFromFollowup,
            handleLiftStayOfExecution,
            handleMemoFollowupClick,
            handlePartyDeathSave,
            handlePayment,
            handlePaymentFromCalculator,
            handlePublicationNoticeDebtorAttended,
            handlePublicationNoticeRegister,
            handlePublicationNoticeTerminate,
            handleRequestCreditorSubstitution,
            handleRequestDebtorSubstitution,
            handleResumeExecution,
            handleSettlementFromCalculator,
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
            paymentAmount,
            paymentDate,
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
            restoreCaseNoteFromTrash,
            restoreCaseTaskFromTrash,
            restoreTimelineEventFromTrash,
            releaseSeizureAssetRow,
            remaining,
            removeJudicialCustodianEntry,
            requestEditTimelineEvent,
            resolveCalendarUserId,
            salarySeizureRegistryAssets,
            salarySeizureTabRows,
            saveSummonsMarkerPurposeEdit,
            saveTimelineEditDraft,
            seizedAssets,
            seizedMovablesForSeizureLog,
            seizedPropertiesForSeizureLog,
            seizureLogExecutorDecisions,
            seizureMatrixLedgerParamsRef,
            setActiveFinancialTab,
            setActiveCoerciveActions,
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
            setPaymentAmount,
            setPaymentDate,
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
            setSeizedAssets,
            setSeizureDraftsByDecisionId,
            setSummonsContextDebtorKey,
            setSummonsHubInitialMainTab,
            setSummonsMarkerPopoverOpen,
            setSummonsPurposeDraft,
            setThirdPartyFundsDraftById,
            setThirdPartySeizuresUi,
            setTimelineAccordionExpanded,
            setTimelineEditDraft,
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
            showExecutionTrashModal,
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
            timelineEditDraft,
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
            ...pickExecutionFollowupScopeSlice(followupScopeBag),
        }),
    });

    return {
        isLoading,
        loadError,
        executionData,
        viewExecutionData,
        onClose,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        hideToast,
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
        showUnifiedExecutionModal,
    };
}
