// @ts-nocheck
/** Ù…Ù†Ø·Ù‚ ExecutionDashboard â€” chunk execution-dashboard-core */
// âœ… PERFORMANCE OPTIMIZED - v11.1 - Zustand modals + useCallback + optimized useEffect
import React, {
    useState,
    useMemo,
    useLayoutEffect,
    useCallback,
    useRef,
    startTransition,
} from 'react';
import { debug } from '@/app/utils/debug';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import {
    syncExecutionTimelineAppointment,
} from '@/app/services/calendarDossierSync';
// âœ… NEW: Import fixed calculation functions for 7-day grace period
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODULAR HELPERS - Ø¯ÙˆØ§Ù„ Ù…Ø³Ø§Ø¹Ø¯Ø© Ù…Ø¹ÙŠØ§Ø±ÙŠØ©
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
import {
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODULAR COMPONENTS - Ù…ÙƒÙˆÙ†Ø§Øª Ù…Ø¹ÙŠØ§Ø±ÙŠØ©
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// ðŸ†• V10.5: ENHANCED UTILITIES
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
import { useExecutionAppealBannerState } from '@/app/hooks/useHasActiveExecutionAppeals';
import { supabase } from '@/app/lib/supabase-client';

import { dedupeTimelineEventsForDisplay, mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { useShallow as shallow } from 'zustand/react/shallow';
// âœ… FIXED: Import proper types
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
import {
    defaultEvictionEarnerFeeCollectionSM,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import {
    isSalarySeizureLaneOccupied,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { AR_TABLIGH_RAQM } from '../executionDashboardLazyShellUi';
import { FollowupModalContext } from '../followupModalContext';
import { buildFollowupModalSnapshot } from '../followupModalSnapshot';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    handleExecutorApproval,
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
import { buildExecutionDashboardCoreDynamicScope } from './executionDashboardCore/buildExecutionDashboardCoreDynamicScope';
import { buildExecutionDashboardCoreScopeBags } from './executionDashboardCore/buildExecutionDashboardCoreScopeBags';
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
import { useExecutionDashboardGuarantorFollowupHandlers } from './executionDashboardCore/useExecutionDashboardGuarantorFollowupHandlers';
import { useExecutionDashboardEvictionFinancialHandlers } from './executionDashboardCore/useExecutionDashboardEvictionFinancialHandlers';
import { useExecutionDashboardModuleExpenseHandlers } from './executionDashboardCore/useExecutionDashboardModuleExpenseHandlers';
import { useExecutionDashboardSeizureAssetModalHandlers } from './executionDashboardCore/useExecutionDashboardSeizureAssetModalHandlers';
import { useExecutionDashboardDebtorEmploymentHandlers } from './executionDashboardCore/useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from './executionDashboardCore/useExecutionDashboardDebtorSummonsCoerciveHandlers';
import { useExecutionDashboardThirdPartySeizureHandlers } from './executionDashboardCore/useExecutionDashboardThirdPartySeizureHandlers';
import { useExecutionDashboardBreakInventoryHandlers } from './executionDashboardCore/useExecutionDashboardBreakInventoryHandlers';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './executionDashboardCore/useExecutionDashboardEmployeeAssignmentHandlers';
import { useExecutionDashboardPartyDeathHandlers } from './executionDashboardCore/useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardNotesTasksHandlers } from './executionDashboardCore/useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './executionDashboardCore/useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './executionDashboardCore/useExecutionDashboardVoluntaryPeriodHandlers';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from './executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers';
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
import {
    useExecutionDashboardDecisionsNamespaceReconcile,
    useExecutionDashboardDecisionsStorageMigration,
    useExecutionDashboardDossierLifecycleReconcile,
    useExecutionDashboardShellPrefetch,
    useExecutionDashboardStoreFileSync,
    useExecutionDashboardUrlDelegationSync,
} from './executionDashboardCore/useExecutionDashboardDossierBootLifecycle';
import {
    useExecutionDashboardExecutionFileCoerciveRefresh,
    useExecutionDashboardSubDossierTimelineLifecycle,
} from './executionDashboardCore/useExecutionDashboardSubDossierTimelineLifecycle';
import { useExecutionDashboardOpenDecisionsModalBridge } from './executionDashboardCore/useExecutionDashboardOpenDecisionsModalBridge';
import {
    useExecutionDashboardDebtorNotificationSync,
    useExecutionDashboardDebtorTabIndexClamp,
    useExecutionDashboardDebtorTabResetOnFileChange,
    useExecutionDashboardDecisionsHeirsModalExclusivity,
    useExecutionDashboardEarnerFeeSmSync,
    useExecutionDashboardExecutionPausedSync,
    useExecutionDashboardLegacyNoticeStateBackfill,
    useExecutionDashboardPaidClientFeesSync,
    useExecutionDashboardPerformanceMonitor,
    useExecutionDashboardSummonsPopoverEscapeClose,
    useExecutionDashboardSpecialRequestTemplateMenuDismiss,
    useExecutionDashboardDossierLifecycleDraftSync,
    useExecutionDashboardStandaloneMarksSync,
    useExecutionDashboardFollowupSolidaryIndexReset,
    useExecutionDashboardScopedDebtorNoticeSync,
    useExecutionDashboardActiveTimelineFilterNormalize,
    useExecutionDashboardEmployeeCompulsoryBannerReset,
    useExecutionDashboardEmployeePersonalTabUnlockHydrate,
    useExecutionDashboardPartiesExtraPanelsReset,
    useExecutionResidentialGraceClearedListener,
    useExecutionDashboardUnifiedModalPersonalTabRedirect,
    useExecutionDashboardDebtorBrowserTabsClamp,
    useExecutionDashboardSaveOnUnmount,
    useExecutionDashboardFieldVisitScheduledListener,
    useExecutionDashboardMaritalFurnitureFinancialSync,
    useExecutionDashboardSupabaseTimelineHydrate,
    useExecutionDashboardExecutionFeeExemptionToast,
} from './executionDashboardCore/useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDecisionOutcomeToastBridge,
    useExecutionToastBridge,
} from './useExecutionDashboardWindowBridge';

import { pickExecutionFollowupScopeSlice } from './pickExecutionFollowupScopeSlice';
import { useEarnerFinancialPersonalCoerciveFlags } from './executionDashboardEarnerFinancialCoerciveGate';
import { applyEarnerFinancialPersonalCoerciveOverlay } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import {
    buildEndGracePeriodMergePatch,
    buildGracePeriodEndedTimelineEvent,
    computeForcedDebtorNotificationYmd,
} from './executionDashboardCore/executionDashboardGraceSummoning';
import {
    buildInitialExecutorSeizureDetails,
} from './executionDashboardCore/executionDashboardCoerciveAction';
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
    /** Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø© Ø§Ù„Ø£Ù…/Ø§Ù„ÙØ±Ø¹ÙŠØ© */
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

    /** Ù‚Ø±Ø§Ø¡Ø© delegationParentId Ù…Ù† Ø§Ù„Ø±Ø§Ø¨Ø· â€” Ø§Ù„Ù…ØµØ¯Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ Ù„Ù„Ø­Ù‚ÙŠÙ‚Ø© */
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

    /** Ù…Ø²Ø§Ù…Ù†Ø© URL â†’ Store Ø¹Ù†Ø¯ Ø¨Ø¯Ø¡ Ø§Ù„ØªØ´ØºÙŠÙ„ */
    useExecutionDashboardUrlDelegationSync(
        urlDelegationParentId,
        delegationParentFileId,
        setDelegationParentFileId,
    );

    /** ðŸ†• Ø§Ù„ØªØ¨ÙˆÙŠØ¨Ø§Øª (Parent-Child) â€” orchestrator */
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

    /** Ø£Ø­Ø¯Ø« Ù…Ù„Ù Ù„Ù„Ø¯Ù…Ø¬ â€” ÙŠÙ…Ù†Ø¹ Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Ø­Ù‚ÙˆÙ„ Ø¨Ø³Ø¨Ø¨ Ø¥ØºÙ„Ø§Ù‚ Ù‚Ø¯ÙŠÙ… Ù„Ù€ persistExecutionMerge Ø¹Ù†Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ù…Ù†ÙØ° */
    const executionDataRef = useRef<ExecutionFile | null>(null);
    executionDataRef.current = executionData ?? null;

    const partyBadgesExecutionId = String(executionData?.id ?? executionId ?? file?.id ?? 'unknown');

    /** Ù…ÙØªØ§Ø­ Ù…ÙˆØ­Ù‘Ø¯ Ù„Ù€ localStorage Â«execution_*_decisionsÂ» â€” ÙŠØ¬Ø¨ Ø£Ù† ÙŠØ·Ø§Ø¨Ù‚ id Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø£ØµÙ„ÙŠ ÙˆÙ„ÙŠØ³ Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ© */
    const decisionsStorageExecutionId = useMemo(() => {
        const parent = String(parentDossierId || executionId || file?.id || '').trim();
        if (parent && parent !== 'default' && parent !== 'undefined') return parent;
        return String(executionData?.id ?? 'default');
    }, [parentDossierId, executionId, file?.id, executionData?.id]);
    const executionAppealBanner = useExecutionAppealBannerState(
        decisionsStorageExecutionId !== 'default' ? decisionsStorageExecutionId : undefined
    );

    useExecutionDashboardDecisionsStorageMigration({
        isHistoricalMode,
        decisionsStorageExecutionId,
        executionId,
        fileId: file?.id,
        activeSubFileId,
        activeTabId,
        currentFileId: String(currentFileId || ''),
    });

    useExecutionDashboardDecisionsNamespaceReconcile({
        isHistoricalMode,
        decisionsStorageExecutionId,
        executionDataRef,
        executionData,
    });

    const dossierFileKey = String(executionData?.id ?? executionId ?? file?.id ?? '');
    const executionFileKey = String(file?.id ?? executionId ?? '');
    const reconcileDossierLifecycle = useExecutionDashboardStore((s) => s.reconcileDossierLifecycle);
    const dossierLifecycleRow = useExecutionDashboardStore((s) => {
        const k = dossierFileKey;
        if (!k || k === 'undefined') return undefined;
        return s.dossierLifecycleByFileId[k];
    });

    useExecutionDashboardDossierLifecycleReconcile({
        dossierFileKey,
        executionData,
        reconcileDossierLifecycle,
    });

    /** ÙŠÙØ²Ø§Ù…ÙŽÙ† Ù…Ø¹ Ø§Ù„Ù…Ù„Ù Ø¹Ø¨Ø± scopedSummonsMarker + unifiedSummonsTargetDebtorKey (Ù…ØµØ¯Ø± ÙˆØ§Ø­Ø¯ØŒ Ø¨Ù„Ø§ ØªÙƒØ±Ø§Ø± Ù…Ø¹ Ø§Ù„Ø¬Ø°Ø± ÙÙ‚Ø·) */
    const [debtorSummonsMarkerLocal, setDebtorSummonsMarkerLocal] = useState<
        ExecutionFile['debtor_summons_marker'] | null
    >(() => (executionData ? (executionData.debtor_summons_marker ?? null) : null));

    const fileForStoreSync = useStableExecutionFileForStore(
        isUnifiedTabActive ? unifiedTabFileRow : (file as ExecutionFile | null | undefined),
    );

    useExecutionDashboardStoreFileSync({
        fileForStoreSync,
        isUnifiedTabActive,
        activeSubFileId,
    });
    
    // ðŸš€ V11.0: OPTIMIZED - Start with false since data is synchronous
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadError, setLoadError] = useState<string | null>(executionData ? null : 'لم يتم العثور على بيانات التنفيذ');
    
    const debtorsSectionRef = useRef<DebtorsSectionHandle>(null);

    useExecutionDashboardShellPrefetch();
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

    /** Ø¥Ø¶Ø¨Ø§Ø±Ø© Ø²Ù…ÙŠÙ„ Ù…ÙˆØ­Ù‘Ø¯Ø© â€” Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ø²Ù…Ù†ÙŠ */
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
    
    // ðŸ†• V16: TASK ENGINE STATE
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

    useExecutionDashboardDebtorTabResetOnFileChange(executionData?.id, setExecutionDebtorTabIndex);

    // NEW: Timeline Accordion    // NEW: Timeline Accordion (Relocated below Tools Grid)
    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState<boolean>(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState<string>('الكل');
    
    // CRITICAL: Grace Period Global State (restored from localStorage if available)
    const [gracePeriodActive, setGracePeriodActive] = useState<boolean>(executionData?.gracePeriodActive ?? true);
    const [gracePeriodEnded, setGracePeriodEnded] = useState<boolean>(executionData?.gracePeriodEnded ?? false);
    
    // ðŸ†• V8: DEBTOR NOTIFICATION PIPELINE (Initial vs Subsequent)
    const [notificationCount, setNotificationCount] = useState<number>(executionData?.notificationCount || 0);
    const [notificationPurpose, setNotificationPurpose] = useState<string>('');
    /** Ø¥Ø¹Ù„Ø§Ù† Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ø¯Ø© Ø§Ù„Ø±Ø¶Ø§Ø¦ÙŠØ© Ù‚Ø¨Ù„ ÙˆØµÙˆÙ„ ØªØ­Ø¯ÙŠØ« executionData Ù…Ù† Ø§Ù„Ø£Ø¨ */
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    /** Ù…Ø«Ù„ Ø£Ø¹Ù„Ø§Ù‡ â€” Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø§Øª ØºÙŠØ± Ø§Ù„ØªØ®Ù„ÙŠØ© */
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] = useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    useExecutionDashboardSummonsPopoverEscapeClose(
        summonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
    );
    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState<boolean>(executionData?.forcedAttendanceIssued || false);
    const [debtorEvaded, setDebtorEvaded] = useState<boolean>(executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState<boolean>(executionData?.arrestWarrantUnlocked || false);
    
    const [creditorAttended, setCreditorAttended] = useState<boolean>(executionData?.creditorAttended ?? true);
    const [executionPaused, setExecutionPaused] = useState<boolean>(executionData?.executionPaused || false);
    useExecutionDashboardExecutionPausedSync(executionData, setExecutionPaused);
    
    // ðŸ†• V9: UNIFIED SUMMONS HUB STATE
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

    useExecutionDashboardSpecialRequestTemplateMenuDismiss(
        specialRequestTemplateMenuOpen,
        specialRequestTemplateMenuRef,
        setSpecialRequestTemplateMenuOpen,
    );

    useExecutionDashboardPaidClientFeesSync(executionData, setPaidClientFees);

    useExecutionDashboardDossierLifecycleDraftSync({
        executionData,
        setDossierStatusDraft,
        setDossierReasonDraft,
        setDossierDateDraft,
    });

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

    // ðŸ†• V12: FINANCIAL LEDGER HISTORY
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
    /** +ÙŠÙˆÙ… ØªÙ‚ÙˆÙŠÙ…ÙŠ ÙˆØ§Ø­Ø¯ Ø¨Ù‚Ø±Ø§Ø± Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ (Ù…Ø±Ø¨Ø¹ Ø§Ù„ØªÙ…Ø¯ÙŠØ¯) â€” ÙŠÙØ­ÙØ¸ Ù…Ø¹ isHolidayExtension ÙÙŠ Ø§Ù„Ù…Ù„Ù */
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState<boolean>(false);

    useExecutionDashboardDebtorNotificationSync({
        executionData,
        setDebtorNotificationDate,
        setManualGraceCalendarExtra,
    });

    useExecutionDashboardLegacyNoticeStateBackfill({ executionData, setActiveNoticeState });

    // ðŸ†• V10.5: Ø§Ø³ØªØ¨Ø¯Ø§Ù„ Toast Ø§Ù„Ù‚Ø¯ÙŠÙ… Ø¨Ù†Ø¸Ø§Ù… Toast Ø§Ù„Ø¬Ø¯ÙŠØ¯ (Ø³ÙŠØªÙ… Ø§Ø³ØªØ®Ø¯Ø§Ù… ExecutionToasts Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù† showToast)
    // âœ… FIXED: Proper types
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(executionData?.timelineEvents || []);
    const timelineEventsRef = useRef<TimelineEvent[]>(timelineEvents);
    timelineEventsRef.current = timelineEvents;
    /** ÙŠÙØ¹Ø¨ÙŽÙ‘Ø£ Ø¨Ø¹Ø¯ ØªØ¹Ø±ÙŠÙ `persistExecutionMerge` â€” Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø§Ù„Ø¯Ù…Ø¬ Ù…Ù† `executorApprovalActions` Ø§Ù„Ù…Ø¹Ø±Ù Ø³Ø§Ø¨Ù‚Ø§Ù‹ */
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(null);
    const pushTimelineEventRef = useRef<((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null>(
        null
    );
    /** Ù„Ù‚Ø·Ø§Øª Ø§Ù„Ù…Ù„Ù Ù„Ø¯Ù…Ø¬ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø­Ø±Ø§Ø³ Ø¯ÙˆÙ† Ø¥ØºÙ„Ø§Ù‚ Ù‚Ø¯ÙŠÙ… Ø¹Ù„Ù‰ `executionData` */
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    const [earnerFeeCollectionSm, setEarnerFeeCollectionSm] = useState<EvictionEarnerFeeCollectionSM>(() =>
        defaultEvictionEarnerFeeCollectionSM()
    );
    const [caseNotesLog, setCaseNotesLog] = useState<NonNullable<ExecutionFile['caseNotesLog']>>(
        executionData?.caseNotesLog ?? []
    );

    useExecutionDashboardEarnerFeeSmSync(executionData, setEarnerFeeCollectionSm);

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

    /** Ø¯Ù…Ø¬ Ø£Ø­Ø¯Ø§Ø« Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ© Ù…Ø¹ Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø© Ø§Ù„Ø£Ù… â€” Ù…Ø¹ Ø¥Ø¶Ø§ÙØ© source badge */
    const [showOnlyActiveFileTimeline, setShowOnlyActiveFileTimeline] = useState(false);
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

    const nextTimelineId = useCallback(
        () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        []
    );
    
    // ðŸ†• V7: SEIZED ASSETS & COERCIVE ACTIONS STATE
    // âœ… FIXED: Proper types
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
    useExecutionDashboardStandaloneMarksSync(
        executionData,
        executionStorageTick,
        setStandaloneExecutionMarks,
    );

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

    useExecutionDashboardSubDossierTimelineLifecycle({
        activeSubFileId,
        isInabaActive,
        parentDossierId,
        executionData,
        executionDashboardFileId,
        setShowOnlyActiveFileTimeline,
        setTimelineEvents,
        persistExecutionMergeRef,
        setCaseNotesLog,
        setCaseTasksPending,
        setSeizedAssets,
        setSeizureDraftsByDecisionId,
        setActiveCoerciveActions,
        setRealEstateSeizureAssets,
    });

    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null); // null | 'salary' | 'property' | 'travel' | 'imprisonment'
    /** Ø¨Ø¹Ø¯ Ù…ÙˆØ§ÙÙ‚Ø© Ø§Ù„Ù…Ù†ÙØ° Ø¹Ù„Ù‰ Ø·Ù„Ø¨ Ø§Ù„Ø­Ø¬Ø² â€” Ø¥ÙƒÙ…Ø§Ù„ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„ØªÙØµÙŠÙ„ÙŠØ© ÙÙŠ Ø§Ù„Ù†Ø§ÙØ°Ø© Ù†ÙØ³Ù‡Ø§ */
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

    useExecutionDecisionOutcomeToastBridge({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        showUnifiedExecutionModalRef,
        showToastRef,
    });
    useExecutionToastBridge(showToastRef);

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

    useExecutionDashboardExecutionFileCoerciveRefresh({
        executionData,
        setSeizedAssets,
        setActiveCoerciveActions,
        setSeizureDraftsByDecisionId,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setCaseTasksPending,
    });
    
    // ðŸ†• V10.8: EXECUTION FEE INJECTION STATE
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

    useExecutionDashboardOpenDecisionsModalBridge({
        executionDataId: executionData?.id,
        executionId,
        setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        openDecisionsModalWithBoot,
    });

    const { thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch } =
        useThirdPartySeizuresUi(executionData);

    useSeizureApprovalToast({
        executionDataId: executionData?.id,
        executionId,
        showToast,
    });
    
    // ðŸ†• V10.5: PERFORMANCE MONITORING
    useExecutionDashboardPerformanceMonitor();
    
    // ðŸš€ V11.0: REMOVED - validation moved to initial state for better performance
    
    // âœ… IMPORTANT: Don't use early returns - use conditional rendering in JSX instead
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
        
        // âš–ï¸ COURT-ORDERED LAWYER FEES (ÙŠØªØ­Ù…Ù„Ù‡Ø§ Ø§Ù„Ù…Ø¯ÙŠÙ† - ØªÙØ¶Ø§Ù Ù„Ù„ØªÙ†ÙÙŠØ°)
        lawyerFeesAmount = 0,  // From "أتعاب المحاماة المحكوم بها" checkbox
        executionFee = lawyerFeesAmount || 0,  // Backward compatibility
        
        // ðŸ’¼ PRIVATE CLIENT FEES (ÙŠØ¯ÙØ¹Ù‡Ø§ Ø§Ù„Ù…ÙˆÙƒÙ„ Ù„Ù„Ù…Ø­Ø§Ù…ÙŠ - Ø­Ø³Ø§Ø¨Ø§Øª Ø®Ø§ØµØ©)
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
        daysSinceNotice = 0, // âš ï¸ DEPRECATED: Ø§Ø³ØªØ®Ø¯Ù… daysSinceNoticeCalculated Ø¨Ø¯Ù„Ø§Ù‹ Ù…Ù†Ù‡Ø§
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
        
        // Ù…Ø´Ø§Ù‡Ø¯Ø© ÙˆØ§Ø³ØªØµØ­Ø§Ø¨ (Ù…Ù† ExecutionCreationView)
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

    /** Ù„Ù„Ø¹Ø±Ø¶ ÙÙ‚Ø·: Ø§Ù„Ù…Ø¯ÙŠÙ† Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ Ø«Ù… Ø§Ù„Ø¥Ø¶Ø§ÙÙŠÙŠÙ† â€” ÙŠØ·Ø§Ø¨Ù‚ party_multiplicity */
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

    /** ØªÙˆØ§ÙÙ‚ Ù…Ø¹ Ø§Ù„Ù…Ù†Ø·Ù‚ Ø§Ù„Ø³Ø§Ø¨Ù‚ â€” ÙƒÙ„ Ø§Ù„Ù…Ø¯ÙŠÙ†ÙŠÙ† Ù…ØªØ¶Ø§Ù…Ù†ÙŠÙ† */
    const isSolidaryLiability = allDebtorsSolidary;

    /** Ù…Ø¯ÙŠÙ† Ø£Ø³Ø§Ø³ÙŠ + Ø¥Ø¶Ø§ÙÙŠÙˆÙ† â€” Ù„Ø¹Ø±Ø¶ Â«Ù†Ø§ÙØ°Ø©Â» ÙˆØ§Ø­Ø¯Ø© ÙÙŠ Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© */
    const debtorWorkspaceEntries = useDebtorWorkspaceEntries(
        effectiveDebtors,
        executionData?.party_multiplicity?.additionalDebtors,
        allDebtorsUnified,
    );

    const { creditorWorkspaceEntries, creditorNamesTextList } = useCreditorWorkspace(
        effectiveCreditors,
        additionalCreditorsPm,
    );

    useExecutionDashboardDebtorTabIndexClamp({
        allDebtorsUnified,
        executionDataId: executionData?.id,
        debtorWorkspaceEntries,
        partyMultiplicityAdditionalDebtors: partyMultiplicityExec?.additionalDebtors,
        setExecutionDebtorTabIndex,
    });

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

    /** Ø°Ù…Ø© Ù…Ù‚Ø³ÙˆÙ…Ø© (ØªØ¨ÙˆÙŠØ¨Ø§Øª): Ø§Ù„Ù…Ø¯ÙŠÙ† Ø§Ù„Ù†Ø´Ø· ÙŠØ­Ø¯Ø¯ Ù…Ø³Ø§Ø±Ø§Øª Ù…Ø­Ø¶Ø± Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ø¬Ø¨Ø±ÙŠØ© */
    const multiDebtorMode = allDebtorsUnified.length > 1;
    /** ØªØ¨ÙˆÙŠØ¨Ø§Øª Ø§Ù„Ø°Ù…Ø©: Ù…ØªØ¶Ø§Ù…Ù†ÙˆÙ† ÙÙŠ ØªØ¨ÙˆÙŠØ¨ / Ù…Ø³ØªÙ‚Ù„ÙˆÙ† ÙÙŠ ØªØ¨ÙˆÙŠØ¨ â€” Ø£Ùˆ ØªØ¨ÙˆÙŠØ¨ Ù„ÙƒÙ„ Ù…Ø¯ÙŠÙ† (Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ù‚Ø¯ÙŠÙ…) */
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



    useExecutionDashboardFollowupSolidaryIndexReset(
        executionDebtorTabIndex,
        activeLiabilityGroupId,
        setFollowupSolidaryDebtorIndex,
    );

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
    useExecutionDashboardScopedDebtorNoticeSync({
        scopedNotificationCount,
        unifiedSummonsTargetDebtorKey,
        scopedSummonsMarker,
        setNotificationCount,
        setDebtorSummonsMarkerLocal,
    });

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

    /** Ù…Ø³Ø§Ø± Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡ Ù„Ù„Ù…Ø¯ÙŠÙ† Ø§Ù„Ù†Ø´Ø· ÙÙŠ Ø§Ù„ØªØ¨ÙˆÙŠØ¨ â€” Ù„Ù†ÙØ³ Ù†Øµ Ø²Ø± â‹® ÙÙŠ Ù…Ø­Ø¶Ø± Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© */
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

    /** Ù…ØµØ¯Ø± Ù…ÙˆØ­Ù‘Ø¯ â€” Ù†ÙØ³ Ø£Ø¹Ù„Ø§Ù… resolveFollowupSpecializationFromExecution Ø¹Ø¨Ø± Ø·Ø¨Ù‚Ø© Ø§Ù„Ø¹Ø²Ù„ */
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

    useExecutionDashboardActiveTimelineFilterNormalize(timelineFilterOptions, setActiveTimelineFilter);

    /** ÙˆÙØ§Ø© Ø§Ù„Ù…Ø¯ÙŠÙ† Ø£Ùˆ Ø§Ø³ØªØ­ØµØ§Ù„ Ù…Ø§Ù„ÙŠ+Ù…ÙˆØ¸Ù: Ø¥Ø®ÙØ§Ø¡ Ø§Ù„ØªØ¨ÙˆÙŠØ¨Ø› Ø§Ù„ÙƒØ§Ø³Ø¨ ÙŠØ¹ÙŠØ¯ Ø§Ù„Ø¸Ù‡ÙˆØ± */
    const showPersonalCoerciveFollowupTab =
        !followupSpecializationEffective.hidePersonalCoerciveFollowupTab;
    /** Ù…ÙˆØ¸Ù: Ø¥Ø¸Ù‡Ø§Ø± Ø­Ø¬Ø² Ø§Ù„Ø±Ø§ØªØ¨ ÙÙŠ Ø§Ù„Ø­Ø¬Ø² Ø§Ù„Ù…Ø§Ù„ÙŠ â€” ÙƒØ§Ø³Ø¨: Ø¥Ø®ÙØ§Ø¤Ù‡ */
    const showSalarySeizureInFollowupModal = followupModalDebtorIsEmployee;
    const followupSalarySeizureLabel =
        followupModalDebtorIsDeceased && followupModalDebtorIsEmployee
                      ? 'أقساط / تسوية'
                      : 'دفعة واحدة';
    useExecutionDashboardEmployeeCompulsoryBannerReset(
        employeeAssignmentPhaseForCoercive,
        setEmployeeCompulsoryBannerDismissed,
    );

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

    useExecutionDashboardEmployeePersonalTabUnlockHydrate(
        employeePersonalTabUnlockStorageKey,
        setPersonalTabUnlockByDebtor,
    );

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
                      ? 'أقساط / تسوية'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
            });
        }
        if (!followupModalSpecializationEffective.hideFollowupCoerciveTab && !followupTabsRestricted) {
            tabs.push({ id: 'seizure_requests', label: 'طلبات الحجز المالية' });
        }
        if (!followupTabsRestricted && !followupModalSpecializationEffective.hideFollowupSeizureRequestsTab) {
            tabs.push({ id: 'seizure_requests', label: 'طلبات الحجز المالية' });
        }
        tabs.push(
            { id: 'dossier_controls', label: 'التحكم في الإضبارة' },
            { id: 'dossier_controls', label: 'التحكم في الإضبارة' },
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

    useExecutionDashboardUnifiedModalPersonalTabRedirect({
        showUnifiedExecutionModal,
        modalShowPersonalCoerciveFollowupTab,
        unifiedModalTab,
        hideFollowupSeizureRequestsTab:
            followupModalSpecializationEffective.hideFollowupSeizureRequestsTab,
        hideFollowupCoerciveTab: followupModalSpecializationEffective.hideFollowupCoerciveTab,
        followupSolidaryDebtorIndex,
        executionDebtorTabIndex,
        setUnifiedModalTab,
    });

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

    useExecutionDashboardDebtorBrowserTabsClamp({
        debtorBrowserTabsMode,
        debtorWorkspaceEntryCount: debtorWorkspaceEntries.length,
        setExecutionDebtorTabIndex,
    });

    useExecutionDashboardPartiesExtraPanelsReset(
        executionFileKey,
        setShowExtraCreditors,
        setShowExtraDebtors,
    );

    useExecutionResidentialGraceClearedListener({
        executionDataId: executionData?.id,
        executionId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionResidentialGraceManuallyEndedAt,
        setEvictionExecutorVacateGrantApproved,
        setGraceModalAllowResave,
        caseTasksPendingRef,
        setCaseTasksPending,
        setTimelineEvents,
        persistExecutionMergeRef,
    });

    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
    
    // âš–ï¸ COURT-ORDERED LAWYER FEES (ÙŠØªØ­Ù…Ù„Ù‡Ø§ Ø§Ù„Ù…Ø¯ÙŠÙ†)
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

    /** Ù…Ø²Ø§Ù…Ù†Ø© Ù„Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø©: Ø¥Ø¶Ø§Ø¨Ø± Ù‚Ø¯ÙŠÙ…Ø© ÙˆØ§ÙÙ‚ Ø§Ù„Ù…Ù†ÙØ° Ø¹Ù„Ù‰ ØµØ±Ù Ø§Ù„Ø£ØªØ¹Ø§Ø¨ Ø¯ÙˆÙ† Ø­ÙØ¸ eviction_lawyer_fee_requested */
    useExecutionDashboardEvictionLawyerFeeBackfill({
        isEvictionExecutionModule,
        executionData,
        executionId,
        executionFileKey,
        decisionsReloadEpoch,
        persistExecutionMergeRef,
    });

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
    
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
     * Ù…Ø­Ø¶Ø± Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ù„Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¬Ø¨Ø±ÙŠØ©: ØªÙÙ‚ÙÙŽÙ„ ÙÙ‚Ø· Ø¹Ù†Ø¯ Ø§Ù„Ø¥ÙŠÙ‚Ø§Ù/Ø§Ù„Ø§Ø³ØªØ¦Ø®Ø§Ø± â€” Ù„Ø§ ØªÙØ¹Ø·ÙŽÙ‘Ù„ Ù„Ù…Ø¬Ø±Ø¯ Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø©
     * (Ø³ÙŠØ§Ø³Ø© Zero-Lock Ø¨Ø¹Ø¯ ÙˆÙØ§Ø© Ø§Ù„Ù…Ø¯ÙŠÙ†Ø› Ù…Ø³Ø¤ÙˆÙ„ÙŠØ© Ø§Ù„Ù…Ø­Ø§Ù…ÙŠ).
     */
    /** ØªØ¹Ø·ÙŠÙ„ Ø£Ø²Ø±Ø§Ø± Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø© (Ø¹Ø¯Ø§ Ù…Ø±ÙƒØ² Ø§Ù„Ø­Ø§Ù„Ø§Øª Ø§Ù„Ø®Ø§ØµØ©) */
    const executionActionsGridLocked = stayOfExecutionActive;
    const executionToolsTimelineLockedUi = executionActionsGridLocked || isHistoricalMode;
    /** ØªØ®Ù„ÙŠØ©: Ø¥Ø¸Ù‡Ø§Ø± Ø£Ø¯ÙˆØ§Øª Ù…Ø°ÙƒØ±Ø© Ø¥Ø®Ø¨Ø§Ø± Ø§Ù„ÙˆØ±Ø«Ø© Ø¹Ù†Ø¯ ÙˆÙØ§Ø© Ø§Ù„Ù…Ø¯ÙŠÙ† */
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

    /** Ù…Ù‡Ù„Ø© Ø§Ù„ØªØ®Ù„ÙŠØ© Ø§Ù„Ø³ÙƒÙ†ÙŠØ©: Ø§Ù†ØªÙ‡Øª Ø¨ØªÙ‚ÙˆÙŠÙ… ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ Ø§Ù„Ù…Ø³Ø¬Ù‘Ù„ */
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

    /** Ø§Ù„ØªØ®Ù„ÙŠØ© Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠØ©: Ù„Ø§ ØªÙÙ‚ÙÙŽÙ„ Ù„Ù…Ø¬Ø±Ø¯ Ø­Ø§Ù„Ø© Ø¢Ù„Ø© Ø­ÙŠØ§Ø© Ø§Ù„Ø¥Ø¶Ø¨Ø§Ø±Ø©Ø› ÙÙ‚Ø· Ø¹Ù†Ø¯ Ù…ÙˆÙ‚Ù Ù‚Ø§Ù†ÙˆÙ†ÙŠ (Ø¥ÙŠÙ‚Ø§Ù/Ø§Ø³ØªØ¦Ø®Ø§Ø±). */
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

    
    // ðŸ§  Development validation (OPTIONAL: Pass uiState to check for actual UI conflicts)
    // This validation is now PASSIVE - it only logs errors if you provide uiState parameter
    // We don't provide uiState here, so it only checks for critical status mismatches
    
    // ===========================
    // FINANCIAL CENTER ACCORDION & TABS STATE
    // ===========================
    // âœ… V10.8: Moved to top with other useState (lines 190-192)
    
    // ===========================
    // DOCUMENT DETAILS ACCORDION STATE
    // ===========================
    // âœ… V10.8: Moved to top with other useState (line 192)
    
    const financialStatus = useMemo(() => {
        if (remaining <= 0) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (!gracePeriodEnded && daysSinceNoticeCalculated <= 7) {
            return { label: 'فترة الإمهال القانوني', color: 'amber', pulse: false };
        }
        if (gracePeriodEnded || daysSinceNoticeCalculated > 7) {
        return { label: 'إخلال - جاهز للتنفيذ', color: 'rose', pulse: true };
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

    useExecutionDashboardExecutionFeeExemptionToast({
        debtorNotificationDate,
        daysSinceNoticeCalculated,
        remaining,
        executionFeeInjected,
        showToast,
    });

    useExecutionDashboardStatuteWarning(
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        isAlimonyClaim,
    );
    
    // âœ… CRITICAL PERFORMANCE FIX: Removed heavy useEffect that was causing 12s+ render time
    // Instead, save data manually when needed (onClose, on specific actions)
    // This prevents infinite re-renders caused by timeline/state updates
    
    // ðŸš€ OPTIMIZED: Save data only when closing or on specific actions
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
    
    useExecutionDashboardSaveOnUnmount(saveExecutionData);

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
                ? `إعادة مذكرة الإخبار بالتنفيذ. تاريخ التبليغ الفعلي: ${dateToUse}.`
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
                    'تحويل المطالبة لتعذر التسليم / هلاك الشيء — حقن الدين الأصلي في المركز المالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                source: 'تسليم شيء معين — تحويل مالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                source: 'تسليم شيء معين — تحويل مالي',
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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                      ? 'أقساط / تسوية'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
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

    useExecutionDashboardFieldVisitScheduledListener({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        executorApprovalActions,
    });

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
        openPoliceAssistanceFromBadge,
        openPoliceAssistanceDetailsForDecision,
        savePoliceAssistanceEntry,
        savePoliceAssistanceFromModal,
        completePoliceAssistance,
    } = useExecutionDashboardPoliceAssistanceHandlers({
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
        executionDataRef,
        setShowDecisionsModal,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        setFollowupExpandProcedureKey,
    });

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

    useExecutionDashboardMaritalFurnitureFinancialSync({
        isMaritalFurnitureClaim,
        executionData,
        maritalFurnitureItemsForFollowup,
        persistExecutionMerge,
    });

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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: 'طلب صرف أتعاب محكومة للمحامي',
                    description: `Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø§Ø± ÙˆØ§Ù„Ù…Ù‚Ø§Ø·Ø¹Ø©: ${nextRow.propertyNoAndDistrict}\nØ¬Ù†Ø³ Ø§Ù„Ø¹Ù‚Ø§Ø±: ${nextRow.propertyGender}${nextRow.deedNotes ? `\nØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø³Ù†Ø¯/Ù…Ù„Ø§Ø­Ø¸Ø§Øª: ${nextRow.deedNotes}` : ''}`,
                    type: 'coercive',
                source: 'تسليم شيء معين — تحويل مالي',
                    metadata: {
                        timelineThreadKey: `real_estate_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        realEstateAssetId: nextRow.id,
                    },
                },
                { mergePatch: { realEstateSeizureAssets: nextAssets } }
            );
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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

    useExecutionDashboardSupabaseTimelineHydrate({
        executionDataId: executionData?.id,
        setTimelineEvents,
    });

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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
                return false;
            }
            if (!persistExecutionMergeRef.current) {
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: 'طلب صرف أتعاب محكومة للمحامي',
                description: [
                    `مكان العمل: ${wp}`,
                    `مكان العمل: ${wp}`,
                    `مكان العمل: ${wp}`,
                    sal != null ? `الراتب: ${sal.toLocaleString('ar-IQ')} د.ع` : null,
                    ded != null ? `الاستقطاع: ${ded.toLocaleString('ar-IQ')} د.ع` : null,
                ]
                    .filter(Boolean)
                    .join('\n'),
                type: 'procedure',
                source: 'تسليم شيء معين — تحويل مالي',
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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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

    /** Ù…ØµØ¯Ø± Ù…ÙˆØ­Ù‘Ø¯ Ù„ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø¯ÙŠÙ†ÙŠÙ† â€” ÙŠÙØ¶Ù‘Ù„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø¯Ù…Ø¬Ø© ÙÙŠ Ø§Ù„Ù…Ù„Ù Ø¹Ù„Ù‰ props Ø§Ù„Ù…ØªØ£Ø®Ø±Ø© */
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

    const { handleDebtorEmploymentToggle } = useExecutionDashboardDebtorEmploymentHandlers({
        executionDataRef,
        debtorWorkspaceEntries,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
    }, [
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        persistExecutionMerge,
        showToast,
    ]);

    const {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
    } = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData,
        voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
    });

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
                title: 'طلب صرف أتعاب محكومة للمحامي',
                description: `${row.note} — ${row.requestTitle}`,
            type: 'summons',
                source: 'تسليم شيء معين — تحويل مالي',
            metadata: {
                ...timelineDebtorMetadata(targetDebtorKey),
                timelineExpandedNote:
                    'تحويل المطالبة لتعذر التسليم / هلاك الشيء — حقن الدين الأصلي في المركز المالي',
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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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

    const {
        handleSaveNote,
        commitDossierNote,
        completePendingTask,
        beginEditPendingTask,
        handleSaveTask,
        handleUpdateTask,
        handleDeleteTask,
        handleAddTimelineEvent,
        handleCompleteTask,
        handleMemoFollowupClick,
    } = useExecutionDashboardNotesTasksHandlers({
        noteTitle,
        noteBody,
        isTask,
        taskDueDate,
        taskStatus,
        editingTaskId,
        caseTasksPending,
        caseNotesLogRef,
        caseTasksPendingRef,
        timelineEventsRef,
        currentFileId,
        executionData,
        file,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        moveCaseTaskToTrash,
        setNoteTitle,
        setNoteBody,
        setIsTask,
        setTaskDueDate,
        setTaskStatus,
        setEditingTaskId,
        setEditingNoteId,
        setCaseNotesLog,
        setCaseTasksPending,
        setTimelineEvents,
        setShowNotesModal,
        openFollowupModalPersisted,
        closeUnifiedSeizureLog,
    });

    const voiceUserId = useMemo(() => resolveCalendarUserId(null), []);

    const { handleSaveAppointment } = useExecutionDashboardAppointmentHandlers({
        appointmentPurpose,
        appointmentDateOnly,
        appointmentTimeOptional,
        editingAppointmentId,
        timelineEventsRef,
        currentFileId,
        executionData,
        file,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setAppointmentPurpose,
        setAppointmentDateOnly,
        setAppointmentTimeOptional,
        setEditingAppointmentId,
    });

    // âœ… OPTIMIZED: useCallback
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
                    'تحويل المطالبة لتعذر التسليم / هلاك الشيء — حقن الدين الأصلي في المركز المالي',
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
                      ? 'أقساط / تسوية'
                      : 'دفعة واحدة';
            }
            setActiveNoticeState('initial_notice');
            if (targetIsPrimary) setNoticeVoluntaryPeriodEndOptimistic(false);
            setVoluntaryEndOptimistic(false);
        } else {
            const raqm = nextCount - 1;
            const raqmLabel = AR_TABLIGH_RAQM[raqm] ?? String(raqm);
            eventTitle = `ðŸ”” ØªØ¨Ù„ÙŠØº Ø±Ù‚Ù… ${raqmLabel}${purposeText ? ` â€” ${purposeText}` : ''}`;
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
                source: 'تسليم شيء معين — تحويل مالي',
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
                      ? 'أقساط / تسوية'
                : wasInitialNotice
                      ? 'أقساط / تسوية'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
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
    useExecutionDashboardDecisionsHeirsModalExclusivity(
        showDecisionsModal,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
    );
    const issueHeirMemoNotice = useCallback(
        (heirName: string) => {
            const key = normalizeHeirWorkflowKey(heirName);
            const ymd = heirNoticeDateDrafts[key] || '';
            if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'notification',
                source: 'تسليم شيء معين — تحويل مالي',
                }
            );
            showToast(`لا يجوز تجاوز ${residentialVacateDeadlineMaxIso} (أقصى 90 يوماً تقويمياً بعد الإخبار)`, 'warning');
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'other',
                source: 'تسليم شيء معين — تحويل مالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'other',
                source: 'تسليم شيء معين — تحويل مالي',
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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'notification',
                source: 'تسليم شيء معين — تحويل مالي',
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
            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'coercive',
                source: 'تسليم شيء معين — تحويل مالي',
                    metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
                }
            );
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'other',
                source: 'تسليم شيء معين — تحويل مالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'coercive',
                source: 'تسليم شيء معين — تحويل مالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'other',
                source: 'تسليم شيء معين — تحويل مالي',
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
                title: `💰 تحويل تسليم شيء معين: ${trimmed.toLocaleString('ar-IQ')} د.ع`,
                description: `${row.note} — ${row.requestTitle}`,
                    type: 'other',
                source: 'تسليم شيء معين — تحويل مالي',
                }
            );
            setHeirSummonsDatePickerOpenByHeir((prev) => ({ ...prev, [key]: false }));
        },
        [nextTimelineId, normalizeHeirWorkflowKey, upsertHeirWorkflow]
    );

    const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        applyEarnerFeeSmAction,
        resetEarnerFeeNotificationCycle,
        handleArrestWarrant,
    } = useExecutionDashboardDebtorSummonsCoerciveHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        forcedSummoningAnalysis,
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setInvestigationCourtRequested,
        setInvestigationPathDebtorPresent,
        setInvestigationMemoIssued,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
        setDebtorArrested,
        setEarnerFeeCollectionSm,
    });

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

            showToast('سبق أن وافق منفذ العدل على صرف الأتعاب المحكومة — لا يُعاد طرح الطلب.', 'warning');
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
                title: 'طلب صرف أتعاب محكومة للمحامي',
                description: `${row.note} — ${row.requestTitle}`,
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

    /** Ù…ÙˆØ§ÙÙ‚Ø© Ø¥Ù†Ù‡Ø§Ø¡ Ù…Ø¨ÙƒØ± Ø³Ø§Ø±ÙŠØ© â€” ØªÙÙ„ØºÙ‰ Ø¹Ù†Ø¯ ÙˆØ¬ÙˆØ¯ Ù…Ù‡Ù„Ø© Ù†Ø´Ø·Ø© (Ø¯ÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø© Ø¨Ø¹Ø¯ Ø§Ù„ØªØ³Ø¬ÙŠÙ„) */
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

    /** ÙŠØ¸Ù‡Ø± Ø·Ù„Ø¨ Ø§Ù„Ø¥Ù†Ù‡Ø§Ø¡ ÙÙ‚Ø· Ù…Ø¹ Ù…Ù‡Ù„Ø© Ø³ÙƒÙ†ÙŠØ© Ù…Ø³Ø¬Ù‘Ù„Ø© ÙˆØ³Ø§Ø±ÙŠØ© â€” Ù†ÙØ³ Ø´Ø±Ø· Â«ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù‡Ù„Ø©Â» */
    const showResidentialGraceEarlyEndRequest = residentialGracePeriodSaved;

    /** Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ù…ÙŠØ¯Ø§Ù†ÙŠØ© Ø¨Ø¹Ø¯ Ù…Ù‡Ù„Ø© Ø³ÙƒÙ†ÙŠØ©: Ù…ÙˆØ§ÙÙ‚Ø© Ø¥Ù†Ù‡Ø§Ø¡ Ù…Ø¨ÙƒØ±ØŒ Ø§Ù†ØªÙ‡Ø§Ø¡ ØªÙ‚ÙˆÙŠÙ…ÙŠØŒ Ø£Ùˆ Ø¥Ù†Ù‡Ø§Ø¡ ÙŠØ¯ÙˆÙŠ */
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

    const {
        residentialGraceModalShowPrimarySave,
        openEvictionResidentialGraceModal,
        openEvictionExecutorCompletion,
        submitEvictionResidentialGraceFromModal,
        completeEvictionResidentialGrace,
    } = useExecutionDashboardEvictionResidentialGraceHandlers({
        graceModalAllowResave,
        residentialGracePeriodSaved,
        evictionProcedureLocked,
        evictionVacateDeadlineLocal,
        evictionVacateDraft,
        evictionResidentialGracePeriodStart,
        graceModalStartYmd,
        graceModalEndYmd,
        isResidentialVacateGraceFinished,
        residentialVacateDeadlineMaxIso,
        timelineEvents,
        timelineEventsRef,
        caseTasksPendingRef,
        decisionsStorageExecutionId,
        executionId,
        executionData,
        file,
        currentFileId,
        evictionGraceDecisionId,
        executorApprovalActions,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setGraceModalEndYmd,
        setGraceModalStartYmd,
        setGraceModalAllowResave,
        setShowEvictionResidentialGraceModal,
        setEvictionGraceDecisionId,
        setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart,
        setEvictionExecutorVacateGrantApproved,
        setEvictionResidentialGraceManuallyEndedAt,
        setTimelineEvents,
        setCaseTasksPending,
        setShowDecisionsModal,
        setDecisionsModalBootListTab,
        setDecisionsModalScrollToDecisionId,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceRequestTitle,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceModalOpen,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
    });

    openEvictionExecutorCompletionRef.current = openEvictionExecutorCompletion;

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

    const {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
    } = useExecutionDashboardGuarantorFollowupHandlers({
        decisionsStorageExecutionId,
        executionData,
        executionId,
        assignmentWorkspaceCtx,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
    });

    const {
        handleEvictionLedgerActivated,
        handleEvictionLawyerFeeRequest,
        runEvictionLawyerFeeSubmit,
        runEvictionExpenseSubmit,
    } = useExecutionDashboardEvictionFinancialHandlers({
        decisionsStorageExecutionId,
        parsedLawyerFees,
        lawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        evictionExpenseAmount,
        evictionExpenseNote,
        evictionExpensePayMode,
        evictionCaseExpenses,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setEvictionAssetsTabUnlocked,
        setTimelineEvents,
        setEvictionCaseExpenses,
        setShowEvictionLawyerFeeModal,
        setLawyerFeeDisburseNotes,
        setShowEvictionExpenseModal,
        setEvictionExpenseAmount,
        setEvictionExpenseNote,
        setEvictionExpensePayMode,
    });

    const {
        handleEncroachmentExpenseRecorded,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
    } = useExecutionDashboardModuleExpenseHandlers({
        executionData,
        encroachmentCaseExpenses,
        specificDeliveryCaseExpenses,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        setEncroachmentCaseExpenses,
        setSpecificDeliveryCaseExpenses,
        setTimelineEvents,
    });

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

    const {
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
        openSeizureMarkModal,
        openPublicationModal,
        openAuctionResultModal,
        saveSeizureMarkConfirmation,
        savePublicationDetails,
        saveSeizedPropertyStepDetails,
        saveSeizedPropertyAuctionSessionResult,
    } = useExecutionDashboardSeizureAssetModalHandlers({
        decisionsStorageExecutionId,
        executionId,
        executionDataRef,
        openSeizureRequestsTabRef,
        nextTimelineId,
        persistExecutionMerge,
        pushTimelineEvent,
        showToast,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
        seizureMatrixLedgerParamsRef,
        setUnifiedLedgerRevision,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal,
        seizureMarkModalEntityId,
        seizureMarkModalEntityKind,
        seizureMarkLetterNumberDraft,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        setSeizureMarkModalOpen,
        setSeizureMarkModalEntityId,
        setSeizureMarkModalEntityKind,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        publicationModalEntityId,
        publicationModalEntityKind,
        publicationNewspaperNameDraft,
        publicationDateYmdDraft,
        setPublicationModalOpen,
        setPublicationModalEntityId,
        setPublicationModalEntityKind,
        setPublicationNewspaperNameDraft,
        setPublicationDateYmdDraft,
        seizedPropertyAuctionResultPropertyId,
        seizedPropertyAuctionResultEntityKind,
        seizedPropertyAuctionResultOutcome,
        seizedPropertyAuctionResultBuyerNameDraft,
        seizedPropertyAuctionResultAmountDraft,
        seizedPropertyAuctionDepositAmountDraft,
        setSeizedPropertyAuctionResultModalOpen,
        setSeizedPropertyAuctionResultPropertyId,
        setSeizedPropertyAuctionResultEntityKind,
        setSeizedPropertyAuctionResultOutcome,
        setSeizedPropertyAuctionResultBuyerNameDraft,
        setSeizedPropertyAuctionResultAmountDraft,
        setSeizedPropertyAuctionDepositAmountDraft,
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
    });

    focusSeizurePropertyInlineRef.current = focusSeizurePropertyInlineCompletion;
    focusSeizureMovableInlineRef.current = focusSeizureMovableInlineCompletion;
    focusSeizureThirdPartyInlineRef.current = focusSeizureThirdPartyInlineCompletion;
    focusSeizureNoticeInlineRef.current = focusSeizureNoticeInlineCompletion;

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

    const {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
    } = buildExecutionDashboardCoreScopeBags({
        FollowupModalContext,
        accumulatedAlimony,
        activeCoerciveActions,
        activeDebtorHeirsForNotification,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeDebtorNoticeScope,
        activeFinancialTab,
        activeFollowupDebtorKey,
        activeGraceTasks,
        activeGroupEntries,
        activeNoticeState,
        activeSubFileId,
        activeTabId,
        activeTimelineEvents,
        activeTimelineEventsDebtorScoped,
        activeTimelineFilter,
        alimonyBeneficiaryDeathModalOpen,
        alimonyBeneficiaryDeathModalProfile,
        alimonyBeneficiaryProfile,
        allDebtorsUnified,
        appealPerspective,
        appealsModalScrollToDecisionId,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
        appendGuarantorFollowupRequest,
        appointmentDateOnly,
        appointmentPurpose,
        archiveAndClearGuarantor,
        assignmentWorkspaceCtx,
        beginThirdPartyReceiveStep,
        breakInventoryFurnitureModalCtx,
        breakInventoryFurnitureModalOpen,
        buildDebtorSummonsMarkerPatchForKey,
        buildEmployeeAssignmentPatchForDebtorKey,
        buildPartyHeirsRows,
        buildPublicationNoticePatchForDebtorKey,
        calculatedExecutionFee,
        cancelThirdPartyReceiveStep,
        caseTasksPending,
        childDossiers,
        claimType,
        claimTypeArabicDisplay,
        claimTypeForExecutionModule,
        classificationDisplay,
        clearActiveSalarySeizurePath,
        clearDebtorSummonsMarker,
        clearDecisionsModalBootState,
        closeFollowupModalPersisted,
        closeHeirMemoManually,
        closeUnifiedSeizureLog,
        coerciveSubjectRef,
        coerciveUiLocked,
        commitDossierNote,
        completeEvictionResidentialGrace,
        completePoliceAssistance,
        computeDaysRemaining,
        computeDeadlineYmd,
        computeTaklifDeadlineYmd,
        confirmThirdPartyReceive,
        consumeFollowupExpandProcedure,
        creditorDeathMenuLabel,
        creditorExtraMinorLabel,
        creditorExtraMinorNames,
        creditorOtherPartyTrackHandlers,
        creditorSubstitutionRequestStatus,
        creditorWorkspaceEntries,
        currentFile,
        currentFileId,
        custodyRemovalClaimActive,
        daysRemainingInGracePeriod,
        daysRemainingUntilDeadline,
        daysSinceNoticeCalculated,
        debtorArrested,
        debtorAttendedVoluntarily,
        debtorBrowserTabsMode,
        debtorDeathMenuLabel,
        debtorEmploymentToggleMenuLabel,
        debtorEvaded,
        debtorForcedToAttend,
        debtorLiabilityGroups,
        debtorNotificationDate,
        debtorNotifiedForEvictionGrace,
        debtorSubstitutionRequestStatus,
        debtorSummonsMarkerLocal,
        debtorSummonsProfile,
        debtorWorkspaceChipStripRef,
        debtorWorkspaceEntries,
        debtorsSectionRef,
        decisionsModalBootHubTab,
        decisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
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
        dossierMetaDraft,
        dossierPendingStatus,
        dossierReasonDraft,
        dossierStatusDraft,
        earnerFinancialPersonalCoerciveActive,
        earnerForcedActionUnlocked,
        editPartyTarget,
        editingAppointmentId,
        editingNoteId,
        editingTaskId,
        effectiveCreditors,
        effectiveDebtors,
        effectiveFollowupModalTabs,
        employeeAssignmentTabEnabled,
        employeeForcedBringAwaitingPersonalOutcome,
        employeePersonalTabUnlockStorageKey,
        evictionAssetsTabUnlocked,
        evictionCaseExpenses,
        evictionCaseExpensesTotalForFinancial,
        evictionExecutorWorkflow,
        evictionExpenseAmount,
        evictionExpenseNote,
        evictionExpensePayMode,
        evictionFullAddressField,
        evictionGraceBadgeInfo,
        evictionGraceHidden,
        evictionGracePinned,
        evictionHeirsNotificationDateYmd,
        evictionLawyerFeesInTotals,
        evictionPremisesUseResolved,
        evictionProcedureLockHint,
        evictionProcedureLocked,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        executionActionsGridLocked,
        executionAppealBanner,
        executionCoerciveButtonDisabled,
        executionData,
        executionDataRef,
        executionDebtorTabIndex,
        executionDomainContext,
        executionId,
        executionMemoBadgePopoverOpen,
        executionPaused,
        executionReportPrompt,
        executionStatus,
        executionToolsTimelineLockedUi,
        executorApprovalActions,
        executorScheduleContext,
        executorScheduleModalOpen,
        file,
        fileNumber,
        fileYear,
        finalizeBreakInventoryEntry,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        financialLawyerFeesAmount,
        financialLedger,
        financialPrincipalAmount,
        financialStatus,
        firstActiveAppealDecisionId,
        focusSeizureMovableInlineCompletion,
        focusSeizurePropertyInlineCompletion,
        followupAssignmentWorkspaceCtx,
        followupDebtorSummonsProfile,
        followupEarnerForcedActionUnlocked,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupExpandProcedureKey,
        followupGarnishmentAmountPreview,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        followupModalBodyScrollRef,
        followupModalChipTablistRef,
        followupModalDebtorIsDeceased,
        followupModalDebtorIsEmployee,
        followupModalDebtorTabsRef,
        followupModalSectionTabsRef,
        followupModalSpecializationEffectiveWithEarnerGate,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        followupSolidaryDebtorIndex,
        followupSpecialization,
        followupSpecializationWithEarnerGate,
        forcedAttendanceIssued,
        forcedBringDecisionState,
        forcedPathAttendanceSecured,
        forcedSummoningAnalysis,
        getDebtorSummonsMarkerForKey,
        getDebtorSummonsProfile,
        getEmployeeAssignmentForDebtorKey,
        getExecutionPartyDisplayName,
        getLocalTodayYmd,
        getMilestoneTimelineSnapshot,
        getPersonalCoerciveSubtypeOutcome,
        getPublicationNoticeForDebtorKey,
        goFollowupSectionTabByDelta,
        graceHiddenKey,
        graceModalEndYmd,
        graceModalStartYmd,
        gracePeriodEnded,
        guarantorDeductionDraft,
        guarantorFollowupAwaitingDetailsSave,
        guarantorNameDraft,
        guarantorSalaryDraft,
        guarantorWorkplaceDraft,
        handleAddTimelineEvent,
        handleAlimonyBeneficiaryDeathConfirm,
        handleCoerciveAction,
        handleCompleteTask,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        handleDebtorEmploymentToggle,
        handleDebtorEvasion,
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
        handleDeleteTask,
        handleDossierAction,
        handleDossierLifecycleConfirmDetails,
        handleDossierLifecyclePick,
        handleEmployeeAssignmentAttend,
        handleEmployeeAssignmentConfirm,
        handleEmployeeAssignmentDeclareAbsent,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentResolveForcedBringOutcome,
        handleEmployeeAssignmentTerminate,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEncroachmentExpenseRecorded,
        handleEndGracePeriod,
        handleEvictionHeirsNotificationDateChange,
        handleEvictionLawyerFeeRequest,
        handleEvictionLedgerActivated,
        handleForcedAttendance,
        handleFundsLedgerPayment,
        handleGuarantorRequestFromFollowup,
        handleIssueHeirsExecutionNoticeMemo,
        handleLiftStayOfExecution,
        handleMemoFollowupClick,
        handleNotifyDebtor,
        handlePartyDeathSave,
        handlePayment,
        handlePaymentFromCalculator,
        handlePublicationNoticeDebtorAttended,
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handleRequestCreditorSubstitution,
        handleRequestDebtorSubstitution,
        handleResumeExecution,
        handleSaveAppointment,
        handleSaveTask,
        handleSettlementFromCalculator,
        handleSpecialCasesStay,
        handleSpecificDeliveryExpenseRecorded,
        handleSpecificDeliveryFinancialized,
        handleSpecificDeliveryItemDeclaredDestroyed,
        handleUpdateTask,
        hasChildDossiers,
        hasFinancialLedger,
        hasUnifiedSeizureLogContent,
        headerFields,
        heirNoticeDateDrafts,
        heirSummonsDatePickerOpenByHeir,
        heirsQuickView,
        heirsWorkflowByHeir,
        hideCoerciveTabsForDebtorAgent,
        hideExecutiveDetentionJudgeCard,
        inabaCorrespondenceLog,
        inabaTargets,
        initialFileNumber,
        initiator,
        inlineActionGateKey,
        insertTimelineEventToSupabase,
        isAlimonyClaim,
        isAlimonyClaimType,
        isAssignmentDeadlinePassed,
        isDebtorFreelancer,
        isDebtorGovernmentEmployee,
        isDebtorRowEmployee,
        isEvictionExecutionModule,
        isEvictionGraceEffectivelyExpired,
        isEvictionGraceExpiredCalendar,
        isFinancialCenterExpanded,
        isFollowupTabActive,
        isGracePeriodExpiredNow,
        isHeaderExpanded,
        isHistoricalMode,
        isInabaActive,
        isMaritalFurnitureClaim,
        isNonFinancialClaim,
        isPaused,
        isPersonalStatusExecutionClaim,
        isRepresentingDebtor,
        isSolidaryLiability,
        isTask,
        isUnifiedTabActive,
        isVisitationClaim,
        issueHeirMemoNotice,
        issueHeirSummons,
        judgmentDateDisplay,
        judicialCustodianModalCtx,
        judicialCustodianModalOpen,
        judicialCustodianSalariesExpenseIqd,
        judicialCustodiansResolved,
        kasabTerminationEmphasis,
        lawyerFeeDisburseMode,
        lawyerFeeDisburseNotes,
        lawyerFeePayoutApproved,
        lawyerStartedPostNoticeExecution,
        liabilityGroupTabsMode,
        linkSeizureAuctionToAppointments,
        linkedDossierToView,
        maritalFurnitureItemsForFollowup,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
        mergeSimilarRecentTimelineEvent,
        mergedTimelineEvents,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        modalActiveDebtorNoticeScope,
        modalEmployeeCoerciveDetentionRestricted,
        modalKasabTerminationEmphasis,
        modalPersonalTabLockedForEmployee,
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        modalShowPersonalCoerciveFollowupTab,
        monthlyAlimony,
        movableSeizureRegistryAssets,
        movableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        moveCaseNoteToTrash,
        moveTimelineEventToTrash,
        multiDebtorMode,
        nextTimelineId,
        normalizeHeirWorkflowKey,
        noteBody,
        noteTitle,
        noticeKindGoalStrictBinding,
        noticeVoluntaryPeriodEndOptimistic,
        notificationCount,
        onClose,
        onUpdate,
        openDecisionsModalWithBoot,
        openEditDossierMeta,
        openEditParty,
        openEvictionResidentialGraceModal,
        openExecutionSeizuresTab,
        openFinancialHubLedger,
        openGuarantorDetailsModal,
        openHeirsNotificationCenter,
        openHeirsQuickView,
        openOtherPartyAppealsModal,
        openParentDossierMetaEdit,
        openPoliceAssistanceDetailsForDecision,
        openPoliceAssistanceFromBadge,
        openSeizureRequestsTab,
        openUnifiedSeizureLog,
        otherPartyCreditorMirrorProps,
        otherPartyTabSubmitHandler,
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
        partyDeathModalParty,
        partyEditDraft,
        partyEditHeirDeleteConfirmIdx,
        patchSalarySeizureAssetDetails,
        pauseReason,
        paymentAmount,
        paymentDate,
        permanentDeleteTimelineId,
        permanentlyDeleteCaseNote,
        permanentlyDeleteCaseTask,
        permanentlyDeleteTimelineEvent,
        persistExecutionMerge,
        persistFollowupModalViewport,
        persistGuarantorFollowupDetails,
        personalTabLockedForEmployee,
        policeAssistanceAgencyDraft,
        policeAssistanceBadgeInfo,
        policeAssistanceModalOpen,
        policeAssistanceRequestTitle,
        primaryDebtorAbsenceBadge,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        primaryMemoNoticeBadge,
        principalDebtAmount,
        propertyInlineSaveCtx,
        propertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        publicationDateYmdDraft,
        publicationModalEntityKind,
        publicationModalOpen,
        publicationNewspaperNameDraft,
        publicationNoticeDeadlineYmd,
        pushTimelineEvent,
        queueMicrotask,
        realEstateModalInitial,
        realEstateSeizureAssets,
        realEstateSeizureModalDecisionId,
        realEstateSeizureRegistryAssets,
        registerDebtorVoluntaryAttendance,
        releaseSeizureAssetRow,
        remaining,
        remainingBalanceForSeizure,
        removeHeirFromPartyEditDraftAtIndex,
        removeJudicialCustodianEntry,
        requestEditTimelineEvent,
        requestFollowupSeizureDecision,
        requestGuarantorSeizure,
        residentialGraceAllowsFieldwork,
        residentialGraceModalShowPrimarySave,
        residentialGracePeriodSaved,
        residentialVacateDeadlineMaxIso,
        resolveCalendarUserId,
        resolvedEmployeeSummonsAssignment,
        restoreCaseNoteFromTrash,
        restoreCaseTaskFromTrash,
        restoreTimelineEventFromTrash,
        runEvictionExpenseSubmit,
        runEvictionLawyerFeeSubmit,
        runSpecialFollowupSubmit,
        salarySeizureRegistryAssets,
        salarySeizureTabRows,
        saveBreakInventoryLedgerEntry,
        saveCoerciveAction,
        saveCoerciveActionRef,
        saveDossierMetaDraft,
        saveMaritalFurnitureDeliveryInventoryEntry,
        savePartyEditDraft,
        savePoliceAssistanceEntry,
        savePoliceAssistanceFromModal,
        savePublicationDetails,
        saveRealEstateSeizureFromModal,
        saveSeizedMovableInitForDecision,
        saveSeizedPropertyAuctionSessionResult,
        saveSeizedPropertyInitForDecision,
        saveSeizedPropertyStepDetails,
        saveSeizureMarkConfirmation,
        saveStandaloneExecutionMarkForDecision,
        saveSummonsMarkerPurposeEdit,
        saveThirdPartySeizureForDecision,
        saveTimelineEditDraft,
        savedNotesSplit,
        savedNotesView,
        scopedSummonsMarker,
        seizedAssets,
        seizedAssetsModalExecutionId,
        seizedMovablesForSeizureLog,
        seizedPropertiesForSeizureLog,
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
        seizureDetailCompletion,
        seizureDraftsByDecisionId,
        seizureLogExecutorDecisions,
        seizureMarkDateDraft,
        seizureMarkEntityDraft,
        seizureMarkLetterNumberDraft,
        seizureMarkModalEntityKind,
        seizureMarkModalOpen,
        seizureMatrix,
        seizureMatrixLedgerParamsRef,
        setActiveCoerciveActions,
        setActiveFinancialTab,
        setActiveNoticeState,
        setActiveTabId,
        setActiveTimelineFilter,
        setAlimonyBeneficiaryDeathModalOpen,
        setAlimonyBeneficiaryDeathModalProfile,
        setAppointmentDateOnly,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        setBreakInventoryFurnitureModalCtx,
        setBreakInventoryFurnitureModalOpen,
        setCaseTasksPending,
        setDebtorArrested,
        setDebtorForcedToAttend,
        setDebtorNotificationDate,
        setDebtorSummonsMarkerLocal,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        setDossierActionModalType,
        setDossierDateDraft,
        setDossierLifecyclePanelOpen,
        setDossierLifecyclePanelPhase,
        setDossierMetaDraft,
        setDossierPendingStatus,
        setDossierReasonDraft,
        setEditPartyTarget,
        setEditingAppointmentId,
        setEditingTaskId,
        setEmployeeCompulsoryBannerDismissed,
        setEncroachmentCaseExpenses,
        setEvictionExpenseAmount,
        setEvictionExpenseNote,
        setEvictionExpensePayMode,
        setEvictionGraceDecisionId,
        setEvictionGraceHidden,
        setExecutionDebtorTabIndex,
        setExecutionMemoBadgePopoverOpen,
        setExecutionReportPrompt,
        setExecutionStorageTick,
        setExecutorScheduleContext,
        setExecutorScheduleModalOpen,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        setFollowupSolidaryDebtorIndex,
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
        setInlineActionGateKey,
        setIsFinancialCenterExpanded,
        setIsPaused,
        setIsTask,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setLawyerFeeDisburseMode,
        setLawyerFeeDisburseNotes,
        setLinkSeizureAuctionToAppointments,
        setLinkedDossierToView,
        setManualGraceCalendarExtra,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        setNonInterferenceIssued,
        setNoteBody,
        setNoteTitle,
        setPartyDeathModalDecisionId,
        setPartyDeathModalParty,
        setPartyEditDraft,
        setPartyEditHeirDeleteConfirmIdx,
        setPauseReason,
        setPaymentAmount,
        setPaymentDate,
        setPermanentDeleteTimelineId,
        setPersonalTabUnlockByDebtor,
        setPoliceAssistanceAgencyDraft,
        setPoliceAssistanceDecisionId,
        setPoliceAssistanceModalOpen,
        setPoliceAssistanceRequestTitle,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        setPublicationDateYmdDraft,
        setPublicationModalEntityId,
        setPublicationModalOpen,
        setPublicationNewspaperNameDraft,
        setRealEstateSeizureModalDecisionId,
        setSavedNotesView,
        setSeizedAssets,
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
        setSeizureDraftsByDecisionId,
        setSeizureMarkDateDraft,
        setSeizureMarkEntityDraft,
        setSeizureMarkLetterNumberDraft,
        setSeizureMarkModalEntityId,
        setSeizureMarkModalOpen,
        setShowCoerciveActionForm,
        setShowCoerciveModal,
        setShowExecutionFinancialHub,
        setShowExecutionTrashModal,
        setShowExtraCreditors,
        setShowExtraDebtors,
        setShowOnlyActiveFileTimeline,
        setShowStayOfExecutionModal,
        setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowVisitationCalendarModal,
        setSolidaryCoerciveActionPending,
        setSpecialRequestContent,
        setSpecialRequestDate,
        setSpecialRequestManualTitle,
        setSpecialRequestTemplatePick,
        setSummonsContextDebtorKey,
        setSummonsHubInitialMainTab,
        setSummonsMarkerPopoverOpen,
        setSummonsPurposeDraft,
        setTaskDueDate,
        setTaskStatus,
        setThirdPartyFundsDraftById,
        setThirdPartySeizuresUi,
        setTimelineAccordionExpanded,
        setTimelineEditDraft,
        setTimelineEvents,
        setUnifiedLedgerRevision,
        setUnifiedModalTab,
        setUnifiedSeizureLogTab,
        settlementGuarantorGate,
        shouldCalculateExecutionFee,
        shouldShowGuarantorExternalHub,
        showBreakInventoryRequest,
        showCoerciveModal,
        showDebtorSummonsAttendanceBadge,
        showDebtorUnservedMemoBadge,
        showEmployeeAssignmentCoerciveBlock,
        showEmployeeCompulsoryProceduresBanner,
        showExecutionFinancialHub,
        showExecutionTrashModal,
        showExtraCreditors,
        showExtraDebtors,
        showFollowupSolidaryDebtorTabs,
        showGuarantorInSeizureFollowupTab,
        showJudgmentMeta,
        showOnlyActiveFileTimeline,
        showPersonalCoerciveFollowupTab,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        showStayOfExecutionModal,
        showToast,
        showUnifiedSeizureLogModal,
        showVisitationCalendarModal,
        solidaryCoerciveActionPending,
        specialRequestContent,
        specialRequestDate,
        specialRequestManualTitle,
        specialRequestTemplatePick,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        standaloneExecutionMarks,
        statusMetadata,
        statuteStatus,
        stayOfExecutionActive,
        subFiles,
        submitEvictionResidentialGraceFromModal,
        submitMovableSeizureRequest,
        submitPropertySeizureRequest,
        subsequentNoticeUnlocked,
        summoningRound,
        summonsHubInitialMainTab,
        summonsMarkerPopoverOpen,
        summonsPurposeDraft,
        syncActiveCoerciveActions,
        syncRollingCalendarSessions,
        syncSeizedAssets,
        syncSeizureDrafts,
        terminateDebtorSummonsMarker,
        thirdPartyFundsDraftById,
        thirdPartySeizureAssets,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        timelineAccordionExpanded,
        timelineDebtorMetadata,
        timelineEditDraft,
        timelineEvents,
        timelineFilterOptions,
        timelineRadarPreviewLimit,
        todayYmd,
        toggleCaseNotePin,
        toggleCaseTaskPin,
        toggleEvictionGracePinned,
        toggleHeaderExpanded,
        togglePartyEditHeirClient,
        toggleTimelineEventPin,
        totalExecutionExpenses,
        totalOwed,
        totalWithExecutionFee,
        total_execution_expenses,
        trashedCaseNotes,
        trashedCaseTasks,
        trashedTimelineEvents,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        unifiedCollectionApproved,
        unifiedModalTab,
        unifiedSeizureLogEntries,
        unifiedSeizureLogTab,
        unifiedSeizureTabCounts,
        unifiedSummonsTargetDebtorKey,
        updateThirdPartyReceiveDraft,
        useExecutionDashboardStore,
        viewExecutionData,
        visitChildNames,
        voiceUserId,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
    });

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
        getScopeSources: () =>
            buildExecutionDashboardChunkScopeSources(
                buildExecutionDashboardCoreDynamicScope({
                    executionModalFlags,
                    executionModalSetters,
                    followupScopeBag,
                    coerciveScopeBag,
                    financialScopeBag,
                    timelineDossierScopeBag,
                    decisionsSeizureEvictionScopeBag,
                    workspaceScopeBag,
                }),
            ),
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
