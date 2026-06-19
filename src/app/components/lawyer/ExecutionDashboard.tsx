// ✅ PERFORMANCE OPTIMIZED - v11.1 - Zustand modals + useCallback + optimized useEffect
import React, {
    useState,
    useMemo,
    useEffect,
    useLayoutEffect,
    useCallback,
    useRef,
    startTransition,
    Suspense,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { debug } from '@/app/utils/debug';
import { CalendarBridge, normalizeDateToYmd, resolveCalendarUserId } from '@/app/services/calendarBridge';
import {
    syncExecutionTaskDue,
    syncExecutionTimelineAppointment,
} from '@/app/services/calendarDossierSync';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
// ✅ NEW: Import fixed calculation functions for 7-day grace period
import {
    formatDateToLocalYmd,
    getLocalTodayYmd,
    isGracePeriodExpired,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';
import { buildCreditorDebtRows, distributePaymentProRata } from '@/app/utils/creditorPaymentProRata';
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

import { 
    X, User, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
    Calendar, FileText, FolderOpen, Scale,
    Clock, AlertCircle, CheckCircle, Users, Bell,
    Activity, Trash2,
    Book, History, Phone, MapPin, Pencil, Bot,
    Wallet, CreditCard, Shield,
    XCircle, Pause, Play, Car, ClipboardList, Building2, Package, AlertTriangle,
    Forward, Shuffle, RefreshCw, MessageSquare
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR HELPERS - دوال مساعدة معيارية
// ═══════════════════════════════════════════════════════════════════════════
import {
    // Date Utilities
    evictionLocalYmdToday,
    evictionInclusiveCalendarDays,
    // Seizure Utilities
    seizureCoerciveKeyFromAssetType,
    stripSeizureTypeDecorators,
    isMovablePropertySeizureRow,
    buildSeizureRegistryDraftPatch,
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
    // Heir Utilities
    heirsDetailsIncludeClient,
    heirRowCompletenessScore,
    heirRowHasAnyText,
    // Dossier Lifecycle Utilities
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from './ExecutionDashboard/helpers';

// ═══════════════════════════════════════════════════════════════════════════
// MODULAR COMPONENTS - مكونات معيارية
// ═══════════════════════════════════════════════════════════════════════════
import { ExecutionToast } from './ExecutionDashboard/components/ExecutionToast';
import { ExecutionTrashModal } from './ExecutionDashboard/components/ExecutionTrashModal';
import type { DebtorsSectionHandle } from './ExecutionDashboard/components/DebtorsSection';
import { GuarantorExternalHub } from './ExecutionDashboard/components/GuarantorExternalHub';
import { shouldShowGuarantorExternalHub } from './ExecutionDashboard/components/guarantorExternalUtils';
import { DossierSwitcher } from './ExecutionDashboard/components/DossierSwitcher';
import { TimelineEditModal } from './ExecutionDashboard/components/TimelineEditModal';
import { InlineActionGate } from './ExecutionDashboard/components/InlineActionGate';
import {
    useDossierMeta,
    useEvictionProcedures,
    useToastSystem,
    useStatuteOfLimitations,
    useDynamicExpenses,
    useTodayYmd,
    useFinancialComputed,
    useGracePeriodCalculations,
    useDebtorSummonsProfile,
    useExecutionFlags,
    useEvictionBadges,
    useFinancialTotals,
    useForcedSummoningAndFees,
    useExecutionAICopilot,
    useSubsequentNoticeFlow,
    useMergedTimelineEvents,
    useAllDebtorsUnified,
    useEvictionProcedureLockHint,
    useDebtorWorkspaceEntries,
    useMasterState,
    useActiveDebtorProfile,
    useActiveDebtorHeirsForNotification,
    useHeirsWorkflowByHeir,
    useCreditorWorkspace,
    useDebtorScopedTimeline,
    useDossierDeathStatus,
    useDossierHeaderMetadata,
    executionFileContentSignature,
    useExecutionData,
    useStableExecutionFileForStore,
    useSeizureRegistryAssets,
    isSalarySeizureAsset,
    useUnifiedSeizureLog,
    useThirdPartySeizuresUi,
    useSeizureLogEntityData,
    useThirdPartyFundsReceivedOutcome,
    useSeizureDecisionOutcome,
    useSeizureApprovalToast,
    useUnifiedCollectionOutcome,
    useGuarantorRequestOutcome,
    useOpenSeizureCompletion,
    useTrustDisbursedOutcome,
    useOpenFinancialHubLedger,
    useEvictionLawyerFeeOutcome,
    useCaseTasksAndNotes,
    useExecutionTrashAndPins,
    usePartyEditWorkflow,
} from './ExecutionDashboard/hooks';
import {
    readFollowupModalPersist,
    resolveFollowupTabOnOpen,
    writeFollowupModalPersist,
    type FollowupModalTabId,
} from './ExecutionDashboard/utils/followupModalPersistUtils';
import { SPECIAL_REQUEST_MANUAL_MODE } from './ExecutionDashboard/components/requestsTabConstants';
import { ExecutionHeirsQuickViewModal } from './ExecutionDashboard/components/ExecutionHeirsQuickViewModal';
import { ExecutionTransferFileNumberModal } from './ExecutionDashboard/components/ExecutionTransferFileNumberModal';
import type { PartyEditDraft } from './ExecutionDashboard/components/PartyEditModal';
import { DossierActionsModal } from './ExecutionDashboard/components/DossierActionsModal';
import type { DossierActionType, DossierActionPayload } from './ExecutionDashboard/components/DossierActionsModal';
import {
    createInabaCorrespondenceLogEntry,
    getInabaCorrespondenceLog,
    patchParentInabaCorrespondenceLog,
} from './ExecutionDashboard/utils/inabaCorrespondenceLog';
import { LinkedDossierTimelineModal } from './ExecutionDashboard/components/LinkedDossierTimelineModal';
import { SeizureRequestSubjectModal } from './ExecutionDashboard/components/SeizureRequestSubjectModal';

// 🆕 V10.5: ENHANCED UTILITIES
import { storageCache } from '@/app/utils/storageCache';
import {
    computeTrustBalanceFromPayments,
    emptyStore,
    parseUnifiedLedgerFromStorage,
    resolveSettlementGuarantorGateFromLedger,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import {
    creditMovableProceedsForExecution,
    creditMovableSaleProceedsToTrustLedger,
    syncSoldMovableProceedsToTrustLedger,
} from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureFinancialUtils';
import { syncSoldPropertyProceedsToTrustLedger } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureFinancialUtils';
import { creditThirdPartySeizureFunds } from '@/app/components/lawyer/ExecutionDashboard/utils/thirdPartyFundsReceivedOutcomeUtils';
import {
    clearSalarySeizureFromStore,
    clearSettlementFromStore,
    promptSettlementSalaryConflictChoice,
    releaseSalarySeizedAssets,
} from '@/app/components/lawyer/FinancialOperationsCenter/settlementSalaryExclusion';
import {
    executionGarnishmentDetailsStorageKey,
    executionGarnishmentFlagStorageKey,
} from '@/app/utils/executionStorageKeys';
import { resolveAmountGuarantorRequestVisible } from '@/app/components/lawyer/FinancialOperationsCenter/settlementGuarantorGate';
import { hasActiveFinancialGuarantorFollowup } from './ExecutionDashboard/components/guarantorExternalUtils';
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
import { ExecutionDashboardSkeleton } from '@/app/components/ui/Skeleton';
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
    appendCreditorPartyDeathRequest,
    appendPersonalCoerciveExecutorRequest,
    appendPendingExecutorSeizureDecision,
    appendSpecialFollowupRequest,
    appendDebtorHeirSubstitutionRequest,
    computeGuarantorApprovalMergePatch,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    hasApprovedUnifiedCollection,
    findLatestHeirSubstitutionDecisionNeedingEntry,
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

import { buildExecutionMergeForCreditorPartyDeath } from '@/app/utils/creditorPartyDeathPersistence';
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
    dispatchDomainIsolationBlocked,
    isFollowupRequestKindAllowed,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { ensureDecisionsNamespaceMigrated } from '@/app/utils/executionDecisionsNamespace';
import { resolveDecisionsModalBootState } from '@/app/utils/decisionsModalBoot';
import { reconcileDomainViolatingDecisions } from '@/app/utils/executionDomainReconcile';
import {
    resolveCreditorOtherPartyTrackDecision,
    submitCreditorOtherPartyTrackToDecisions,
} from '@/app/utils/otherPartyCreditorTrackDecisionUtils';
import { AlimonyBeneficiaryDeathModal } from '@/app/components/lawyer/execution/AlimonyBeneficiaryDeathModal';
import {
    buildAlimonyBeneficiaryDeathMerge,
    buildSoleSurvivorDeathInput,
    resolveAlimonyBeneficiaryProfile,
    shouldShowAlimonyBeneficiaryDeathPicker,
    type AlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import {
    applyDebtorDeathFollowupOverlay,
    buildDossierAutoFinishPatch,
    isHeirSubstitutionAllowedForClaim,
    shouldAutoFinishDossierOnDeathReport,
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
import { buildTimelineEventsFromOtherPartyActionLog } from '@/app/utils/otherPartyActionLogTimeline';
import { computeSeizureMatrix, resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import {
    resolveRemainingBalanceFromFinancialCenter,
    type UnifiedLedgerTotalParams,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
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
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    type SalarySeizureDetailsPatch,
} from '@/app/components/lawyer/ExecutionDashboard/components/SalarySeizureLogDetailCard';
import { UnifiedSeizureLogHost } from '@/app/components/lawyer/ExecutionDashboard/components/UnifiedSeizureLogHost';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import {
    buildSalarySeizureDescriptionText,
    resolveSalarySeizureSubject,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureDisplayUtils';
import {
    buildSalarySeizureTabRows,
    isSalarySeizureLaneOccupied,
} from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import {
    buildExpertObjectionEntityPatch,
    expertCommitteeSizeLabelAr,
    parseExpertObjectionKindFromPayload,
    readExpertCommitteeSize,
} from '@/app/components/lawyer/ExecutionDashboard/utils/expertCommitteeUtils';
import type { ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    ExecutionPartyInteractiveBadges,
    type TaklifAssignmentBadgeInfo,
    type PublicationNoticeBadgeInfo,
} from '@/app/components/lawyer/execution/ExecutionPartyInteractiveBadges';
import { DebtorSeizureCategoryBadges } from '@/app/components/lawyer/execution/DebtorSeizureCategoryBadges';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import {
    EXEC_MODAL_BACKDROP_STRONG,
    EXEC_MODAL_Z,
} from '@/app/components/lawyer/execution/executionModalStack';
import {
    AR_TABLIGH_RAQM,
    EXEC_FOC_LAZY_FALLBACK,
    EXEC_OVERLAY_LAZY_FALLBACK,
    EXEC_SECTION_LAZY_FALLBACK,
    formatUnifiedLedgerDate,
    LazyActionGridSection,
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDashboardHeaderSection,
    LazyDebtorsSection,
    LazyDecisionsAndAppealsEngine,
    LazyDossierControlsTab,
    LazyDossierLifecyclePanel,
    LazyDossierMetaEditSection,
    LazyDocumentVault,
    LazyExecutionDecisionsModalContainer,
    LazyExecutionDebtorNotificationMemoModalContainer,
    LazyExecutionFinancialHubPortal,
    LazyExecutionFinancialLedgerPortalContainer,
    LazyExecutionFullTimelineModalContainer,
    LazyExecutionHeirsNotificationModalContainer,
    LazyExecutionModalsContainer,
    LazyExecutionNotesAndAppointmentModals,
    LazyExecutionPaymentModalContainer,
    LazyExecutionSeizedAssetsModalContainer,
    LazyExecutionSolidaryAndEvictionFollowupModalsContainer,
    LazyExecutorWorkflowPortalModals,
    LazyUnifiedSummonsModalContainer,
    LazyFinancialOperationsCenter,
    LazyFinancialTab,
    LazyGuarantorDetailsPostApprovalModal,
    LazyLawReferencePanel,
    LazyMaritalFurnitureModule,
    LazyModalSeizedAssetsManager,
    LazyOtherPartyTab,
    LazyPartiesSection,
    LazyPartyEditModal,
    LazyPermanentDeleteConfirmDialog,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
    LazyPartyDeathReportModal,
    LazyPaymentCalculator,
    LazyPoliceAssistanceDetailsModal,
    LazyPremiumTimelineAuditLog,
    LazyRealEstateSeizurePostApprovalModal,
    LazySettlementCalculator,
    LazySmartTimelineRadar,
    LazyStayOfExecutionModal,
    LazyTimelineSection,
    LazyUnifiedSummonsHub,
    LazyVisitationScheduleModule,
    LazyVisitationCalendarModal,
    LazyExecutorApprovedDateTimeModal,
    LazyExecutorBreakInventoryFurnitureModal,
    LazyExecutorJudicialCustodianModal,
    LazyExecutorWorkflowConfirmModal,
    LazyPersonalCoerciveFollowupPanel,
    LazyEmployeeAssignmentCoerciveFollowupBlock,
    LazyJudicialCustodianCardMenu,
    LazyEvictionFieldProceduresPanel,
    LazyOtherPartyActionsLog,
    PartyOverflowToggle,
    prefetchExecutionDashboardShell,
    prefetchExecutionFollowupDefaultTab,
    prefetchExecutionModalContainers,
    prefetchExecutionFollowupModalPortal,
    LazyExecutionFollowupModalPortal,
} from './ExecutionDashboard/executionDashboardLazyShell';
import { FollowupModalContext } from './ExecutionDashboard/followupModalContext';
import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';
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
import { HAMI_APPEND_EXECUTION_TIMELINE } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { buildSeizedAssetDetailLines } from '@/app/utils/seizedAssetDisplay';
import { computeNewDossierAmountAfterRealEstateSale } from '@/app/utils/realEstateSeizureMath';
import {
    getExecutionPartyDisplayName,
} from '@/app/utils/partyDisplayName';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';
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
    mergeInvestigationOutcomesIntoEmployeeAssignments,
    isAssignmentDeadlinePassed,
    type ExecutorDecisionRowLite,
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

import type { UnifiedExecutionDebtorRow, ExecutionDashboardProps, InlineActionGateKey } from './ExecutionDashboard/types';
import type { DebtorWorkspaceEntry } from './ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import { bindHorizontalWheelToScroll } from './ExecutionDashboard/helpers';

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = React.memo(({ file, executionId, onClose, onUpdate }) => {
    
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

    /** 🆕 التبويبات (Parent-Child) للتوحيد — التبديل بين الإضبارة الأصلية والأضابير الموحّدة */
    const [activeTabId, setActiveTabId] = useState<string>(() => String(currentFileId || ''));
    const stableCurrentFileRef = useRef(String(currentFileId || ''));
    useEffect(() => {
        const cur = String(currentFileId || '');
        if (stableCurrentFileRef.current !== cur) {
            stableCurrentFileRef.current = cur;
            setActiveTabId(cur);
        }
    }, [currentFileId]);

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
    }, []);
    /** عند >2 دائن/مدين: إظهار أول اثنين فقط حتى يضغط المستخدم لعرض الباقي */
    const [showExtraCreditors, setShowExtraCreditors] = useState(false);
    const [showExtraDebtors, setShowExtraDebtors] = useState(false);

    // 🚀 V11.0: نوافذ التنفيذ — مصدر واحد: Zustand (مفاتيح show*Modal)
    const modals = useExecutionDashboardStore((s) => s.modals) as ModalStates;
    const closeAllModals = useExecutionDashboardStore((s) => s.closeAllModals);
    const resetUIPanelsForExecutionContext = useExecutionDashboardStore(
        (s) => s.resetUIPanelsForExecutionContext
    );
    const activeBottomTab = useExecutionDashboardStore((s) => s.ui.activeBottomTab);
    const isHeaderExpanded = useExecutionDashboardStore((s) => s.ui.isHeaderExpanded);
    const toggleHeaderExpanded = useExecutionDashboardStore((s) => s.toggleHeaderExpanded);

    const setExecutionModal = useCallback((key: keyof ModalStates, show: boolean) => {
        const { openModal, closeModal } = useExecutionDashboardStore.getState();
        if (show) openModal(key);
        else closeModal(key);
    }, []);

    const executionDashboardFileId = executionData?.id ?? null;
    useEffect(() => {
        closeAllModals();
        resetUIPanelsForExecutionContext();
    }, [executionDashboardFileId, closeAllModals, resetUIPanelsForExecutionContext]);

    useEffect(() => {
        return () => {
            const st = useExecutionDashboardStore.getState();
            st.closeAllModals();
            st.resetUIPanelsForExecutionContext();
        };
    }, []);

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
	const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');
    
    // NEW: Unified Execution & Assets Modal with Tabs
    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const showUnifiedExecutionModalRef = useRef(showUnifiedExecutionModal);
    showUnifiedExecutionModalRef.current = showUnifiedExecutionModal;
    const seizureMatrixRef = useRef(
        computeSeizureMatrix({
            remainingBalanceIqd: 0,
            debtorJob: 'kasib',
            debtorType: 'natural_person',
        })
    );
    const openSeizureRequestsTabRef = useRef<() => void>(() => {});
    const setShowUnifiedExecutionModal = (show: boolean) => setExecutionModal('showUnifiedExecutionModal', show);
    const [unifiedModalTab, setUnifiedModalTab] = useState<
        'personal' | 'coercive' | 'financial' | 'seizure_requests' | 'other_party' | 'correspondences' | 'admin' | 'special' | 'dossier_controls'
    >('seizure_requests');
    const [specialRequestDate, setSpecialRequestDate] = useState('');
    const [specialRequestContent, setSpecialRequestContent] = useState('');
    const [specialRequestTemplatePick, setSpecialRequestTemplatePick] = useState(
        SPECIAL_REQUEST_MANUAL_MODE
    );
    const [specialRequestManualTitle, setSpecialRequestManualTitle] = useState('');
    const [specialRequestTemplateMenuOpen, setSpecialRequestTemplateMenuOpen] = useState(false);
    const specialRequestTemplateMenuRef = useRef<HTMLDivElement | null>(null);
    const specialRequestInitOnceRef = useRef(false);
    const [showStayOfExecutionModal, setShowStayOfExecutionModal] = useState(false);
    const [inlineActionGateKey, setInlineActionGateKey] = useState<InlineActionGateKey | null>(null);
    const [isLawReferenceOpen, setIsLawReferenceOpen] = useState(false);
    /** Dossier Actions Modal State */
    const [dossierActionModalOpen, setDossierActionModalOpen] = useState(false);
    const [dossierActionModalType, setDossierActionModalType] = useState<DossierActionType | null>(null);
    const [dossierActionModalSaving, setDossierActionModalSaving] = useState(false);
    /** تعدّد مدينين + ذمة مقسومة: تبويب نشط داخل محضر المتابعة والبطاقة الرئيسية */
    const [executionDebtorTabIndex, setExecutionDebtorTabIndex] = useState(0);
    const [employeeCompulsoryBannerDismissed, setEmployeeCompulsoryBannerDismissed] = useState(false);
    /** تضامن: اختيار المستهدف قبل فتح نموذج الإجراء الجبري */
    const [showSolidaryCoerciveTargetModal, setShowSolidaryCoerciveTargetModal] = useState(false);
    const [solidaryCoerciveActionPending, setSolidaryCoerciveActionPending] = useState<string | null>(null);
    /** تبويبات المدينين المتضامنين داخل محضر المتابعة */
    const [followupSolidaryDebtorIndex, setFollowupSolidaryDebtorIndex] = useState(0);
    const coerciveSubjectRef = useRef<{ id: string; name: string }>({ id: '', name: '' });
    const followupModalChipTablistRef = useRef<HTMLDivElement>(null);
    const followupModalDebtorTabsRef = useRef<HTMLDivElement>(null);
    const followupModalSectionTabsRef = useRef<HTMLDivElement>(null);
    const followupModalBodyScrollRef = useRef<HTMLDivElement>(null);
    const followupModalOpenGenerationRef = useRef(0);
    const debtorWorkspaceChipStripRef = useRef<HTMLDivElement>(null);
    const [partyDeathModalParty, setPartyDeathModalParty] = useState<'creditor' | 'debtor' | null>(null);
    const [partyDeathModalDecisionId, setPartyDeathModalDecisionId] = useState<string | null>(null);
    const [alimonyBeneficiaryDeathModalOpen, setAlimonyBeneficiaryDeathModalOpen] = useState(false);
    const [alimonyBeneficiaryDeathModalProfile, setAlimonyBeneficiaryDeathModalProfile] =
        useState<AlimonyBeneficiaryProfile | null>(null);
    const lastHeirSubRequestAtRef = useRef<{ creditor: number; debtor: number }>({
        creditor: 0,
        debtor: 0,
    });

    const [evictionVacateDeadlineLocal, setEvictionVacateDeadlineLocal] = useState<string | null>(null);
    const [evictionAssetsTabUnlocked, setEvictionAssetsTabUnlocked] = useState(false);
    const [evictionCaseExpenses, setEvictionCaseExpenses] = useState<
        Array<{ id: string; amount: number; note: string; date: string }>
    >([]);
    const [encroachmentCaseExpenses, setEncroachmentCaseExpenses] = useState<
        import('@/app/utils/unifiedFundsLedgerStorage').EncroachmentCaseExpenseRow[]
    >([]);
    const [specificDeliveryCaseExpenses, setSpecificDeliveryCaseExpenses] = useState<
        import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[]
    >([]);
    const [evictionVacateDraft, setEvictionVacateDraft] = useState('');
    const [showEvictionExpenseModal, setShowEvictionExpenseModal] = useState(false);
    const [evictionExpenseAmount, setEvictionExpenseAmount] = useState('');
    const [evictionExpenseNote, setEvictionExpenseNote] = useState('');
    const [showHeirsNotificationModal, setShowHeirsNotificationModal] = useState(false);
    const [showVisitationCalendarModal, setShowVisitationCalendarModal] = useState(false);
    const [heirNoticeDateDrafts, setHeirNoticeDateDrafts] = useState<Record<string, string>>({});
    const [heirSummonsDatePickerOpenByHeir, setHeirSummonsDatePickerOpenByHeir] = useState<
        Record<string, boolean>
    >({});
    const [evictionExpensePayMode, setEvictionExpensePayMode] = useState<
        'salary_fifth' | 'lump_sum' | 'installments'
    >('lump_sum');
    const [showEvictionLawyerFeeModal, setShowEvictionLawyerFeeModal] = useState(false);
    const [lawyerFeeDisburseMode, setLawyerFeeDisburseMode] = useState<
        'salary_fifth' | 'lump_sum' | 'settlement'
    >('lump_sum');
    const [lawyerFeeDisburseNotes, setLawyerFeeDisburseNotes] = useState('');
    const [evictionExecutorVacateGrantApproved, setEvictionExecutorVacateGrantApproved] = useState(false);
    const [evictionResidentialGracePeriodStart, setEvictionResidentialGracePeriodStart] = useState<string | null>(
        null
    );
    const [showEvictionResidentialGraceModal, setShowEvictionResidentialGraceModal] = useState(false);
    const [evictionGraceDecisionId, setEvictionGraceDecisionId] = useState<string | null>(null);
    const [graceModalStartYmd, setGraceModalStartYmd] = useState('');
    const [graceModalEndYmd, setGraceModalEndYmd] = useState('');
    const [graceModalAllowResave, setGraceModalAllowResave] = useState(false);
    const [evictionResidentialGraceManuallyEndedAt, setEvictionResidentialGraceManuallyEndedAt] = useState<
        string | null
    >(null);
    const [policeAssistanceModalOpen, setPoliceAssistanceModalOpen] = useState(false);
    const [followupExpandProcedureKey, setFollowupExpandProcedureKey] = useState<
        | 'field_visit'
        | 'police'
        | 'break_inventory'
        | 'marital_furniture_delivery'
        | 'custodian'
        | 'forced_eviction'
        | null
    >(null);
    const consumeFollowupExpandProcedure = useCallback(() => {
        setFollowupExpandProcedureKey(null);
    }, []);
    const [policeAssistanceDecisionId, setPoliceAssistanceDecisionId] = useState<string | null>(null);
    const [policeAssistanceRequestTitle, setPoliceAssistanceRequestTitle] = useState('');
    const [policeAssistanceAgencyDraft, setPoliceAssistanceAgencyDraft] = useState('');
    const [evictionHeirsNotificationDateYmd, setEvictionHeirsNotificationDateYmd] = useState('');

    const openEvictionExecutorCompletionRef = useRef<((decisionId: string) => void) | null>(null);

    useEffect(() => {
        if (!showUnifiedExecutionModal) {
            specialRequestInitOnceRef.current = false;
            return;
        }
        if (unifiedModalTab !== 'special') return;
        if (specialRequestInitOnceRef.current) return;
        specialRequestInitOnceRef.current = true;
        setSpecialRequestTemplatePick(SPECIAL_REQUEST_MANUAL_MODE);
        setSpecialRequestContent('');
        setSpecialRequestManualTitle('');
        setSpecialRequestDate(getLocalTodayYmd());
    }, [showUnifiedExecutionModal, unifiedModalTab]);

    // NEW: Timeline Accordion (Relocated below Tools Grid)
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
    const [summonsHubInitialMainTab, setSummonsHubInitialMainTab] = useState<
        'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null
    >(null);
    /** عند فتح المركز من شارة مدين: نثبت المستهدف حتى لا يختلط مع تبويب آخر */
    const [summonsContextDebtorKey, setSummonsContextDebtorKey] = useState<string | null>(null);
    useEffect(() => {
        setSummonsContextDebtorKey(null);
        setSummonsHubInitialMainTab(null);
    }, [executionDashboardFileId]);
    /** طلبات الحجز والإجراءات الجبرية المركّزة في «التنفيذ والمحجوزات» فقط */
    const openExecutionSeizuresTab = useCallback(() => {
        startTransition(() => {
            setUnifiedModalTab('coercive');
            setExecutionModal('showUnifiedExecutionModal', true);
            setExecutionModal('showCoerciveModal', false);
            setExecutionModal('showUnifiedSummonsModal', false);
            setSummonsHubInitialMainTab(null);
            setSummonsContextDebtorKey(null);
        });
    }, [setExecutionModal]);
    
    // 🆕 V9: COERCION RESOLUTION ENGINE STATE
    const [activeNoticeState, setActiveNoticeState] = useState<string | null>(executionData?.activeNoticeState || null); // 'initial_notice' | 'forced_attendance' | 'arrest_warrant'
    const [debtorAttendedVoluntarily, setDebtorAttendedVoluntarily] = useState<boolean>(executionData?.debtorAttendedVoluntarily || false);
    const [debtorForcedToAttend, setDebtorForcedToAttend] = useState<boolean>(executionData?.debtorForcedToAttend || false);
    const [debtorArrested, setDebtorArrested] = useState<boolean>(executionData?.debtorArrested || false);
    const [nonInterferenceIssued, setNonInterferenceIssued] = useState<boolean>(executionData?.nonInterferenceIssued || false);
    const [summoningRound, setSummoningRound] = useState<number>(executionData?.summoningRound ?? 1);
    const [voluntaryAttendanceCount, setVoluntaryAttendanceCount] = useState<number>(
        executionData?.voluntaryAttendanceCount ?? 0
    );
    const [investigationCourtRequested, setInvestigationCourtRequested] = useState<boolean>(
        executionData?.investigationCourtRequested ?? false
    );
    const [investigationMemoIssued, setInvestigationMemoIssued] = useState<boolean>(
        executionData?.investigationMemoIssued ?? false
    );
    const [investigationPathDebtorPresent, setInvestigationPathDebtorPresent] = useState<boolean>(
        executionData?.investigationPathDebtorPresent ?? false
    );
    const [forcedPathAttendanceSecured, setForcedPathAttendanceSecured] = useState<boolean>(
        executionData?.forcedPathAttendanceSecured ?? false
    );
    
    // ===========================
    // 7-YEAR STATUTE OF LIMITATIONS TRACKER
    // ===========================
    const [lastActionDate, setLastActionDate] = useState<string | null>(executionData?.lastActionDate || null);
    const [showStatuteWarning, setShowStatuteWarning] = useState<boolean>(false);

    const [dossierStatusDraft, setDossierStatusDraft] = useState<DossierLifecycleStatus>('active');
    const [dossierReasonDraft, setDossierReasonDraft] = useState('');
    const [dossierDateDraft, setDossierDateDraft] = useState('');
    const [dossierLifecyclePanelOpen, setDossierLifecyclePanelOpen] = useState(false);
    const [dossierLifecyclePanelPhase, setDossierLifecyclePanelPhase] = useState<'menu' | 'details'>(
        'menu'
    );
    const [dossierPendingStatus, setDossierPendingStatus] = useState<DossierLifecycleStatus | null>(
        null
    );
    const dossierLifecyclePopoverRef = useRef<HTMLDivElement>(null);
    const dossierLifecyclePanelPortalRef = useRef<HTMLDivElement>(null);
    const [dossierLifecyclePopStyle, setDossierLifecyclePopStyle] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
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
    const timelineDedupeSigRef = useRef<string>('');
    /** يُعبَّأ بعد تعريف `persistExecutionMerge` — لاستدعاء الدمج من `executorApprovalActions` المعرف سابقاً */
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(null);
    const pushTimelineEventRef = useRef<((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null>(
        null
    );
    /** لقطات الملف لدمج قائمة الحراس دون إغلاق قديم على `executionData` */
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    /** يمنع تكرار دمج مفاتحة التكليف + التنبيه عند تشغيل الـ effect مرتين (React Strict Mode) */
    const employeeInvestigationSyncSigRef = useRef<string>('');
    useEffect(() => {
        employeeInvestigationSyncSigRef.current = '';
    }, [executionData?.id]);
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

    const graceUiExecutionKey = String(executionData?.id ?? executionId ?? '').trim();
    const gracePinnedKey = graceUiExecutionKey ? `hami_eviction_grace_pinned_${graceUiExecutionKey}` : '';
    const graceHiddenKey = graceUiExecutionKey ? `hami_eviction_grace_hidden_${graceUiExecutionKey}` : '';
    const [evictionGracePinned, setEvictionGracePinned] = useState<boolean>(() => {
        if (!gracePinnedKey) return true;
        try {
            const raw = SecureStoreService.getItemSync(gracePinnedKey);
            if (raw === null) return true;
            return raw === '1';
        } catch {
            return true;
        }
    });
    const [evictionGraceHidden, setEvictionGraceHidden] = useState<boolean>(() => {
        if (!graceHiddenKey) return false;
        try {
            return SecureStoreService.getItemSync(graceHiddenKey) === '1';
        } catch {
            return false;
        }
    });
    useEffect(() => {
        if (!gracePinnedKey || !graceHiddenKey) return;
        try {
            const p = SecureStoreService.getItemSync(gracePinnedKey);
            setEvictionGracePinned(p === null ? true : p === '1');
            setEvictionGraceHidden(SecureStoreService.getItemSync(graceHiddenKey) === '1');
        } catch {
            /* ignore */
        }
    }, [gracePinnedKey, graceHiddenKey]);

    const toggleEvictionGracePinned = useCallback(() => {
        setEvictionGracePinned((v) => {
            const next = !v;
            if (gracePinnedKey) {
                try {
                    SecureStoreService.setItemSync(gracePinnedKey, next ? '1' : '0');
                } catch {
                    /* ignore */
                }
            }
            return next;
        });
    }, [gracePinnedKey]);

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
    const [seizureAuctionDateDraftById, setSeizureAuctionDateDraftById] = useState<Record<string, string>>(
        {}
    );
    const [realEstateAuctionDateDraftById, setRealEstateAuctionDateDraftById] = useState<
        Record<string, string>
    >({});

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

    const [propertySeizureRequestModalOpen, setPropertySeizureRequestModalOpen] = useState(false);
    const [propertySeizureSubjectDraft, setPropertySeizureSubjectDraft] = useState('');
    const [movableSeizureRequestModalOpen, setMovableSeizureRequestModalOpen] = useState(false);
    const [movableSeizureSubjectDraft, setMovableSeizureSubjectDraft] = useState('');

    const [seizedPropertyStepModalOpen, setSeizedPropertyStepModalOpen] = useState(false);
    const [seizedPropertyStepDecisionId, setSeizedPropertyStepDecisionId] = useState<string | null>(null);
    const [seizedPropertyStepPropertyId, setSeizedPropertyStepPropertyId] = useState<string | null>(null);
    const [seizedPropertyStepEntityKind, setSeizedPropertyStepEntityKind] = useState<'property' | 'movable'>(
        'property'
    );
    const [seizedPropertyStepKind, setSeizedPropertyStepKind] = useState<
        'experts' | 'auction' | 'award' | 'reauction_default' | null
    >(null);
    const [seizedPropertyExpertsNamesDraft, setSeizedPropertyExpertsNamesDraft] = useState('');
    const [seizedPropertyExpertReportDateDraft, setSeizedPropertyExpertReportDateDraft] = useState('');
    const [seizedPropertyExpertPriceDraft, setSeizedPropertyExpertPriceDraft] = useState('');
    const [seizedPropertyAuctionDateDraft, setSeizedPropertyAuctionDateDraft] = useState('');
    const [linkSeizureAuctionToAppointments, setLinkSeizureAuctionToAppointments] = useState(true);
    const [seizedPropertyBuyerNameDraft, setSeizedPropertyBuyerNameDraft] = useState('');
    const [seizedPropertyAwardAmountDraft, setSeizedPropertyAwardAmountDraft] = useState('');
    const [seizedPropertyStepNotesDraft, setSeizedPropertyStepNotesDraft] = useState('');

    const [seizedPropertyAuctionResultModalOpen, setSeizedPropertyAuctionResultModalOpen] = useState(false);
    const [seizedPropertyAuctionResultPropertyId, setSeizedPropertyAuctionResultPropertyId] = useState<string | null>(
        null
    );
    const [seizedPropertyAuctionResultEntityKind, setSeizedPropertyAuctionResultEntityKind] = useState<
        'property' | 'movable'
    >('property');
    const [seizedPropertyAuctionResultOutcome, setSeizedPropertyAuctionResultOutcome] = useState<
        'initial_award' | 'no_bidders'
    >('initial_award');
    const [seizedPropertyAuctionResultBuyerNameDraft, setSeizedPropertyAuctionResultBuyerNameDraft] = useState('');
    const [seizedPropertyAuctionResultAmountDraft, setSeizedPropertyAuctionResultAmountDraft] = useState('');
    const [seizedPropertyAuctionDepositAmountDraft, setSeizedPropertyAuctionDepositAmountDraft] = useState('');

    const [seizureMarkModalOpen, setSeizureMarkModalOpen] = useState(false);
    const [seizureMarkModalEntityKind, setSeizureMarkModalEntityKind] = useState<'property' | 'movable'>('property');
    const [seizureMarkModalEntityId, setSeizureMarkModalEntityId] = useState<string | null>(null);
    const [seizureMarkLetterNumberDraft, setSeizureMarkLetterNumberDraft] = useState('');
    const [seizureMarkDateDraft, setSeizureMarkDateDraft] = useState('');
    const [seizureMarkEntityDraft, setSeizureMarkEntityDraft] = useState('');

    const [publicationModalOpen, setPublicationModalOpen] = useState(false);
    const [publicationModalEntityKind, setPublicationModalEntityKind] = useState<'property' | 'movable'>('property');
    const [publicationModalEntityId, setPublicationModalEntityId] = useState<string | null>(null);
    const [publicationNewspaperNameDraft, setPublicationNewspaperNameDraft] = useState('');
    const [publicationDateYmdDraft, setPublicationDateYmdDraft] = useState('');

    const [showRealEstateSeizureModal, setShowRealEstateSeizureModal] = useState(false);
    const [realEstateSeizureModalDecisionId, setRealEstateSeizureModalDecisionId] = useState<string | null>(
        null
    );
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
    const { salarySeizureRegistryAssets, realEstateSeizureRegistryAssets, thirdPartySeizureRegistryAssets } = useSeizureRegistryAssets(
        seizedAssets,
        realEstateSeizureAssets,
        thirdPartySeizureAssets,
    );

    const salarySeizureTabRows = useMemo(() => {
        return buildSalarySeizureTabRows({
            registryAssets: salarySeizureRegistryAssets,
            seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
            executionData: executionData ?? null,
            executionId: String(decisionsStorageExecutionId ?? executionId ?? '').trim(),
        });
    }, [
        salarySeizureRegistryAssets,
        seizureDraftsByDecisionId,
        executionData,
        decisionsStorageExecutionId,
        executionId,
    ]);

    // Alimony cycle (30-day recurring) - MOVED HERE BEFORE EFFECTS
    const [alimonyDaysRemaining, setAlimonyDaysRemaining] = useState<number>(30);
    const [showAlimonyAlert, setShowAlimonyAlert] = useState<boolean>(false);
    
    // CRITICAL: Execution pause state - MOVED HERE BEFORE EFFECTS
    const [isPaused, setIsPaused] = useState<boolean>(executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState<string>(executionData?.pauseReason ?? '');
    const showPauseModal = modals.showPauseModal;
    const setShowPauseModal = (show: boolean) => setExecutionModal('showPauseModal', show);
    
    // CRITICAL: 3% execution fee tracking - MOVED HERE BEFORE EFFECTS
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

    const [decisionsReloadEpoch, setDecisionsReloadEpoch] = useState(0);
    const [decisionsModalBootHubTab, setDecisionsModalBootHubTab] = useState<'appeals' | null>(null);
    const [decisionsModalBootListTab, setDecisionsModalBootListTab] = useState<
        'current' | 'previous' | 'appeals' | null
    >(null);
    const [decisionsModalScrollToDecisionId, setDecisionsModalScrollToDecisionId] = useState<string | null>(null);
    const [appealsModalScrollToDecisionId, setAppealsModalScrollToDecisionId] = useState<string | null>(null);

    const clearDecisionsModalBootState = useCallback(() => {
        setDecisionsModalBootHubTab(null);
        setDecisionsModalBootListTab(null);
        setDecisionsModalScrollToDecisionId(null);
        setAppealsModalScrollToDecisionId(null);
    }, []);

    const openDecisionsModalWithBoot = useCallback(
        (opts?: { tab?: 'current' | 'previous' | 'appeals'; decisionId?: string | null }) => {
            const boot = resolveDecisionsModalBootState(opts);
            setDecisionsModalBootHubTab(boot.hubTab);
            setDecisionsModalBootListTab(boot.listTab);
            setDecisionsModalScrollToDecisionId(boot.scrollDecisionId);
            setAppealsModalScrollToDecisionId(boot.scrollAppealId);
            setShowDecisionsModal(true);
        },
        [setShowDecisionsModal]
    );

    const [showGuarantorDetailsModal, setShowGuarantorDetailsModal] = useState(false);
    const [guarantorDetailsDecisionId, setGuarantorDetailsDecisionId] = useState<string | null>(null);
    const [guarantorNameDraft, setGuarantorNameDraft] = useState('');
    const [guarantorWorkplaceDraft, setGuarantorWorkplaceDraft] = useState('');
    const [guarantorSalaryDraft, setGuarantorSalaryDraft] = useState('');
    const [guarantorDeductionDraft, setGuarantorDeductionDraft] = useState('');
    const [guarantorPanelExpanded, setGuarantorPanelExpanded] = useState(false);
    const guarantorAutoOpenStampRef = useRef(0);
    useEffect(() => {
        const bump = () => {
            queueMicrotask(() => setDecisionsReloadEpoch((n) => n + 1));
        };
        window.addEventListener('hami-decisions-reload', bump);
        window.addEventListener('hami-execution-decision-outcome', bump);
        return () => {
            window.removeEventListener('hami-decisions-reload', bump);
            window.removeEventListener('hami-execution-decision-outcome', bump);
        };
    }, []);

    useEffect(() => {
        if (showDecisionsModal) return;
        clearDecisionsModalBootState();
    }, [showDecisionsModal, clearDecisionsModalBootState]);

    /** تعبئة مسبقة لحقول النافذة عند وضع إكمال ما بعد الموافقة */
    useLayoutEffect(() => {
        if (!showCoerciveActionForm || !seizureDetailCompletion) return;
        const asset = seizedAssets.find((a) => a.id === seizureDetailCompletion.assetId);
        if (!asset?.details || typeof asset.details !== 'object') return;
        const det = asset.details as Record<string, string>;
        const setVal = (id: string, v: string) => {
            const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
            if (el) el.value = v || '';
        };
        setVal('employerName', det.employerName || '');
        setVal('salaryAmountInput', det.salaryAmount || '');
        setVal('propertyNumber', det.propertyNumber || '');
        setVal('propertyDistrict', det.propertyDistrict || '');
        setVal('propertyType', det.propertyType || '');
        setVal('movableDescription', det.movableDescription || det.movableAssetType || det.vehicleDescription || '');
        setVal('movableLocation', det.movableLocation || '');
        setVal('judicialCustodianName', det.judicialCustodianName || '');
    }, [showCoerciveActionForm, seizureDetailCompletion, seizedAssets]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subject?: string }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            if (!decisionId) return;
            focusSeizurePropertyInlineRef.current(decisionId, String(ce.detail?.subject || '').trim());
        };
        window.addEventListener('hami-open-seized-property-init', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-property-init', handler as EventListener);
    }, [executionData?.id, executionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subject?: string }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            if (!decisionId) return;
            focusSeizureMovableInlineRef.current(decisionId, String(ce.detail?.subject || '').trim());
        };
        window.addEventListener('hami-open-seized-movable-init', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-movable-init', handler as EventListener);
    }, [executionData?.id, executionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                seizedPropertyId?: string;
                step?: 'experts' | 'auction' | 'award' | 'reauction_default';
            }>;
            const myId = String(executionData?.id ?? executionId ?? '').trim();
            const storageId = String(decisionsStorageExecutionId ?? '').trim();
            const evId = String(ce.detail?.executionId ?? '').trim();
            const allowedIds = new Set(
                [myId, storageId, String(executionId ?? '').trim()].filter(
                    (x) => x && x !== 'undefined' && x !== 'null'
                )
            );
            if (!evId || !allowedIds.has(evId)) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const seizedPropertyId = String(ce.detail?.seizedPropertyId || '').trim();
            const step = ce.detail?.step ?? null;
            if (!decisionId || !seizedPropertyId || !step) return;
            setSeizedPropertyStepEntityKind('property');
            setSeizedPropertyStepDecisionId(decisionId);
            setSeizedPropertyStepPropertyId(seizedPropertyId);
            setSeizedPropertyStepKind(step);
            setSeizedPropertyExpertsNamesDraft('');
            setSeizedPropertyExpertReportDateDraft('');
            setSeizedPropertyExpertPriceDraft('');
            setSeizedPropertyAuctionDateDraft('');
            setSeizedPropertyBuyerNameDraft('');
            setSeizedPropertyAwardAmountDraft('');
            setSeizedPropertyStepNotesDraft('');
            const list = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
            const hit = list.find((x) => String(x.id) === seizedPropertyId);
            if (hit) {
                if (step === 'experts') {
                    setSeizedPropertyExpertsNamesDraft(
                        Array.isArray(hit.expertNames) ? hit.expertNames.join('، ') : ''
                    );
                    setSeizedPropertyExpertReportDateDraft(String(hit.expertReportDateYmd || ''));
                    setSeizedPropertyExpertPriceDraft(
                        hit.experts?.estimatedPriceIqd != null
                            ? formatNumberInput(String(hit.experts.estimatedPriceIqd))
                            : hit.estimatedPriceIqd != null
                              ? formatNumberInput(String(hit.estimatedPriceIqd))
                              : (hit as any).expertEstimatedAmountIqd != null
                                ? formatNumberInput(String((hit as any).expertEstimatedAmountIqd))
                                : ''
                    );
                } else if (step === 'auction') {
                    setSeizedPropertyAuctionDateDraft(String(hit.auction?.auctionDateYmd || ''));
                } else if (step === 'award') {
                    setSeizedPropertyBuyerNameDraft(
                        String(
                            hit.award?.buyerName ||
                                hit.initialAwardBuyerName ||
                                hit.lastBidderOrBuyerName ||
                                ''
                        )
                    );
                    setSeizedPropertyAwardAmountDraft(
                        hit.award?.awardAmountIqd != null
                            ? String(hit.award.awardAmountIqd)
                            : hit.initialAwardAmountIqd != null
                              ? String(hit.initialAwardAmountIqd)
                              : hit.finalAwardAmountIqd != null
                                ? String(hit.finalAwardAmountIqd)
                                : ''
                    );
                } else if (step === 'reauction_default') {
                    setSeizedPropertyStepNotesDraft(String(hit.reauctionDefault?.notes || ''));
                }
            }
            setSeizedPropertyStepModalOpen(true);
        };
        window.addEventListener('hami-open-seized-property-step', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-property-step', handler as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                decisionId?: string;
                seizedMovableId?: string;
                step?: 'experts' | 'auction' | 'award' | 'reauction_default';
            }>;
            const myId = String(executionData?.id ?? executionId ?? '');
            if (!myId || String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId || '').trim();
            const seizedMovableId = String(ce.detail?.seizedMovableId || '').trim();
            const step = ce.detail?.step ?? null;
            if (!seizedMovableId || !step) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-movable-inline-focus', {
                        detail: {
                            executionId: myId,
                            movableId: seizedMovableId,
                            step,
                            decisionId,
                        },
                    })
                );
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('hami-open-seized-movable-step', handler as EventListener);
        return () => window.removeEventListener('hami-open-seized-movable-step', handler as EventListener);
    }, [executionData?.id, executionId]);

    const openGuarantorDetailsModal = useCallback((decisionId?: string) => {
        const exId = String(executionData?.id ?? executionId ?? '').trim();
        const did = String(decisionId ?? '').trim();
        if (did) {
            setGuarantorDetailsDecisionId(did);
        } else if (exId) {
            const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
            const candidates = rows.filter(
                (r) =>
                    String(r.requestKind || '') === 'guarantor_request' &&
                    (String((r as any).executorOutcome || '') === 'approved' ||
                        String((r as any).executorOutcome || '') === 'alternative') &&
                    !Boolean(String((r as any).guarantorDetailsSavedAt || '').trim())
            );
            if (candidates.length > 0) {
                const best = candidates.reduce((acc, cur) => {
                    const a = String((acc as any).resolvedAt ?? (acc as any).date ?? '');
                    const b = String((cur as any).resolvedAt ?? (cur as any).date ?? '');
                    return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
                }, candidates[0]);
                const bestId = String((best as any).id || '').trim();
                if (bestId) setGuarantorDetailsDecisionId(bestId);
            }
        }
        const gf = executionData?.guarantor_followup;
        setGuarantorNameDraft(String(gf?.guarantor_name ?? '').trim());
        setGuarantorWorkplaceDraft(String(gf?.guarantor_workplace ?? '').trim());
        setGuarantorSalaryDraft(formatStoredAmountForInput(gf?.guarantor_salary_iqd));
        setGuarantorDeductionDraft(formatStoredAmountForInput(gf?.guarantor_deduction_iqd));
        setShowGuarantorDetailsModal(true);
    }, [executionData?.guarantor_followup, executionData?.id, executionId]);

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const nowMs = Date.now();
            if (nowMs - guarantorAutoOpenStampRef.current > 1200) {
                guarantorAutoOpenStampRef.current = nowMs;
                const did = String(ce.detail?.decisionId || '').trim();
                if (did) setGuarantorDetailsDecisionId(did);
                openGuarantorDetailsModal();
            }
        };
        window.addEventListener('hami-open-guarantor-details', handler as EventListener);
        return () =>
            window.removeEventListener('hami-open-guarantor-details', handler as EventListener);
    }, [executionData?.id, executionId, openGuarantorDetailsModal]);

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
    
    // 🆕 V10.8: ACCORDION STATES (moved from line 484+)
    const [isFinancialCenterExpanded, setIsFinancialCenterExpanded] = useState<boolean>(false);
    const [activeFinancialTab, setActiveFinancialTab] = useState<number>(1);
    const [showExecutionFinancialHub, setShowExecutionFinancialHub] = useState(false);
    const [financialHubAutoOpenMode, setFinancialHubAutoOpenMode] = useState<'disburse' | null>(null);
    const [financialHubSeizedMovableId, setFinancialHubSeizedMovableId] = useState<string | null>(null);
    const [financialHubSeizedPropertyId, setFinancialHubSeizedPropertyId] = useState<string | null>(null);
    const openFinancialHubLedger = useCallback(() => {
        setShowUnifiedExecutionModal(false);
        setIsFinancialCenterExpanded(true);
        setShowExecutionFinancialHub(true);
    }, []);

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
            const boot = resolveDecisionsModalBootState(
                tab || did ? { tab: tab ?? null, decisionId: did } : undefined
            );
            setDecisionsModalBootHubTab(boot.hubTab);
            setDecisionsModalBootListTab(boot.listTab);
            setDecisionsModalScrollToDecisionId(boot.scrollDecisionId);
            setAppealsModalScrollToDecisionId(boot.scrollAppealId);
            setShowDecisionsModal(true);
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
        if (!showUnifiedExecutionModal) setFollowupSolidaryDebtorIndex(0);
    }, [showUnifiedExecutionModal]);

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

    const modalResolvedEmployeeSummonsAssignment = useMemo(() => {
        if (!executionData) return null;
        return getEmployeeAssignmentForDebtorKey(
            executionData,
            followupAssignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKeyResolved,
        );
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        followupAssignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
    ]);

    const modalShowEmployeeAssignmentCoerciveBlock = useMemo(() => {
        if (!followupModalDebtorIsEmployee) return false;
        const a = modalResolvedEmployeeSummonsAssignment;
        if (!a) return false;
        return (
            a.phase === 'absent_declared' ||
            a.phase === 'investigation_pending' ||
            a.phase === 'warrant_ui'
        );
    }, [followupModalDebtorIsEmployee, modalResolvedEmployeeSummonsAssignment]);

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

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string }>).detail;
            const targetId = String(detail?.executionId || executionId || executionData?.id || '').trim();
            const currentId = String(executionId || executionData?.id || '').trim();
            if (targetId && currentId && targetId !== currentId) return;
            setShowDecisionsModal(false);
            openExecutionSeizuresTab();
        };
        window.addEventListener('hami-open-execution-coercive-tab', handler as EventListener);
        return () => window.removeEventListener('hami-open-execution-coercive-tab', handler as EventListener);
    }, [executionData?.id, executionId, openExecutionSeizuresTab, setShowDecisionsModal]);

    const activeDebtorNameResolved = useMemo(() => {
        const row = allDebtorsUnified[executionDebtorTabIndex];
        return String(row?.name || debtors?.[0]?.name || 'المدين').trim();
    }, [allDebtorsUnified, executionDebtorTabIndex, debtors]);

    const employeeAssignmentPhaseForCoercive = useMemo(() => {
        if (!executionData) return null;
        const a = getEmployeeAssignmentForDebtorKey(
            executionData,
            assignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKeyResolved
        );
        return a?.phase ?? null;
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        assignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
    ]);

    const employeeUnlocksPersonalCoerciveFromAssignment =
        activeDebtorIsEmployee &&
        (employeeAssignmentPhaseForCoercive === 'absent_declared' ||
            employeeAssignmentPhaseForCoercive === 'investigation_pending' ||
            employeeAssignmentPhaseForCoercive === 'warrant_ui');

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

    const goFollowupSectionTabByDelta = useCallback(
        (delta: number) => {
            const order = (followupSectionTabOrder as readonly string[]).filter(
                (tabId) => tabId !== 'seizure_requests' || !seizureMatrixRef.current.hideSeizureTab
            );
            if (!order.length) return;
            const cur = order.includes(unifiedModalTab) ? unifiedModalTab : order[0];
            const idx = order.indexOf(cur);
            const next = order[(idx + delta + order.length) % order.length] as any;
            setUnifiedModalTab(next);
            queueMicrotask(() => {
                const host = followupModalSectionTabsRef.current;
                if (!host) return;
                const el = host.querySelector(`[data-followup-tab="${String(next)}"]`) as HTMLElement | null;
                el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },
        [followupSectionTabOrder, unifiedModalTab]
    );

    const followupModalPersistStorageKey = `hami-followup-modal:${dossierFileKey}`;

    const readFollowupModalPersistForDossier = useCallback(
        () => readFollowupModalPersist(followupModalPersistStorageKey),
        [followupModalPersistStorageKey]
    );

    const writeFollowupModalPersistForDossier = useCallback(
        (patch: { tab?: string; scroll?: number }) =>
            writeFollowupModalPersist(followupModalPersistStorageKey, patch),
        [followupModalPersistStorageKey]
    );

    const persistFollowupModalViewport = useCallback(() => {
        const body = followupModalBodyScrollRef.current;
        writeFollowupModalPersistForDossier({
            tab: unifiedModalTab,
            scroll: body?.scrollTop ?? readFollowupModalPersistForDossier().scroll ?? 0,
        });
    }, [readFollowupModalPersistForDossier, unifiedModalTab, writeFollowupModalPersistForDossier]);

    const openFollowupModalPersisted = useCallback(
        (opts?: { tab?: FollowupModalTabId }) => {
            prefetchExecutionFollowupModalPortal();
            followupModalOpenGenerationRef.current += 1;
            setShowUnifiedExecutionModal(true);
            const order = (followupSectionTabOrder as readonly string[]).filter(
                (tabId) => tabId !== 'seizure_requests' || !seizureMatrixRef.current.hideSeizureTab
            );
            const resolved = resolveFollowupTabOnOpen({
                explicitTab: opts?.tab,
                savedTab: readFollowupModalPersistForDossier().tab,
                allowedTabOrder: order,
            });
            if (resolved.routeSeizureRequests) {
                openSeizureRequestsTabRef.current();
                return;
            }
            if (resolved.tab) {
                setUnifiedModalTab(resolved.tab);
            }
        },
        [followupSectionTabOrder, readFollowupModalPersistForDossier, setShowUnifiedExecutionModal]
    );

    const closeFollowupModalPersisted = useCallback(() => {
        persistFollowupModalViewport();
        setShowUnifiedExecutionModal(false);
    }, [persistFollowupModalViewport, setShowUnifiedExecutionModal]);

    const followupModalScrollRestoredForGenRef = useRef(0);

    useLayoutEffect(() => {
        if (!showUnifiedExecutionModal) {
            followupModalScrollRestoredForGenRef.current = 0;
            return;
        }
        const saved = readFollowupModalPersistForDossier();
        const openGen = followupModalOpenGenerationRef.current;
        const restoreBodyScroll = followupModalScrollRestoredForGenRef.current !== openGen;
        queueMicrotask(() => {
            const host = followupModalSectionTabsRef.current;
            const chip = host?.querySelector(
                `[data-followup-tab="${String(unifiedModalTab)}"]`
            ) as HTMLElement | null;
            chip?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            if (!restoreBodyScroll) return;
            const body = followupModalBodyScrollRef.current;
            if (body && typeof saved.scroll === 'number') {
                body.scrollTop = saved.scroll;
            }
            followupModalScrollRestoredForGenRef.current = openGen;
        });
    }, [readFollowupModalPersistForDossier, showUnifiedExecutionModal, unifiedModalTab]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        writeFollowupModalPersistForDossier({ tab: unifiedModalTab });
    }, [showUnifiedExecutionModal, unifiedModalTab, writeFollowupModalPersistForDossier]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const tag = t?.tagName ? t.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t as any)?.isContentEditable) return;
            if (!e.altKey) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goFollowupSectionTabByDelta(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goFollowupSectionTabByDelta(1);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [goFollowupSectionTabByDelta, showUnifiedExecutionModal]);

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

    const executionFileKey = String(file?.id ?? executionId ?? '');

    /** مزامنة لمرة واحدة: إضابر قديمة وافق المنفذ على صرف الأتعاب دون حفظ eviction_lawyer_fee_requested */
    const backfillEvictionLawyerFeeRequestedRef = useRef<string | null>(null);
    useEffect(() => {
        backfillEvictionLawyerFeeRequestedRef.current = null;
    }, [executionFileKey]);

    useEffect(() => {
        setShowExtraCreditors(false);
        setShowExtraDebtors(false);
    }, [executionFileKey]);

    useEffect(() => {
        if (!executionData?.id) return;
        setEvictionVacateDeadlineLocal(executionData.eviction_vacate_deadline ?? null);
        setEvictionAssetsTabUnlocked(!!executionData.eviction_assets_tab_unlocked);
        setEvictionCaseExpenses(
            Array.isArray(executionData.eviction_case_expenses) ? executionData.eviction_case_expenses : []
        );
        setEncroachmentCaseExpenses(
            Array.isArray(executionData.encroachment_case_expenses)
                ? executionData.encroachment_case_expenses
                : []
        );
        setSpecificDeliveryCaseExpenses(
            Array.isArray(
                (executionData as { specific_delivery_case_expenses?: unknown }).specific_delivery_case_expenses
            )
                ? ((executionData as { specific_delivery_case_expenses?: import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[] })
                      .specific_delivery_case_expenses as import('@/app/utils/specificDeliveryPropertyExpertRequest').SpecificDeliveryCaseExpenseRow[])
                : []
        );
        const grant = executionData.eviction_executor_vacate_grant_approved;
        setEvictionExecutorVacateGrantApproved(grant === true);
        const vd = executionData.eviction_vacate_deadline;
        setEvictionVacateDraft(
            typeof vd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(vd) ? vd : ''
        );
        const gs = executionData.eviction_residential_grace_period_start;
        setEvictionResidentialGracePeriodStart(
            typeof gs === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(gs) ? gs : null
        );
        const me = executionData.eviction_residential_grace_manually_ended_at;
        setEvictionResidentialGraceManuallyEndedAt(
            typeof me === 'string' && me.trim() ? me.trim() : null
        );
        const hnd = executionData.eviction_heirs_notification_date_ymd;
        setEvictionHeirsNotificationDateYmd(
            typeof hnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(hnd) ? hnd : ''
        );
    }, [
        executionFileKey,
        executionData?.id,
        executionData?.eviction_vacate_deadline,
        executionData?.eviction_residential_grace_period_start,
        executionData?.eviction_executor_vacate_grant_approved,
        executionData?.eviction_residential_grace_manually_ended_at,
        executionData?.eviction_heirs_notification_date_ymd,
    ]);

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

    useEffect(() => {
        if (!executionData?.id) return;
        setSummoningRound(executionData.summoningRound ?? 1);
        setVoluntaryAttendanceCount(executionData.voluntaryAttendanceCount ?? 0);
        setInvestigationCourtRequested(executionData.investigationCourtRequested ?? false);
        setInvestigationMemoIssued(executionData.investigationMemoIssued ?? false);
        setInvestigationPathDebtorPresent(executionData.investigationPathDebtorPresent ?? false);
        setForcedPathAttendanceSecured(executionData.forcedPathAttendanceSecured ?? false);
    }, [executionFileKey]);
    
    const executionExtras = (executionData || ({} as ExecutionFile)) as ExecutionFile & {
        perDebtorSalaries?: Record<string, string>;
        perDebtorGarnishments?: Record<string, string>;
    };
    
    // ⚖️ COURT-ORDERED LAWYER FEES (يتحملها المدين)
    const parseMoneyLike = (v: unknown): number => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'string') {
            const normalizeDigits = (s: string) =>
                s
                    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
                    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
            const normalized = normalizeDigits(v).replace(/\u066B/g, '.');
            const cleaned = normalized.replace(/[^0-9.]/g, '');
            const n = parseFloat(cleaned);
            return Number.isFinite(n) ? n : 0;
        }
        return 0;
    };

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

    // ===========================
    // FINANCIAL LOGIC ENGINE
    // ===========================
    
    const isNonFinancialClaim = isNonFinancialExecutionClaim(
        executionData as Record<string, unknown> | null | undefined,
        claimType
    );

    const isVisitationClaim = isVisitationExecutionClaim(
        executionData as Record<string, unknown> | null | undefined,
        claimType
    );

    const isMaritalFurnitureClaim = isMaritalFurnitureExecutionClaim(
        executionData as Record<string, unknown> | null | undefined,
        claimType
    );

    const maritalFurnitureItemsForFollowup = useMemo(
        () => readMaritalFurnitureItems(viewExecutionData),
        [viewExecutionData]
    );

    const isAlimonyClaimType = hasOngoingAlimonyInExecution(
        executionData as Record<string, unknown> | null | undefined,
        claimType
    );

    const principalDebtAmount = useMemo(() => {
        if (isNonFinancialClaim) return 0;
        if (isMaritalFurnitureClaim) {
            const types = getEffectiveClaimTypes(
                executionData as Record<string, unknown> | null | undefined
            );
            if (types.length <= 1) {
                return resolveMaritalFurnitureFinancialPrincipal(
                    executionData as Record<string, unknown> | null | undefined
                );
            }
            return buildExecutionClaimBreakdown(
                executionData as Record<string, unknown> | null | undefined
            ).reduce((sum, row) => sum + row.amount, 0);
        }
        return resolveUnifiedVesselPrincipalAmount(
            executionData as Record<string, unknown> | null | undefined,
            parsedDebtAmount
        );
    }, [isNonFinancialClaim, isMaritalFurnitureClaim, executionData, parsedDebtAmount]);

    const financialPrincipalAmount = useMemo(() => {
        if (!liabilityGroupTabsMode || !activeLiabilityGroup || isNonFinancialClaim) {
            return principalDebtAmount;
        }
        if (isMaritalFurnitureClaim) return principalDebtAmount;
        return resolveLiabilityGroupPrincipal(
            allDebtorRowsForLiability,
            executionData?.party_multiplicity as Record<string, unknown> | undefined,
            activeLiabilityGroup,
        );
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        isNonFinancialClaim,
        isMaritalFurnitureClaim,
        principalDebtAmount,
        allDebtorRowsForLiability,
        executionData?.party_multiplicity,
    ]);

    const financialLawyerFeesAmount = useMemo(() => {
        if (!liabilityGroupTabsMode || !activeLiabilityGroup) {
            return parsedLawyerFees;
        }
        const globalFees = Math.max(
            parseMoneyLike(lawyerFeesAmount),
            parseMoneyLike(executionFee),
        );
        return resolveLiabilityGroupLawyerFees(
            allDebtorRowsForLiability,
            globalFees,
            activeLiabilityGroup,
        );
    }, [
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        parsedLawyerFees,
        allDebtorRowsForLiability,
        lawyerFeesAmount,
        executionFee,
    ]);

    /** نوع المطالبة الأساسي — يمنع تسريب إجراءات نوع آخر عند claimTypes[] */
    const claimTypeForExecutionModule = useMemo(
        () =>
            resolvePrimaryExecutionClaimType(
                executionData as Record<string, unknown> | null | undefined,
                claimType
            ),
        [claimType, executionData]
    );

    const executionModuleStrategy = useMemo(
        () => getExecutionModuleStrategy(claimTypeForExecutionModule),
        [claimTypeForExecutionModule]
    );
    const hasEvictionSignals = useMemo(() => {
        const ed: any = executionData as any;
        if (!ed) return false;
        const boolSignals = [
            'eviction_executor_vacate_grant_approved',
            'eviction_voluntary_period_end_declared',
            'notice_voluntary_period_end_declared',
        ];
        for (const k of boolSignals) {
            if (ed[k] === true) return true;
        }
        const strSignals = [
            'eviction_premises_use',
            'eviction_vacate_deadline',
            'eviction_residential_grace_period_start',
            'eviction_residential_grace_manually_ended_at',
            'eviction_executor_vacate_grant_request_date',
        ];
        for (const k of strSignals) {
            if (String(ed[k] ?? '').trim() !== '') return true;
        }
        const arrSignals = ['eviction_judicial_custodians', 'eviction_caseTasksPending', 'eviction_tasks'];
        for (const k of arrSignals) {
            const v = ed[k];
            if (Array.isArray(v) && v.length > 0) return true;
        }
        return false;
    }, [executionData]);

    const hasEvictionTimelineSignals = useMemo(() => {
        return (
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.HANDOVER_FINAL) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END) ||
            hasEvictionTimelineAction(activeTimelineEvents, EVICTION_TIMELINE_ACTION_IDS.HEIRS_EXECUTION_NOTICE_MEMO)
        );
    }, [activeTimelineEvents]);

    /** لا تفعيل وحدة التخلية إلا لنوع تخلية فعلي — أحداث زمنية لا تُسرّب من إضبارة أخرى */
    const isEvictionExecutionModule = useMemo(() => {
        if (isSpecificDeliveryClaim(claimTypeForExecutionModule)) return false;
        if (isEncroachmentRemovalClaim(claimTypeForExecutionModule)) return false;
        if (isMaritalFurnitureClaim) return false;
        if (!isEvictionClaim(claimTypeForExecutionModule)) return false;
        return (
            executionModuleStrategy.useEvictionFieldProcedures ||
            hasEvictionSignals ||
            hasEvictionTimelineSignals
        );
    }, [
        claimTypeForExecutionModule,
        isMaritalFurnitureClaim,
        executionModuleStrategy.useEvictionFieldProcedures,
        hasEvictionSignals,
        hasEvictionTimelineSignals,
    ]);

    const {
        judicialCustodiansResolved,
        judicialCustodianSalariesExpenseIqd,
        evictionCaseExpensesTotalForFinancial,
        evictionLawyerFeesInTotals,
        totalOwed,
    } = useFinancialTotals(
        executionData,
        evictionCaseExpensesSum,
        isEvictionExecutionModule,
        financialLawyerFeesAmount,
        financialPrincipalAmount,
        total_execution_expenses,
    );

    const [unifiedLedgerRevision, setUnifiedLedgerRevision] = useState(0);
    useEffect(() => {
        const bump = () => setUnifiedLedgerRevision((n) => n + 1);
        window.addEventListener('hami-unified-ledger-updated', bump);
        window.addEventListener('hami-unified-ledger-external-collect', bump);
        window.addEventListener('hami-unified-ledger-payment-undo', bump);
        window.addEventListener('focus', bump);
        return () => {
            window.removeEventListener('hami-unified-ledger-updated', bump);
            window.removeEventListener('hami-unified-ledger-external-collect', bump);
            window.removeEventListener('hami-unified-ledger-payment-undo', bump);
            window.removeEventListener('focus', bump);
        };
    }, []);

    const seizureMatrixLedgerParams = useMemo((): UnifiedLedgerTotalParams => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
        const evictionLawyerFeeWaivedAtIntake = isEvictionExecutionModule
            ? !(executionData as { eviction_initial_notice_lawyer_fees_included?: boolean } | undefined)
                  ?.eviction_initial_notice_lawyer_fees_included
            : Boolean(
                  (executionData as { eviction_lawyer_fee_waived_at_intake?: boolean } | undefined)
                      ?.eviction_lawyer_fee_waived_at_intake
              );
        return {
            principal_amount: financialPrincipalAmount,
            courtOrderedFeesSafe: Math.max(0, evictionLawyerFeesInTotals),
            evictionLawyerFeeWaivedAtIntake,
            executionExpensesSumSafe: Math.max(0, total_execution_expenses),
            evictionCaseExpensesSumSafe: isEvictionExecutionModule
                ? Math.max(0, evictionCaseExpensesTotalForFinancial)
                : 0,
            seedLawyerId: exId ? `seed-lawyer-${exId}` : '',
            seedExpenseId: exId ? `seed-exp-${exId}` : '',
        };
    }, [
        decisionsStorageExecutionId,
        executionId,
        isEvictionExecutionModule,
        executionData,
        financialPrincipalAmount,
        evictionLawyerFeesInTotals,
        total_execution_expenses,
        evictionCaseExpensesTotalForFinancial,
    ]);

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

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const movables = (executionData?.seizedMovables || []) as SeizedMovable[];
        if (!Array.isArray(movables) || movables.length === 0) return;
        const totals = resolveUnifiedLedgerFinancialTotals(myId, seizureMatrixLedgerParams, (k) =>
            storageCache.get(k)
        );
        const results = syncSoldMovableProceedsToTrustLedger(myId, movables, {
            totalOwedIqd: totals.totalOwedUnified,
            ledgerParams: seizureMatrixLedgerParams,
        });
        if (results.some((r) => r.created || r.updated)) {
            setUnifiedLedgerRevision((v) => v + 1);
        }
    }, [executionData?.id, executionId, executionData?.seizedMovables, seizureMatrixLedgerParams]);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '').trim();
        if (!myId) return;
        const properties = (executionData?.seizedProperties || []) as SeizedProperty[];
        if (!Array.isArray(properties) || properties.length === 0) return;
        const totals = resolveUnifiedLedgerFinancialTotals(myId, seizureMatrixLedgerParams, (k) =>
            storageCache.get(k)
        );
        const results = syncSoldPropertyProceedsToTrustLedger(myId, properties, {
            totalOwedIqd: totals.totalOwedUnified,
            ledgerParams: seizureMatrixLedgerParams,
        });
        if (results.some((r) => r.created || r.updated)) {
            setUnifiedLedgerRevision((v) => v + 1);
        }
    }, [executionData?.id, executionId, executionData?.seizedProperties, seizureMatrixLedgerParams]);

    const remainingBalanceForSeizure = useMemo(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined;
        return resolveRemainingBalanceFromFinancialCenter({
            executionId: exId,
            ledgerParams: seizureMatrixLedgerParams,
            readRaw: (key) => storageCache.get(key),
        });
    }, [
        decisionsStorageExecutionId,
        executionId,
        seizureMatrixLedgerParams,
        unifiedLedgerRevision,
    ]);

    const settlementGuarantorGate = useMemo(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined;
        return resolveSettlementGuarantorGateFromLedger({
            executionId: exId,
            readRaw: (key) => storageCache.get(key),
        });
    }, [decisionsStorageExecutionId, executionId, unifiedLedgerRevision]);

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
        ]
    );
    seizureMatrixRef.current = seizureMatrix;

    const isPersonalStatusExecutionClaim = useMemo(() => {
        const ct = String(
            claimType || (executionData as { claimType?: string } | undefined)?.claimType || ''
        ).trim();
        const edFull = executionData as {
            docType?: string;
            classification?: string;
            category?: string;
        } | null;
        return (
            isPersonalStatusCourtDecisionsDossier(
                docType || edFull?.docType,
                classification || edFull?.classification,
                edFull?.category,
                activeDebtorEntityKind
            ) ||
            (ct.includes('نفقة') && !ct.includes('نفقة عدة') && !ct.includes('مهر'))
        );
    }, [claimType, classification, docType, executionData, activeDebtorEntityKind]);

    /** بطاقات حجز الكفيل النشطة في تبويب الحجز — طلب الكفيل الأولي يبقى في «الطلبات المخفية» */
    const showGuarantorInSeizureFollowupTab = useMemo(() => {
        if (activeDebtorIsDeceased) return false;
        if (hasActiveFinancialGuarantorFollowup(viewExecutionData)) return true;
        if (followupSpecialization.hideAllGuarantorPresence) return false;
        if (activeDebtorIsEmployee) return false;
        if (
            followupSpecialization.isFinancialDebtCollection &&
            resolveAmountGuarantorRequestVisible({
                isFinancialDebtCollectionClaim: true,
                financialCenterTotalIqd: remainingBalanceForSeizure,
                settlementBreachTriggeredAt: settlementGuarantorGate.settlementBreachTriggeredAt,
                pendingSettlement: settlementGuarantorGate.pendingSettlement,
                hideAllGuarantorPresence: false,
            })
        ) {
            return followupSpecialization.showFinancialGuarantorRequestOnly;
        }
        return false;
    }, [
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        followupSpecialization.hideAllGuarantorPresence,
        followupSpecialization.isFinancialDebtCollection,
        followupSpecialization.showFinancialGuarantorRequestOnly,
        remainingBalanceForSeizure,
        settlementGuarantorGate.pendingSettlement,
        settlementGuarantorGate.settlementBreachTriggeredAt,
        viewExecutionData,
    ]);

    const effectiveFollowupSectionTabOrder = useMemo(
        () =>
            (followupSectionTabOrder as readonly string[]).filter(
                (tabId) =>
                    tabId !== 'seizure_requests' ||
                    (!seizureMatrix.hideSeizureTab &&
                        !followupSpecialization.hideFollowupSeizureRequestsTab)
            ),
        [
            followupSectionTabOrder,
            seizureMatrix.hideSeizureTab,
            followupSpecialization.hideFollowupSeizureRequestsTab,
        ]
    );

    const effectiveFollowupModalTabs = useMemo(
        () =>
            followupModalTabs.filter(
                (tab) => {
                    if (followupTabsRestricted && !restrictedFollowupTabIds.has(tab.id)) {
                        return false;
                    }
                    return (
                        tab.id !== 'seizure_requests' ||
                        (!seizureMatrix.hideSeizureTab &&
                            !followupSpecialization.hideFollowupSeizureRequestsTab)
                    );
                }
            ),
        [
            followupModalTabs,
            seizureMatrix.hideSeizureTab,
            followupSpecialization.hideFollowupSeizureRequestsTab,
            followupTabsRestricted,
            restrictedFollowupTabIds,
        ]
    );

    const openSeizureRequestsTab = useCallback(() => {
        if (seizureMatrix.hideSeizureTab || followupSpecialization.hideFollowupSeizureRequestsTab) {
            showToast(
                followupSpecialization.hideFollowupSeizureRequestsTab
                    ? 'تبويب الحجز غير متاح في مطالبات المشاهدة والاستصحاب'
                    : seizureMatrix.ruleId === 'rule_0_government'
                      ? 'المدين جهة حكومية — الحجز معطّل (حصانة الدولة)'
                      : 'لا يوجد رصيد متبٍّ — تبويب الحجز غير متاح',
                'info'
            );
            return;
        }
        setUnifiedModalTab('seizure_requests');
    }, [seizureMatrix, followupSpecialization.hideFollowupSeizureRequestsTab, showToast]);
    openSeizureRequestsTabRef.current = openSeizureRequestsTab;

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (followupTabsRestricted && !restrictedFollowupTabIds.has(unifiedModalTab)) {
            setUnifiedModalTab(
                hideCoerciveTabsForDebtorAgent ? 'other_party' : 'correspondences'
            );
            return;
        }
        if (unifiedModalTab !== 'seizure_requests') return;
        if (!seizureMatrix.hideSeizureTab && !followupSpecialization.hideFollowupSeizureRequestsTab) return;
        const fallback = (effectiveFollowupSectionTabOrder[0] ?? 'correspondences') as typeof unifiedModalTab;
        setUnifiedModalTab(fallback);
    }, [
        showUnifiedExecutionModal,
        unifiedModalTab,
        seizureMatrix.hideSeizureTab,
        followupSpecialization.hideFollowupSeizureRequestsTab,
        effectiveFollowupSectionTabOrder,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        hideCoerciveTabsForDebtorAgent,
    ]);

    const {
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
    } = useExecutionFlags(
        executionData,
        debtorNotificationDate,
        effectiveDebtors,
        claimType,
        isNonFinancialClaim,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
    );
    
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
    } = useGracePeriodCalculations(
        executionData,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
    );

    useEffect(() => {
        if (executionData?.eviction_voluntary_period_end_declared === true) {
            setVoluntaryEndOptimistic(false);
        }
    }, [executionData?.eviction_voluntary_period_end_declared]);

    useEffect(() => {
        if (executionData?.notice_voluntary_period_end_declared === true) {
            setNoticeVoluntaryPeriodEndOptimistic(false);
        }
    }, [executionData?.notice_voluntary_period_end_declared]);

    const unifiedCollectionApproved = useMemo(
        () => hasApprovedUnifiedCollection(String(executionData?.id ?? executionId ?? '')),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const {
        forcedSummoningAnalysis,
        shouldCalculateExecutionFee,
        calculatedExecutionFee,
        totalWithExecutionFee,
        remaining,
        isInBreach,
    } = useForcedSummoningAndFees(
        executionData,
        effectiveDebtors,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup,
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        debtorNotificationDate,
        activeTimelineEventsDebtorScoped,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        manualGraceCalendarExtra,
        notificationCount,
        voluntaryEndOptimistic,
        initiator,
        daysSinceNoticeCalculated,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
    );

    const otherPartyCreditorMirrorProps = useMemo(() => {
        if (!isRepresentingDebtor) return null;
        return {
            executionId: decisionsStorageExecutionId ?? executionId,
            claimType: String(claimType || '').trim(),
            flags: {
                ...followupSpecializationEffective,
                showPersonalCoerciveFollowupTab,
                showGuarantorInSeizureTab: showGuarantorInSeizureFollowupTab,
                isPersonalStatusExecutionClaim,
                isAlimonyClaim: isAlimonyClaimType,
                activeDebtorIsEmployee,
                isCustodyRemovalClaim: custodyRemovalClaimActive,
                showHiddenExecutiveDossierPresentation:
                    !followupSpecializationEffective.hidePersonalJudgePresentation &&
                    !employeeCoerciveDetentionRestricted &&
                    remainingBalanceForSeizure > 0,
            },
            guarantorCtx: {
                executionData: viewExecutionData,
                settlementBreachTriggeredAt: settlementGuarantorGate.settlementBreachTriggeredAt,
                ledgerPendingSettlement: settlementGuarantorGate.pendingSettlement,
                financialCenterTotalIqd: remainingBalanceForSeizure,
                activeDebtorIsDeceased,
                activeDebtorIsEmployee,
            },
            activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
            primaryDebtorKey: primaryDebtorKeyResolved,
            remainingBalanceIqd: remainingBalanceForSeizure,
            executionData: viewExecutionData,
            activeDebtorIsDeceased,
            mirrorWorkflow: {
                executionId: String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined,
                executionData: viewExecutionData,
                activeDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
                primaryDebtorKey: primaryDebtorKeyResolved,
                forcedSummoningCanForce: forcedSummoningAnalysis.canForceSummon,
                hidePersonalForcedBringActivation:
                    followupSpecialization.hidePersonalForcedBringActivation,
                hideDossierJudgePresentation: followupSpecialization.hidePersonalJudgePresentation,
                personalTabLockedForEmployee,
                showPersonalCoerciveFollowupTab,
                debtRemainingIqd: remaining,
                activeDebtorIsEmployee,
                activeDebtorIsDeceased,
            },
            debtorAgentManualTrack: true,
        };
    }, [
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        executionId,
        claimType,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        activeDebtorIsEmployee,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate.settlementBreachTriggeredAt,
        settlementGuarantorGate.pendingSettlement,
        activeDebtorIsDeceased,
        assignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        forcedSummoningAnalysis.canForceSummon,
        personalTabLockedForEmployee,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remaining,
    ]);

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
    const coerciveUiLocked = executionPaused || isPaused || stayOfExecutionActive;
    /** ذمة مقسومة: المدين النشط في تبويب محضر المتابعة أوفى حصته */
    const dividedActiveDebtorCleared =
        !activeDebtorSolidary &&
        allDebtorsUnified.length > 1 &&
        Boolean(allDebtorsUnified[executionDebtorTabIndex]?.cleared);
    /** تعطيل أزرار الحجز/الإجراء الجبري داخل محضر المتابعة عند إيقاف الإضبارة أو براءة ذمة التبويب */
    const executionCoerciveButtonDisabled = coerciveUiLocked || dividedActiveDebtorCleared;

    const dossierStatusUi = dossierLifecycleRow?.dossierStatus ?? 'active';
    const coerciveDossierLocked = dossierStatusUi !== 'active';
    /**
     * محضر المتابعة والأدوات الجبرية: تُقفَل فقط عند الإيقاف/الاستئخار — لا تُعطَّل لمجرد انتهاء الإضبارة
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
    
    
    // 🆕 V15: AUTO-SYNC gracePeriodEnded WITH STATE MACHINE
    // Instead of manual button click, automatically sync with calculated status
    useEffect(() => {
        const shouldBeEnded = executionStatus === 'READY_FOR_COERCIVE';
        if (shouldBeEnded && !gracePeriodEnded) {
            setGracePeriodEnded(true);
            setGracePeriodActive(false);
        }
    }, [executionStatus, gracePeriodEnded]);
    
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
    
    // ===========================
    // STATUTE OF LIMITATIONS WARNING
    // ===========================
    React.useEffect(() => {
        if (statuteStatus && statuteStatus.isCritical && !showStatuteWarning && !isAlimonyClaim) {
            setShowStatuteWarning(true);
        }
    }, [statuteStatus, showStatuteWarning, isAlimonyClaim]);
    
    // ✅ CRITICAL PERFORMANCE FIX: Removed heavy useEffect that was causing 12s+ render time
    // Instead, save data manually when needed (onClose, on specific actions)
    // This prevents infinite re-renders caused by timeline/state updates
    
    // 🚀 OPTIMIZED: Save data only when closing or on specific actions
    const saveExecutionData = useCallback(() => {
        const persistKey = String(executionData?.id ?? executionId ?? '');
        if (!persistKey || persistKey === 'undefined') return;
        
        try {
            const updatedData = {
                ...executionData,
                debtorNotificationDate,
                debtor_summons_marker: debtorSummonsMarkerLocal,
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
                eviction_vacate_deadline: evictionVacateDeadlineLocal,
                eviction_residential_grace_period_start: evictionResidentialGracePeriodStart,
                eviction_executor_vacate_grant_approved: evictionExecutorVacateGrantApproved,
                eviction_residential_grace_manually_ended_at: evictionResidentialGraceManuallyEndedAt,
                eviction_assets_tab_unlocked: evictionAssetsTabUnlocked,
                eviction_case_expenses: evictionCaseExpenses,
                encroachment_case_expenses: encroachmentCaseExpenses,
                specific_delivery_case_expenses: specificDeliveryCaseExpenses,
                eviction_lawyer_fee_requested: executionData.eviction_lawyer_fee_requested,
                eviction_lawyer_fee_waived_at_intake: executionData.eviction_lawyer_fee_waived_at_intake,
                eviction_voluntary_period_end_declared: executionData.eviction_voluntary_period_end_declared,
                eviction_earner_fee_collection_sm: earnerFeeCollectionSm,
                execution_memo_anchor_date: executionData.execution_memo_anchor_date,
                notice_voluntary_period_end_declared: executionData.notice_voluntary_period_end_declared,
            };
            
            // Use storageCache for better performance
            storageCache.set(executionStorageKey(String(persistKey)), updatedData);
        } catch (error) {
            debug.error('Failed to save execution data:', error);
        }
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
        debtorSummonsMarkerLocal,
        executionData?.execution_memo_anchor_date,
        executionData?.notice_voluntary_period_end_declared]);
    
    // Save on unmount
    useEffect(() => {
        return () => {
            saveExecutionData();
        };
    }, [saveExecutionData]);
    

	useEffect(() => {
		const appts = (timelineEventsRef.current || []).filter((ev: any) => String(ev?.type || '') === 'appointment');
		const ymdOf = (ev: any): string => {
			const raw = String(ev?.date || '').trim();
			const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
			return m ? m[0] : '';
		};
		const titleOf = (ev: any): string => {
			const t = String(ev?.title || '').trim();
			return t.replace(/^📅\s*/, '').trim() || 'موعد';
		};
		for (const ev of appts) {
			const ymd = ymdOf(ev);
			if (!ymd || ymd < todayYmd) continue;
			const daysUntil = Math.max(0, evictionInclusiveCalendarDays(todayYmd, ymd) - 1);
			if (daysUntil > 1) continue;
			const key = String((ev as any).id || `${ymd}-${titleOf(ev)}`);
			const toastSig = `hami:apptReminder:${executionData?.id ?? executionId ?? 'x'}:${key}:${todayYmd}`;
			try {
				if (SecureStoreService.getItemSync(toastSig)) continue;
				SecureStoreService.setItemSync(toastSig, '1');
			} catch {
				/* ignore */
			}
			showToastRef.current(`موعد قريب: ${titleOf(ev)} — ${ymd}`, 'info');
		}
	}, [todayYmd, executionData?.id, executionId, setShowTimelineModal, setActiveTimelineFilter]);

    useEffect(() => {
        if (!evictionGraceBadgeInfo) return;
        const rem = Number(evictionGraceBadgeInfo.remainingDays ?? 0);
        if (!Number.isFinite(rem) || rem <= 0 || rem > 2) return;
        const persistKey = String(executionData?.id ?? executionId ?? '').trim();
        if (!persistKey) return;
        const today = getLocalTodayYmd();
        const k = `eviction-grace-reminder:${persistKey}:${evictionGraceBadgeInfo.endYmd}`;
        try {
            const last = String(SecureStoreService.getItemSync(k) || '').trim();
            if (last === today) return;
            SecureStoreService.setItemSync(k, today);
        } catch {
            /* ignore */
        }
        showToast(
            `⏳ تنبيه: تبقى ${rem} ${rem === 1 ? 'يوم' : 'أيام'} على انتهاء المهلة (${evictionGraceBadgeInfo.endYmd})`,
            'warning'
        );
    }, [
        evictionGraceBadgeInfo?.endYmd,
        evictionGraceBadgeInfo?.remainingDays,
        executionData?.id,
        executionId,
        showToast,
    ]);

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

    useEffect(() => {
        if (!executionData?.id) return;
        const execId = String(executionData.id || '');
        const scopedInput =
            isInabaSubFileId(execId) && activeSubFileId
                ? filterTimelineEventsForInabaDossier(timelineEvents, activeSubFileId)
                : parentDossierId
                  ? filterTimelineEventsForParentDossier(timelineEvents, parentDossierId)
                  : timelineEvents;
        const cleaned = dedupeTimelineEventsForDisplay(scopedInput);
        const sig = cleaned
            .map(
                (e) =>
                    `${String(e.id)}:${String(e.type || '')}:${String(e.title || '')}:${
                        String(e.timestamp || e.date || '')
                    }:${String(e.trashedAt || '')}:${e.isPinned ? '1' : '0'}`
            )
            .join('|');
        if (sig === timelineDedupeSigRef.current) return;
        const rawSig = (timelineEvents || [])
            .map(
                (e) =>
                    `${String(e.id)}:${String(e.type || '')}:${String(e.title || '')}:${
                        String((e as any).timestamp || (e as any).date || '')
                    }:${String((e as any).trashedAt || '')}:${(e as any).isPinned ? '1' : '0'}`
            )
            .join('|');
        if (sig === rawSig) {
            timelineDedupeSigRef.current = sig;
            return;
        }
        timelineDedupeSigRef.current = sig;
        setTimelineEvents(cleaned);
        persistExecutionMerge({ timelineEvents: cleaned });
    }, [executionData?.id, persistExecutionMerge, timelineEvents, activeSubFileId, parentDossierId]);

    useEffect(() => {
        const myId = String(executionData?.id ?? executionId ?? '');
        if (!myId) return;

        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; decisionId?: string; subtype?: string }>;
            if (String(ce.detail?.executionId ?? '') !== myId) return;
            const decisionId = String(ce.detail?.decisionId ?? '').trim();
            const subtype = String(ce.detail?.subtype ?? '').trim();
            if (!decisionId || !subtype) return;

            if (subtype === 'property') {
                return;
            }

            const alreadyDraft = Boolean(seizureDraftsByDecisionIdRef.current?.[decisionId]);
            if (alreadyDraft) return;
            const alreadyAsset = seizedAssetsSnapshotRef.current.some(
                (a) =>
                    String((a.details as Record<string, unknown> | undefined)?.decisionRowId ?? '') ===
                    decisionId
            );
            if (alreadyAsset) return;

            const actionType =
                subtype === 'movable' || subtype === 'movable_auction'
                    ? 'vehicle'
                    : subtype === 'salary'
                      ? 'salary'
                      : 'property';

            const baseDesc =
                actionType === 'salary'
                    ? 'طلب حجز راتب (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                    : actionType === 'vehicle'
                      ? 'طلب حجز مال منقول (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                      : subtype === 'notice'
                        ? 'طلب وضع إشارة الحجز التنفيذي (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                        : 'طلب حجز عقار (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.';

            const details: Record<string, string> = {
                seizureUiKind: actionType,
                decisionRowId: decisionId,
                employerName: '',
                salaryAmount: '',
                propertyAddress: '',
                propertyLocation: '',
                vehicleDescription: '',
                vehiclePlate: '',
                movableAssetType: '',
                movableDescription: '',
                movableLocation: '',
                judicialCustodianName: '',
                description: baseDesc,
            };

            const dayYmd = getLocalTodayYmd();
            const draft: SeizedAsset = {
                id: `draft_${decisionId}`,
                type:
                    subtype === 'notice'
                        ? 'طلب وضع إشارة الحجز التنفيذي (قيد البت)'
                        : actionType === 'salary'
                          ? 'طلب حجز راتب (قيد البت)'
                          : actionType === 'vehicle'
                            ? 'طلب حجز مال منقول (قيد البت)'
                            : 'طلب حجز عقار (قيد البت)',
                details,
                status: 'pending',
                seizureDate: dayYmd,
            };

            const label =
                subtype === 'notice'
                    ? 'طلب وضع إشارة الحجز التنفيذي'
                    : actionType === 'salary'
                      ? 'طلب حجز راتب'
                      : actionType === 'vehicle'
                        ? 'طلب حجز مال منقول'
                        : 'طلب حجز عقار';
            const now = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: now,
                timestamp: now,
                title: `📋 ${label} — قيد البت`,
                description: baseDesc,
                type: 'coercive',
                source: 'التنفيذ والمحجوزات',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            };

            setSeizureDraftsByDecisionId((prev) => {
                const next = { ...prev, [decisionId]: draft };
                setTimelineEvents((tlPrev) => {
                    const nextTl = [ev, ...tlPrev];
                    persistExecutionMerge({ seizureDraftsByDecisionId: next, timelineEvents: nextTl });
                    return nextTl;
                });
                return next;
            });
        };

        window.addEventListener('hami-seizure-request-created', handler as EventListener);
        return () => window.removeEventListener('hami-seizure-request-created', handler as EventListener);
    }, [executionData?.id, executionId, nextTimelineId, persistExecutionMerge]);

    /** مزامنة موافقة الكفيل من تخزين «القرارات» إلى الملف — إذا فشل الوسيط أو أُغلق المودال قبل الدمج */
    useEffect(() => {
        if (!executionData) return;
        const patch = computeGuarantorApprovalMergePatch(
            decisionsStorageExecutionId,
            executionData
        );
        if (!patch || Object.keys(patch).length === 0) return;
        persistExecutionMerge(patch);
    }, [
        decisionsReloadEpoch,
        decisionsStorageExecutionId,
        executionData?.id,
        executionData?.guarantor_followup,
        persistExecutionMerge,
    ]);
    useEffect(() => {
        if (!activeDebtorIsDeceased) return;
        if (
            activeCoerciveActions.length === 0 &&
            !debtorArrested &&
            !investigationPathDebtorPresent &&
            !executionData?.forced_bring_in_personal_outcome &&
            !executionData?.forced_bring_in_personal_followup_logged
        ) {
            return;
        }
        setActiveCoerciveActions([]);
        setDebtorArrested(false);
        setInvestigationPathDebtorPresent(false);
        persistExecutionMerge({
            activeCoerciveActions: [],
            debtorArrested: false,
            investigationPathDebtorPresent: false,
            forced_bring_in_personal_outcome: null,
            forced_bring_in_personal_followup_logged: false,
        });
    }, [
        activeDebtorIsDeceased,
        activeCoerciveActions,
        debtorArrested,
        investigationPathDebtorPresent,
        executionData?.forced_bring_in_personal_outcome,
        executionData?.forced_bring_in_personal_followup_logged,
        persistExecutionMerge,
    ]);

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

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{
                executionId?: string;
                event?: Omit<TimelineEvent, 'id'>;
                mergePatch?: Record<string, unknown>;
            }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            const myId = String(executionData?.id ?? executionId ?? '').trim();
            const storeId = String(decisionsStorageExecutionId ?? '').trim();
            if (!evId || (evId !== myId && evId !== storeId)) return;
            const payload = ce.detail?.event;
            if (!payload) return;
            pushTimelineEventRef.current?.(
                { ...payload, id: nextTimelineId() },
                ce.detail?.mergePatch ? { mergePatch: ce.detail.mergePatch } : undefined
            );
        };
        window.addEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
        return () =>
            window.removeEventListener(HAMI_APPEND_EXECUTION_TIMELINE, handler as EventListener);
    }, [executionData?.id, executionId, decisionsStorageExecutionId, nextTimelineId]);

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

    const saveThirdPartySeizureForDecision = useCallback(
        (input: {
            decisionId: string;
            thirdPartyName: string;
            requestedAmountIqd: number;
            notificationDateIso: string;
        }) => {
            const decisionId = String(input.decisionId || '').trim();
            if (!decisionId) return;
            const draft = {
                thirdPartyName: input.thirdPartyName,
                requestedAmountIqd: input.requestedAmountIqd,
                notificationDateIso: input.notificationDateIso,
            };
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = (executionDataRef.current?.thirdPartySeizures || []) as ThirdPartySeizure[];
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const entityId = String(existing?.id || `tps_${decisionId}_${Date.now()}`);
            const nextRow = {
                id: entityId,
                decisionRowId: decisionId,
                thirdPartyName: String(draft.thirdPartyName || '').trim(),
                requestedAmountIqd:
                    typeof draft.requestedAmountIqd === 'number' && Number.isFinite(draft.requestedAmountIqd)
                        ? Math.max(0, Math.trunc(draft.requestedAmountIqd))
                        : null,
                notificationDateIso: String(draft.notificationDateIso || '').trim() ? String(draft.notificationDateIso).trim() : null,
                replyStatus: existing?.replyStatus || 'pending',
                transferredAmountIqd:
                    typeof existing?.transferredAmountIqd === 'number' && Number.isFinite(existing.transferredAmountIqd)
                        ? Math.max(0, Math.trunc(existing.transferredAmountIqd))
                        : null,
                status: existing?.status || 'notified',
            };
            const nextSeizures: ThirdPartySeizure[] = [nextRow as ThirdPartySeizure, ...prev.filter((a) => String(a.id || '') !== entityId)];
            setThirdPartySeizuresUi(nextSeizures);

            try {
                const decisionRow = getExecutorDecisionRowById(decisionsStorageExecutionId, decisionId) as any;
                const rawJson = String(decisionRow?.seizurePayloadJson || '').trim();
                const updatedPayloadJson = (() => {
                    try {
                        const prevJson = rawJson ? (JSON.parse(rawJson) as any) : {};
                        return JSON.stringify({
                            ...prevJson,
                            thirdPartySeizureId: entityId,
                            thirdPartyName: nextRow.thirdPartyName,
                            requestedAmountIqd: nextRow.requestedAmountIqd,
                            notificationDateIso: nextRow.notificationDateIso,
                        });
                    } catch {
                        return JSON.stringify({
                            thirdPartySeizureId: entityId,
                            thirdPartyName: nextRow.thirdPartyName,
                            requestedAmountIqd: nextRow.requestedAmountIqd,
                            notificationDateIso: nextRow.notificationDateIso,
                        });
                    }
                })();
                const amountLabel =
                    typeof nextRow.requestedAmountIqd === 'number' && nextRow.requestedAmountIqd > 0
                        ? `${nextRow.requestedAmountIqd.toLocaleString('ar-IQ')} د.ع`
                        : '—';
                patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
                    seizureRequestSavedAt: nowIso,
                    seizureRequestDetails: [
                        `الجهة: ${nextRow.thirdPartyName || '—'}`,
                        `المبلغ المطلوب حجزه: ${amountLabel}`,
                        nextRow.notificationDateIso ? `تاريخ التبليغ: ${String(nextRow.notificationDateIso).slice(0, 10)}` : null,
                    ]
                        .filter(Boolean)
                        .join('\n'),
                    seizurePayloadJson: updatedPayloadJson,
                });
            } catch {
                /* ignore */
            }

            const requested =
                typeof nextRow.requestedAmountIqd === 'number' &&
                Number.isFinite(nextRow.requestedAmountIqd) &&
                nextRow.requestedAmountIqd > 0
                    ? `${nextRow.requestedAmountIqd.toLocaleString('ar-IQ')} د.ع`
                    : '—';

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: '📨 حجز مال المدين لدى الغير — تم التبليغ',
                    description: `الجهة: ${nextRow.thirdPartyName}\nالمبلغ المطلوب حجزه: ${requested}${nextRow.notificationDateIso ? `\nتاريخ التبليغ: ${String(nextRow.notificationDateIso).slice(0, 10)}` : ''}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — حجز لدى الغير',
                    metadata: {
                        timelineThreadKey: `third_party_seizure:${decisionId}`,
                        decisionRowId: decisionId,
                        thirdPartySeizureId: entityId,
                    },
                },
                { mergePatch: { thirdPartySeizures: nextSeizures } as any }
            );
            showToast('تم إنشاء مسار الحجز لدى الغير بحالة (تم التبليغ).', 'success');
        },
        [decisionsStorageExecutionId, getLocalTodayYmd, nextTimelineId, pushTimelineEvent, showToast]
    );

    const saveStandaloneExecutionMarkForDecision = useCallback(
        (input: {
            decisionId: string;
            markType: string;
            targetEntity: string;
            markDetails: string;
            letterDetails: string;
        }) => {
            const decisionId = String(input.decisionId || '').trim();
            const markType = String(input.markType || '').trim();
            const targetEntity = String(input.targetEntity || '').trim();
            const markDetails = String(input.markDetails || '').trim();
            const letterDetails = String(input.letterDetails || '').trim();
            if (!decisionId) {
                showToast('معرّف القرار غير متوفر.', 'warning');
                return;
            }
            if (!markType || !targetEntity || !markDetails) {
                showToast('أكمل نوع الشارة والجهة المستهدفة وتفاصيل القيد.', 'warning');
                return;
            }
            const exId = String(
                decisionsStorageExecutionId ?? executionDataRef.current?.id ?? executionId ?? ''
            ).trim();
            if (!exId || exId === 'undefined') {
                showToast('معرّف ملف التنفيذ غير متوفر.', 'warning');
                return;
            }
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();
            const prev = standaloneExecutionMarksSnapshotRef.current;
            const existing = prev.find((a) => String(a.decisionRowId || '').trim() === decisionId) || null;
            const nextRow: StandaloneExecutionMark = {
                id: existing?.id || `mk_${decisionId}_${Date.now()}`,
                decisionRowId: decisionId,
                markType,
                targetEntity,
                markDetails,
                letterDetails,
                isMarkConfirmed: existing?.isMarkConfirmed || false,
                status: existing?.status || 'active',
                record_locked: existing?.record_locked || false,
                archived_at_ymd: existing?.archived_at_ymd ?? null,
            };
            const nextMarks = [...prev.filter((a) => a.id !== nextRow.id), nextRow];
            setStandaloneExecutionMarks(nextMarks);
            standaloneExecutionMarksSnapshotRef.current = nextMarks;

            const seizureRequestDetails = [
                `النوع: ${markType}`,
                `الجهة: ${targetEntity}`,
                letterDetails ? `الكتاب: ${letterDetails}` : null,
                `التفاصيل: ${markDetails}`,
            ]
                .filter(Boolean)
                .join('\n');
            const seizurePayloadJson = JSON.stringify({
                standaloneMarkId: nextRow.id,
                markType,
                targetEntity,
                markDetails,
                letterDetails,
            });
            const decisionPatch = {
                seizureRequestSavedAt: nowIso,
                seizureRequestDetails,
                seizurePayloadJson,
            };

            persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
            patchExecutorDecisionRow(exId, decisionId, decisionPatch);
            patchExecutorDecisionRowEverywhere(decisionId, decisionPatch);

            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: today,
                    timestamp: nowIso,
                    title: '📌 تعميم/حجز احتياطي — بدء الإجراء',
                    description: `النوع: ${nextRow.markType}\nالجهة: ${nextRow.targetEntity}${nextRow.letterDetails ? `\nالكتاب: ${nextRow.letterDetails}` : ''}\nالتفاصيل: ${nextRow.markDetails}`,
                    type: 'coercive',
                    source: 'محضر المتابعة — الشارة التنفيذية',
                    metadata: {
                        timelineThreadKey: `standalone_mark:${decisionId}`,
                        decisionRowId: decisionId,
                        markId: nextRow.id,
                    },
                },
                { mergePatch: { standaloneExecutionMarks: nextMarks } }
            );

            try {
                window.dispatchEvent(
                    new CustomEvent('hami-execution-decision-outcome', {
                        detail: {
                            executionId: exId,
                            decisionId,
                            outcome: 'approved',
                            requestKind: 'seizure',
                        },
                    })
                );
            } catch {
                /* ignore */
            }

            showToast('تم حفظ الشارة التنفيذية وربطها بالسجل', 'success');
        },
        [
            decisionsStorageExecutionId,
            executionId,
            getLocalTodayYmd,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ]
    );

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

    const applyDossierLifecycleToFileAndTimeline = useCallback(
        (status: DossierLifecycleStatus, reason: string, date: string) => {
            const r = reason.trim();
            const d = date.trim();
            const persistKey = String(executionData?.id ?? executionId ?? '');
            if (!persistKey || persistKey === 'undefined') return false;
            if (status !== 'active' && (!r || !d)) {
                showToast('أدخل السبب والتاريخ لاعتماد الحالة.', 'warning');
                return false;
            }
            const label = dossierLifecycleLabelAr(status);
            const iso = new Date().toISOString();
            const day = iso.slice(0, 10);
            const baseEx = executionDataRef.current;
            const lifecycleSnap = buildExecutionTimelineSnapshot({
                executionData: baseEx
                    ? {
                          ...baseEx,
                          dossier_lifecycle_status: status,
                          dossier_status_reason: status === 'active' ? '' : r,
                          dossier_status_date: status === 'active' ? '' : d,
                      }
                    : null,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: day,
                timestamp: iso,
                title: `📋 حالة الإضبارة: ${label}`,
                description:
                    status === 'active'
                        ? 'أُعيدت الإضبارة إلى الحالة النشطة.'
                        : `السبب:\n${r}\n\nالتاريخ: ${d}`,
                type: 'procedure',
                source: 'رأس الإضبارة',
                snapshot: lifecycleSnap,
            };
            setTimelineEvents((prev) => {
                const next = [ev, ...prev];
                queueMicrotask(() => {
                    persistExecutionMerge({
                        dossier_lifecycle_status: status,
                        dossier_status_reason: status === 'active' ? '' : r,
                        dossier_status_date: status === 'active' ? '' : d,
                        timelineEvents: next,
                    });
                    const execId = String(baseEx?.id ?? executionId ?? '');
                    if (execId && execId !== 'undefined') {
                        void import('@/app/services/timelineEventsSupabase')
                            .then(({ insertTimelineEventToSupabase }) =>
                                insertTimelineEventToSupabase({
                                    executionFileId: execId,
                                    event: ev,
                                    snapshotData: lifecycleSnap,
                                })
                            )
                            .catch(() => {});
                    }
                });
                return next;
            });
            if (dossierFileKey && dossierFileKey !== 'undefined') {
                reconcileDossierLifecycle(dossierFileKey, {
                    ...(executionData ?? {}),
                    dossier_lifecycle_status: status,
                    dossier_status_reason: status === 'active' ? '' : r,
                    dossier_status_date: status === 'active' ? '' : d,
                } as ExecutionFile);
            }
            if (status === 'active') {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
            showToast('تم حفظ الحالة وتسجيلها في السجل الزمني.', 'success');
            return true;
        },
        [
            dossierFileKey,
            executionData,
            executionId,
            nextTimelineId,
            persistExecutionMerge,
            reconcileDossierLifecycle,
            showToast,
        ]
    );

    const closeDossierLifecyclePanel = useCallback(() => {
        setDossierLifecyclePanelOpen(false);
        setDossierLifecyclePanelPhase('menu');
        setDossierPendingStatus(null);
    }, []);

    const handleDossierLifecyclePick = useCallback(
        (picked: DossierLifecycleStatus) => {
            if (picked === 'active') {
                const ok = applyDossierLifecycleToFileAndTimeline('active', '', '');
                if (ok) closeDossierLifecyclePanel();
                return;
            }
            const committed = normalizeDossierLifecycleStatus(executionData?.dossier_lifecycle_status);
            setDossierPendingStatus(picked);
            setDossierLifecyclePanelPhase('details');
            if (picked === committed) {
                setDossierReasonDraft(String(executionData?.dossier_status_reason ?? '').trim());
                setDossierDateDraft(String(executionData?.dossier_status_date ?? '').slice(0, 10));
            } else {
                setDossierReasonDraft('');
                setDossierDateDraft('');
            }
        },
        [applyDossierLifecycleToFileAndTimeline, closeDossierLifecyclePanel, executionData]
    );

    const handleDossierLifecycleConfirmDetails = useCallback(() => {
        if (!dossierPendingStatus || dossierPendingStatus === 'active') return;
        const ok = applyDossierLifecycleToFileAndTimeline(
            dossierPendingStatus,
            dossierReasonDraft,
            dossierDateDraft
        );
        if (ok) closeDossierLifecyclePanel();
    }, [
        applyDossierLifecycleToFileAndTimeline,
        closeDossierLifecyclePanel,
        dossierDateDraft,
        dossierPendingStatus,
        dossierReasonDraft,
    ]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (dossierLifecyclePopoverRef.current?.contains(t)) return;
            if (dossierLifecyclePanelPortalRef.current?.contains(t)) return;
            closeDossierLifecyclePanel();
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useEffect(() => {
        if (!dossierLifecyclePanelOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDossierLifecyclePanel();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [dossierLifecyclePanelOpen, closeDossierLifecyclePanel]);

    useLayoutEffect(() => {
        if (!dossierLifecyclePanelOpen) {
            setDossierLifecyclePopStyle(null);
            return;
        }
        let raf = 0;
        const update = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = dossierLifecyclePopoverRef.current;
                if (!el) return;
                const r = el.getBoundingClientRect();
                const vw = document.documentElement.clientWidth;
                const margin = 12;
                const maxPanelW = Math.min(304, vw - 2 * margin);
                const w = Math.min(maxPanelW, Math.max(224, r.width));
                const desiredLeft = r.right - w;
                let left = desiredLeft;
                if (left < margin) left = margin;
                if (left + w > vw - margin) left = Math.max(margin, vw - margin - w);
                setDossierLifecyclePopStyle({
                    top: r.bottom + 6,
                    left,
                    width: w,
                });
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [dossierLifecyclePanelOpen, dossierLifecyclePanelPhase, dossierStatusDraft]);

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

    const ACTION_TITLE_MAP: Record<DossierActionType, string> = {
        delegation: 'طلب الإنابة التنفيذية',
        unify: 'طلب توحيد الأضابير',
        transfer: 'طلب نقل الإضبارة',
        renew: 'طلب تجديد الإضبارة',
        inaba_correspondence: 'طلب مخاطبة مديرية الانابة',
    };

    const handleDossierAction = useCallback((payload: DossierActionPayload): boolean => {
        const today = getLocalTodayYmd();
        const title = ACTION_TITLE_MAP[payload.actionType];
        const contentParts: string[] = [];

        if (payload.actionType === 'delegation') {
            contentParts.push(`الدائرة المناب إليها: ${payload.delegationTargetDirectorate}`);
            contentParts.push(`الغاية من الإنابة: ${payload.delegationPurpose}`);
        } else if (payload.actionType === 'inaba_correspondence') {
            contentParts.push(`مديرية الإنابة: ${payload.inabaCorrespondenceDirectorate}`);
            contentParts.push(`موضوع المخاطبة: ${payload.inabaCorrespondenceSubject}`);
        } else if (payload.actionType === 'unify') {
            contentParts.push(`معرف الإضبارة: ${payload.unificationTargetId}`);
            if (payload.unificationTargetMeta?.fileNumber) {
                contentParts.push(`رقم الإضبارة: ${payload.unificationTargetMeta.fileNumber}`);
            }
            if (payload.unificationTargetMeta?.fileYear) {
                contentParts.push(`السنة: ${payload.unificationTargetMeta.fileYear}`);
            }
            if (payload.unificationTargetMeta?.directorate) {
                contentParts.push(`المديرية: ${payload.unificationTargetMeta.directorate}`);
            }
        } else if (payload.actionType === 'transfer') {
            contentParts.push(`الدائرة المراد النقل إليها: ${payload.transferTargetDirectorate}`);
        } else if (payload.actionType === 'renew') {
            contentParts.push(`سبب التجديد: ${payload.renewalReason}`);
        }

        const fullContent = `${title}\n${contentParts.join('\n')}`;
        if (payload.actionType === 'inaba_correspondence') {
            if (!String(payload.inabaCorrespondenceSubFileId || '').trim()) {
                showToast('تعذر إرسال الطلب: لا توجد إنابة نشطة لهذه الإضبارة.', 'warning');
                setDossierActionModalSaving(false);
                return false;
            }
            if (!String(payload.inabaCorrespondenceSubject || '').trim()) {
                showToast('أدخل موضوع المخاطبة', 'warning');
                setDossierActionModalSaving(false);
                return false;
            }
        }
        if (payload.actionType === 'transfer') {
            if (!String(payload.transferTargetDirectorate || '').trim()) {
                showToast('أدخل اسم المديرية المراد نقل الإضبارة إليها', 'warning');
                setDossierActionModalSaving(false);
                return false;
            }
        }
        if (payload.actionType === 'unify') {
            if (!String(payload.unificationTargetId || '').trim()) {
                showToast('اختر الإضبارة المراد دمجها', 'warning');
                setDossierActionModalSaving(false);
                return false;
            }
        }

        const payloadJson =
            payload.actionType === 'unify'
                ? JSON.stringify({
                      kind: 'unification',
                      v: 1,
                      targetType: 'own',
                      targetId: payload.unificationTargetId,
                      targetMeta: payload.unificationTargetMeta,
                  })
                : payload.actionType === 'inaba_correspondence'
                  ? JSON.stringify({
                        kind: 'inaba_correspondence',
                        v: 1,
                        inabaSubFileId: payload.inabaCorrespondenceSubFileId,
                        directorate: payload.inabaCorrespondenceDirectorate,
                        subject: payload.inabaCorrespondenceSubject,
                    })
                  : payload.actionType === 'transfer'
                    ? JSON.stringify({
                          kind: 'transfer',
                          v: 1,
                          targetDirectorate: payload.transferTargetDirectorate,
                      })
                  : undefined;

        const decisionId = appendSpecialFollowupRequest({
            executionId: decisionsStorageExecutionId,
            requestDate: today,
            content: fullContent,
            decisionTitle: title,
            ...(payloadJson ? { payloadJson } : {}),
        });
        if (!decisionId) {
            showToast(`يوجد طلب "${title}" مماثل قيد البت لدى المنفذ.`, 'warning', { decisionsLink: true });
            setDossierActionModalOpen(false);
            setDossierActionModalSaving(false);
            return false;
        }
        if (payload.actionType === 'inaba_correspondence') {
            const entry = createInabaCorrespondenceLogEntry({
                subFileId: String(payload.inabaCorrespondenceSubFileId || ''),
                directorate: String(payload.inabaCorrespondenceDirectorate || ''),
                subject: String(payload.inabaCorrespondenceSubject || ''),
                requestDate: today,
                decisionRowId: decisionId,
            });
            const prev = getInabaCorrespondenceLog(
                isInabaActive && parentExecutionFile
                    ? parentExecutionFile
                    : (executionData as ExecutionFile | null)
            );
            const next = [entry, ...prev];
            if (isInabaActive || isUnifiedTabActive) {
                patchParentInabaCorrespondenceLog(decisionsStorageExecutionId, () => next);
            } else {
                persistExecutionMerge({ inaba_correspondence_log: next });
            }
            setExecutionStorageTick((t) => t + 1);
        }
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: `${title} — قيد البت`,
            description: `بتاريخ ${today}:\n\n${fullContent}`,
            type: 'coercive',
            source: 'محضر المتابعة',
            metadata: {
                timelineThreadKey: `executor_decision:${decisionId}`,
                decisionRowId: decisionId,
                dossierActionPayload: payload,
            },
        });
        setDossierActionModalOpen(false);
        setDossierActionModalSaving(false);
        showToast(`تم إرسال "${title}" إلى القرارات والطعون بانتظار الموافقة.`, 'success');
        return true;
    }, [
        decisionsStorageExecutionId,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        setDossierActionModalOpen,
        setDossierActionModalSaving,
        isInabaActive,
        parentExecutionFile,
        executionData,
        isUnifiedTabActive,
        persistExecutionMerge,
    ]);

    const handleOpenDossierAction = useCallback((actionType: DossierActionType) => {
        setDossierActionModalType(actionType);
        setDossierActionModalOpen(true);
    }, []);

    const { runSubmit: runSpecialFollowupSubmit } = useStandardSubmit({
        validate: () => {
            const followupGate = isFollowupRequestKindAllowed(
                executionData as Record<string, unknown> | null | undefined,
                decisionsStorageExecutionId,
                'special_followup'
            );
            if (!followupGate.allowed) {
                dispatchDomainIsolationBlocked(followupGate.reasonAr, 'special_followup');
                return false;
            }
            const d = specialRequestDate.trim();
            if (!d) return false;
            return Boolean(specialRequestManualTitle.trim()) && Boolean(specialRequestContent.trim());
        },
        validationMessage: 'أكمل موضوع الطلب والتاريخ والتفاصيل',
        submit: () => {
            const d = specialRequestDate.trim();
            const content = specialRequestContent.trim();
            const title = specialRequestManualTitle.trim() || 'طلب يدوي';
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content: content || title,
                decisionTitle: title,
                payloadJson: JSON.stringify({
                    kind: 'manual_followup',
                    v: 1,
                }),
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return false;
            }
            const now = new Date().toISOString();
            const fullBody = `بتاريخ ${d}:\n\n${content || title}`;
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: `${title} — قيد البت`,
                description: fullBody,
                type: 'coercive',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            setSpecialRequestTemplatePick(SPECIAL_REQUEST_MANUAL_MODE);
            setSpecialRequestContent('');
            setSpecialRequestManualTitle('');
            setSpecialRequestDate(getLocalTodayYmd());
        },
        onClose: () => {},
        successMessage:
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ — افتح «القرارات والطعون» من الشريط عند الحاجة',
        showToast,
        successToastOptions: { decisionsLink: true },
    });

    const handleOtherPartyActionLogOnly = useCallback(
        (input: { date: string; content: string }): { ok: boolean } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر',
                description: content,
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
            });
            showToast('تم تسجيل التحرك في السجل الزمني.', 'success');
            return { ok: true };
        },
        [nextTimelineId, pushTimelineEvent, showToast]
    );

    const handleOtherPartyActionSubmitToDecisions = useCallback(
        (input: { date: string; content: string }): { ok: boolean; decisionId?: string } => {
            const d = String(input.date || '').trim();
            const content = String(input.content || '').trim();
            if (!d || !content) {
                showToast('أدخل تاريخ التحرك ومضمون الطلب', 'warning');
                return { ok: false };
            }
            const decisionId = appendSpecialFollowupRequest({
                executionId: decisionsStorageExecutionId,
                requestDate: d,
                content,
                appealRequestOrigin: 'debtor_side',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true });
                return { ok: false };
            }
            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: d,
                timestamp: now,
                title: 'تحرك الطرف الآخر — قيد البت',
                description: `بتاريخ ${d}:\n\n${content}`,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${decisionId}`, decisionRowId: decisionId },
            });
            showToast('تم حفظ التحرك في السجل.', 'success');
            return { ok: true, decisionId };
        },
        [
            decisionsStorageExecutionId,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleCreditorTrackSubmit = useCallback(
        (input: { optionId: string; label: string; date: string }): { ok: boolean; decisionId?: string } => {
            const storageId = String(
                decisionsStorageExecutionId ||
                    executionId ||
                    executionDataRef.current?.id ||
                    ''
            ).trim();
            const res = submitCreditorOtherPartyTrackToDecisions({
                executionId: storageId || undefined,
                optionId: input.optionId,
                label: input.label,
                requestDate: input.date,
            });
            if (!res.ok) {
                showToast('تعذّر إنشاء البطاقة — قد يوجد طلب مماثل قيد البت.', 'warning', {
                    decisionsLink: true,
                });
                return { ok: false };
            }
            pushTimelineEvent({
                id: nextTimelineId(),
                date: input.date,
                timestamp: new Date().toISOString(),
                title: `${input.label} — قيد البت`,
                description: `تقدّم وكيل الدائن — متابعة من جانب موكّل المدين.`,
                type: 'other_party',
                source: 'تحركات الطرف الآخر',
                metadata: {
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                    otherPartyTrackOptionId: input.optionId,
                },
            });
            showToast('تم إنشاء بطاقة في القرارات والطعون.', 'success', { decisionsLink: true });
            return res;
        },
        [decisionsStorageExecutionId, executionId, nextTimelineId, pushTimelineEvent, showToast]
    );

    const handleCreditorTrackResolve = useCallback(
        (input: { decisionId: string; resolution: 'approved' | 'rejected' }): boolean => {
            const ok = resolveCreditorOtherPartyTrackDecision({
                executionId: decisionsStorageExecutionId,
                decisionId: input.decisionId,
                resolution: input.resolution,
            });
            if (!ok) {
                showToast('تعذّر تحديث بطاقة القرار.', 'warning');
                return false;
            }
            showToast(
                input.resolution === 'approved' ? 'سُجّلت موافقة المنفذ.' : 'سُجّل رفض المنفذ.',
                'success'
            );
            return true;
        },
        [decisionsStorageExecutionId, showToast]
    );

    const handleCreditorTrackOpenDecision = useCallback(
        (decisionId: string) => {
            openDecisionsModalWithBoot({
                tab: 'current',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot]
    );

    const creditorOtherPartyTrackHandlers = useMemo(
        () => ({
            onSubmitCreditorRequest: handleCreditorTrackSubmit,
            onResolveCreditorDecision: handleCreditorTrackResolve,
            showMessage: (message: string, type?: 'warning' | 'success') =>
                showToast(message, type ?? 'info'),
            onOpenDecision: handleCreditorTrackOpenDecision,
        }),
        [
            handleCreditorTrackSubmit,
            handleCreditorTrackResolve,
            handleCreditorTrackOpenDecision,
            showToast,
        ]
    );

    const otherPartyTabSubmitHandler = useMemo(
        () =>
            isRepresentingDebtor
                ? handleOtherPartyActionLogOnly
                : handleOtherPartyActionSubmitToDecisions,
        [isRepresentingDebtor, handleOtherPartyActionLogOnly, handleOtherPartyActionSubmitToDecisions]
    );

    const otherPartyLogMigratedRef = useRef(false);
    useEffect(() => {
        if (!isRepresentingDebtor || otherPartyLogMigratedRef.current) return;
        const log = executionData?.other_party_actions_log;
        if (!Array.isArray(log) || log.length === 0) return;
        otherPartyLogMigratedRef.current = true;
        const { events: migrated, migratedIds } = buildTimelineEventsFromOtherPartyActionLog(
            log,
            timelineEvents,
            nextTimelineId
        );
        if (migrated.length === 0) {
            persistExecutionMerge({ other_party_actions_log: [] });
            return;
        }
        const nextTimeline = [...migrated, ...timelineEvents];
        persistExecutionMerge({
            timelineEvents: nextTimeline,
            other_party_actions_log: [],
        });
        setTimelineEvents(nextTimeline);
        if (migratedIds.length > 0) {
            showToast(
                `نُقل ${migratedIds.length} سجل إلى السجل الزمني (تبويب تحركات الطرف الآخر).`,
                'info'
            );
        }
    }, [
        isRepresentingDebtor,
        executionData?.other_party_actions_log,
        timelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const openOtherPartyAppealsModal = useCallback(
        (decisionId?: string) => {
            openDecisionsModalWithBoot({
                tab: 'previous',
                decisionId: String(decisionId || '').trim() || null,
            });
        },
        [openDecisionsModalWithBoot]
    );

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

    useEffect(() => {
        if (!exIdForPersonalDecisions) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions);
        const travelOk = rows.some(
            (r) =>
                r.requestKind === 'personal_coercive' &&
                r.personalCoerciveSubtype === 'travel_ban' &&
                r.executorOutcome === 'approved'
        );
        if (travelOk && !executionData?.debtor_travel_ban_active) {
            persistExecutionMerge({ debtor_travel_ban_active: true });
        }
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData?.debtor_travel_ban_active,
        persistExecutionMerge,
    ]);

    /** مزامنة نتيجة منفذ العدل على طلب مفاتحة التحقيق (تكليف حضور موظف — يدعم أكثر من مدين) */
    useEffect(() => {
        const d = executionData;
        if (!d || !exIdForPersonalDecisions) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions) as ExecutorDecisionRowLite[];
        const merged = mergeInvestigationOutcomesIntoEmployeeAssignments(
            d,
            primaryDebtorKeyResolved,
            rows
        );
        if (!merged) return;
        const syncSig = [
            String(d.id),
            String(merged.approvedCount),
            String(merged.rejectedCount),
            ...Object.entries(merged.patch.employee_summons_assignments_by_debtor)
                .map(
                    ([k, st]) =>
                        `${k}:${st.phase}:${String(st.investigationDecisionId ?? '')}:${String(st.arrestOrderRecorded ?? '')}`
                )
                .sort(),
        ].join('|');
        if (employeeInvestigationSyncSigRef.current === syncSig) return;
        employeeInvestigationSyncSigRef.current = syncSig;
        persistExecutionMerge(merged.patch);
        const { approvedCount, rejectedCount } = merged;
        if (approvedCount > 0 && rejectedCount === 0) {
            showToast('تمت موافقة المنفذ على طلب المفاتحة.', 'success');
        } else if (rejectedCount > 0 && approvedCount === 0) {
            showToast('صدر رفض الطلب — يمكن إنهاء التكليف أو إعادة المحاولة.', 'info', {
                decisionsLink: true,
            });
        } else {
            showToast(
                `تم تحديث طلبات المفاتحة: ${approvedCount} موافقة، ${rejectedCount} رفض.`,
                'info',
                { decisionsLink: true }
            );
        }
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData,
        executionData?.employee_summons_assignment,
        executionData?.employee_summons_assignments_by_debtor,
        hideToast,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        showToast,
    ]);

    useEffect(() => {
        if (!exIdForPersonalDecisions) return;
        if (executionData?.forced_bring_in_personal_followup_logged) return;
        const rows = readExecutorDecisionsArray(exIdForPersonalDecisions);
        const ok = rows.some(
            (r) =>
                r.requestKind === 'personal_coercive' &&
                r.personalCoerciveSubtype === 'forced_bring_in' &&
                r.executorOutcome === 'approved'
        );
        if (!ok) return;
        setTimelineEvents((prev) => {
            if (prev.some((e) => e.title && e.title.includes('مسودة مذكرة إحضار'))) {
                queueMicrotask(() =>
                    persistExecutionMerge({ forced_bring_in_personal_followup_logged: true })
                );
                return prev;
            }
            const now = new Date().toISOString();
            const memo: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: '📄 مسودة مذكرة إحضار (بعد موافقة المنفذ)',
                description:
                    'راجع الصياغة للطباعة وتسليمها لمركز الشرطة / المفرزة. يُسجّل إنجاز المهمة عند إتمام التنفيذ الميداني.',
                type: 'coercive',
                source: 'محضر المتابعة',
            };
            const task: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: '📌 مهمة: مرافقة المفرزة أو تسليم مذكرة الإحضار',
                description: 'متابعة ميدانية — حدّد الموعد من «إضافة موعد» إن لزم.',
                type: 'other',
                source: 'محضر المتابعة',
            };
            const next = [memo, task, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    timelineEvents: next,
                    forced_bring_in_personal_followup_logged: true,
                })
            );
            return next;
        });
    }, [
        decisionsReloadEpoch,
        exIdForPersonalDecisions,
        executionData?.forced_bring_in_personal_followup_logged,
        nextTimelineId,
        persistExecutionMerge,
    ]);

    const executiveDetentionReminderFiredRef = useRef(false);
    useEffect(() => {
        if (!executionData?.executive_detention_reminder_sent) {
            executiveDetentionReminderFiredRef.current = false;
        }
    }, [executionData?.executive_detention_reminder_sent]);

    useEffect(() => {
        const until = executionData?.executive_detention_until;
        if (!executionData?.debtor_executive_detention_active) return;
        if (until) {
            const end = new Date(`${until}T23:59:59`);
            if (!Number.isNaN(end.getTime()) && Date.now() > end.getTime()) {
                persistExecutionMerge({
                    debtor_executive_detention_active: false,
                    executive_detention_until: null,
                    executive_detention_days_total: null,
                    executive_detention_reminder_sent: false,
                    executive_detention_released_or_closed_at: new Date().toISOString(),
                });
                return;
            }
        }
        if (!until) return;
        if (executionData.executive_detention_reminder_sent || executiveDetentionReminderFiredRef.current) {
            return;
        }
        const end = new Date(`${until}T23:59:59`);
        if (Number.isNaN(end.getTime())) return;
        const msLeft = end.getTime() - Date.now();
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        if (msLeft > 0 && msLeft <= twoDays) {
            executiveDetentionReminderFiredRef.current = true;
            showToast(
                '⏳ يتبقّى أقل من يومين على انتهاء الحبس التنفيذي — قرّر طلب التجديد أو المتابعة.',
                'warning'
            );
            persistExecutionMerge({ executive_detention_reminder_sent: true });
        }
    }, [
        executionData?.executive_detention_until,
        executionData?.debtor_executive_detention_active,
        executionData?.executive_detention_reminder_sent,
        persistExecutionMerge,
        showToast,
    ]);

    const handleLiftStayOfExecution = useCallback(() => {
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: '✅ رفع الاستئخار',
            description: 'عادت أدوات التنفيذ للعمل وفق وضع الإيقاف العام للإضبارة.',
            type: 'decision',
            source: 'التنفيذ',
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    stay_of_execution: {
                        active: false,
                        decision_number: '',
                        court_name: '',
                        next_hearing_date: '',
                    },
                    timelineEvents: next,
                })
            );
            return next;
        });
        showToast('تم رفع الاستئخار', 'success');
    }, [nextTimelineId, persistExecutionMerge, showToast]);

    const handleSpecialCasesStay = useCallback(
        (input: { decision_number: string; court_name: string; next_hearing_date: string }): boolean => {
            const court_name = input.court_name.trim();
            const next_hearing_date = input.next_hearing_date.trim();
            if (!court_name || !next_hearing_date) {
                showToast('أدخل اسم المحكمة وتاريخ الجلسة', 'warning');
                return false;
            }
            const decision_number = input.decision_number.trim();
            const taskId = nextTimelineId();
            const teId = nextTimelineId();
            const now = new Date().toISOString();
            const task = {
                id: taskId,
                title: 'متابعة استئخار التنفيذ',
                body: `محكمة: ${court_name}${decision_number ? ` — قرار: ${decision_number}` : ''}`,
                dueDate: next_hearing_date,
                createdAt: now,
            };
            const te: TimelineEvent = {
                id: teId,
                date: now.slice(0, 10),
                timestamp: now,
                title: '⚠️ تفعيل استئخار التنفيذ',
                description: `محكمة: ${court_name}${decision_number ? `\nرقم القرار: ${decision_number}` : ''}\nجلسة/متابعة: ${next_hearing_date}\n— تُعطَّل أدوات الإضبارة حتى رفع الاستئخار.`,
                type: 'decision',
                source: 'استئخار التنفيذ',
            };
            setCaseTasksPending((prev) => {
                const nextTasks = [...prev, task];
                setTimelineEvents((prevTl) => {
                    const nextTl = [te, ...prevTl];
                    queueMicrotask(() => {
                        persistExecutionMerge({
                            stay_of_execution: {
                                active: true,
                                decision_number,
                                court_name,
                                next_hearing_date,
                            },
                            timelineEvents: nextTl,
                            caseTasksPending: nextTasks,
                        });
                        syncExecutionTaskDue({
                            executionId: currentFileId,
                            task,
                            caseNo:
                                String(
                                    executionData?.fileNumber ??
                                        executionData?.caseNo ??
                                        file?.fileNumber ??
                                        '',
                                ).trim() || undefined,
                            clientName:
                                String(
                                    executionData?.creditors?.[0]?.name ??
                                        executionData?.clientName ??
                                        file?.creditors?.[0]?.name ??
                                        '',
                                ).trim() || undefined,
                        });
                    });
                    return nextTl;
                });
                return nextTasks;
            });
            showToast('تم تفعيل الاستئخار وتسجيل المهمة.', 'success');
            return true;
        },
        [nextTimelineId, persistExecutionMerge, showToast, currentFileId, executionData, file]
    );

    const handlePartyDeathSave = useCallback(
        (payload: PartyDeathSavePayload): boolean => {
            const base = executionDataRef.current ?? executionData;
            if (
                (payload.action === 'heir_substitution' ||
                    payload.action === 'seek_heir' ||
                    payload.action === 'no_heirs') &&
                !isHeirSubstitutionAllowedForClaim(base as Record<string, unknown>, claimType)
            ) {
                showToast('لا يوجد مسار ورثة لهذا النوع من المطالبة.', 'info');
                return false;
            }
            const partyLabelAr = payload.deceased_party === 'debtor' ? 'المدين' : 'الدائن';
            const mergeHeirNames = (existing: string[], incoming: string[]) => {
                const out: string[] = [];
                [...existing, ...incoming].forEach((n) => {
                    const name = String(n || '').trim();
                    if (!name) return;
                    if (!out.some((x) => x === name)) out.push(name);
                });
                return out;
            };
            const mergeHeirDetails = (
                existing: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>,
                incoming: Array<{ name?: string; phone?: string; address?: string; isClient?: boolean }>
            ) => {
                const map = new Map<string, { name: string; phone: string; address: string; isClient?: boolean }>();
                [...existing, ...incoming].forEach((h) => {
                    const name = String(h?.name || '').trim();
                    if (!name) return;
                    const phone = String(h?.phone || '').trim();
                    const address = String(h?.address || '').trim();
                    const ic = Boolean(h?.isClient);
                    const key = `${name.toLowerCase()}|${phone}`;
                    const prev = map.get(key);
                    if (!prev) {
                        map.set(key, { name, phone, address, ...(ic ? { isClient: true } : {}) });
                        return;
                    }
                    map.set(key, {
                        name: name || prev.name,
                        phone: phone || prev.phone,
                        address: address || prev.address,
                        isClient: Boolean(prev.isClient || ic),
                    });
                });
                return [...map.values()];
            };

            if (payload.deceased_party === 'creditor') {
                const creditorsList = [...(base?.creditors || creditors)];
                const debtorsSnapshot = [...(base?.debtors || debtors)];
                const nameSnapshot = String(creditorsList[0]?.name || '').trim();
                const heirNamesResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                        : [];
                const heirDetailsResolved =
                    payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                        ? (payload.heir_details || [])
                              .map((h) => ({
                                  name: String(h?.name || '').trim(),
                                  phone: String(h?.phone || '').trim(),
                                  address: String(h?.address || '').trim(),
                                  isClient: Boolean((h as { isClient?: boolean }).isClient),
                              }))
                              .filter((h) => /\S/.test(h.name))
                        : [];
                if (payload.action === 'death_only') {
                    if (hasOngoingAlimonyInExecution(base as Record<string, unknown>, claimType)) {
                        showToast(
                            'نفقة مستمرة — حدّد المستحق المتوفى من قائمة الدائن (نافذة مستحقي النفقة).',
                            'warning'
                        );
                        return false;
                    }
                    const autoFinishCreditor = shouldAutoFinishDossierOnDeathReport(
                        base as Record<string, unknown>,
                        claimType,
                        'creditor'
                    );
                    if (creditorsList[0]) {
                        creditorsList[0] = {
                            ...creditorsList[0],
                            type: 'creditor',
                            isDeceased: true,
                            heirs: [],
                            heirs_details: [],
                        } as Creditor;
                    }
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تسجيل الإبلاغ عن الوفاة',
                        description: `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || 'الدائن'} في الإضبارة.`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        persistExecutionMerge({
                            ...buildScopedPartyDeathPersistPatch(base, 'creditor', {
                                deceased_party: 'creditor',
                                heir_names: [],
                                heir_details: [],
                                flow: 'death_only',
                                heir_certificate_file_name: null,
                            }),
                            creditors: creditorsList,
                            debtors: debtorsSnapshot,
                            is_creditor_deceased: true,
                            deceased_creditor_legal_name_snapshot:
                                nameSnapshot || base?.deceased_creditor_legal_name_snapshot,
                            timelineEvents: next,
                            ...(autoFinishCreditor
                                ? buildDossierAutoFinishPatch('وفاة الدائن — إغلاق الإضبارة')
                                : {}),
                        });
                        return next;
                    });
                    showToast(
                        autoFinishCreditor
                            ? 'تم تسجيل وفاة الدائن وإغلاق الإضبارة.'
                            : 'تم تسجيل الإبلاغ عن وفاة الدائن.',
                        'success'
                    );
                    return true;
                }
                if (
                    payload.action === 'heir_substitution' &&
                    (getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'approved' ||
                        getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId) === 'alternative')
                ) {
                    const existingNames = (base?.creditors?.[0]?.heirs || []).filter((s) =>
                        /\S/.test(String(s))
                    );
                    const existingCaseNames = (
                        getPartyDeathCaseForRole(base, 'creditor')?.heir_names || []
                    ).filter((s) => /\S/.test(String(s)));
                    const mergedHeirNames = mergeHeirNames(
                        mergeHeirNames(existingNames, existingCaseNames),
                        heirNamesResolved
                    );
                    const existingDetails = Array.isArray(base?.creditors?.[0]?.heirs_details)
                        ? base.creditors[0].heirs_details
                        : [];
                    const creditorDeathCase = getPartyDeathCaseForRole(base, 'creditor');
                    const existingCaseDetails = Array.isArray(creditorDeathCase?.heir_details)
                        ? (creditorDeathCase.heir_details as Array<{
                              name?: string;
                              phone?: string;
                              address?: string;
                          }>)
                        : [];
                    const mergedHeirDetails = mergeHeirDetails(
                        mergeHeirDetails(existingDetails, existingCaseDetails),
                        heirDetailsResolved
                    );
                    const merge = buildExecutionMergeForCreditorPartyDeath(base, {
                        action: 'heir_substitution',
                        creditorNameSnapshot: nameSnapshot,
                        heir_names: mergedHeirNames,
                    });
                    const now = new Date().toISOString();
                    const te: TimelineEvent = {
                        id: nextTimelineId(),
                        date: now.slice(0, 10),
                        timestamp: now,
                        title: 'تثبيت إحلال ورثة الدائن',
                        description: `تم تثبيت إحلال ورثة الدائن في الإضبارة بعد موافقة المنفذ.\nأسماء الورثة: ${heirNamesResolved.join('، ') || '—'}`,
                        type: 'procedure',
                        source: 'بطاقة الخصوم',
                    };
                    setTimelineEvents((prev) => {
                        const next = [te, ...prev];
                        const mergeRec = merge as Record<string, unknown>;
                        const mergedCreditors = Array.isArray(mergeRec.creditors)
                            ? ([...(mergeRec.creditors as Creditor[])] as Creditor[])
                            : creditorsList;
                        if (mergedCreditors[0]) {
                            mergedCreditors[0] = {
                                ...mergedCreditors[0],
                                heirs: mergedHeirNames,
                                heirs_details: mergedHeirDetails,
                            } as Creditor;
                        }
                        persistExecutionMerge({
                            ...merge,
                            ...buildScopedPartyDeathPersistPatch(base, 'creditor', {
                                deceased_party: 'creditor',
                                heir_names: mergedHeirNames,
                                heir_details: mergedHeirDetails,
                                flow: 'heir_substitution',
                                heir_certificate_file_name: null,
                            }),
                            creditors: mergedCreditors,
                            timelineEvents: next,
                        });
                        return next;
                    });
                    showToast('تم تثبيت إحلال ورثة الدائن بعد موافقة المنفذ.', 'success');
                    if (partyDeathModalDecisionId) {
                        patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                            heirSubstitutionCompletedAt: now,
                        });
                    }
                    return true;
                }
                const req = appendCreditorPartyDeathRequest({
                    executionId: decisionsStorageExecutionId,
                    action: payload.action,
                    creditorNameSnapshot: nameSnapshot,
                    heirNames: payload.action === 'no_heirs' ? [] : heirNamesResolved,
                });
                if (!req.ok) {
                    showToast(
                        'يوجد طلب بخصوص وفاة الدائن قيد البت لدى المنفذ. أكمل بتّه من «القرارات والطعون».',
                        'warning'
                    );
                    return false;
                }
                const now = new Date().toISOString();
                const teId = nextTimelineId();
                let teTitle = 'طلب — وفاة الدائن / إحلال الورثة';
                let teDesc = `أُحيل الطلب إلى «القرارات والطعون» بانتظار موافقة منفذ العدل أو رفض الطلب أو قرار بديل.\nالدائن: ${nameSnapshot || 'الدائن'}.`;
                if (payload.action === 'no_heirs') {
                    teTitle = 'طلب — وفاة الدائن دون ورثة وإغلاق الإضبارة';
                    teDesc = `قيد البت لدى المنفذ.\n${nameSnapshot || 'الدائن'}`;
                } else if (payload.action === 'seek_heir') {
                    teTitle = 'طلب — تسجيل وريث بعد مسار دون ورثة';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء مقترحة: ${heirNamesResolved.join('، ') || '—'}`;
                } else if (payload.action === 'heir_substitution') {
                    teTitle = 'طلب — إحلال الورثة محل الدائن المتوفى';
                    teDesc = `قيد البت لدى المنفذ.\nأسماء الورثة المقترحة: ${heirNamesResolved.join('، ')}`;
                }
                const te: TimelineEvent = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: teTitle,
                    description: teDesc,
                    type: 'decision',
                    source: 'بطاقة الخصوم',
                    metadata: req.decisionId
                        ? {
                              timelineThreadKey: `executor_decision:${req.decisionId}`,
                              decisionRowId: req.decisionId,
                          }
                        : undefined,
                };
                setTimelineEvents((prev) => {
                    const next = [te, ...prev];
                    persistExecutionMerge({ timelineEvents: next });
                    return next;
                });
                showToast('تم تقديم الطلب إلى «القرارات والطعون» بانتظار موافقة المنفذ.', 'success', {
                    decisionsLink: true,
                });
                return true;
            } else {

            const creditorsList = [...(base?.creditors || creditors)];
            const debtorsList = [...(base?.debtors || debtors)];
            const nameSnapshot = String(debtorsList[0]?.name || '').trim();

            if (payload.action === 'heir_substitution') {
                const st = getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId);
                if (st !== 'approved' && st !== 'alternative') {
                    showToast('لا يمكن إدراج الورثة قبل موافقة المنفذ على طلب الإحلال.', 'warning');
                    return false;
                }
            }

            const heirNamesResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                    : [];
            const heirDetailsResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? (payload.heir_details || [])
                          .map((h) => ({
                              name: String(h?.name || '').trim(),
                              phone: String(h?.phone || '').trim(),
                              address: String(h?.address || '').trim(),
                              isClient: Boolean((h as { isClient?: boolean }).isClient),
                          }))
                          .filter((h) => /\S/.test(h.name))
                    : [];
            const existingPrimaryHeirs = debtorsList[0]?.heirs || [];
            const existingCaseHeirs = (
                getPartyDeathCaseForRole(base, 'debtor')?.heir_names || []
            ).filter((s) => /\S/.test(String(s)));
            const mergedHeirNames = mergeHeirNames(
                mergeHeirNames(existingPrimaryHeirs as string[], existingCaseHeirs),
                heirNamesResolved
            );
            const primaryParty = debtorsList[0];
            const existingPrimaryDetails = Array.isArray(primaryParty?.heirs_details)
                ? primaryParty.heirs_details
                : [];
            const debtorDeathCaseRead = getPartyDeathCaseForRole(base, 'debtor');
            const existingCaseDetails = Array.isArray(debtorDeathCaseRead?.heir_details)
                ? (debtorDeathCaseRead.heir_details as Array<{
                      name?: string;
                      phone?: string;
                      address?: string;
                  }>)
                : [];
            const mergedHeirDetails = mergeHeirDetails(
                mergeHeirDetails(existingPrimaryDetails, existingCaseDetails),
                heirDetailsResolved
            );

            const applyHeirsToParty = (
                heirs: string[],
                heirDetails: Array<{ name: string; phone?: string; address?: string; isClient?: boolean }>
            ) => {
                if (debtorsList[0]) {
                    debtorsList[0] = {
                        ...debtorsList[0],
                        type: 'debtor',
                        isDeceased: true,
                        heirs,
                        heirs_details: heirDetails,
                    } as Debtor;
                }
            };

            const deceasedFlags = {
                is_debtor_deceased: true,
                is_creditor_deceased: executionData?.is_creditor_deceased,
                deceased_debtor_legal_name_snapshot:
                    nameSnapshot || executionData?.deceased_debtor_legal_name_snapshot,
                deceased_creditor_legal_name_snapshot: executionData?.deceased_creditor_legal_name_snapshot,
            };

            const now = new Date().toISOString();
            const teId = nextTimelineId();
            const closedReason = 'وفاة المدين دون ورثة — إغلاق الإضبارة';

            let te: TimelineEvent;
            let flow: 'no_heirs' | 'heir_substitution' | 'death_only';
            let storedHeirNames: string[];
            let mergeExtra: Record<string, unknown> = {};

            if (payload.action === 'death_only') {
                applyHeirsToParty([], []);
                flow = 'death_only';
                storedHeirNames = [];
                const autoFinishDebtor = shouldAutoFinishDossierOnDeathReport(
                    base as Record<string, unknown>,
                    claimType,
                    'debtor'
                );
                if (autoFinishDebtor) {
                    mergeExtra = buildDossierAutoFinishPatch('وفاة المدين — إغلاق الإضبارة');
                }
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: autoFinishDebtor
                        ? 'تسجيل وفاة المدين — إغلاق الإضبارة'
                        : 'تسجيل الإبلاغ عن الوفاة',
                    description: autoFinishDebtor
                        ? `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} وإغلاق الإضبارة آلياً.`
                        : `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || partyLabelAr} في الإضبارة.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            } else if (payload.action === 'no_heirs') {
                applyHeirsToParty([], []);
                flow = 'no_heirs';
                storedHeirNames = [];
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة — إغلاق الإضبارة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} دون ورثة؛ أُغلقت الإضبارة آلياً وفق المسار المختار.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'finished' as const,
                    dossier_status_reason: closedReason,
                    dossier_status_date: now.slice(0, 10),
                };
            } else if (payload.action === 'seek_heir') {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'العثور على وريث — إعادة فتح الإضبارة',
                    description: `بعد مسار «بلا ورثة» تم تسجيل وريث لـ${nameSnapshot || partyLabelAr} وإعادة تفعيل الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'active' as const,
                    dossier_status_reason: '',
                    dossier_status_date: '',
                };
            } else {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة وإحلال الورثة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} وإحلال ورثته محله في الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            }

            const mergeBase: Record<string, unknown> = {
                ...buildScopedPartyDeathPersistPatch(base, 'debtor', {
                    deceased_party: 'debtor',
                    heir_names: storedHeirNames,
                    heir_details: flow === 'heir_substitution' ? mergedHeirDetails : [],
                    flow,
                    heir_certificate_file_name: null,
                }),
                creditors: creditorsList,
                debtors: debtorsList,
                ...deceasedFlags,
                ...mergeExtra,
            };

            setTimelineEvents((prev) => {
                const next = [te, ...prev];
                persistExecutionMerge({
                    ...mergeBase,
                    timelineEvents: next,
                });
                return next;
            });

            if (payload.action === 'death_only') {
                showToast(
                    mergeExtra.dossier_lifecycle_status === 'finished'
                        ? 'تم تسجيل وفاة المدين وإغلاق الإضبارة.'
                        : 'تم تسجيل الإبلاغ عن الوفاة.',
                    'success'
                );
            } else if (payload.action === 'no_heirs') {
                showToast('تم تسجيل الوفاة وإغلاق الإضبارة (لا ورثة).', 'success');
            } else if (payload.action === 'seek_heir') {
                showToast('تم تسجيل الوريث وإعادة تفعيل الإضبارة.', 'success');
            } else {
                showToast('تم تسجيل الوفاة وإحلال الورثة.', 'success');
                if (partyDeathModalDecisionId) {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                        heirSubstitutionCompletedAt: now,
                    });
                }
            }
            return true;
            }
        },
        [
            creditors,
            debtors,
            decisionsStorageExecutionId,
            executionData?.is_debtor_deceased,
            executionData?.is_creditor_deceased,
            executionData?.deceased_debtor_legal_name_snapshot,
            executionData?.deceased_creditor_legal_name_snapshot,
            nextTimelineId,
            persistExecutionMerge,
            partyDeathModalDecisionId,
            patchExecutorDecisionRow,
            showToast,
            claimType,
        ]
    );

    const handleAlimonyBeneficiaryDeathConfirm = useCallback(
        (input: { wifeDeceased: boolean; childrenDiedCount: number }): boolean => {
            const base = executionDataRef.current ?? executionData;
            const merge = buildAlimonyBeneficiaryDeathMerge(base, input);
            if (!merge) {
                showToast('تعذّر تطبيق الإبلاغ — راجع بيانات النفقة المستمرة.', 'warning');
                return false;
            }
            const now = new Date().toISOString();
            const parts: string[] = [];
            if (input.wifeDeceased) parts.push('الزوجة');
            if (input.childrenDiedCount > 0) {
                parts.push(
                    input.childrenDiedCount === 1
                        ? 'طفل واحد'
                        : `${input.childrenDiedCount} من الأولاد`
                );
            }
            const te: TimelineEvent = {
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'إبلاغ وفاة مستحقي النفقة',
                description: `تم تسجيل وفاة: ${parts.join(' و')} — وتحديث المركز المالي.${
                    merge.dossier_lifecycle_status === 'finished'
                        ? '\nأُغلقت الإضبارة لوفاة جميع المستحقين.'
                        : ''
                }`,
                type: 'procedure',
                source: 'بطاقة الخصوم',
            };
            setTimelineEvents((prev) => {
                const next = [te, ...prev];
                const mergedFile = {
                    ...(base as Record<string, unknown>),
                    ...merge,
                    timelineEvents: next,
                };
                persistExecutionMerge({ ...merge, timelineEvents: next });
                executionDataRef.current = mergedFile as ExecutionFile;
                setAlimonyBeneficiaryDeathModalProfile(
                    resolveAlimonyBeneficiaryProfile(mergedFile)
                );
                return next;
            });
            showToast(
                merge.dossier_lifecycle_status === 'finished'
                    ? 'تم الإبلاغ وإغلاق الإضبارة — لا مستحقين متبقين.'
                    : 'تم الإبلاغ وتحديث مبالغ النفقة في المركز المالي.',
                'success'
            );
            return true;
        },
        [executionData, nextTimelineId, persistExecutionMerge, showToast]
    );

    const debtorSubstitutionRequestStatus = useMemo(
        () => getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );
    const creditorSubstitutionRequestStatus = useMemo(
        () => getCreditorHeirSubstitutionRequestStatus(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch]
    );

    const handleRequestDebtorSubstitution = useCallback((): boolean => {
        if (!isHeirSubstitutionAllowedForClaim(executionData, claimType)) {
            showToast('لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
            return false;
        }
        if (debtorSubstitutionRequestStatus === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - lastHeirSubRequestAtRef.current.debtor < 1200) {
            showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        lastHeirSubRequestAtRef.current.debtor = nowMs;
        const debtorName = String(
            executionDataRef.current?.debtors?.[0]?.name ?? debtors?.[0]?.name ?? ''
        ).trim();
        const req = appendDebtorHeirSubstitutionRequest({
            executionId: decisionsStorageExecutionId,
            debtorNameSnapshot: debtorName,
        });
        if (!req.ok) {
            showToast('يوجد طلب إحلال مدين قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالمدين: ${debtorName || 'المدين'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        showToast('تم إرسال طلب إحلال المدين إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        debtorSubstitutionRequestStatus,
        debtors,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleRequestCreditorSubstitution = useCallback((): boolean => {
        if (!isHeirSubstitutionAllowedForClaim(executionData, claimType)) {
            showToast('لا يوجد مسار إحلال ورثة لهذا النوع من المطالبة.', 'info');
            return false;
        }
        if (creditorSubstitutionRequestStatus === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const nowMs = Date.now();
        if (nowMs - lastHeirSubRequestAtRef.current.creditor < 1200) {
            showToast('تم تجاهل النقر المتكرر. انتظر لحظة ثم أعد المحاولة.', 'info');
            return false;
        }
        lastHeirSubRequestAtRef.current.creditor = nowMs;
        const creditorName = String(creditors?.[0]?.name || '').trim();
        const req = appendCreditorPartyDeathRequest({
            executionId: decisionsStorageExecutionId,
            action: 'heir_substitution',
            creditorNameSnapshot: creditorName,
            heirNames: [],
        });
        if (!req.ok) {
            showToast('يوجد طلب إحلال ورثة للدائن قيد البت لدى المنفذ.', 'warning');
            return false;
        }
        const now = new Date().toISOString();
        const te: TimelineEvent = {
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: 'طلب — إحلال الورثة محل الدائن المتوفى',
            description: `تم إرسال الطلب إلى «القرارات والطعون» بانتظار بتّ المنفذ.\nالدائن: ${creditorName || 'الدائن'}.`,
            type: 'decision',
            source: 'بطاقة الخصوم',
            metadata: req.decisionId
                ? {
                      timelineThreadKey: `executor_decision:${req.decisionId}`,
                      decisionRowId: req.decisionId,
                  }
                : undefined,
        };
        setTimelineEvents((prev) => {
            const next = [te, ...prev];
            persistExecutionMerge({ timelineEvents: next });
            return next;
        });
        showToast('تم إرسال طلب إحلال ورثة الدائن إلى قرارات المنفذ.', 'success', { decisionsLink: true });
        return true;
    }, [
        creditorSubstitutionRequestStatus,
        creditors,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handleCreditorDeathMenuAction = useCallback(() => {
        if (ongoingAlimonyClaim) {
            const profileNow = resolveAlimonyBeneficiaryProfile(
                executionDataRef.current ?? executionData
            );
            if (!profileNow) {
                showToast(
                    'لا تتوفر بيانات مستحقي النفقة في الإضبارة. راجع مبالغ الزوجة/الأولاد عند الإنشاء.',
                    'warning'
                );
                return;
            }
            if (!profileNow.anyBeneficiaryAlive) {
                showToast('جميع مستحقي النفقة مُسجَّلون متوفين.', 'info');
                return;
            }
            if (shouldShowAlimonyBeneficiaryDeathPicker(profileNow)) {
                setAlimonyBeneficiaryDeathModalProfile(profileNow);
                setAlimonyBeneficiaryDeathModalOpen(true);
                return;
            }
            const soleInput = buildSoleSurvivorDeathInput(profileNow);
            if (soleInput) {
                handleAlimonyBeneficiaryDeathConfirm(soleInput);
                return;
            }
            showToast('تعذّر تحديد مستحق النفقة المتبقي.', 'warning');
            return;
        }
        if (!heirSubstitutionAllowed) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'creditor' });
            return;
        }
        if (!creditorDeathMarked) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'creditor' });
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'creditor');
        if (openId) {
            setPartyDeathModalParty('creditor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = creditorSubstitutionRequestStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        handleRequestCreditorSubstitution();
    }, [
        alimonyBeneficiaryProfile?.anyBeneficiaryAlive,
        creditorDeathMarked,
        creditorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        executionData,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        handleAlimonyBeneficiaryDeathConfirm,
        handlePartyDeathSave,
        handleRequestCreditorSubstitution,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        showToast,
    ]);

    const handleDebtorDeathMenuAction = useCallback(() => {
        if (!debtorDeathMarked) {
            handlePartyDeathSave({ action: 'death_only', deceased_party: 'debtor' });
            return;
        }
        if (!heirSubstitutionAllowed) {
            showToast('تم تسجيل وفاة المدين مسبقاً — لا إجراء إضافي في هذا النوع من المطالبة.', 'info');
            return;
        }
        const openId = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, 'debtor');
        if (openId) {
            setPartyDeathModalParty('debtor');
            setPartyDeathModalDecisionId(openId);
            return;
        }
        const st = debtorSubstitutionRequestStatus;
        if (st === 'pending') {
            showToast('الطلب مُرسل مسبقاً وقيد البت لدى المنفذ.', 'warning');
            return;
        }
        handleRequestDebtorSubstitution();
    }, [
        debtorDeathMarked,
        debtorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        handlePartyDeathSave,
        handleRequestDebtorSubstitution,
        heirSubstitutionAllowed,
        showToast,
    ]);

    useEffect(() => {
        const openHandler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; party?: 'creditor' | 'debtor'; decisionId?: string }>;
            if (String(ce.detail?.executionId ?? '') !== String(executionData?.id ?? executionId ?? '')) return;
            const p = ce.detail?.party;
            if (p !== 'creditor' && p !== 'debtor') return;
            setPartyDeathModalParty(p);
            const did = String(ce.detail?.decisionId ?? '').trim();
            setPartyDeathModalDecisionId(did || null);
        };
        window.addEventListener('hami-open-party-death-modal', openHandler as EventListener);
        return () =>
            window.removeEventListener('hami-open-party-death-modal', openHandler as EventListener);
    }, [executionData?.id, executionId]);

    useEffect(() => {
        if (!partyDeathModalParty) return;
        if (partyDeathModalDecisionId) return;
        const st =
            partyDeathModalParty === 'creditor' ? creditorSubstitutionRequestStatus : debtorSubstitutionRequestStatus;
        if (st !== 'approved' && st !== 'alternative') return;
        const id = findLatestHeirSubstitutionDecisionNeedingEntry(decisionsStorageExecutionId, partyDeathModalParty);
        if (id) setPartyDeathModalDecisionId(id);
    }, [
        creditorSubstitutionRequestStatus,
        debtorSubstitutionRequestStatus,
        decisionsStorageExecutionId,
        findLatestHeirSubstitutionDecisionNeedingEntry,
        partyDeathModalDecisionId,
        partyDeathModalParty,
    ]);

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
            showToast('لا يوجد تاريخ إخبار/تبليغ مُسجَّل لاحتساب المدة', 'warning');
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
            showToast('لا يوجد تاريخ مذكرة إخبار مُسجَّل لاحتساب المدة', 'warning');
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

    useEffect(() => {
        if (!isEvictionExecutionModule) return;
        const id = String(executionData?.id ?? executionId ?? '');
        if (!id || id === 'undefined') return;
        if (executionData?.eviction_lawyer_fee_requested) return;
        if (!hasApprovedLawyerFeePayout(id)) return;

        const marker = `backfill_lawyer_fee_${id}`;
        if (backfillEvictionLawyerFeeRequestedRef.current === marker) return;
        backfillEvictionLawyerFeeRequestedRef.current = marker;

        persistExecutionMerge({ eviction_lawyer_fee_requested: true });
    }, [
        isEvictionExecutionModule,
        executionData?.id,
        executionId,
        executionData?.eviction_lawyer_fee_requested,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        // تبويب "الحجز المالي" أُلغي من محضر المتابعة؛ أي حالة قديمة تُعاد للتبويب الجبري.
        if (unifiedModalTab === 'financial') {
            const fallback = effectiveFollowupSectionTabOrder[0] ?? 'coercive';
            setUnifiedModalTab(
                followupSpecialization.hideFollowupCoerciveTab ? fallback : 'coercive'
            );
        }
    }, [
        effectiveFollowupSectionTabOrder,
        followupSpecialization.hideFollowupCoerciveTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (!showPersonalCoerciveFollowupTab && unifiedModalTab === 'personal') {
            const fallback = effectiveFollowupSectionTabOrder[0] ?? 'coercive';
            setUnifiedModalTab(
                followupSpecialization.hideFollowupCoerciveTab ? fallback : 'coercive'
            );
        }
    }, [
        effectiveFollowupSectionTabOrder,
        followupSpecialization.hideFollowupCoerciveTab,
        showPersonalCoerciveFollowupTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (followupSpecialization.hideFollowupCoerciveTab && unifiedModalTab === 'coercive') {
            setUnifiedModalTab((effectiveFollowupSectionTabOrder[0] ?? 'coercive') as typeof unifiedModalTab);
        }
    }, [
        effectiveFollowupSectionTabOrder,
        followupSpecialization.hideFollowupCoerciveTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) {
            setShowSolidaryCoerciveTargetModal(false);
            setSolidaryCoerciveActionPending(null);
        }
    }, [showUnifiedExecutionModal]);

    useLayoutEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const cleanups: Array<() => void> = [];
        const chips = followupModalChipTablistRef.current;
        const debtors = followupModalDebtorTabsRef.current;
        if (chips) cleanups.push(bindHorizontalWheelToScroll(chips));
        if (debtors) cleanups.push(bindHorizontalWheelToScroll(debtors));
        return () => cleanups.forEach((u) => u());
    }, [showUnifiedExecutionModal, isSolidaryLiability, allDebtorsUnified.length]);

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

    const handleEmployeeAssignmentConfirm = useCallback(
        (p: { purpose: string; notifyDate: string; durationDays: number }) => {
            const d = executionData;
            if (!d?.id) return;
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const existing = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (
                existing &&
                (existing.phase === 'active' ||
                    existing.phase === 'absent_declared' ||
                    existing.phase === 'investigation_pending' ||
                    existing.phase === 'warrant_ui')
            ) {
                showToast('يوجد تكليف مسجّل لهذا المدين — أنهِه أو أكمل المرحلة الحالية أولاً', 'warning');
                return;
            }
            const effectiveDurationDays = Math.max(1, Number(p.durationDays) || 1);
            const deadlineDate = computeTaklifDeadlineYmd(p.notifyDate, effectiveDurationDays);
            const ts = new Date().toISOString();
            const assignment = {
                phase: 'active' as const,
                assignedDebtorKey: targetKey,
                purpose: p.purpose,
                notifyDate: p.notifyDate,
                durationDays: effectiveDurationDays,
                deadlineDate,
                confirmedAt: ts,
                investigationDecisionId: null as string | null,
                investigationApproved: false,
                arrestOrderRecorded: false,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.notifyDate,
                    timestamp: ts,
                    title: '📋 تكليف حضور — مدين موظف',
                    description: `الغاية: ${p.purpose}\nالمدة: ${effectiveDurationDays} أيام (من اليوم التالي لتاريخ التبليغ) — ينتهي ${deadlineDate}`,
                    type: 'summons',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, assignment, pk),
                    ...buildDebtorSummonsMarkerPatchForKey(d, targetKey, pk, null),
                    ...buildPublicationNoticePatchForDebtorKey(d, targetKey, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التكليف بالحضور', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            executionData?.id,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            showToast,
        ]
    );

    const handleEmployeeAssignmentAttend = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a0) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تكليف بالحضور',
                description: 'سُجّل حضور المدين خلال مدة التكليف.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء التكليف', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentDeclareAbsent = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'active') return;
        const deadlineYmd =
            a.notifyDate != null && a.notifyDate !== ''
                ? computeTaklifDeadlineYmd(a.notifyDate, a.durationDays ?? 1)
                : a.deadlineDate || '';
        if (!deadlineYmd) return;
        if (!isAssignmentDeadlinePassed(deadlineYmd)) {
            showToast('تسجيل عدم الحضور يُتاح بعد انتهاء المدة التقويمية', 'warning');
            return;
        }
        const nextGen = (a.taklifCycleGeneration ?? 0) + 1;
        const resetAssignment = {
            ...a,
            phase: 'absent_declared' as const,
            taklifCycleGeneration: nextGen,
            investigationDecisionId: null as string | null,
            investigationApproved: false,
            arrestOrderRecorded: false,
        };
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⚠ عدم حضور المدين — إعادة دورة التكليف',
                description: `سُجّل عدم الحضور بعد انتهاء المدة التقويمية للتكليف. دورة التكليف: ${nextGen}. أُعيدت مرحلة المفاتحة والتنفيذ الجبري للبداية ضمن نفس التكليف.`,
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    { ...resetAssignment, periodEndedAt: ts },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentTerminate = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء تكليف الحضور (تسجيل يدوي)',
                description: 'أُنهي تكليف الحضور دون اكتمال المسار الآلي.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التكليف بالحضور', 'info');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestInvestigation = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        const deadlineForBody =
            a.deadlineDate ||
            (a.notifyDate != null &&
            a.notifyDate !== '' &&
            a.durationDays != null &&
            a.durationDays > 0
                ? addCalendarDaysYmd(a.notifyDate, a.durationDays)
                : '—');
        const body = `تكليف حضور (مدين موظف).\nالغاية: ${a.purpose || '—'}\nمرجع تاريخ التكليف: ${a.notifyDate || '—'}\nآخر أجل للمدة: ${deadlineForBody}`;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'employee_assignment_investigation',
            title: 'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض — تكليف حضور (موظف)',
            body,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج الطلب في القرارات', 'error');
            return;
        }
        const decisionId = res.decisionId;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب مفاتحة التحقيق — تكليف حضور',
                description: 'أُرسل طلب مفاتحة محكمة التحقيق لإصدار أمر قبض ضمن مسار التكليف بالحضور.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    {
                        ...a,
                        phase: 'investigation_pending',
                        investigationDecisionId: decisionId,
                    },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل الطلب إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestForcedBring = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'warrant_ui' || !a.arrestOrderRecorded) return;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'forced_bring_in',
            title: 'طلب إحضار جبري للمدين — بعد أمر قبض (تكليف حضور)',
            body: `تكليف حضور.\nالغاية: ${a.purpose || '—'}\nطلب إحضار جبري بعد تسجيل صدور أمر القبض ضمن مسار التكليف.`,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج طلب الإحضار في القرارات', 'error');
            return;
        }
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب إحضار جبري — تكليف حضور',
                description: 'أُرسل طلب إحضار جبري إلى منفذ العدل ضمن مسار التكليف بعد أمر القبض.',
                type: 'summons',
                source: 'التبليغ',
                metadata: {
                    ...timelineDebtorMetadata(targetKey),
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                },
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل طلب الإحضار إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeRegisterArrestOrder = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📌 تسجيل صدور أمر القبض — تكليف حضور',
                description: 'سُجّل صدور أمر القبض بعد موافقة مسار المفاتحة.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, { ...a, arrestOrderRecorded: true }, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل صدور أمر القبض', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeWarrantOutcome = useCallback(
        (which: 'brought' | 'terminate') => {
            const d = executionData;
            if (!d) return;
            if (!(forcedBringDecisionState.approved && !forcedBringDecisionState.pending)) {
                showToast('لا يمكن تسجيل نتيجة أمر القبض قبل موافقة المنفذ على طلب الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => {
                const ev: TimelineEvent =
                    which === 'brought'
                        ? {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '✓ تم إحضار المدين — بعد أمر القبض',
                              description: 'أُنهي تكليف الحضور بعد التنفيذ.',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          }
                        : {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '⏹ إنهاء التكليف بالحضور',
                              description: 'أُنهي التكليف دون إحضار (تسجيل يدوي).',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    timelineEvents: next,
                });
                return next;
            });
            showToast(which === 'brought' ? 'تم التسجيل' : 'تم إنهاء التكليف', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            forcedBringDecisionState.approved,
            forcedBringDecisionState.pending,
            showToast,
        ]
    );

    /** بعد موافقة المنفذ على الإحضار الجبري: نفس منطق محضر المتابعة مع إنهاء التكليف للمدين المستهدف */
    const handleEmployeeAssignmentResolveForcedBringOutcome = useCallback(
        (which: 'brought' | 'absconded') => {
            const d = executionData;
            if (!d) return;
            if (!employeeForcedBringAwaitingPersonalOutcome) {
                showToast('لا يمكن تسجيل النتيجة الآن. الحالة ليست بانتظار نتيجة الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            const label =
                which === 'brought'
                    ? '✅ تم إحضار المدين أمام المنفذ'
                    : '⚠️ المدين متخفي / مجهول محل الإقامة';
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: label,
                    description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين — مع إنهاء تكليف الحضور.',
                    type: 'coercive',
                    source: 'محضر المتابعة',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    forced_bring_in_personal_outcome: which === 'brought' ? null : 'absconded',
                    timelineEvents: next,
                });
                return next;
            });
            showToast(
                which === 'brought'
                    ? 'تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.'
                    : 'تم تسجيل النتيجة في محضر المتابعة.',
                'success'
            );
        },
        [
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            employeeForcedBringAwaitingPersonalOutcome,
            showToast,
        ]
    );

    const handlePublicationNoticeRegister = useCallback(
        (p: { publicationDateYmd: string; newspaper1: string; newspaper2: string }) => {
            if (executionActionsGridLocked) {
                showToast(
                    '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                    'warning'
                );
                return;
            }
            const d = executionData;
            if (!d?.id) return;
            const dk = unifiedSummonsTargetDebtorKey;
            const existing = getPublicationNoticeForDebtorKey(d, dk);
            if (existing) {
                showToast('يوجد تبليغ بالنشر سارٍ لهذا المدين.', 'warning');
                return;
            }
            const ts = new Date().toISOString();
            const deadline = publicationNoticeDeadlineYmd(p.publicationDateYmd);
            const state = {
                publicationDateYmd: p.publicationDateYmd,
                newspaper1: p.newspaper1,
                newspaper2: p.newspaper2,
                recordedAt: ts,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.publicationDateYmd,
                    timestamp: ts,
                    title: '📰 تسجيل التبليغ بالنشر',
                    description: `تاريخ النشر: ${p.publicationDateYmd}\nالجريدة ١: ${p.newspaper1}\nالجريدة ٢: ${p.newspaper2}\nمدة ${PUBLICATION_NOTICE_DURATION_DAYS} يوماً تقويمياً حتى ${deadline} (يبدأ الاحتساب من اليوم التالي لتاريخ النشر).`,
                    type: 'notification',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(dk),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildPublicationNoticePatchForDebtorKey(d, dk, state),
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, dk, null, primaryDebtorKeyResolved),
                    ...buildDebtorSummonsMarkerPatchForKey(d, dk, primaryDebtorKeyResolved, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التبليغ بالنشر', 'success');
        },
        [
            executionActionsGridLocked,
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.id,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
        ]
    );

    const handlePublicationNoticeTerminate = useCallback(() => {
        if (executionActionsGridLocked) {
            showToast(
                '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                'warning'
            );
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء التبليغ بالنشر',
                description: 'أُنهي مسار التبليغ بالنشر يدوياً.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, { ...cur, periodEndedAt: ts }),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التبليغ بالنشر', 'info');
    }, [
        executionActionsGridLocked,
        unifiedSummonsTargetDebtorKey,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

    const handlePublicationNoticeDebtorAttended = useCallback(() => {
        if (executionActionsGridLocked) {
            showToast(
                '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
                'warning'
            );
            return;
        }
        const d = executionData;
        if (!d) return;
        const dk = unifiedSummonsTargetDebtorKey;
        const cur = getPublicationNoticeForDebtorKey(d, dk);
        if (!cur) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تبليغ بالنشر',
                description: 'سُجّل حضور المدين أثناء مدة التبليغ بالنشر.',
                type: 'notification',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(dk),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildPublicationNoticePatchForDebtorKey(d, dk, null),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء دورة التبليغ بالنشر', 'success');
    }, [
        executionActionsGridLocked,
        unifiedSummonsTargetDebtorKey,
        executionData,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
    ]);

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
    const handlePayment = useCallback(() => {
        const normalized = String(paymentAmount || '')
            .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
            .replace(/[^\d.]/g, '');
        const amount = Math.max(0, Math.round(parseFloat(normalized) || 0));
        if (!Number.isFinite(amount) || amount <= 0) {
            showToast('يرجى إدخال مبلغ صحيح', 'warning');
            return;
        }
        if (amount > remaining) {
            showToast(
                `لا يمكن تسديد مبلغ يتجاوز المتبقي (${remaining.toLocaleString('ar-IQ')} د.ع)`,
                'warning'
            );
            return;
        }

        const fileSnap = executionDataRef.current as Record<string, unknown> | null;
        const debtRows = buildCreditorDebtRows(fileSnap);
        const distribution = distributePaymentProRata(amount, debtRows);

        const creditorsList = [...(fileSnap?.creditors as Array<Record<string, unknown>> | undefined ?? [])];
        const pmBase = (fileSnap?.party_multiplicity as Record<string, unknown> | undefined) ?? {};
        const additionalCreditorsList = [
            ...((pmBase.additionalCreditors as Array<Record<string, unknown>> | undefined) ?? []),
        ];

        for (const alloc of distribution.allocations) {
            if (alloc.isAdditional) {
                const idx = additionalCreditorsList.findIndex(
                    (c) => String(c.id) === alloc.creditorId
                );
                if (idx >= 0) {
                    const prevPaid = Number(additionalCreditorsList[idx].paid_amount) || 0;
                    additionalCreditorsList[idx] = {
                        ...additionalCreditorsList[idx],
                        paid_amount: prevPaid + alloc.amount,
                    };
                }
            } else {
                const idx = creditorsList.findIndex((c) => String(c.id) === alloc.creditorId);
                if (idx >= 0) {
                    const prevPaid = Number(creditorsList[idx].paid_amount) || 0;
                    creditorsList[idx] = {
                        ...creditorsList[idx],
                        paid_amount: prevPaid + alloc.amount,
                    };
                }
            }
        }

        const payYmd = paymentDate?.trim() || getLocalTodayYmd();
        const payTs = `${payYmd}T12:00:00.000Z`;
        const splitSummary =
            distribution.allocations.length > 1
                ? distribution.allocations
                      .map(
                          (a) =>
                              `${a.creditorName}: ${a.amount.toLocaleString('ar-IQ')} د.ع${
                                  a.isClient ? ' (موكلي → المركز المالي)' : ''
                              }`
                      )
                      .join(' · ')
                : '';

        const nextPaid = paidDebt + amount;
        const newBalance = Math.max(0, remaining - amount);
        const ledgerEntry = {
            id: Date.now().toString(),
            date: payTs,
            type: 'payment' as const,
            amount,
            description: splitSummary
                ? `تسديد إجمالي — توزيع تلقائي: ${splitSummary}`
                : 'تسديد إجمالي للإضبارة',
            balance: newBalance,
        };
        const nextLedger = [ledgerEntry, ...financialLedger];

        const partyMultiplicityPatch =
            additionalCreditorsList.length > 0 || pmBase.isSolidaryLiability != null
                ? {
                      party_multiplicity: {
                          ...pmBase,
                          additionalCreditors: additionalCreditorsList,
                      },
                  }
                : {};

        const mergePatch: Record<string, unknown> = {
            paidDebt: nextPaid,
            financialLedger: nextLedger,
            creditors: creditorsList,
            creditor: creditorsList[0] ?? fileSnap?.creditor,
            ...partyMultiplicityPatch,
        };

        const paySnap = buildExecutionTimelineSnapshot({
            executionData: executionDataRef.current
                ? { ...executionDataRef.current, ...mergePatch }
                : null,
            financialLedger: nextLedger,
            seizedAssets: seizedAssetsSnapshotRef.current,
        });

        const clientNote =
            distribution.clientCreditorTotal > 0
                ? ` — مبلغ موكلي المُرحَّل للمركز المالي: ${distribution.clientCreditorTotal.toLocaleString('ar-IQ')} د.ع`
                : '';

        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: payYmd,
                timestamp: payTs,
                title: newBalance === 0 ? '✅ تسديد كامل للمديونية' : '💰 تسديد للمديونية',
                description: `تم تسجيل تسديد بمبلغ ${amount.toLocaleString('ar-IQ')} د.ع.${splitSummary ? `\n${splitSummary}` : ''}\nالمتبقي: ${newBalance.toLocaleString('ar-IQ')} د.ع${clientNote}`,
                type: 'payment',
                source: 'تسديد الإضبارة',
                snapshot: paySnap,
            },
            { mergePatch }
        );
        setPaidDebt(nextPaid);
        setFinancialLedger(nextLedger);

        const exId = String(executionId ?? executionDataRef.current?.id ?? '').trim();
        if (distribution.clientCreditorTotal > 0 && exId) {
            const clientPaymentRow = {
                id: `pay-client-creditor-${Date.now()}`,
                amount: distribution.clientCreditorTotal,
                at: payTs,
                kind: 'partial' as const,
                entryType: 'collect' as const,
            };
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-unified-ledger-external-collect', {
                        detail: { executionId: exId, payment: clientPaymentRow },
                    })
                );
            } catch {
                /* ignore */
            }
        }

        showToast(`✅ تم تسجيل التسديد: ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
        setPaymentAmount('');
        setPaymentDate(getLocalTodayYmd());
        setShowPaymentModal(false);
    }, [
        paymentAmount,
        paymentDate,
        remaining,
        paidDebt,
        financialLedger,
        executionId,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
    ]);
    
    // 🆕 V9: PAYMENT CALCULATOR HANDLER
    // ✅ OPTIMIZED: useCallback
    const handlePaymentFromCalculator = useCallback(
        (amount: number) => {
            const newPaidDebt = paidDebt + amount;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            // Audit log: تسجيل الدفعة (dedupe key يمنع التكرار عند re-renders سريعة)
            if (executionId && amount > 0) {
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        const data = executionDataRef.current as Record<string, unknown> | undefined;
                        const caseNo =
                            (data?.executionCaseNumber as string | undefined) ||
                            (data?.caseNo as string | undefined) ||
                            String(executionId);
                        AuditLog.execution.paymentReceived({
                            executionId,
                            amount,
                            caseNo,
                        });
                    });
                } catch { /* silent */ }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const ledgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'payment' as const,
                amount: amount,
                description: `سداد دفعة نقدية`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const calcSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '💵 تم سداد دفعة نقدية',
                    description: `تم سداد دفعة نقدية بقيمة ${amount.toLocaleString('ar-IQ')} دينار. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} دينار.`,
                    type: 'payment',
                    source: 'حاسبة السداد',
                    snapshot: calcSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } }
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast(`✅ تم تسجيل السداد: ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
        },
        [
            executionId,
            totalOwed,
            paidDebt,
            financialLedger,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );

    const handleFundsLedgerPayment = useCallback(
        ({
            amount,
            kind,
            description,
        }: {
            amount: number;
            kind: 'full' | 'partial';
            description: string;
        }) => {
            if (!amount || amount <= 0) return;
            const newPaid = paidDebtRef.current + amount;
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaid,
                    });
                }
            }
            const newRemaining =
                totalWithExecutionFee -
                (newPaid + paidCourtFees + paidDirectorateFees + paidClientFees);
            const ledgerEntry = {
                id: nextTimelineId(),
                date: new Date().toISOString(),
                type: 'payment' as const,
                amount,
                description: `${description} (${kind === 'full' ? 'تسديد كامل' : 'جزئي'})`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedgerRef.current];
            const ts = new Date().toISOString();
            const evId = nextTimelineId();
            const fundsSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaid, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: evId,
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: kind === 'full' ? '✅ إغلاق الوعاء المالي الموحّد' : '💰 تسديد من الوعاء الموحّد',
                    description: `${description}. المبلغ: ${amount.toLocaleString('ar-IQ')} د.ع. المتبقي في اللوحة: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'payment',
                    source: 'إدارة الأموال والمصاريف',
                    snapshot: fundsSnap,
                },
                { mergePatch: { paidDebt: newPaid, financialLedger: nextLedger } }
            );
            setFinancialLedger(nextLedger);
            showToast(
                kind === 'full'
                    ? `✅ تم تسجيل التسديد الكامل للوعاء الموحّد`
                    : `✅ تم تسجيل دفعة ${amount.toLocaleString('ar-IQ')} د.ع`,
                'success'
            );
        },
        [
            executionId,
            totalWithExecutionFee,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            showToast,
            nextTimelineId,
            pushTimelineEvent,
        ]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; amount?: number }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            const myId = String(executionData?.id ?? executionId ?? '').trim();
            if (!evId || evId !== myId) return;
            const amt = Number(ce.detail?.amount ?? 0);
            if (!Number.isFinite(amt) || amt <= 0) return;
            const newPaid = Math.max(0, paidDebtRef.current - amt);
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaid,
                    });
                }
            }
            setFinancialLedger((prev) => {
                const next = prev.length > 0 ? prev.slice(1) : prev;
                queueMicrotask(() =>
                    persistExecutionMerge({ paidDebt: newPaid, financialLedger: next })
                );
                return next;
            });
        };
        window.addEventListener('hami-unified-ledger-payment-undo', handler as EventListener);
        return () =>
            window.removeEventListener('hami-unified-ledger-payment-undo', handler as EventListener);
    }, [executionData?.id, executionId, persistExecutionMerge]);
    
    // 🆕 V9: SETTLEMENT CALCULATOR HANDLER — لقطة زمنية + دمج ملف كمسار الدفع
    // ✅ OPTIMIZED: useCallback
    const handleSettlementFromCalculator = useCallback(
        (downPayment: number, monthlyInstallment: number) => {
            const newPaidDebt = paidDebt + downPayment;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const months =
                monthlyInstallment > 0 && newRemaining > 0
                    ? Math.ceil(newRemaining / monthlyInstallment)
                    : 0;

            const ledgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'settlement' as const,
                amount: downPayment,
                description: `تسوية قانونية — دفعة مقدمة. القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} د.ع؛ الأقساط المتوقعة: ${months} شهر`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const settlementSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '📅 تم إبرام تسوية قانونية',
                    description: `تم إبرام تسوية قانونية. الدفعة المقدمة: ${downPayment.toLocaleString('ar-IQ')} دينار، القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} دينار، عدد الأقساط المتوقعة: ${months} شهر. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'settlement',
                    source: 'حاسبة التسوية',
                    snapshot: settlementSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } }
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast(`✅ تم إبرام التسوية بنجاح`, 'success');
        },
        [
            executionId,
            totalOwed,
            paidDebt,
            financialLedger,
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        ]
    );
    
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
    useEffect(() => {
        if (!executionData?.id) return;
        const byHeir = executionData?.heirs_notification_workflow?.byHeir || {};
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        let changed = false;
        const nextByHeir: Record<string, any> = { ...byHeir };
        Object.entries(byHeir).forEach(([k, v]) => {
            const row = (v || {}) as Record<string, any>;
            const decisionId = String(row.investigationDecisionId || '').trim();
            if (!decisionId) return;
            const decision = rows.find((r) => String((r as { id?: unknown }).id ?? '') === decisionId);
            const outcome = String((decision as { executorOutcome?: unknown } | undefined)?.executorOutcome ?? 'pending');
            const mapped =
                outcome === 'approved'
                    ? 'approved'
                    : outcome === 'rejected' || outcome === 'alternative'
                      ? 'rejected'
                      : 'pending';
            if (String(row.investigationDecisionStatus || 'none') !== mapped) {
                nextByHeir[k] = { ...row, investigationDecisionStatus: mapped };
                changed = true;
            }
        });
        if (!changed) return;
        persistExecutionMerge({
            heirs_notification_workflow: {
                hasReceivedInitialNotice: true,
                byHeir: nextByHeir,
            },
        });
    }, [
        executionData?.id,
        executionData?.heirs_notification_workflow?.byHeir,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);
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
                    description: `الغاية: ${p || '—'}. تاريخ التبليغ المُسجَّل: ${m.date}`,
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
    
    // 🆕 V8: RESUME EXECUTION HANDLER (استئناف التنفيذ)
    const handleResumeExecution = () => {
        setExecutionPaused(false);
        const newEvent = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            title: '▶️ استئناف التنفيذ',
            description: 'تم استئناف التنفيذ بعد مراجعة الدائن',
            type: 'decision'
        };
        setTimelineEvents(prev => [newEvent, ...prev]);
        showToast('تم استئناف التنفيذ', 'success');
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
        // 1. Global State Mutation
        setGracePeriodActive(false);
        setGracePeriodEnded(true);
        
        // 2. Force timer to expired state (تواريخ محلية — بدون انزياح UTC)
        const notificationDate = debtorNotificationDate
            ? parseLocalNotificationDate(debtorNotificationDate)
            : new Date();
        const forcedDate = new Date(notificationDate.getTime());
        forcedDate.setDate(forcedDate.getDate() - 8); // Make it 8+ days ago
        setDebtorNotificationDate(formatDateToLocalYmd(forcedDate));
        
        const mergePatch: Record<string, unknown> = {
            gracePeriodEnded: true,
            gracePeriodActive: false,
        };
        if (!executionFeeInjected && calculatedExecutionFee > 0) {
            setExecutionFeeInjected(true);
            mergePatch.executionFeeInjected = true;
            pushTimelineEvent({
                id: `fee_end_grace_${Date.now()}`,
                date: getLocalTodayYmd(),
                timestamp: new Date().toISOString(),
                title: '💰 تطبيق رسم التحصيل 3%',
                description: `تم احتساب وإضافة رسم التحصيل البالغ ${calculatedExecutionFee.toLocaleString('ar-IQ')} دينار عراقي (3% من أصل الدين والرسوم القضائية) بسبب إعلان انتهاء المهلة القانونية`,
                type: 'payment',
            });
        }
        pushTimelineEvent(
            {
                id: `grace_end_${Date.now()}`,
                date: getLocalTodayYmd(),
                timestamp: new Date().toISOString(),
                title: '🚨 إعلان انتهاء المهلة القانونية',
                description:
                    'تم إعلان انتهاء المهلة القانونية البالغة 7 أيام وتفعيل الإجراءات الجبرية. جميع أدوات التنفيذ الجبري (حجز الراتب، الحجز العقاري، طلب الحبس) أصبحت متاحة الآن.',
                type: 'coercive',
            },
            { mergePatch }
        );
        
        // 5. UI Feedback
        showToast('⚠️ تم تفعيل التنفيذ الجبري وإضافة الرسوم المطلوبة', 'warning');
        
        // 6. Update last action date
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
        const datePart = ymd ? `\nتاريخ تبليغ الورثة المسجَّل: ${ymd}.` : '';
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
                'المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة المهلة.',
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
                : 'تم تسجيل المهلة — يُحدَّث السجل والمواعيد تلقائياً.',
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

    const savePoliceAssistanceEntry = useCallback(
        (input: { decisionId: string; agencyName: string; linkToTasks?: boolean }) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن حفظ القوة الجبرية — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const decisionId = String(input.decisionId || '').trim();
            if (!decisionId) return;
            const agency = String(input.agencyName || '').trim();
            if (!agency) {
                showToast('أدخل اسم الجهة المرافقة', 'warning');
                return;
            }

            const now = new Date().toISOString();
            const storageId = String(
                decisionsStorageExecutionId || executionData?.id || executionId || ''
            ).trim();
            const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
                policeAssistanceSavedAt: now,
                policeAssistanceAgency: agency,
            });
            if (!ok) {
                showToast('تعذر حفظ بيانات القوة الإجرائية — تحقق من قرار المنفذ.', 'error');
                return;
            }

            const linked = executorApprovalActions.getFieldVisitDeadlineIso();
            let dueYmd = now.slice(0, 10);
            if (linked) {
                const d = new Date(linked);
                if (!Number.isNaN(d.getTime())) {
                    dueYmd = formatDateToLocalYmd(d);
                } else if (/^\d{4}-\d{2}-\d{2}/.test(linked)) {
                    dueYmd = linked.slice(0, 10);
                }
            }

            const ev: TimelineEvent = {
                id: nextTimelineId(),
                type: 'eviction',
                date: now.slice(0, 10),
                timestamp: now,
                title: '🛡️ القوة الجبرية',
                description: `الجهة المرافقة: ${agency}`,
                source: 'الإجراءات الجبرية — تخلية',
                metadata: {
                    evictionActionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                    decisionRowId: decisionId,
                    policeAssistanceAgency: agency,
                },
            };
            const linkToTasks = input.linkToTasks !== false;
            let nextTimeline = [ev, ...timelineEventsRef.current];
            let nextTasks = caseTasksPendingRef.current;

            if (linkToTasks) {
                const taskId = nextTimelineId();
                const taskTitle = '🛡️ متابعة القوة الجبرية';
                const taskBody = `الجهة المرافقة: ${agency}`;
                nextTasks = [
                    {
                        id: taskId,
                        title: taskTitle,
                        body: taskBody,
                        dueDate: dueYmd,
                        createdAt: now,
                    },
                    ...nextTasks,
                ];
                nextTimeline = [
                    {
                        id: nextTimelineId(),
                        type: 'other',
                        date: now,
                        timestamp: now,
                        title: `📌 مهمة قيد الإنجاز: ${taskTitle}`,
                        description: `${taskBody}\n\n📅 تاريخ الإنجاز المطلوب: ${dueYmd}`,
                        source: 'الإجراءات الجبرية — تخلية',
                    },
                    ...nextTimeline,
                ];
            }

            setCaseTasksPending(nextTasks);
            setTimelineEvents(nextTimeline);
            persistExecutionMerge({
                eviction_police_assistance: {
                    decisionId,
                    agencyName: agency,
                    dueYmd,
                    savedAt: now,
                    completedAt: null,
                },
                timelineEvents: nextTimeline,
                ...(linkToTasks ? { caseTasksPending: nextTasks } : {}),
            });

            setPoliceAssistanceDecisionId(null);
            setPoliceAssistanceRequestTitle('');
            setPoliceAssistanceAgencyDraft('');
            setPoliceAssistanceModalOpen(false);
            showToast(
                linkToTasks
                    ? 'تم حفظ القوة الجبرية وإضافتها إلى المهام'
                    : 'تم حفظ القوة الجبرية في السجل',
                'success'
            );
        },
        [
            evictionProcedureLocked,
            showToast,
            decisionsStorageExecutionId,
            executorApprovalActions,
            nextTimelineId,
            persistExecutionMerge,
            executionData?.id,
            executionId,
        ]
    );

    const savePoliceAssistanceFromModal = useCallback(
        (agencyName: string, options?: { linkToTasks?: boolean }) => {
            const decisionId = String(policeAssistanceDecisionId || '').trim();
            if (!decisionId) return;
            savePoliceAssistanceEntry({
                decisionId,
                agencyName,
                linkToTasks: options?.linkToTasks,
            });
        },
        [policeAssistanceDecisionId, savePoliceAssistanceEntry]
    );

    const saveBreakInventoryLedgerEntry = useCallback(
        (input: { decisionId: string; payload: BreakInventoryFurnitureSavePayload }) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن حفظ الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const decisionId = String(input.decisionId || '').trim();
            if (!decisionId) return;
            const storageId = String(
                decisionsStorageExecutionId || executionData?.id || executionId || ''
            ).trim();
            const ts = new Date().toISOString();
            const payload = input.payload;
            const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
                breakInventoryFurnitureLedgerAt: ts,
                breakInventoryFurnitureMode: payload.mode,
                breakInventoryFurnitureLines:
                    payload.mode === 'list'
                        ? payload.lines.map((s) => s.trim()).filter(Boolean)
                        : [],
            });
            if (!ok) {
                showToast('تعذر حفظ الجرد — تحقق من قرار المنفذ.', 'error');
                return;
            }
            const body =
                payload.mode === 'none'
                    ? 'إقرار: لا يوجد أثاث منقول في العين وقت الجرد (كسر الأقفال والجرد).'
                    : [
                          'قائمة المنقولات المجرودة (كسر الأقفال والجرد):',
                          ...payload.lines
                              .map((s) => s.trim())
                              .filter(Boolean)
                              .map((l, i) => `${i + 1}. ${l}`),
                      ].join('\n');
            const now = new Date().toISOString();
            const noteId = `note_${Date.now()}`;
            setCaseNotesLog((prev) => {
                const next = [
                    {
                        id: noteId,
                        title: 'جرد الأثاث — كسر الأقفال والجرد',
                        body,
                        createdAt: now,
                    },
                    ...prev,
                ];
                queueMicrotask(() => {
                    persistExecutionMergeRef.current?.({ caseNotesLog: next });
                });
                return next;
            });
            showToast('تم حفظ الجرد في قسم الملاحظات', 'success');
        },
        [
            evictionProcedureLocked,
            showToast,
            decisionsStorageExecutionId,
            executionData?.id,
            executionId,
        ]
    );

    const finalizeBreakInventoryEntry = useCallback(
        (input: { decisionId: string }) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن تأكيد الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const decisionId = String(input.decisionId || '').trim();
            if (!decisionId) return;
            const storageId = String(
                decisionsStorageExecutionId || executionData?.id || executionId || ''
            ).trim();
            const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
                breakInventoryFurnitureFinalizedAt: new Date().toISOString(),
            });
            if (!ok) {
                showToast('تعذر تأكيد اكتمال الجرد', 'error');
                return;
            }
            showToast('تم إنهاء الجرد وإغلاق الطلب', 'success');
        },
        [
            evictionProcedureLocked,
            showToast,
            decisionsStorageExecutionId,
            executionData?.id,
            executionId,
        ]
    );

    const saveMaritalFurnitureDeliveryInventoryEntry = useCallback(
        (input: { decisionId: string; items: import('@/app/types/maritalFurniture').MaritalFurnitureItem[] }) => {
            if (evictionProcedureLocked) {
                showToast('لا يمكن حفظ الجرد — الإضبارة أو الإجراءات مقفلة.', 'warning');
                return;
            }
            const decisionId = String(input.decisionId || '').trim();
            if (!decisionId) return;
            const normalized = normalizeMaritalFurnitureItems(input.items).map((row) => ({
                ...row,
                delivered: input.items.find((i) => i.id === row.id)?.delivered === true,
            }));
            if (normalized.length === 0) {
                showToast('لا توجد قطع أثاث لحفظ حالة التسليم', 'warning');
                return;
            }

            const storageId = String(
                decisionsStorageExecutionId || executionData?.id || executionId || ''
            ).trim();
            const ts = new Date().toISOString();
            const undeliveredTotal = sumUndeliveredMaritalFurnitureTotal(normalized);
            const furnitureValue = sumMaritalFurnitureTotal(normalized);
            const body = buildMaritalFurnitureDeliveryNoteBody(normalized);

            const { ok } = patchExecutorDecisionRowReliable(storageId, decisionId, {
                breakInventoryFurnitureLedgerAt: ts,
                breakInventoryFurnitureMode: 'marital_delivery',
                breakInventoryFurnitureLines: normalized.map(
                    (row) =>
                        `${row.name}|${row.quantity}|${row.delivered ? 'delivered' : 'undelivered'}`
                ),
            });
            if (!ok) {
                showToast('تعذر حفظ جرد التسليم — تحقق من قرار المنفذ.', 'error');
                return;
            }

            persistExecutionMerge({
                maritalFurnitureItems: normalized,
                furnitureValue,
                furnitureDetails: furnitureDetailsFromItems(normalized),
                maritalFurnitureDeliveryRecordedAt: ts,
                totalAmount: undeliveredTotal,
                debtAmount: undeliveredTotal,
            });

            const noteId = `note_${Date.now()}`;
            setCaseNotesLog((prev) => {
                const next = [
                    {
                        id: noteId,
                        title: 'جرد تسليم الأثاث الزوجية',
                        body,
                        createdAt: ts,
                    },
                    ...prev,
                ];
                queueMicrotask(() => {
                    persistExecutionMergeRef.current?.({ caseNotesLog: next });
                });
                return next;
            });

            showToast(
                undeliveredTotal > 0
                    ? `تم حفظ التسليم — ${undeliveredTotal.toLocaleString('ar-IQ')} د.ع غير مُسلَّم في المركز المالي`
                    : 'تم حفظ التسليم — جميع القطع مُسلَّمة ولا مبلغ في المركز المالي',
                'success'
            );
        },
        [
            evictionProcedureLocked,
            showToast,
            decisionsStorageExecutionId,
            executionData?.id,
            executionId,
            persistExecutionMerge,
        ]
    );

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

    // 🆕 V7: COERCIVE ACTION HANDLERS — تعدّد الخصوم + تضامن (توجيه الإجراء)
    const handleCoerciveAction = (actionType: string) => {
        if (coerciveUiLocked) {
            showToast('⏸️ الإضبارة موقوفة قانونياً. يجب استئناف التنفيذ أولاً.', 'warning');
            return;
        }
        if (actionType === 'salary' && !activeDebtorIsEmployee) {
            showToast('حجز الراتب متاح للمدين الموظف فقط.', 'info');
            return;
        }

        if (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') {
            const exId = String(decisionsStorageExecutionId ?? '').trim();
            if (exId && exId !== 'undefined') {
                const wantedSubtype = actionType === 'vehicle' ? 'movable_auction' : actionType;
                const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
                const awaiting = rows.find((r) => {
                    if (String(r.requestKind || '') !== 'seizure') return false;
                    if (String((r as any).seizureRequestSavedAt || '').trim()) return false;
                    const o = String((r as any).executorOutcome || '').trim();
                    const appealStatus = String((r as any).appealStatus || '').trim();
                    const appealResult = String((r as any).appealResult || '').trim();
                    const appealWorkflowState = String((r as any).appealWorkflowState || '').trim();
                    const approved =
                        o === 'approved' ||
                        o === 'alternative' ||
                        (o === 'rejected' &&
                            (appealStatus === 'overturned' ||
                                appealResult === 'نقض القرار' ||
                                appealWorkflowState === 'REVOKED_BY_APPEAL'));
                    if (!approved) return false;
                    let subtype = String((r as any).seizureSubtype || '').trim();
                    if (!subtype) {
                        const t = `${String((r as any).title || '')}\n${String((r as any).body || '')}`;
                        if (/لدى الغير/i.test(t)) subtype = 'third_party';
                        else if (/إشارة|اشارة/i.test(t)) subtype = 'notice';
                        else if (/راتب|مخصصات|مكاف/i.test(t)) subtype = 'salary';
                        else if (/مال منقول|منقول|مركبة/i.test(t)) subtype = 'movable_auction';
                        else if (/عقار/i.test(t)) subtype = 'property';
                        else subtype = 'property';
                    }
                    return subtype === wantedSubtype;
                });

                const decisionId = String((awaiting as any)?.id || '').trim();
                if (decisionId) {
                    setShowUnifiedExecutionModal(true);
                    openSeizureRequestsTabRef.current();
                    showToast('يوجد طلب حجز موافق عليه يحتاج إكمال البيانات داخل محضر المتابعة.', 'info', {
                        decisionsLink: true,
                        decisionId,
                        decisionsTab: 'current',
                    });
                    return;
                }
            }
        }

        const multi = allDebtorsUnified.length > 1;
        const activeRow = allDebtorsUnified[executionDebtorTabIndex];
        const activeSolidary = activeRow ? resolveDebtorSolidaryFlag(activeRow) : isSolidaryLiability;

        if (activeSolidary && multi) {
            const selectable = allDebtorsUnified.filter(
                (r) => !r.cleared && resolveDebtorSolidaryFlag(r),
            );
            if (selectable.length === 0) {
                showToast('لا يوجد مدين نشط لتوجيه الإجراء ضده.', 'warning');
                return;
            }
            const preferred = allDebtorsUnified[executionDebtorTabIndex];
            const picked =
                preferred && !preferred.cleared && resolveDebtorSolidaryFlag(preferred)
                    ? preferred
                    : selectable[0];
            coerciveSubjectRef.current = { id: picked.id, name: picked.name };
            saveCoerciveAction(actionType, buildInitialExecutorSeizureDetails(actionType));
            return;
        }

        if (!activeSolidary && multi) {
            const row = allDebtorsUnified[executionDebtorTabIndex];
            if (!row || row.cleared) {
                showToast(
                    'براءة ذمة هذا المدين — الإجراءات الجبرية معطّلة له في هذا التبويب.',
                    'warning'
                );
                return;
            }
            coerciveSubjectRef.current = { id: row.id, name: row.name };
            saveCoerciveAction(actionType, buildInitialExecutorSeizureDetails(actionType));
            return;
        }

        const sole = allDebtorsUnified[0];
        coerciveSubjectRef.current = sole
            ? { id: sole.id, name: sole.name }
            : {
                  id: '',
                  name: String((effectiveDebtors[0] as Debtor | undefined)?.name || 'المدين'),
              };
        saveCoerciveAction(actionType, buildInitialExecutorSeizureDetails(actionType));
    };

    const submitPropertySeizureRequest = useCallback(() => {
        const exId = String(decisionsStorageExecutionId ?? '').trim();
        if (!exId || exId === 'undefined') return;
        const subject = String(propertySeizureSubjectDraft || '').trim() || 'طلب حجز عقار';
        const body = `موضوع الطلب:\n${subject}`;
        const did = appendPendingExecutorSeizureDecision({
            executionId: exId,
            requestTitle: 'طلب حجز عقار — قيد البت لدى المنفذ',
            requestBody: body,
            seizureSubtype: 'property',
        });
        if (!did) {
            showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', { decisionsLink: true, decisionsTab: 'current' });
            return;
        }
        const now = new Date().toISOString();
        pushTimelineEvent({
            id: nextTimelineId(),
            date: now.slice(0, 10),
            timestamp: now,
            title: '📋 طلب حجز عقار — قيد البت',
            description: body,
            type: 'decision',
            source: 'محضر المتابعة',
            metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
        });
        showToast('تم إرسال طلب حجز العقار إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: did,
            decisionsTab: 'current',
        });
        setPropertySeizureRequestModalOpen(false);
        setPropertySeizureSubjectDraft('');
    }, [
        decisionsStorageExecutionId,
        nextTimelineId,
        propertySeizureSubjectDraft,
        pushTimelineEvent,
        showToast,
    ]);

    const submitMovableSeizureRequest = useCallback(() => {
        const exId = String(decisionsStorageExecutionId ?? '').trim();
        if (!exId || exId === 'undefined') return;
        const subject = String(movableSeizureSubjectDraft || '').trim() || 'طلب حجز مال منقول';
        const body = `موضوع الطلب:\n${subject}`;
        const did = appendPendingExecutorSeizureDecision({
            executionId: exId,
            requestTitle: 'طلب حجز مال منقول — قيد البت لدى المنفذ',
            requestBody: body,
            seizureSubtype: 'movable_auction',
        });
        if (!did) {
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
            title: '📦 طلب حجز مال منقول — قيد البت',
            description: body,
            type: 'decision',
            source: 'محضر المتابعة',
            metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
        });
        showToast('تم إرسال طلب الحجز إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: did,
            decisionsTab: 'current',
        });
        setMovableSeizureRequestModalOpen(false);
        setMovableSeizureSubjectDraft('');
    }, [
        decisionsStorageExecutionId,
        movableSeizureSubjectDraft,
        nextTimelineId,
        pushTimelineEvent,
        showToast,
    ]);

    const saveSeizedPropertyInitForDecision = useCallback(
        (input: {
            decisionId: string;
            subject?: string;
            propertyNumber: string;
            propertyGender: RealEstateGender;
            deedNotes: string;
        }) => {
            const exId = String(decisionsStorageExecutionId ?? '').trim();
            const decisionId = String(input.decisionId || '').trim();
            if (!exId || exId === 'undefined' || !decisionId) return;
            const propertyNumber = String(input.propertyNumber || '').trim();
            if (!propertyNumber) {
                showToast('أدخل رقم العقار.', 'warning');
                return;
            }
            const deedNotes = String(input.deedNotes || '').trim();
            if (!deedNotes) {
                showToast('أدخل تفاصيل السند.', 'warning');
                return;
            }
            const nowIso = new Date().toISOString();
            const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
            const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
            const next: SeizedProperty[] = [...prev];
            const nextRow: SeizedProperty = {
                id: existingIdx >= 0 ? String(next[existingIdx].id) : `sp_${decisionId}`,
                decisionRowId: decisionId,
                propertyNumber,
                district: String((existingIdx >= 0 ? next[existingIdx].district : '') || ''),
                propertyGender: input.propertyGender,
                deedNotes,
                status: 'seized',
                seizedAtIso: nowIso,
                subject: String(input.subject || '').trim() || undefined,
            };
            if (existingIdx >= 0) next[existingIdx] = { ...next[existingIdx], ...nextRow };
            else next.unshift(nextRow);
            persistExecutionMerge({ seizedProperties: next });
            patchExecutorDecisionRow(exId, decisionId, {
                seizureRequestSavedAt: nowIso,
                seizureRequestDetails: `رقم العقار: ${propertyNumber}\nالجنس: ${input.propertyGender}\nتفاصيل السند:\n${deedNotes}`,
            });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '🏠 حفظ بيانات العقار (بعد موافقة المنفذ)',
                description: `رقم العقار: ${propertyNumber}\nالجنس: ${input.propertyGender}\nتفاصيل السند:\n${deedNotes}`,
                type: 'decision',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedPropertyId: nextRow.id, decisionRowId: decisionId },
            });
            showToast('تم حفظ بيانات العقار وإنشاء البطاقة داخل الأموال المحجوزة.', 'success');
        },
        [decisionsStorageExecutionId, nextTimelineId, persistExecutionMerge, pushTimelineEvent, showToast]
    );

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

    const saveSeizedMovableInitForDecision = useCallback(
        (input: {
            decisionId: string;
            subject?: string;
            movableDescription: string;
            movableLocation: string;
            judicialCustodianName: string;
        }) => {
            const exId = String(decisionsStorageExecutionId ?? '').trim();
            const decisionId = String(input.decisionId || '').trim();
            if (!exId || exId === 'undefined' || !decisionId) return;
            const desc = String(input.movableDescription || '').trim();
            if (!desc) {
                showToast('أدخل وصف المال المنقول.', 'warning');
                return;
            }
            const loc = String(input.movableLocation || '').trim();
            if (!loc) {
                showToast('أدخل مكان تواجد المال المنقول.', 'warning');
                return;
            }
            const cust = String(input.judicialCustodianName || '').trim();
            if (!cust) {
                showToast('أدخل اسم الحارس القضائي.', 'warning');
                return;
            }
            const nowIso = new Date().toISOString();
            const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
            const existingIdx = prev.findIndex((x) => String(x.decisionRowId || '') === decisionId);
            const next: SeizedMovable[] = [...prev];
            const nextRow: SeizedMovable = {
                id: existingIdx >= 0 ? String(next[existingIdx].id) : `sm_${decisionId}`,
                decisionRowId: decisionId,
                movableDescription: desc,
                movableLocation: loc,
                judicialCustodianName: cust,
                status: 'seized',
                seizedAtIso: nowIso,
                subject: String(input.subject || '').trim() || undefined,
            };
            if (existingIdx >= 0) next[existingIdx] = nextRow;
            else next.unshift(nextRow);
            persistExecutionMerge({ seizedMovables: next });
            patchExecutorDecisionRow(exId, decisionId, {
                seizureRequestSavedAt: nowIso,
                seizureRequestDetails: `وصف المال المنقول: ${desc}\nالمكان: ${loc}\nالحارس القضائي: ${cust}`,
            });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '📦 حفظ بيانات المال المنقول (بعد موافقة المنفذ)',
                description: `وصف المال المنقول: ${desc}\nالمكان: ${loc}\nالحارس القضائي: ${cust}`,
                type: 'decision',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedMovableId: nextRow.id, decisionRowId: decisionId },
            });
            showToast('تم حفظ بيانات المال المنقول وإنشاء البطاقة داخل الأموال المحجوزة.', 'success');
        },
        [decisionsStorageExecutionId, nextTimelineId, persistExecutionMerge, pushTimelineEvent, showToast]
    );

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
        const entityId = String(seizureMarkModalEntityId || '').trim();
        const entityKind = seizureMarkModalEntityKind;
        if (!entityId) return;
        const letterNo = String(seizureMarkLetterNumberDraft || '').trim();
        if (!letterNo) {
            showToast('أدخل رقم كتاب التأييد.', 'warning');
            return;
        }
        const ymd = String(seizureMarkDateDraft || '').trim();
        if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('اختر تاريخ الكتاب بشكل صحيح.', 'warning');
            return;
        }
        const entity = String(seizureMarkEntityDraft || '').trim();
        if (!entity) {
            showToast('أدخل الجهة المجيبة.', 'warning');
            return;
        }
        const nowIso = new Date().toISOString();
        if (entityKind === 'movable') {
            const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
            const idx = prev.findIndex((x) => String(x.id) === entityId);
            if (idx < 0) return;
            const next = [...prev];
            next[idx] = {
                ...(next[idx] as any),
                seizureMarkLetterNumber: letterNo,
                seizureMarkDate: ymd,
                seizureMarkEntity: entity,
            } as any;
            persistExecutionMerge({ seizedMovables: next });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '📨 تسجيل كتاب تأييد وضع الإشارة — مال منقول',
                description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedMovableId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
            });
        } else {
            const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
            const idx = prev.findIndex((x) => String(x.id) === entityId);
            if (idx < 0) return;
            const next = [...prev];
            next[idx] = {
                ...(next[idx] as any),
                seizureMarkLetterNumber: letterNo,
                seizureMarkDate: ymd,
                seizureMarkEntity: entity,
            } as any;
            persistExecutionMerge({ seizedProperties: next });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '📨 تسجيل كتاب تأييد وضع الإشارة — عقار',
                description: `رقم الكتاب: ${letterNo}\nتاريخ الكتاب: ${ymd}\nالجهة المجيبة: ${entity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedPropertyId: entityId, seizureMarkLetterNumber: letterNo, seizureMarkEntity: entity },
            });
        }
        setSeizureMarkModalOpen(false);
        setSeizureMarkModalEntityId(null);
        setSeizureMarkLetterNumberDraft('');
        setSeizureMarkDateDraft('');
        setSeizureMarkEntityDraft('');
        showToast('تم تسجيل كتاب التأييد وتحديث البطاقة فوراً.', 'success');
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
        const entityId = String(publicationModalEntityId || '').trim();
        const entityKind = publicationModalEntityKind;
        if (!entityId) return;
        const newspaperName = String(publicationNewspaperNameDraft || '').trim();
        if (!newspaperName) {
            showToast('أدخل اسم الصحيفة.', 'warning');
            return;
        }
        const ymd = String(publicationDateYmdDraft || '').trim();
        if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('اختر تاريخ النشر بشكل صحيح.', 'warning');
            return;
        }
        const nowIso = new Date().toISOString();
        if (entityKind === 'movable') {
            const prev = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
            const idx = prev.findIndex((x) => String(x.id) === entityId);
            if (idx < 0) return;
            const next = [...prev];
            next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
            persistExecutionMerge({ seizedMovables: next });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '📰 توثيق النشر والإعلان — مال منقول',
                description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
                type: 'coercive',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedMovableId: entityId, newspaperName, publicationDateYmd: ymd },
            });
        } else {
            const prev = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
            const idx = prev.findIndex((x) => String(x.id) === entityId);
            if (idx < 0) return;
            const next = [...prev];
            next[idx] = { ...(next[idx] as any), newspaperName, publicationDateYmd: ymd } as any;
            persistExecutionMerge({ seizedProperties: next });
            pushTimelineEvent({
                id: nextTimelineId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: '📰 توثيق النشر والإعلان — عقار',
                description: `الصحيفة: ${newspaperName}\nتاريخ النشر: ${ymd}`,
                type: 'coercive',
                source: 'محضر المتابعة — الأموال المحجوزة',
                metadata: { seizedPropertyId: entityId, newspaperName, publicationDateYmd: ymd },
            });
        }
        setPublicationModalOpen(false);
        setPublicationModalEntityId(null);
        setPublicationNewspaperNameDraft('');
        setPublicationDateYmdDraft('');
        showToast('تم حفظ بيانات النشر وتحديث البطاقة فوراً.', 'success');
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
        const exId = String(decisionsStorageExecutionId ?? '').trim();
        const decisionId = String(seizedPropertyStepDecisionId || '').trim();
        const entityKind = seizedPropertyStepEntityKind;
        const entityId = String(seizedPropertyStepPropertyId || '').trim();
        const step = seizedPropertyStepKind;
        if (!exId || exId === 'undefined' || !decisionId || !entityId || !step) return;
        const prev =
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
        const idx = prev.findIndex((x) => String((x as any).id) === entityId);
        if (idx < 0) {
            showToast(
                entityKind === 'movable' ? 'لم يتم العثور على المال المنقول داخل الإضبارة.' : 'لم يتم العثور على العقار داخل الإضبارة.',
                'warning'
            );
            return;
        }
        const nowIso = new Date().toISOString();
        const cur = prev[idx] as any;
        const next = [...prev];

        const header =
            entityKind === 'movable'
                ? `وصف المال: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}`
                : `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}`;

        let title = '';
        let desc = '';
        let patch: Record<string, unknown> = {};

        if (step === 'experts') {
            const expertNamesRaw = String(seizedPropertyExpertsNamesDraft || '').trim();
            const expertNames = expertNamesRaw
                ? expertNamesRaw
                      .split(/[,\n،]+/g)
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];
            if (expertNames.length === 0) {
                showToast('أدخل أسماء الخبراء.', 'warning');
                return;
            }
            const requiredExperts = readExpertCommitteeSize(cur as any);
            if (expertNames.length !== requiredExperts) {
                showToast(
                    `يجب إدخال ${requiredExperts} ${requiredExperts === 1 ? 'خبير' : 'خبراء'} بالضبط (${expertCommitteeSizeLabelAr(requiredExperts)}).`,
                    'warning'
                );
                return;
            }
            const reportYmd = String(seizedPropertyExpertReportDateDraft || '').trim();
            if (!reportYmd || !/^\d{4}-\d{2}-\d{2}$/.test(reportYmd)) {
                showToast('اختر تاريخ تقرير الخبراء بشكل صحيح.', 'warning');
                return;
            }
            const priceRaw = String(seizedPropertyExpertPriceDraft || '')
                .replace(/[^\d]/g, '')
                .replace(/,/g, '')
                .trim();
            const price = priceRaw ? Number(priceRaw) : NaN;
            if (!Number.isFinite(price) || price <= 0) {
                showToast('أدخل السعر المقدر بشكل صحيح.', 'warning');
                return;
            }
            title = '🧾 تسجيل تقرير الخبراء';
            desc = `${header}\nالسعر المقدر: ${Number(price).toLocaleString('ar-IQ')} د.ع\nتاريخ التقرير: ${reportYmd}\nالخبراء: ${expertNames.join('، ')}`;
            patch = {
                status: 'valued',
                ...(entityKind === 'movable' ? {} : { estimatedPriceIqd: price }),
                expertEstimatedAmountIqd: price,
                expertNames,
                expertCommitteeSize: requiredExperts,
                expertReportDateYmd: reportYmd,
                experts: { expertName: expertNames.join('، '), estimatedPriceIqd: price, recordedAtIso: nowIso },
            };
        } else if (step === 'auction') {
            const ymd = String(seizedPropertyAuctionDateDraft || '').trim();
            if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                showToast('اختر موعد المزايدة بشكل صحيح.', 'warning');
                return;
            }
            title = '📅 تسجيل موعد المزايدة';
            desc = `${header}\nموعد المزايدة: ${ymd}`;
            patch = {
                status: 'published',
                auctionDateYmd: ymd,
                auction: { auctionDateYmd: ymd, recordedAtIso: nowIso },
                newspaperName: '',
                publicationDateYmd: null,
            };
            const auctionPurpose =
                entityKind === 'movable'
                    ? 'موعد مزايدة — مال منقول محجوز'
                    : 'موعد مزايدة — عقار محجوز';
            pushSeizureAuctionCalendarAppointment({
                dossierId: exId,
                decisionId,
                ymd,
                purpose: auctionPurpose,
                linkToAppointments: linkSeizureAuctionToAppointments,
            });
        } else if (step === 'award') {
            const buyerName = String(seizedPropertyBuyerNameDraft || '').trim();
            if (!buyerName) {
                showToast('أدخل اسم المزايد الأخير/المشتري.', 'warning');
                return;
            }
            const amtRaw = String(seizedPropertyAwardAmountDraft || '')
                .replace(/[^\d]/g, '')
                .replace(/,/g, '')
                .trim();
            const amt = amtRaw ? Number(amtRaw) : NaN;
            if (!Number.isFinite(amt) || amt <= 0) {
                showToast('أدخل مبلغ الإحالة بشكل صحيح.', 'warning');
                return;
            }
            title = '✅ تسجيل الإحالة القطعية';
            desc = `${header}\nالمشتري: ${buyerName}\nمبلغ الإحالة: ${Number(amt).toLocaleString('ar-IQ')} د.ع`;
            patch = {
                status: 'sold',
                lastBidderOrBuyerName: buyerName,
                finalAwardAmountIqd: amt,
                award: { buyerName, awardAmountIqd: amt, recordedAtIso: nowIso },
            };
        } else if (step === 'reauction_default') {
            const notes = String(seizedPropertyStepNotesDraft || '').trim();
            title = '🔁 تسجيل النكول / إعادة المزايدة';
            desc = `${header}${notes ? `\nالسبب/الملاحظات:\n${notes}` : ''}`;
            patch = {
                reauctionDefault: { recordedAtIso: nowIso, ...(notes ? { notes } : {}) },
                status: 'published',
                initialAwardBuyerName: undefined,
                initialAwardAmountIqd: null,
                initialAwardRecordedAtIso: undefined,
                noBiddersRecordedAtIso: undefined,
                lastBidderOrBuyerName: undefined,
                finalAwardAmountIqd: null,
            };
        }

        (next as any)[idx] = { ...(cur as any), ...(patch as any) };

        if (entityKind === 'movable' && step === 'award') {
            const soldMovable = next[idx] as SeizedMovable;
            const ledgerParams = seizureMatrixLedgerParamsRef.current;
            const trustCredit = ledgerParams
                ? creditMovableProceedsForExecution(exId, soldMovable, ledgerParams, nowIso)
                : creditMovableSaleProceedsToTrustLedger({
                      executionId: exId,
                      movable: soldMovable,
                      at: nowIso,
                  });
            if (trustCredit.created || trustCredit.updated) {
                desc += `\n\n💰 تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع في الأمانات.`;
                setUnifiedLedgerRevision((v) => v + 1);
                showToast(
                    trustCredit.updated
                        ? `تم تصحيح حصيلة البيع في الأمانات: ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع`
                        : `تم إيداع ${trustCredit.amount.toLocaleString('ar-IQ')} د.ع (حصيلة البيع) في الأمانات.`,
                    'success'
                );
            }
        }

        persistExecutionMerge(entityKind === 'movable' ? { seizedMovables: next } : { seizedProperties: next });
        patchExecutorDecisionRowEverywhere(decisionId, {
            seizureRequestSavedAt: nowIso,
            seizureRequestDetails: desc,
        });
        try {
            window.dispatchEvent(
                new CustomEvent('hami-seizure-decision-step-saved', {
                    detail: { executionId: exId, decisionId },
                })
            );
        } catch {
            /* ignore */
        }
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title,
            description: desc,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata:
                entityKind === 'movable'
                    ? { seizedMovableId: entityId, decisionRowId: decisionId }
                    : { seizedPropertyId: entityId, decisionRowId: decisionId },
        });
        setSeizedPropertyStepModalOpen(false);
        setSeizedPropertyStepDecisionId(null);
        setSeizedPropertyStepPropertyId(null);
        setSeizedPropertyStepEntityKind('property');
        setSeizedPropertyStepKind(null);
        setSeizedPropertyExpertsNamesDraft('');
        setSeizedPropertyExpertReportDateDraft('');
        setSeizedPropertyExpertPriceDraft('');
        setSeizedPropertyAuctionDateDraft('');
        setSeizedPropertyBuyerNameDraft('');
        setSeizedPropertyAwardAmountDraft('');
        setSeizedPropertyStepNotesDraft('');
        showToast(entityKind === 'movable' ? 'تم حفظ نتيجة الخطوة وتحديث بطاقة المال المنقول.' : 'تم حفظ نتيجة الخطوة وتحديث بطاقة العقار.', 'success');
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
        const entityId = String(seizedPropertyAuctionResultPropertyId || '').trim();
        const entityKind = seizedPropertyAuctionResultEntityKind;
        if (!entityId) return;
        const prev =
            entityKind === 'movable'
                ? ((executionDataRef.current?.seizedMovables || []) as SeizedMovable[])
                : ((executionDataRef.current?.seizedProperties || []) as SeizedProperty[]);
        const idx = prev.findIndex((x) => String((x as any).id) === entityId);
        if (idx < 0) {
            showToast(entityKind === 'movable' ? 'لم يتم العثور على المال المنقول داخل الإضبارة.' : 'لم يتم العثور على العقار داخل الإضبارة.', 'warning');
            return;
        }

        const nowIso = new Date().toISOString();
        const cur = prev[idx] as any;
        const next = [...prev];

        const header =
            entityKind === 'movable'
                ? `وصف المال المنقول: ${String(cur.movableDescription || '').trim()}\nالمكان: ${String(cur.movableLocation || '').trim()}\nالحارس القضائي: ${String(cur.judicialCustodianName || '').trim()}`
                : `رقم العقار: ${String(cur.propertyNumber || '').trim()}\nالجنس: ${String(cur.propertyGender || '').trim()}`;

        const outcome = seizedPropertyAuctionResultOutcome;
        let title = '';
        let desc = '';
        let patch: Record<string, unknown> = {};

        if (outcome === 'initial_award') {
            const buyerName = String(seizedPropertyAuctionResultBuyerNameDraft || '').trim();
            if (!buyerName) {
                showToast('أدخل اسم المشتري.', 'warning');
                return;
            }
            const amtRaw = String(seizedPropertyAuctionResultAmountDraft || '')
                .replace(/[^\d]/g, '')
                .replace(/,/g, '')
                .trim();
            const amt = amtRaw ? Number(amtRaw) : NaN;
            if (!Number.isFinite(amt) || amt <= 0) {
                showToast('أدخل مبلغ رسو المزاد بشكل صحيح.', 'warning');
                return;
            }
            const depositRaw = String(seizedPropertyAuctionDepositAmountDraft || '')
                .replace(/[^\d]/g, '')
                .replace(/,/g, '')
                .trim();
            const deposit = depositRaw ? Number(depositRaw) : NaN;
            if (!Number.isFinite(deposit) || deposit <= 0) {
                showToast('أدخل مبلغ التأمينات القانونية المدفوعة (10%) بشكل صحيح.', 'warning');
                return;
            }
            title = '⚖️ نتيجة جلسة المزايدة — إحالة أولية';
            desc = `${header}\nالنتيجة: إحالة أولية (رسو المزاد)\nالمشتري: ${buyerName}\nمبلغ رسو المزاد: ${Number(amt).toLocaleString('ar-IQ')} د.ع\nالتأمينات القانونية (10%): ${Number(deposit).toLocaleString('ar-IQ')} د.ع`;
            patch = {
                status: 'initial_award',
                initialAwardBuyerName: buyerName,
                initialAwardAmountIqd: amt,
                auctionDepositAmountIqd: deposit,
                initialAwardRecordedAtIso: nowIso,
                noBiddersRecordedAtIso: undefined,
                lastBidderOrBuyerName: buyerName,
                finalAwardAmountIqd: null,
            };
        } else {
            title = '⚖️ نتيجة جلسة المزايدة — لا راغب بالشراء';
            desc = `${header}\nالنتيجة: عدم حصول راغب بالشراء`;
            patch = {
                status: 'no_bidders',
                noBiddersRecordedAtIso: nowIso,
                initialAwardBuyerName: undefined,
                initialAwardAmountIqd: null,
                initialAwardRecordedAtIso: undefined,
                lastBidderOrBuyerName: undefined,
                finalAwardAmountIqd: null,
            };
        }

        next[idx] = { ...cur, ...(patch as any) } as any;
        persistExecutionMerge(entityKind === 'movable' ? { seizedMovables: next } : { seizedProperties: next });
        pushTimelineEvent({
            id: nextTimelineId(),
            date: nowIso.slice(0, 10),
            timestamp: nowIso,
            title,
            description: desc,
            type: 'decision',
            source: 'محضر المتابعة — الأموال المحجوزة',
            metadata:
                entityKind === 'movable'
                    ? { seizedMovableId: entityId, auctionResultOutcome: outcome }
                    : { seizedPropertyId: entityId, auctionResultOutcome: outcome },
        });
        setSeizedPropertyAuctionResultModalOpen(false);
        setSeizedPropertyAuctionResultPropertyId(null);
        setSeizedPropertyAuctionResultEntityKind('property');
        setSeizedPropertyAuctionResultOutcome('initial_award');
        setSeizedPropertyAuctionResultBuyerNameDraft('');
        setSeizedPropertyAuctionResultAmountDraft('');
        setSeizedPropertyAuctionDepositAmountDraft('');
        showToast(entityKind === 'movable' ? 'تم تسجيل نتيجة جلسة المزايدة وتحديث حالة المال المنقول.' : 'تم تسجيل نتيجة جلسة المزايدة وتحديث حالة العقار.', 'success');
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

    /** تفاصيل فارغة + وصف مبدئي — تُرسَل لمركز القرارات دون إظهار نافذة الحقول قبل موافقة المنفذ */
    const buildInitialExecutorSeizureDetails = (actionType: string): Record<string, string> => {
        const base =
            actionType === 'salary' && activeDebtorIsDeceased
                ? 'طلب حجز الحوافز والمخصصات (مبدئي) — تُستكمل التفاصيل بعد موافقة منفذ العدل.'
                : 'طلب حجز مبدئي — تُستكمل بيانات التنفيذ بعد موافقة منفذ العدل.';
        return {
            seizureUiKind: actionType,
            employerName: '',
            salaryAmount: '',
            propertyAddress: '',
            propertyLocation: '',
            vehicleDescription: '',
            vehiclePlate: '',
            movableDescription: '',
            movableLocation: '',
            judicialCustodianName: '',
            description: base,
        };
    };

    // ✅ FIXED: Proper type for details
    const clearSettlementFromLedger = useCallback(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
        if (!exId) return;
        const key = storageKey(exId);
        const stored = storageCache.get(key);
        const current = parseUnifiedLedgerFromStorage(stored) ?? emptyStore();
        storageCache.set(key, clearSettlementFromStore(current));
        try {
            window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
        } catch {
            /* ignore */
        }
        setUnifiedLedgerRevision((v) => v + 1);
    }, [decisionsStorageExecutionId, executionId]);

    const clearActiveSalarySeizurePath = useCallback(() => {
        const exId = String(decisionsStorageExecutionId ?? executionId ?? '').trim();
        const nextAssets = releaseSalarySeizedAssets(
            seizedAssets as Array<Record<string, unknown>>
        ) as SeizedAsset[];
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
        if (exId) {
            const key = storageKey(exId);
            const stored = storageCache.get(key);
            const current = parseUnifiedLedgerFromStorage(stored) ?? emptyStore();
            storageCache.set(key, clearSalarySeizureFromStore(current));
            try {
                storageCache.remove(executionGarnishmentFlagStorageKey(exId));
                storageCache.remove(executionGarnishmentDetailsStorageKey(exId));
            } catch {
                /* ignore */
            }
            try {
                window.dispatchEvent(new CustomEvent('hami-unified-ledger-updated'));
            } catch {
                /* ignore */
            }
            setUnifiedLedgerRevision((v) => v + 1);
        }
        showToast('تم إلغاء مسار حجز الراتب — يُتابَع التسوية فقط.', 'info');
    }, [decisionsStorageExecutionId, executionId, persistExecutionMerge, seizedAssets, showToast]);

    const saveCoerciveAction = (
        actionType: string,
        details: Record<string, string>,
        opts?: { skipSettlementConflictCheck?: boolean }
    ) => {
        setShowCoerciveActionForm(null);

        const directDecisionRowId =
            (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
            /\S/.test(String((details as any).decisionRowId || '').trim())
                ? String((details as any).decisionRowId || '').trim()
                : '';

        if (
            actionType === 'salary' &&
            directDecisionRowId &&
            !opts?.skipSettlementConflictCheck &&
            settlementGuarantorGate.pendingSettlement
        ) {
            void (async () => {
                const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
                if (choice === 'keep_settlement') {
                    showToast('تم الإبقاء على التسوية — أُلغي إكمال حجز الراتب.', 'info');
                    return;
                }
                clearSettlementFromLedger();
                saveCoerciveAction(actionType, details, { skipSettlementConflictCheck: true });
            })();
            return;
        }

        if (
            (seizureDetailCompletion &&
                (actionType === 'salary' || actionType === 'property' || actionType === 'vehicle') &&
                seizureDetailCompletion.actionType === actionType) ||
            directDecisionRowId
        ) {
            const decisionRowId = directDecisionRowId || seizureDetailCompletion!.decisionRowId;
            const existingByDecisionRowId = seizedAssets.find(
                (a) => String((a.details as any)?.decisionRowId || '') === String(decisionRowId)
            );
            const assetId =
                directDecisionRowId && existingByDecisionRowId?.id
                    ? existingByDecisionRowId.id
                    : seizureDetailCompletion?.assetId || `sz_${String(decisionRowId)}_${Date.now()}`;
            if (seizureDetailCompletion && !directDecisionRowId) {
                setSeizureDetailCompletion(null);
            }

            let mergedDesc = (details.description || '').trim();
            if (!mergedDesc && actionType === 'salary') {
                const dedRaw = String((details as any).monthlyDeductionIqd || '').trim();
                const parsedDeductionEarly = Number(dedRaw.replace(/,/g, ''));
                mergedDesc = buildSalarySeizureDescriptionText({
                    employerName: String(details.employerName || ''),
                    salaryAmount: String(details.salaryAmount || ''),
                    monthlyDeductionIqd:
                        Number.isFinite(parsedDeductionEarly) && parsedDeductionEarly > 0
                            ? Math.trunc(parsedDeductionEarly)
                            : undefined,
                    activeDebtorIsDeceased,
                    subject: resolveSalarySeizureSubject(
                        {
                            details: {
                                ...details,
                                decisionRowId: String(decisionRowId),
                            },
                        },
                        executionData ?? null,
                        String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined
                    ),
                });
            } else if (!mergedDesc && actionType === 'property') {
                mergedDesc = `رقم العقار: ${details.propertyNumber || ''}\nالمقاطعة: ${details.propertyDistrict || ''}\nالنوع: ${details.propertyType || ''}`.trim();
            } else if (!mergedDesc && actionType === 'vehicle') {
                const cust = String(details.judicialCustodianName || '').trim();
                mergedDesc = [
                    `وصف المال المنقول: ${String(details.movableDescription || details.movableAssetType || details.vehicleDescription || '').trim()}`,
                    `المكان: ${String(details.movableLocation || '').trim()}`,
                    cust ? `الحارس القضائي: ${cust}` : null,
                ]
                    .filter(Boolean)
                    .join('\n')
                    .trim();
            }

            const baseAssetType =
                actionType === 'salary' ? 'salary' : actionType === 'property' ? 'real_estate' : 'movable';
            const today = getLocalTodayYmd();
            const nextAssets = (() => {
                const existing = seizedAssets.find((a) => a.id === assetId);
                if (!existing) {
                    const next = [
                        {
                            id: assetId,
                            type: baseAssetType,
                            description: mergedDesc || undefined,
                            status: 'seized',
                            seizureDate: today,
                            details: {
                                ...details,
                                decisionRowId: String(decisionRowId),
                                seizureUiKind: actionType,
                            } as any,
                        },
                        ...seizedAssets,
                    ];
                    return next as any;
                }
                return seizedAssets.map((a) => {
                    if (a.id !== assetId) return a;
                    const prevDetails =
                        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                            ? (a.details as Record<string, unknown>)
                            : {};
                    return {
                        ...a,
                        type: String((a as any).type || '').trim() ? (a as any).type : baseAssetType,
                        status: String((a as any).status || '').trim() ? (a as any).status : 'seized',
                        seizureDate: (a as any).seizureDate || today,
                        description: mergedDesc || a.description,
                        estimatedValue: a.estimatedValue,
                        notes: a.notes,
                        details: {
                            ...prevDetails,
                            ...details,
                            decisionRowId: String(decisionRowId),
                            seizureUiKind: actionType,
                        },
                    };
                });
            })();
            setSeizedAssets(nextAssets);

            const now = new Date().toISOString();
            const titleAr =
                actionType === 'salary'
                    ? activeDebtorIsDeceased
                        ? '💼 حجز الحوافز والمخصصات'
                        : '💼 حجز الراتب'
                    : actionType === 'property'
                      ? '🏠 تثبيت بيانات حجز العقار'
                      : '📦 تثبيت بيانات حجز مال منقول';
            const descLines = mergedDesc;
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: titleAr,
                description: descLines || undefined,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز المالي',
                metadata: {
                    timelineThreadKey: `seizure_details_saved:${assetId}`,
                    seizureAssetId: assetId,
                    decisionRowId,
                },
            };
            const nextTimeline = [ev, ...timelineEvents];
            setTimelineEvents(nextTimeline);

            const persistPatch: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTimeline };
            if (actionType === 'property') {
                const prevProps = (executionDataRef.current?.seizedProperties || []) as SeizedProperty[];
                persistPatch.seizedProperties = upsertSeizedPropertyFromDetails(prevProps, decisionRowId, {
                    propertyNumber: String(details.propertyNumber || '').trim(),
                    propertyDistrict: String(details.propertyDistrict || '').trim(),
                    propertyType: String(details.propertyType || '').trim(),
                });
            }
            if (actionType === 'vehicle') {
                const prevMov = (executionDataRef.current?.seizedMovables || []) as SeizedMovable[];
                persistPatch.seizedMovables = upsertSeizedMovableFromDetails(prevMov, decisionRowId, {
                    movableDescription: String(
                        details.movableDescription || details.movableAssetType || details.vehicleDescription || ''
                    ).trim(),
                    movableLocation: String(details.movableLocation || '').trim(),
                    judicialCustodianName: String(details.judicialCustodianName || '').trim(),
                });
            }
            if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
                const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
                if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                    const garnishment = parsedSalary / 5;
                    if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                        persistPatch.employeeSalary = parsedSalary;
                        persistPatch.garnishmentAmount = garnishment;
                    } else if (activeWorkspaceDebtorForFollowup?.key) {
                        const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                        persistPatch.perDebtorSalaries = {
                            ...(executionData?.perDebtorSalaries || {}),
                            [debtorKey]: String(parsedSalary),
                        };
                        persistPatch.perDebtorGarnishments = {
                            ...(executionData?.perDebtorGarnishments || {}),
                            [debtorKey]: String(garnishment),
                        };
                    }
                }
            }
            const parsedDeduction = Number(
                String((details as any).monthlyDeductionIqd || '').replace(/,/g, '').trim()
            );
            if (actionType === 'salary' && Number.isFinite(parsedDeduction) && parsedDeduction > 0) {
                const nextAssetsWithDed = (persistPatch.seizedAssets as typeof nextAssets) ?? nextAssets;
                persistPatch.seizedAssets = (nextAssetsWithDed as typeof nextAssets).map((a) => {
                    if (a.id !== assetId) return a;
                    const prevDetails =
                        typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                            ? (a.details as Record<string, unknown>)
                            : {};
                    return {
                        ...a,
                        details: {
                            ...prevDetails,
                            monthlyDeductionIqd: Math.trunc(parsedDeduction),
                        },
                    };
                });
            }
            persistExecutionMerge(persistPatch);
            const nextDraftsAfterSave = { ...seizureDraftsByDecisionIdRef.current };
            if (nextDraftsAfterSave[decisionRowId]) {
                delete nextDraftsAfterSave[decisionRowId];
                setSeizureDraftsByDecisionId(nextDraftsAfterSave);
                persistExecutionMerge({ seizureDraftsByDecisionId: nextDraftsAfterSave });
            }
            patchExecutorDecisionRow(decisionsStorageExecutionId, decisionRowId, {
                seizureRequestSavedAt: now,
                seizureRequestDetails: descLines || mergedDesc || undefined,
            });
            showToast('تم حفظ تفاصيل الحجز بعد موافقة المنفذ.', 'success');
            setLastActionDate(getLocalTodayYmd());
            return;
        }

        const actionLabels: Record<string, string> = {
            'salary': activeDebtorIsDeceased ? 'حجز المخصصات والمكافاة' : 'طلب حجز راتب',
            'property': 'طلب حجز عقار',
            'vehicle': 'طلب حجز مال منقول',
            'travel': 'منع سفر',
            'imprisonment': 'طلب حبس'
        };
        
        const now = new Date().toISOString();
        const label = actionLabels[actionType] || actionType;
        const isSeizureRequest = ['salary', 'property', 'vehicle'].includes(actionType);
        const salaryGarnishmentRoutingNote =
            actionType === 'salary' &&
            executionData?.garnishment_target === 'national_retirement_board'
                ? '\n\nوجهة قانونية إلزامية: هيئة التقاعد الوطنية (وليس جهة العمل السابقة).'
                : '';
        const subj = coerciveSubjectRef.current;
        const targetLead = subj.name
            ? `توجيه الإجراء ضد: ${subj.name}${subj.id ? ` (معرّف: ${subj.id})` : ''}. `
            : '';
        const descBase = targetLead + (details.description || '');
        const descWithRouting = descBase + salaryGarnishmentRoutingNote;

        let seizureDecisionId: string | null = null;
        if (isSeizureRequest) {
            if (
                actionType === 'salary' &&
                isSalarySeizureLaneOccupied({
                    seizedAssets,
                    seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
                })
            ) {
                showToast('يوجد حجز راتب نشط أو طلب قيد البت — لا يمكن التكرار قبل فك الحجز.', 'warning');
                return;
            }
            const seizureBody = [
                `طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`,
                descWithRouting.trim() || null,
            ]
                .filter(Boolean)
                .join('\n');
            const payloadJson =
                actionType === 'vehicle'
                    ? JSON.stringify({
                          movableDescription: String(details.movableDescription || '').trim(),
                          movableLocation: String(details.movableLocation || '').trim(),
                          judicialCustodianName: String(details.judicialCustodianName || '').trim(),
                          subject: String(label || '').trim(),
                      })
                    : undefined;
            seizureDecisionId = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: `${label} — قيد البت لدى المنفذ`,
                requestBody: seizureBody,
                seizureSubtype:
                    actionType === 'salary' ? 'salary' : actionType === 'vehicle' ? ('movable_auction' as any) : 'property',
                ...(payloadJson ? { seizurePayloadJson: payloadJson } : {}),
            });
        }

        const newEvent: TimelineEvent = {
            id: nextTimelineId(),
            date: now,
            timestamp: now,
            title: isSeizureRequest ? `📋 ${label} — قيد البت` : `⚖️ ${label}`,
            description: isSeizureRequest
                ? [`طلب ${label} بشأن المدين${subj.name ? ` (${subj.name})` : ''}.`, descWithRouting.trim() || null]
                      .filter(Boolean)
                      .join('\n')
                : `${label}.${descWithRouting ? ` ${descWithRouting}` : ''}`,
            type: 'coercive',
            source: 'التنفيذ والمحجوزات',
            metadata:
                seizureDecisionId != null
                    ? {
                          timelineThreadKey: `executor_decision:${seizureDecisionId}`,
                          decisionRowId: seizureDecisionId,
                      }
                    : undefined,
        };
        let nextDrafts = seizureDraftsByDecisionId;
        if (isSeizureRequest && seizureDecisionId) {
            const dayYmd = now.slice(0, 10);
            const detailsWithDecision: Record<string, string> = {
                ...details,
                decisionRowId: seizureDecisionId,
            };
            const newAsset: SeizedAsset = {
                id: `draft_${seizureDecisionId}`,
                type:
                    actionType === 'salary'
                        ? 'طلب حجز راتب (قيد البت)'
                        : actionType === 'vehicle'
                          ? 'طلب حجز مال منقول (قيد البت)'
                          : 'طلب حجز عقار (قيد البت)',
                details: detailsWithDecision,
                status: 'pending',
                seizureDate: dayYmd,
            };
            if (details.description?.trim()) {
                newAsset.description = details.description.trim();
            }
            nextDrafts = { ...seizureDraftsByDecisionId, [seizureDecisionId]: newAsset };
            setSeizureDraftsByDecisionId(nextDrafts);
        }
        const nextTimeline = [newEvent, ...timelineEvents];
        setTimelineEvents(nextTimeline);

        const persistPatch: Record<string, unknown> = { timelineEvents: nextTimeline };
        if (isSeizureRequest && seizureDecisionId) {
            persistPatch.seizureDraftsByDecisionId = nextDrafts;
        }
        if (actionType === 'salary' && /\S/.test(String(details.salaryAmount || '').trim())) {
            const parsedSalary = Number(String(details.salaryAmount || '').replace(/,/g, '').trim());
            if (Number.isFinite(parsedSalary) && parsedSalary > 0) {
                const garnishment = parsedSalary / 5;
                if (activeWorkspaceDebtorForFollowup?.isPrimary) {
                    persistPatch.employeeSalary = parsedSalary;
                    persistPatch.garnishmentAmount = garnishment;
                } else if (activeWorkspaceDebtorForFollowup?.key) {
                    const debtorKey = String(activeWorkspaceDebtorForFollowup.key);
                    persistPatch.perDebtorSalaries = {
                        ...(executionData?.perDebtorSalaries || {}),
                        [debtorKey]: String(parsedSalary),
                    };
                    persistPatch.perDebtorGarnishments = {
                        ...(executionData?.perDebtorGarnishments || {}),
                        [debtorKey]: String(garnishment),
                    };
                }
            }
        }
        persistExecutionMerge(persistPatch);

        const msgQueuedExecutor =
            'تم حفظ الطلب بنجاح وتحويله إلى مركز القرارات بانتظار موافقة المنفذ';
        if (isSeizureRequest) {
            showToast(msgQueuedExecutor, 'success', { decisionsLink: true });
        } else {
            showToast(`تم تسجيل ${label}`, 'success');
        }
        setLastActionDate(getLocalTodayYmd());
    };
    saveCoerciveActionRef.current = saveCoerciveAction;

    const patchSeizedRowAndTimeline = (
        nextAssets: SeizedAsset[],
        ev: TimelineEvent,
        nextAc?: string[]
    ) => {
        setSeizedAssets(nextAssets);
        setTimelineEvents((prev) => {
            const nextTl = [ev, ...prev];
            const p: Record<string, unknown> = { seizedAssets: nextAssets, timelineEvents: nextTl };
            if (nextAc) {
                p.activeCoerciveActions = nextAc;
            }
            queueMicrotask(() => persistExecutionMerge(p));
            return nextTl;
        });
        if (nextAc) {
            setActiveCoerciveActions(nextAc);
        }
    };

    const releaseSeizureAssetRow = (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) {
            showToast('السجل مقفول — استخدم «تراجع» إن كان الحجز قد فُك.', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(asset);
        const nextAc = key ? activeCoerciveActions.filter((x) => x !== key) : activeCoerciveActions;
        const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      type: cleanedType,
                      status: 'released',
                      seizure_record_locked: true,
                      released_at_ymd: today,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '🔓 فك حجز',
            description: `فك حجز مسجّل: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_release:${asset.id}`,
                seizureAssetId: asset.id,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        showToast('تم فك الحجز وإزالة إشارة الحجز من المدين', 'success');
    };

    const undoReleaseSeizureAssetRow = (asset: SeizedAsset) => {
        if (!asset.seizure_record_locked || String(asset.status) !== 'released') return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(asset);
        const nextAc =
            key && !activeCoerciveActions.includes(key)
                ? [...activeCoerciveActions, key]
                : activeCoerciveActions;
        const cleanedType = stripSeizureTypeDecorators(String(asset.type)) || String(asset.type);
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      type: cleanedType,
                      status: 'seized',
                      seizure_record_locked: false,
                      released_at_ymd: null,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '↩️ تراجع عن فك الحجز',
            description: `إعادة تفعيل الحجز: ${cleanedType}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_release_undo:${asset.id}`,
                seizureAssetId: asset.id,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        showToast('تم التراجع وإعادة تفعيل بطاقة الحجز', 'success');
    };

    const saveSeizureAuctionDate = (asset: SeizedAsset, ymd: string) => {
        const kind = String((asset.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !asset.isMarkConfirmed) {
            showToast('لا يجوز تحديد المزايدة قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        if (asset.seizure_record_locked || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('اختر تاريخ المزايدة بشكل صحيح.', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id ? { ...a, auction_date_ymd: ymd } : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '📅 تاريخ المزايدة',
            description: `محجوز: ${String(asset.type)} — تاريخ المزايدة: ${ymd}${asset.description ? ` — ${asset.description}` : ''}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_auction:${asset.id}`,
                seizureAssetId: asset.id,
                auctionDateYmd: ymd,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev);
        setSeizureAuctionDateDraftById((p) => {
            const n = { ...p };
            delete n[asset.id];
            return n;
        });
        showToast('تم ربط تاريخ المزايدة بالسجل الزمني', 'success');
    };

    const beginSeizureSalePriceStep = (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) return;
        const kind = String((asset.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !asset.isMarkConfirmed) {
            showToast('لا يجوز الانتقال للبيع قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      seizure_awaiting_sale_price: true,
                      seizure_sale_price_draft: a.seizure_sale_price_draft ?? '',
                  }
                : { ...a, seizure_awaiting_sale_price: false, seizure_sale_price_draft: undefined }
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const updateSeizureSaleDraft = (assetId: string, v: string) => {
        const cleaned = formatNumberInput(String(v || ''));
        const nextAssets = seizedAssets.map((a) =>
            a.id === assetId ? { ...a, seizure_sale_price_draft: cleaned } : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const cancelSeizureSalePriceStep = (asset: SeizedAsset) => {
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id
                ? { ...a, seizure_awaiting_sale_price: false, seizure_sale_price_draft: undefined }
                : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const patchSeizureMarkConfirmation = (
        assetId: string,
        patch: {
            isMarkConfirmed?: boolean;
            markConfirmationLetterNo?: string;
            markConfirmationLetterDateYmd?: string | null;
        }
    ) => {
        const nextAssets = seizedAssets.map((a) => (a.id === assetId ? { ...a, ...patch } : a));
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const confirmSeizureSaleWithPrice = (asset: SeizedAsset) => {
        const row = seizedAssets.find((a) => a.id === asset.id) ?? asset;
        if (row.seizure_record_locked) return;
        const kind = String((row.details as any)?.seizureUiKind || '').trim();
        if (kind === 'vehicle' && !row.isMarkConfirmed) {
            showToast('لا يجوز إتمام البيع قبل تأييد وضع الإشارة من المرور.', 'warning');
            return;
        }
        const price = (row.seizure_sale_price_draft || '').trim();
        if (!price) {
            showToast('أدخل سعر البيع بالدينار', 'warning');
            return;
        }
        const parsedPrice = Number(price.replace(/,/g, '').trim());
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            showToast('أدخل مبلغ بيع صحيح', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const key = seizureCoerciveKeyFromAssetType(row);
        const nextAc = key ? activeCoerciveActions.filter((x) => x !== key) : activeCoerciveActions;
        const nextAssets = seizedAssets.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'sold',
                      seizure_record_locked: true,
                      sale_price_iqd: price,
                      seizure_awaiting_sale_price: false,
                      seizure_sale_price_draft: undefined,
                  }
                : a
        );
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '✅ تمت المزايدة — إتمام البيع',
            description: `المحجوز: ${String(row.type)} — السعر: ${price} د.ع${row.description ? ` — ${row.description}` : ''}`,
            type: 'payment',
            source: 'محضر المتابعة — الحجز المالي',
            metadata: {
                timelineThreadKey: `seizure_sold:${row.id}`,
                seizureAssetId: row.id,
                salePriceIqd: price,
            },
        };
        patchSeizedRowAndTimeline(nextAssets, ev, nextAc);
        const remainingBefore = Math.max(
            0,
            totalWithExecutionFee - (paidDebtRef.current + paidCourtFees + paidDirectorateFees + paidClientFees)
        );
        const applyAmount = Math.min(parsedPrice, remainingBefore);
        if (applyAmount > 0) {
            handleFundsLedgerPayment({
                amount: applyAmount,
                kind: applyAmount >= remainingBefore ? 'full' : 'partial',
                description: 'حصيلة بيع مال منقول',
            });
        }
        showToast('تم تسجيل البيع وقفل السجل', 'success');
    };

    const saveRealEstateAuctionDate = (asset: RealEstateSeizureAsset, ymd: string) => {
        if (!asset.isMarkConfirmed) {
            showToast('لا يجوز تحديد المزايدة قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        if (asset.record_locked || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            showToast('اختر موعد المزايدة بشكل صحيح.', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, auction_date_ymd: ymd } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📅 تحديد موعد المزايدة — حجز عقار',
                description: `العقار: ${asset.propertyNoAndDistrict} — تاريخ المزايدة: ${ymd}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_auction:${asset.id}`,
                    realEstateAssetId: asset.id,
                    auctionDateYmd: ymd,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        setRealEstateAuctionDateDraftById((p) => {
            const n = { ...p };
            delete n[asset.id];
            return n;
        });
        showToast('تم ربط تاريخ المزايدة بالسجل الزمني', 'success');
    };

    const patchRealEstateMarkConfirmation = (
        assetId: string,
        patch: {
            isMarkConfirmed?: boolean;
            markConfirmationLetterNo?: string;
            markConfirmationLetterDateYmd?: string | null;
        }
    ) => {
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, ...patch } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const beginRealEstateSalePriceStep = (asset: RealEstateSeizureAsset) => {
        if (asset.record_locked) return;
        if (!asset.isMarkConfirmed) {
            showToast('لا يجوز الانتقال للبيع قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, awaiting_sale_price: true, sale_price_draft: a.sale_price_draft ?? '' }
                : { ...a, awaiting_sale_price: false, sale_price_draft: '' }
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const updateRealEstateSaleDraft = (assetId: string, v: string) => {
        const cleaned = formatNumberInput(String(v || ''));
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, sale_price_draft: cleaned } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const cancelRealEstateSalePriceStep = (asset: RealEstateSeizureAsset) => {
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, awaiting_sale_price: false, sale_price_draft: '' } : a
        );
        setRealEstateSeizureAssets(nextAssets);
        persistExecutionMerge({ realEstateSeizureAssets: nextAssets });
    };

    const confirmRealEstateSaleWithPrice = (asset: RealEstateSeizureAsset) => {
        const row = realEstateSeizureSnapshotRef.current.find((a) => a.id === asset.id) ?? asset;
        if (row.record_locked) return;
        if (!row.isMarkConfirmed) {
            showToast('لا يجوز إتمام البيع قبل تأييد وضع الإشارة من الطابو.', 'warning');
            return;
        }
        const price = String(row.sale_price_draft || '').trim();
        if (!price) {
            showToast('أدخل سعر البيع النهائي بالدينار', 'warning');
            return;
        }
        const parsedPrice = Number(price.replace(/,/g, '').trim());
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            showToast('أدخل مبلغ بيع صحيح', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'sold' as const,
                      record_locked: true,
                      sale_price_iqd: price,
                      awaiting_sale_price: false,
                      sale_price_draft: '',
                  }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);

        const currentDossierAmount = Number(executionDataRef.current?.debtAmount ?? 0);
        const nextDossierAmount = computeNewDossierAmountAfterRealEstateSale({
            currentDossierAmount,
            salePriceIqd: parsedPrice,
        });

        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '🏛️ تم البيع والإحالة القطعية — حجز عقار',
                description: `العقار: ${row.propertyNoAndDistrict} — سعر البيع النهائي: ${price} د.ع\nمبلغ الإضبارة الجديد: ${nextDossierAmount.toLocaleString('ar-IQ')} د.ع`,
                type: 'payment',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_sold:${row.id}`,
                    realEstateAssetId: row.id,
                    salePriceIqd: price,
                    newDossierAmount: String(nextDossierAmount),
                },
            },
            {
                mergePatch: {
                    realEstateSeizureAssets: nextAssets,
                    debtAmount: nextDossierAmount,
                },
            }
        );
        showToast('تم تسجيل البيع وقفل البطاقة وتحديث مبلغ الإضبارة', 'success');
    };

    const archiveRealEstateSeizureRow = (asset: RealEstateSeizureAsset) => {
        if (asset.record_locked) return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, status: 'archived' as const, record_locked: true, archived_at_ymd: today }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '🔓 فك حجز عقار (أرشفة)',
                description: `فك/أرشفة بطاقة حجز العقار: ${asset.propertyNoAndDistrict}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_archive:${asset.id}`,
                    realEstateAssetId: asset.id,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        showToast('تم فك الحجز وأرشفة البطاقة', 'success');
    };

    const undoArchiveRealEstateSeizureRow = (asset: RealEstateSeizureAsset) => {
        if (!asset.record_locked || String(asset.status) !== 'archived') return;
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = realEstateSeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? { ...a, status: 'seized' as const, record_locked: false, archived_at_ymd: null }
                : a
        );
        setRealEstateSeizureAssets(nextAssets);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '↩️ تراجع عن فك حجز عقار',
                description: `إعادة تفعيل بطاقة حجز العقار: ${asset.propertyNoAndDistrict}`,
                type: 'coercive',
                source: 'محضر المتابعة — الحجز العقاري',
                metadata: {
                    timelineThreadKey: `real_estate_archive_undo:${asset.id}`,
                    realEstateAssetId: asset.id,
                },
            },
            { mergePatch: { realEstateSeizureAssets: nextAssets } }
        );
        showToast('تم التراجع وإعادة تفعيل البطاقة', 'success');
    };

    const beginThirdPartyReceiveStep = (asset: ThirdPartySeizureAsset) => {
        if (asset.record_locked) return;
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === asset.id
                ? {
                      ...a,
                      awaiting_receive: true,
                      receive_amount_draft: a.receive_amount_draft ?? '',
                  }
                : { ...a, awaiting_receive: false, receive_amount_draft: '' }
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const updateThirdPartyReceiveDraft = (assetId: string, v: string) => {
        const cleaned = formatNumberInput(String(v || ''));
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === assetId ? { ...a, receive_amount_draft: cleaned } : a
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const cancelThirdPartyReceiveStep = (asset: ThirdPartySeizureAsset) => {
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === asset.id ? { ...a, awaiting_receive: false, receive_amount_draft: '' } : a
        );
        setThirdPartySeizureAssets(nextAssets);
        persistExecutionMerge({ thirdPartySeizureAssets: nextAssets });
    };

    const confirmThirdPartyReceive = (asset: ThirdPartySeizureAsset) => {
        const row = thirdPartySeizureSnapshotRef.current.find((a) => a.id === asset.id) ?? asset;
        if (row.record_locked) return;
        const amtRaw = String(row.receive_amount_draft || '').trim();
        if (!amtRaw) {
            showToast('أدخل المبلغ الفعلي المستلم', 'warning');
            return;
        }
        const parsed = parseAmount(amtRaw);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            showToast('أدخل مبلغاً صحيحاً', 'warning');
            return;
        }
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextAssets = thirdPartySeizureSnapshotRef.current.map((a) =>
            a.id === row.id
                ? {
                      ...a,
                      status: 'received' as const,
                      record_locked: true,
                      actualReceivedAmountIqd: parsed,
                      received_at_iso: now,
                      archived_at_ymd: today,
                      awaiting_receive: false,
                      receive_amount_draft: '',
                  }
                : a
        );
        setThirdPartySeizureAssets(nextAssets);
        const exId = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
        const trustCredit = creditThirdPartySeizureFunds(
            exId,
            {
                amountIqd: parsed,
                thirdPartySeizureId: String(row.id),
                thirdPartyName: row.thirdPartyName,
                at: now,
            },
            seizureMatrixLedgerParamsRef.current
        );
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '💰 استلام أموال محجوزة لدى الغير',
                description: `الجهة: ${row.thirdPartyName}\nالمبلغ المستلم: ${parsed.toLocaleString('ar-IQ')} د.ع${
                    trustCredit.ok
                        ? `\n\nتم إيداع ${parsed.toLocaleString('ar-IQ')} د.ع في الأمانات — ويُخصم من المتبقي.`
                        : ''
                }`,
                type: 'payment',
                source: 'المركز المالي — حجز لدى الغير',
                metadata: {
                    timelineThreadKey: `third_party_received:${row.id}`,
                    thirdPartyAssetId: row.id,
                    actualReceivedAmountIqd: String(parsed),
                    ...(trustCredit.paymentId ? { trustPaymentId: trustCredit.paymentId } : {}),
                },
            },
            { mergePatch: { thirdPartySeizureAssets: nextAssets } }
        );
        if (trustCredit.ok) {
            setUnifiedLedgerRevision((v) => v + 1);
            showToast(
                `تم تسجيل الاستلام وإيداع ${parsed.toLocaleString('ar-IQ')} د.ع في الأمانات — يُخصم من المتبقي.`,
                'success'
            );
        } else {
            showToast('تم تسجيل الاستلام لكن تعذّر ربط المبلغ بالمركز المالي.', 'warning');
        }
    };

    const patchStandaloneExecutionMark = (
        markId: string,
        patch: Partial<StandaloneExecutionMark>
    ) => {
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === markId ? { ...m, ...patch } : m
        );
        setStandaloneExecutionMarks(nextMarks);
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
    };

    const toggleStandaloneExecutionMarkConfirmed = (mark: StandaloneExecutionMark) => {
        if (mark.record_locked || mark.status === 'archived') return;
        const next = !Boolean(mark.isMarkConfirmed);
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id ? { ...m, isMarkConfirmed: next } : m
        );
        setStandaloneExecutionMarks(nextMarks);
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
        const now = new Date().toISOString();
        const today = getLocalTodayYmd();
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: next ? '📌 تم وضع الشارة رسمياً' : '📌 إعادة الشارة إلى بانتظار التأييد',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_toggle:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
    };

    const archiveStandaloneExecutionMark = (mark: StandaloneExecutionMark) => {
        if (mark.record_locked || mark.status === 'archived') return;
        const today: string = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id
                ? {
                      ...m,
                      status: 'archived' as const,
                      record_locked: true,
                      archived_at_ymd: today,
                  }
                : m
        );
        setStandaloneExecutionMarks(nextMarks);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📌 رفع الشارة/التعميم',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_archive:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
        showToast('تم رفع الشارة/التعميم وأرشفتها', 'success');
    };

    const undoArchiveStandaloneExecutionMark = (mark: StandaloneExecutionMark) => {
        if (!mark.record_locked || mark.status !== 'archived') return;
        const today: string = getLocalTodayYmd();
        const now = new Date().toISOString();
        const nextMarks = standaloneExecutionMarksSnapshotRef.current.map((m) =>
            m.id === mark.id
                ? {
                      ...m,
                      status: 'active' as const,
                      record_locked: false,
                      archived_at_ymd: null,
                  }
                : m
        );
        setStandaloneExecutionMarks(nextMarks);
        pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: today,
                timestamp: now,
                title: '📌 تراجع عن رفع الشارة/التعميم',
                description: `النوع: ${mark.markType}\nالجهة: ${mark.targetEntity}`,
                type: 'coercive',
                source: 'محضر المتابعة — الشارة التنفيذية',
                metadata: {
                    timelineThreadKey: `standalone_mark_undo:${mark.id}`,
                    markId: mark.id,
                },
            },
            { mergePatch: { standaloneExecutionMarks: nextMarks } }
        );
        persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
    };

    const editSeizureDescription = async (asset: SeizedAsset) => {
        const raw = await SmartDialog.prompt('وصف / نوع المال المحجوز:', asset.description || '');
        if (raw === null) return;
        const nextAssets = seizedAssets.map((a) =>
            a.id === asset.id ? { ...a, description: raw.trim() } : a
        );
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
        showToast('تم حفظ الوصف', 'success');
    };

    const updateSeizedAssetStatus = (assetId: string, status: SeizedAsset['status']) => {
        const nextAssets = seizedAssets.map((a) => (a.id === assetId ? { ...a, status } : a));
        setSeizedAssets(nextAssets);
        persistExecutionMerge({ seizedAssets: nextAssets });
    };

    const patchSalarySeizureAssetDetails = useCallback(
        (assetId: string, patch: SalarySeizureDetailsPatch) => {
            const mergedDesc = buildSalarySeizureDescriptionText({
                employerName: String(
                    patch.employerName ??
                        (typeof seizedAssets.find((a) => a.id === assetId)?.details === 'object'
                            ? (
                                  seizedAssets.find((a) => a.id === assetId)?.details as Record<
                                      string,
                                      unknown
                                  >
                              )?.employerName
                            : '') ??
                        ''
                ),
                salaryAmount: patch.salaryAmount,
                monthlyDeductionIqd:
                    patch.monthlyDeductionIqd > 0 ? patch.monthlyDeductionIqd : undefined,
                activeDebtorIsDeceased,
                subject: resolveSalarySeizureSubject(
                    (seizedAssets.find((a) => a.id === assetId) as Record<string, unknown>) ?? {
                        details: { salaryAmount: patch.salaryAmount },
                    },
                    executionData ?? null,
                    String(decisionsStorageExecutionId ?? executionId ?? '').trim() || undefined
                ),
            });
            const nextAssets = seizedAssets.map((a) => {
                if (a.id !== assetId) return a;
                const prevDetails =
                    typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                        ? (a.details as Record<string, unknown>)
                        : {};
                return {
                    ...a,
                    description: mergedDesc || a.description,
                    details: {
                        ...prevDetails,
                        salaryAmount: patch.salaryAmount,
                        ...(patch.employerName != null
                            ? { employerName: String(patch.employerName).trim() }
                            : {}),
                        ...(patch.monthlyDeductionIqd > 0
                            ? { monthlyDeductionIqd: Math.trunc(patch.monthlyDeductionIqd) }
                            : {}),
                    },
                };
            });
            setSeizedAssets(nextAssets);
            persistExecutionMerge({ seizedAssets: nextAssets });
        },
        [activeDebtorIsDeceased, decisionsStorageExecutionId, executionData, executionId, persistExecutionMerge, seizedAssets]
    );

    const deleteSeizureRow = async (asset: SeizedAsset) => {
        if (asset.seizure_record_locked) {
            showToast('سجل مقفول — لا يُحذف', 'warning');
            return;
        }
        const ok = await SmartDialog.confirm('حذف هذا الصف من قائمة المحجوزات؟');
        if (!ok) return;
        const nextAssets = seizedAssets.filter((a) => a.id !== asset.id);
        const today = getLocalTodayYmd();
        const now = new Date().toISOString();
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: today,
            timestamp: now,
            title: '🗑️ حذف صف من قائمة المحجوزات',
            description: `أُزيل: ${String(asset.type)}`,
            type: 'coercive',
            source: 'محضر المتابعة — الحجز المالي',
        };
        const nextTl = [ev, ...timelineEvents];
        setSeizedAssets(nextAssets);
        setTimelineEvents(nextTl);
        persistExecutionMerge({ seizedAssets: nextAssets, timelineEvents: nextTl });
        showToast('تم الحذف', 'success');
    };
    
    // ✅ CONDITIONAL RENDERING: Show loading/error states first
    if (isLoading) {
        return <ExecutionDashboardSkeleton />;
    }
    
    if (loadError || !executionData) {
        return (
            <div className="fixed inset-0 bg-[#000000] z-[100] flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-md text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-red-500 mb-3">خطأ في التحميل</h3>
                    <p className="text-gray-300 mb-6">{loadError || 'لم يتم العثور على بيانات التنفيذ'}</p>
                    <button type="button"
                        onClick={onClose}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div
            className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl z-[100] flex items-center justify-center p-0"
            dir="rtl"
        >
            
            <ExecutionToast
                visible={toastVisible}
                message={toastMessage}
                type={toastType}
                epoch={toastEpoch}
                onClose={hideToast}
                zIndex={EXEC_MODAL_Z.toastAboveExecution}
            />

            {/* MODALS */}
            <ExecutionTrashModal
                visible={showExecutionTrashModal}
                trashedTimelineEvents={trashedTimelineEvents}
                trashedCaseNotes={trashedCaseNotes}
                trashedCaseTasks={trashedCaseTasks}
                onClose={() => setShowExecutionTrashModal(false)}
                onRestoreTimelineEvent={restoreTimelineEventFromTrash}
                onPermanentDeleteTimeline={setPermanentDeleteTimelineId}
                onRestoreCaseNote={restoreCaseNoteFromTrash}
                onPermanentDeleteCaseNote={permanentlyDeleteCaseNote}
                onRestoreCaseTask={restoreCaseTaskFromTrash}
                onPermanentDeleteCaseTask={permanentlyDeleteCaseTask}
            />

            <TimelineEditModal
                visible={!!timelineEditDraft}
                timelineEvent={timelineEditDraft}
                onClose={() => setTimelineEditDraft(null)}
                onSave={saveTimelineEditDraft}
                onDelete={() => {
                    if (timelineEditDraft) moveTimelineEventToTrash(timelineEditDraft);
                }}
            />

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyDossierMetaEditSection
                showEditDossierMetaModal={showEditDossierMetaModal}
                dossierMetaDraft={dossierMetaDraft}
                isEvictionExecutionModule={isEvictionExecutionModule}
                setShowEditDossierMetaModal={setShowEditDossierMetaModal}
                setDossierMetaDraft={setDossierMetaDraft}
                saveDossierMetaDraft={saveDossierMetaDraft}
            />
            </Suspense>

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyPartyEditModal
                editPartyTarget={editPartyTarget}
                setEditPartyTarget={setEditPartyTarget}
                partyEditDraft={partyEditDraft}
                setPartyEditDraft={setPartyEditDraft}
                partyEditHeirDeleteConfirmIdx={partyEditHeirDeleteConfirmIdx}
                setPartyEditHeirDeleteConfirmIdx={setPartyEditHeirDeleteConfirmIdx}
                savePartyEditDraft={savePartyEditDraft}
                togglePartyEditHeirClient={togglePartyEditHeirClient}
                removeHeirFromPartyEditDraftAtIndex={removeHeirFromPartyEditDraftAtIndex}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
            />
            </Suspense>

            <ExecutionHeirsQuickViewModal
                heirsQuickView={heirsQuickView}
                setHeirsQuickView={setHeirsQuickView}
                X={X}
            />

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyPermanentDeleteConfirmDialog
                permanentDeleteTimelineId={permanentDeleteTimelineId}
                setPermanentDeleteTimelineId={setPermanentDeleteTimelineId}
                permanentlyDeleteTimelineEvent={permanentlyDeleteTimelineEvent}
            />
            </Suspense>

            {(showNotesModal || showAppointmentModal) && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionNotesAndAppointmentModals
                showNotesModal={showNotesModal}
                setShowNotesModal={setShowNotesModal}
                setNoteTitle={setNoteTitle}
                setNoteBody={setNoteBody}
                setIsTask={setIsTask}
                setTaskDueDate={setTaskDueDate}
                setTaskStatus={setTaskStatus}
                setEditingTaskId={setEditingTaskId}
                setSavedNotesView={setSavedNotesView}
                moveCaseNoteToTrash={moveCaseNoteToTrash}
                caseTasksPending={caseTasksPending}
                savedNotesSplit={savedNotesSplit}
                savedNotesView={savedNotesView}
                decisionsStorageExecutionId={decisionsStorageExecutionId}
                showToast={showToast}
                noteTitle={noteTitle}
                noteBody={noteBody}
                isTask={isTask}
                editingTaskId={editingTaskId}
                handleSaveNote={handleSaveNote}
                showAppointmentModal={showAppointmentModal}
                setShowAppointmentModal={setShowAppointmentModal}
                setEditingAppointmentId={setEditingAppointmentId}
                setAppointmentPurpose={setAppointmentPurpose}
                setAppointmentDateOnly={setAppointmentDateOnly}
                setAppointmentTimeOptional={setAppointmentTimeOptional}
                editingAppointmentId={editingAppointmentId}
                appointmentPurpose={appointmentPurpose}
                appointmentDateOnly={appointmentDateOnly}
                handleSaveAppointment={handleSaveAppointment}
                timelineEvents={timelineEvents}
                todayYmd={todayYmd}
                moveTimelineEventToTrash={moveTimelineEventToTrash}
                handleSaveTask={handleSaveTask}
                handleUpdateTask={handleUpdateTask}
                handleDeleteTask={handleDeleteTask}
                handleCompleteTask={handleCompleteTask}
                handleAddTimelineEvent={handleAddTimelineEvent}
                toggleCaseNotePin={toggleCaseNotePin}
                toggleCaseTaskPin={toggleCaseTaskPin}
            />
            </Suspense>
            )}

            {(executorScheduleModalOpen ||
                policeAssistanceModalOpen ||
                breakInventoryFurnitureModalOpen ||
                judicialCustodianModalOpen ||
                executionReportPrompt) && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutorWorkflowPortalModals
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyExecutorApprovedDateTimeModal={LazyExecutorApprovedDateTimeModal}
                PoliceAssistanceDetailsModal={LazyPoliceAssistanceDetailsModal}
                LazyExecutorBreakInventoryFurnitureModal={LazyExecutorBreakInventoryFurnitureModal}
                LazyExecutorJudicialCustodianModal={LazyExecutorJudicialCustodianModal}
                LazyExecutorWorkflowConfirmModal={LazyExecutorWorkflowConfirmModal}
                executorScheduleModalOpen={executorScheduleModalOpen}
                setExecutorScheduleModalOpen={setExecutorScheduleModalOpen}
                executorScheduleContext={executorScheduleContext}
                setExecutorScheduleContext={setExecutorScheduleContext}
                policeAssistanceModalOpen={policeAssistanceModalOpen}
                setPoliceAssistanceModalOpen={setPoliceAssistanceModalOpen}
                setPoliceAssistanceDecisionId={setPoliceAssistanceDecisionId}
                setPoliceAssistanceRequestTitle={setPoliceAssistanceRequestTitle}
                setPoliceAssistanceAgencyDraft={setPoliceAssistanceAgencyDraft}
                policeAssistanceRequestTitle={policeAssistanceRequestTitle}
                policeAssistanceAgencyDraft={policeAssistanceAgencyDraft}
                savePoliceAssistanceFromModal={savePoliceAssistanceFromModal}
                breakInventoryFurnitureModalOpen={breakInventoryFurnitureModalOpen}
                setBreakInventoryFurnitureModalOpen={setBreakInventoryFurnitureModalOpen}
                breakInventoryFurnitureModalCtx={breakInventoryFurnitureModalCtx}
                setBreakInventoryFurnitureModalCtx={setBreakInventoryFurnitureModalCtx}
                judicialCustodianModalOpen={judicialCustodianModalOpen}
                setJudicialCustodianModalOpen={setJudicialCustodianModalOpen}
                judicialCustodianModalCtx={judicialCustodianModalCtx}
                setJudicialCustodianModalCtx={setJudicialCustodianModalCtx}
                executionReportPrompt={executionReportPrompt}
                setExecutionReportPrompt={setExecutionReportPrompt}
                setShowDecisionsModal={setShowDecisionsModal}
                openExecutionSeizuresTab={openExecutionSeizuresTab}
                showToast={showToast}
            />
            </Suspense>
            )}

            {showDocumentsModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyDocumentVault
                        executionId={String(executionId || file?.id || 'unknown')}
                        onClose={() => setShowDocumentsModal(false)}
                        onDocumentUploaded={(info) => {
                            const now = new Date().toISOString();
                            const docEvent: TimelineEvent = {
                                id: nextTimelineId(),
                                type: 'other',
                                date: now,
                                timestamp: now,
                                title: `مستند: ${info.title}`,
                                description: `${info.category} — ${info.fileName}`,
                                source: 'المستندات والملفات',
                            };
                            setTimelineEvents((prev) => [docEvent, ...prev]);
                        }}
                    />
                </Suspense>
            )}

            {showRealEstateSeizureModal ? (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyRealEstateSeizurePostApprovalModal
                        open={showRealEstateSeizureModal}
                        onOpenChange={(open) => {
                            setShowRealEstateSeizureModal(open);
                            if (!open) setRealEstateSeizureModalDecisionId(null);
                        }}
                        decisionId={String(realEstateSeizureModalDecisionId || '')}
                        initial={realEstateModalInitial}
                        disabled={isHistoricalMode}
                        onSave={saveRealEstateSeizureFromModal}
                    />
                </Suspense>
            ) : null}

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDecisionsModalContainer
                showDecisionsModal={showDecisionsModal}
                onCloseDecisionsModal={() => {
                    setShowDecisionsModal(false);
                    clearDecisionsModalBootState();
                }}
                LazyDecisionsAndAppealsEngine={LazyDecisionsAndAppealsEngine}
                executionId={decisionsStorageExecutionId}
                getMilestoneTimelineSnapshot={getMilestoneTimelineSnapshot}
                onTimelineUpdate={(event) => {
                    setTimelineEvents((prev) => {
                        const next = mergeSimilarRecentTimelineEvent(prev, event);
                        queueMicrotask(() => {
                            persistExecutionMerge({ timelineEvents: next });
                            const execId = String(
                                executionDataRef.current?.id ?? executionId ?? ''
                            );
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
                }}
                bootHubTab={
                    (decisionsModalBootListTab ?? decisionsModalBootHubTab) ?? undefined
                }
                decisionsScrollToIdOnBoot={decisionsModalScrollToDecisionId ?? undefined}
                appealsScrollToIdOnBoot={
                    decisionsModalBootHubTab === 'appeals'
                        ? (appealsModalScrollToDecisionId ?? firstActiveAppealDecisionId)
                        : undefined
                }
                executionData={viewExecutionData}
                isHistoricalMode={isHistoricalMode}
                seizedAssets={seizedAssets}
                seizureDraftsByDecisionId={seizureDraftsByDecisionId}
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                syncSeizedAssets={(next) => setSeizedAssets(next)}
                syncSeizureDrafts={(next) => setSeizureDraftsByDecisionId(next)}
                syncActiveCoerciveActions={(next) => setActiveCoerciveActions(next)}
                evictionExecutorWorkflow={
                    isEvictionExecutionModule
                        ? {
                              dossierId: String(executionData?.id ?? executionId ?? file?.id ?? 'default'),
                              actions: executorApprovalActions,
                          }
                        : undefined
                }
            />
            </Suspense>

            {showSeizedAssetsModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionSeizedAssetsModalContainer
                showSeizedAssetsModal={showSeizedAssetsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyModalSeizedAssetsManager={LazyModalSeizedAssetsManager}
                setShowSeizedAssetsModal={setShowSeizedAssetsModal}
                seizedAssetsModalExecutionId={executionId || file?.id}
            />
            </Suspense>
            )}

            {showPaymentModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionPaymentModalContainer
                showPaymentModal={showPaymentModal}
                setShowPaymentModal={setShowPaymentModal}
                paymentAmount={paymentAmount}
                setPaymentAmount={setPaymentAmount}
                paymentDate={paymentDate}
                setPaymentDate={setPaymentDate}
                handlePayment={handlePayment}
            />
            </Suspense>
            )}

            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionFullTimelineModalContainer
                showTimelineModal={showTimelineModal}
                setShowTimelineModal={setShowTimelineModal}
                debtorBrowserTabsMode={debtorBrowserTabsMode}
                activeTimelineEventsDebtorScoped={mergedTimelineEventsDebtorScoped}
                activeTimelineEvents={mergedTimelineEvents}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                PremiumTimelineAuditLog={LazyPremiumTimelineAuditLog}
                History={History}
                toggleTimelineEventPin={toggleTimelineEventPin}
                moveTimelineEventToTrash={moveTimelineEventToTrash}
                onRequestEditTimelineEvent={requestEditTimelineEvent}
                isHistoricalMode={isHistoricalMode}
                activeTimelineFilter={activeTimelineFilter}
                setActiveTimelineFilter={setActiveTimelineFilter}
                todayYmd={todayYmd}
                timelineFilterOptions={timelineFilterOptions}
            />
            </Suspense>

            {/* MAIN DASHBOARD */}
            <div
                className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
            >
                {/* 🆕 V16: PREMIUM DIAMOND GLASS HEADER */}
                <div className="bg-gradient-to-r from-slate-800/40 via-slate-700/20 to-slate-800/40 backdrop-blur-xl border-t border-white/10 border-b border-black/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-xl mx-2 mt-2">
                    <div className="flex w-full items-center gap-2 px-3 py-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-[#0A0F1C]/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            aria-label="إغلاق"
                        >
                            <X size={17} strokeWidth={2} />
                        </button>

                        <div className="relative min-w-0 flex-1 flex justify-center" ref={dossierLifecyclePopoverRef}>
                            <button
                                type="button"
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
                                className={`inline-flex max-w-full items-center justify-center gap-2.5 rounded-xl px-2 py-1 transition-all hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${dossierLifecycleTriggerTextClass(dossierStatusDraft)}`}
                                aria-expanded={dossierLifecyclePanelOpen}
                                aria-haspopup="dialog"
                                aria-label={`الإضبارة التنفيذية — ${dossierLifecycleLabelAr(dossierStatusDraft)}`}
                                title="تغيير حالة الإضبارة — اضغط للقائمة"
                            >
                                <span className="truncate text-lg font-semibold tracking-tight">
                                    الإضبارة التنفيذية
                                </span>
                                <span
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/15 shadow-[0_0_8px_rgba(255,255,255,0.2)] ${dossierLifecycleTriggerDotClass(dossierStatusDraft)}`}
                                    aria-hidden
                                />
                            </button>
                            {dossierLifecyclePanelOpen && dossierLifecyclePopStyle
                                ? (
                                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                                <LazyDossierLifecyclePanel
                                    dossierLifecyclePanelOpen={dossierLifecyclePanelOpen}
                                    dossierLifecyclePopStyle={dossierLifecyclePopStyle}
                                    dossierLifecyclePanelPhase={dossierLifecyclePanelPhase}
                                    setDossierLifecyclePanelPhase={setDossierLifecyclePanelPhase}
                                    dossierStatusDraft={dossierStatusDraft}
                                    dossierPendingStatus={dossierPendingStatus}
                                    setDossierPendingStatus={setDossierPendingStatus}
                                    dossierReasonDraft={dossierReasonDraft}
                                    setDossierReasonDraft={setDossierReasonDraft}
                                    dossierDateDraft={dossierDateDraft}
                                    setDossierDateDraft={setDossierDateDraft}
                                    dossierLifecycleLabelAr={dossierLifecycleLabelAr}
                                    handleDossierLifecyclePick={handleDossierLifecyclePick}
                                    handleDossierLifecycleConfirmDetails={handleDossierLifecycleConfirmDetails}
                                    dossierLifecyclePanelPortalRef={dossierLifecyclePanelPortalRef}
                                />
                                </Suspense>
                                )
                                : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowExecutionTrashModal(true)}
                            className="group relative shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-[#0A0F1C]/45 text-slate-400 backdrop-blur-md transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-500/8 hover:text-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
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
                        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#0A0F1C]/40 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
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

                            {childDossiers.map((child) => (
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
                    
                    <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
                    <LazyDashboardHeaderSection
                        statuteStatus={statuteStatus}
                        isAlimonyClaim={isAlimonyClaim}
                        executionPaused={executionPaused}
                        handleResumeExecution={handleResumeExecution}
                        stayOfExecutionActive={stayOfExecutionActive}
                        executionData={viewExecutionData}
                        handleLiftStayOfExecution={handleLiftStayOfExecution}
                        XCircle={XCircle}
                        isHeaderExpanded={isHeaderExpanded}
                        toggleHeaderExpanded={toggleHeaderExpanded}
                        headerFields={headerFields}
                        openEditDossierMeta={openEditDossierMeta}
                        Pencil={Pencil}
                        isEvictionExecutionModule={isEvictionExecutionModule}
                        classificationDisplay={classificationDisplay}
                        showJudgmentMeta={showJudgmentMeta}
                        docNumber={docNumber}
                        judgmentDateDisplay={judgmentDateDisplay}
                        claimTypeArabicDisplay={claimTypeArabicDisplay}
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
                    </Suspense>

                    <DossierActionsModal
                        open={dossierActionModalOpen}
                        actionType={dossierActionModalType}
                        onClose={() => {
                            setDossierActionModalOpen(false);
                            setDossierActionModalType(null);
                        }}
                        onConfirm={(payload) => {
                            setDossierActionModalSaving(true);
                            handleDossierAction(payload);
                        }}
                        saving={dossierActionModalSaving}
                        currentFileId={currentFileId}
                        inabaTargets={inabaTargets}
                    />

                    {/* Parties / Creditors */}
                    <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
                    <LazyPartiesSection
                        creditorWorkspaceEntries={creditorWorkspaceEntries}
                        showExtraCreditors={showExtraCreditors}
                        setShowExtraCreditors={setShowExtraCreditors}
                        getExecutionPartyDisplayName={getExecutionPartyDisplayName}
                        executionData={viewExecutionData}
                        buildPartyHeirsRows={buildPartyHeirsRows}
                        openHeirsQuickView={openHeirsQuickView}
                        effectiveCreditors={effectiveCreditors}
                        heirsDetailsIncludeClient={heirsDetailsIncludeClient}
                        executionAppealBanner={executionAppealBanner}
                        onOpenDecisionsAppealsTab={() => openDecisionsModalWithBoot({ tab: 'appeals' })}
                        partyBadgesExecutionId={partyBadgesExecutionId}
                        viewExecutionData={viewExecutionData}
                        activeCoerciveActions={activeCoerciveActions}
                        seizedAssets={seizedAssets}
                        activeTimelineEvents={activeTimelineEvents}
                        decisionsReloadEpoch={decisionsReloadEpoch}
                        isHistoricalMode={isHistoricalMode}
                        creditorDeathMenuLabel={creditorDeathMenuLabel}
                        handleCreditorDeathMenuAction={handleCreditorDeathMenuAction}
                        creditorExtraMinorNames={creditorExtraMinorNames}
                        creditorExtraMinorLabel={creditorExtraMinorLabel}
                        showToast={showToast}
                        decisionsStorageExecutionId={decisionsStorageExecutionId}
                        openEditParty={openEditParty}
                    />
                    </Suspense>
                    
                    <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
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
                        executionId,
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
                        heirsDetailsIncludeClient,
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
                    </Suspense>

                    {shouldShowGuarantorExternalHub(viewExecutionData) &&
                    !followupSpecialization.hideAllGuarantorPresence ? (
                        <div className="mx-3 mt-3.5">
                            <GuarantorExternalHub
                                executionData={viewExecutionData}
                                openGuarantorDetailsModal={openGuarantorDetailsModal}
                                archiveAndClearGuarantor={archiveAndClearGuarantor}
                                handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                                setSummonsContextDebtorKey={setSummonsContextDebtorKey}
                                setSummonsHubInitialMainTab={setSummonsHubInitialMainTab}
                                setShowUnifiedSummonsModal={setShowUnifiedSummonsModal}
                            />
                        </div>
                    ) : null}

                    {isVisitationClaim && (
                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <LazyVisitationScheduleModule
                                executionData={viewExecutionData}
                                visitChildNames={visitChildNames}
                                fileNumber={String(executionData?.fileNumber ?? headerFields?.fileNumber ?? '')}
                                todayYmd={todayYmd}
                                persistExecutionMerge={persistExecutionMerge}
                                pushTimelineEvent={pushTimelineEvent}
                                nextTimelineId={nextTimelineId}
                                showToast={showToast}
                            />
                        </Suspense>
                    )}

                    {isMaritalFurnitureClaim && (
                        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                            <LazyMaritalFurnitureModule
                                executionData={viewExecutionData}
                                persistExecutionMerge={persistExecutionMerge}
                                showToast={showToast}
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
                                open={showVisitationCalendarModal}
                                onClose={() => setShowVisitationCalendarModal(false)}
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
                                }
                                todayYmd={todayYmd}
                            />
                            </Suspense>
                        )}

                    {isEvictionExecutionModule && judicialCustodiansResolved.length > 0 && (
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
                                                                          savedAt,
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

                    {/* إدارة الأموال + المحفظة الخاصة: تُعرضان من «المركز المالي» في أدوات الإضبارة */}
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyActionGridSection
                        Book={Book}
                        Calendar={Calendar}
                        FileText={FileText}
                        FolderOpen={FolderOpen}
                        Scale={Scale}
                        ClipboardList={ClipboardList}
                        CreditCard={CreditCard}
                        showEmployeeCompulsoryProceduresBanner={showEmployeeCompulsoryProceduresBanner}
                        executionToolsTimelineLockedUi={executionToolsTimelineLockedUi}
                        executionActionsGridLocked={executionActionsGridLocked}
                        setEmployeeCompulsoryBannerDismissed={setEmployeeCompulsoryBannerDismissed}
                        setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                        setUnifiedModalTab={setUnifiedModalTab}
                        showToast={showToast}
                        setShowAppointmentModal={setShowAppointmentModal}
                        setShowNotesModal={setShowNotesModal}
                        setShowDocumentsModal={setShowDocumentsModal}
                        setShowDecisionsModal={setShowDecisionsModal}
                        setIsFinancialCenterExpanded={setIsFinancialCenterExpanded}
                        setShowExecutionFinancialHub={setShowExecutionFinancialHub}
                        setIsLawReferenceOpen={setIsLawReferenceOpen}
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
                    </Suspense>
                    
                    {/* Timeline */}
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyTimelineSection
                        timelineAccordionExpanded={timelineAccordionExpanded}
                        setTimelineAccordionExpanded={setTimelineAccordionExpanded}
                        startTransition={startTransition}
                        ChevronUp={ChevronUp}
                        Activity={Activity}
                        History={History}
                        debtorBrowserTabsMode={debtorBrowserTabsMode}
                        activeTimelineEventsDebtorScoped={mergedTimelineEventsDebtorScoped}
                        activeTimelineEvents={mergedTimelineEvents}
                        EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                        SmartTimelineRadar={LazySmartTimelineRadar}
                        toggleTimelineEventPin={toggleTimelineEventPin}
                        setShowTimelineModal={setShowTimelineModal}
                        timelineRadarPreviewLimit={mergedTimelineRadarPreviewLimit}
                        isHistoricalMode={isHistoricalMode}
                        activeTimelineFilter={activeTimelineFilter}
                        setActiveTimelineFilter={setActiveTimelineFilter}
                        todayYmd={todayYmd}
                        timelineFilterOptions={timelineFilterOptions}
                        PremiumTimelineAuditLog={LazyPremiumTimelineAuditLog}
                        moveTimelineEventToTrash={moveTimelineEventToTrash}
                        onRequestEditTimelineEvent={requestEditTimelineEvent}
                        showOnlyActiveFileTimeline={showOnlyActiveFileTimeline}
                        setShowOnlyActiveFileTimeline={setShowOnlyActiveFileTimeline}
                        subFilesCount={subFiles.length}
                        calendarUserId={resolveCalendarUserId(null)}
                        executionEntityId={String(currentFileId || '')}
                    />
                    </Suspense>

                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyLawReferencePanel
                    isLawReferenceOpen={isLawReferenceOpen}
                    setIsLawReferenceOpen={setIsLawReferenceOpen}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    executionData={viewExecutionData}
                />
                </Suspense>

                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionFinancialHubPortal
                    showExecutionFinancialHub={showExecutionFinancialHub}
                    setShowExecutionFinancialHub={setShowExecutionFinancialHub}
                    onOpenUnifiedSeizureLog={() => openUnifiedSeizureLog()}
                    financialHubAutoOpenMode={financialHubAutoOpenMode}
                    setFinancialHubAutoOpenMode={setFinancialHubAutoOpenMode}
                    financialHubSeizedMovableId={financialHubSeizedMovableId}
                    setFinancialHubSeizedMovableId={setFinancialHubSeizedMovableId}
                    financialHubSeizedPropertyId={financialHubSeizedPropertyId}
                    setFinancialHubSeizedPropertyId={setFinancialHubSeizedPropertyId}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    EXEC_MODAL_Z={EXEC_MODAL_Z}
                    LazyFinancialOperationsCenter={LazyFinancialOperationsCenter}
                    EXEC_FOC_LAZY_FALLBACK={EXEC_FOC_LAZY_FALLBACK}
                    realEstateSeizureRegistryAssets={realEstateSeizureRegistryAssets}
                    movableSeizureRegistryAssets={movableSeizureRegistryAssets}
                    salarySeizureRegistryAssets={salarySeizureTabRows}
                    thirdPartySeizureRegistryAssets={thirdPartySeizureRegistryAssets}
                    standaloneExecutionMarks={standaloneExecutionMarks}
                    executionData={viewExecutionData}
                    executionId={executionId}
                    isFinancialCenterExpanded={isFinancialCenterExpanded}
                    setIsFinancialCenterExpanded={setIsFinancialCenterExpanded}
                    activeFinancialTab={activeFinancialTab}
                    setActiveFinancialTab={setActiveFinancialTab}
                    principalDebtAmount={financialPrincipalAmount}
                    evictionLawyerFeesInTotals={evictionLawyerFeesInTotals}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    parsedLawyerFees={financialLawyerFeesAmount}
                    total_execution_expenses={total_execution_expenses}
                    monthlyAlimony={monthlyAlimony}
                    totalOwed={totalOwed}
                    remaining={remaining}
                    parsedCourtFees={parsedCourtFees}
                    parsedDirectorateFees={parsedDirectorateFees}
                    parsedClientFees={parsedClientFees}
                    financialStatus={financialStatus}
                    isNonFinancialClaim={isNonFinancialClaim}
                    isAlimonyClaim={isAlimonyClaim}
                    claimType={claimType}
                    paidDebt={paidDebt}
                    totalWithExecutionFee={totalWithExecutionFee}
                    calculatedExecutionFee={calculatedExecutionFee}
                    shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                    accumulatedAlimony={accumulatedAlimony}
                    paidCourtFees={paidCourtFees}
                    paidDirectorateFees={paidDirectorateFees}
                    paidClientFees={paidClientFees}
                    daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                    gracePeriodEnded={gracePeriodEnded}
                    initiator={initiator}
                    setShowPaymentCalculator={setShowPaymentCalculator}
                    setShowSettlementCalculator={setShowSettlementCalculator}
                    handleCoerciveAction={handleCoerciveAction}
                    executionStatus={executionStatus}
                    statusMetadata={statusMetadata}
                    isPaused={isPaused}
                    setShowLedgerModal={setShowLedgerModal}
                    financialLedger={financialLedger}
                    evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial}
                    evictionCaseExpenses={evictionCaseExpenses}
                    setShowEvictionExpenseModal={setShowEvictionExpenseModal}
                    handleEvictionLawyerFeeRequest={handleEvictionLawyerFeeRequest}
                    lawyerFeePayoutApproved={lawyerFeePayoutApproved}
                    handleFundsLedgerPayment={handleFundsLedgerPayment}
                    setTimelineEvents={setTimelineEvents}
                    nextTimelineId={nextTimelineId}
                    guarantorFollowupAwaitingDetailsSave={guarantorFollowupAwaitingDetailsSave}
                    setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                    setExecutionDebtorTabIndex={setExecutionDebtorTabIndex}
                    primaryDebtorWorkspaceKey={primaryDebtorWorkspaceKey}
                    expandDebtor={(debtorKey) => debtorsSectionRef.current?.expandDebtor(debtorKey)}
                    openGuarantorDetailsModal={openGuarantorDetailsModal}
                    appendGuarantorFollowupRequest={appendGuarantorFollowupRequest}
                    decisionsStorageExecutionId={decisionsStorageExecutionId}
                    showToast={showToast}
                    timelineDebtorMetadata={timelineDebtorMetadata}
                    assignmentWorkspaceCtx={assignmentWorkspaceCtx}
                    persistExecutionMerge={persistExecutionMerge}
                    handleEvictionLedgerActivated={handleEvictionLedgerActivated}
                    evictionAssetsTabUnlocked={evictionAssetsTabUnlocked}
                    getLocalTodayYmd={getLocalTodayYmd}
                    setCaseTasksPending={setCaseTasksPending}
                    onClearSalarySeizurePath={clearActiveSalarySeizurePath}
                    isRepresentingDebtor={isRepresentingDebtor}
                    activeDebtorIsDeceased={activeDebtorIsDeceased}
                />

                <UnifiedSeizureLogHost
                    isRepresentingDebtor={isRepresentingDebtor}
                    showModal={showUnifiedSeizureLogModal}
                    hasContent={hasUnifiedSeizureLogContent}
                    activeTab={unifiedSeizureLogTab}
                    onTabChange={setUnifiedSeizureLogTab}
                    counts={unifiedSeizureTabCounts}
                    entries={unifiedSeizureLogEntries}
                    onClose={closeUnifiedSeizureLog}
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
                        executionId,
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


                <SeizureRequestSubjectModal
                    open={propertySeizureRequestModalOpen}
                    title="طلب حجز عقار"
                    placeholder="اكتب موضوع طلب حجز العقار"
                    subjectDraft={propertySeizureSubjectDraft}
                    tone="amber"
                    onClose={() => setPropertySeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setPropertySeizureSubjectDraft}
                    onSubmit={submitPropertySeizureRequest}
                />

                <SeizureRequestSubjectModal
                    open={movableSeizureRequestModalOpen}
                    title="طلب حجز مال منقول"
                    placeholder="اكتب موضوع طلب حجز المال المنقول"
                    subjectDraft={movableSeizureSubjectDraft}
                    tone="sky"
                    onClose={() => setMovableSeizureRequestModalOpen(false)}
                    onSubjectDraftChange={setMovableSeizureSubjectDraft}
                    onSubmit={submitMovableSeizureRequest}
                />

                {seizedPropertyStepModalOpen &&
                seizedPropertyStepEntityKind !== 'movable' &&
                typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
                              role="presentation"
                              onClick={(e) => {
                                  if (e.target === e.currentTarget) setSeizedPropertyStepModalOpen(false);
                              }}
                          >
                              <div
                                  className="w-full max-w-md rounded-3xl border-2 border-sky-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="rtl"
                              >
                                  <div className="flex items-center justify-between border-b border-sky-500/20 p-4">
                                      <button
                                          type="button"
                                          onClick={() => setSeizedPropertyStepModalOpen(false)}
                                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                                          aria-label="إغلاق"
                                      >
                                          <X size={18} />
                                      </button>
                                      <p className="text-[12px] font-black text-sky-200">
                                          {seizedPropertyStepKind === 'experts'
                                              ? `تسجيل تقرير الخبراء${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                                              : seizedPropertyStepKind === 'auction'
                                                ? `تسجيل موعد المزايدة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                                                : seizedPropertyStepKind === 'award'
                                                  ? `تسجيل الإحالة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`
                                                  : `تسجيل النكول/إعادة المزايدة${seizedPropertyStepEntityKind === 'movable' ? ' — مال منقول' : ''}`}
                                      </p>
                                      <span className="w-8" aria-hidden />
                                  </div>
                                  <div className="p-4 space-y-3">
                                      {seizedPropertyStepKind === 'experts' ? (
                                          <>
                                              {(() => {
                                                  const entityId = String(seizedPropertyStepPropertyId || '').trim();
                                                  const entities =
                                                      seizedPropertyStepEntityKind === 'movable'
                                                          ? (executionData?.seizedMovables || [])
                                                          : (executionData?.seizedProperties || []);
                                                  const entityHit = entities.find(
                                                      (x) => String(x.id) === entityId
                                                  );
                                                  const requiredExpertCount = entityHit
                                                      ? readExpertCommitteeSize(entityHit)
                                                      : 1;
                                                  return (
                                                      <>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      أسماء الخبراء — {expertCommitteeSizeLabelAr(requiredExpertCount)}
                                                  </label>
                                                  <input
                                                      value={seizedPropertyExpertsNamesDraft}
                                                      onChange={(e) => setSeizedPropertyExpertsNamesDraft(e.target.value)}
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                      placeholder={
                                                          requiredExpertCount === 1
                                                              ? 'اسم الخبير'
                                                              : `اكتب ${requiredExpertCount} أسماء مفصولة بفاصلة`
                                                      }
                                                  />
                                              </div>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      تاريخ تقرير الخبراء
                                                  </label>
                                                  <input
                                                      type="date"
                                                      value={seizedPropertyExpertReportDateDraft}
                                                      onChange={(e) => setSeizedPropertyExpertReportDateDraft(e.target.value)}
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                  />
                                              </div>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      السعر المقدر
                                                  </label>
                                                  <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      dir="ltr"
                                                      value={seizedPropertyExpertPriceDraft}
                                                      onChange={(e) =>
                                                          setSeizedPropertyExpertPriceDraft(
                                                              formatNumberInput(e.target.value)
                                                          )
                                                      }
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] font-mono text-white outline-none text-right"
                                                      placeholder="0"
                                                  />
                                              </div>
                                                      </>
                                                  );
                                              })()}
                                          </>
                                      ) : null}
                                      {seizedPropertyStepKind === 'auction' ? (
                                          <>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      موعد المزايدة
                                                  </label>
                                                  <input
                                                      type="date"
                                                      value={seizedPropertyAuctionDateDraft}
                                                      onChange={(e) =>
                                                          setSeizedPropertyAuctionDateDraft(e.target.value)
                                                      }
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                      style={{ direction: 'ltr', textAlign: 'right' }}
                                                  />
                                              </div>
                                              <FollowupSectionLinkCheckbox
                                                  checked={linkSeizureAuctionToAppointments}
                                                  onChange={setLinkSeizureAuctionToAppointments}
                                                  label="إضافة الموعد إلى قسم المواعيد"
                                                  hint="يمكنك إلغاء التحديد إذا أردت الحفظ في سجل العقار/المنقول فقط."
                                              />
                                          </>
                                      ) : null}
                                      {seizedPropertyStepKind === 'award' ? (
                                          <>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      اسم المزايد الأخير / المشتري
                                                  </label>
                                                  <input
                                                      value={seizedPropertyBuyerNameDraft}
                                                      onChange={(e) => setSeizedPropertyBuyerNameDraft(e.target.value)}
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                      placeholder="اسم المزايد الأخير أو المشتري"
                                                  />
                                              </div>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      مبلغ الإحالة
                                                  </label>
                                                  <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*"
                                                      value={seizedPropertyAwardAmountDraft}
                                                      onChange={(e) => setSeizedPropertyAwardAmountDraft(e.target.value.replace(/[^\d]/g, ''))}
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                      placeholder="مثال: 500000000"
                                                  />
                                              </div>
                                          </>
                                      ) : null}
                                      {seizedPropertyStepKind === 'reauction_default' ? (
                                          <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                              <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                  الملاحظات
                                              </label>
                                              <textarea
                                                  value={seizedPropertyStepNotesDraft}
                                                  onChange={(e) => setSeizedPropertyStepNotesDraft(e.target.value)}
                                                  className="min-h-[96px] w-full resize-none rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                  placeholder="اكتب التفاصيل"
                                              />
                                          </div>
                                      ) : null}
                                      <button
                                          type="button"
                                          onClick={saveSeizedPropertyStepDetails}
                                          className="w-full rounded-2xl border border-sky-500/35 bg-sky-600/15 px-4 py-3 text-[12px] font-black text-sky-100 hover:bg-sky-600/20"
                                      >
                                          حفظ
                                      </button>
                                  </div>
                              </div>
                          </div>,
                          document.body
                      )
                    : null}

                {seizedPropertyAuctionResultModalOpen &&
                seizedPropertyAuctionResultEntityKind !== 'movable' &&
                typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
                              role="presentation"
                              onClick={(e) => {
                                  if (e.target === e.currentTarget) {
                                      setSeizedPropertyAuctionResultModalOpen(false);
                                      setSeizedPropertyAuctionResultPropertyId(null);
                                      setSeizedPropertyAuctionResultEntityKind('property');
                                      setSeizedPropertyAuctionResultOutcome('initial_award');
                                      setSeizedPropertyAuctionResultBuyerNameDraft('');
                                      setSeizedPropertyAuctionResultAmountDraft('');
                                      setSeizedPropertyAuctionDepositAmountDraft('');
                                  }
                              }}
                          >
                              <div
                                  className="w-full max-w-md rounded-3xl border-2 border-sky-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="rtl"
                                  role="dialog"
                                  aria-label="تسجيل نتيجة جلسة المزايدة"
                              >
                                  <div className="flex items-center justify-between border-b border-sky-500/20 p-4">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setSeizedPropertyAuctionResultModalOpen(false);
                                              setSeizedPropertyAuctionResultPropertyId(null);
                                              setSeizedPropertyAuctionResultEntityKind('property');
                                              setSeizedPropertyAuctionResultOutcome('initial_award');
                                              setSeizedPropertyAuctionResultBuyerNameDraft('');
                                              setSeizedPropertyAuctionResultAmountDraft('');
                                              setSeizedPropertyAuctionDepositAmountDraft('');
                                          }}
                                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                                          aria-label="إغلاق"
                                      >
                                          <X size={18} />
                                      </button>
                                      <p className="text-[12px] font-black text-sky-200">
                                          تسجيل نتيجة جلسة المزايدة
                                          {seizedPropertyAuctionResultEntityKind === 'movable' ? ' — مال منقول' : ''}
                                      </p>
                                      <span className="w-8" aria-hidden />
                                  </div>
                                  <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-1 gap-2">
                                          <button
                                              type="button"
                                              onClick={() => setSeizedPropertyAuctionResultOutcome('initial_award')}
                                              className={`rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors ${
                                                  seizedPropertyAuctionResultOutcome === 'initial_award'
                                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                                                      : 'border-white/10 bg-slate-900/35 text-slate-200 hover:bg-slate-900/45'
                                              }`}
                                          >
                                              رسو المزاد (إحالة أولية)
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => setSeizedPropertyAuctionResultOutcome('no_bidders')}
                                              className={`rounded-2xl border px-3 py-3 text-[11px] font-black transition-colors ${
                                                  seizedPropertyAuctionResultOutcome === 'no_bidders'
                                                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
                                                      : 'border-white/10 bg-slate-900/35 text-slate-200 hover:bg-slate-900/45'
                                              }`}
                                          >
                                              عدم حصول راغب بالشراء
                                          </button>
                                      </div>

                                      {seizedPropertyAuctionResultOutcome === 'initial_award' ? (
                                          <>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      اسم المشتري
                                                  </label>
                                                  <input
                                                      value={seizedPropertyAuctionResultBuyerNameDraft}
                                                      onChange={(e) => setSeizedPropertyAuctionResultBuyerNameDraft(e.target.value)}
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                                      placeholder="الاسم الكامل للمشتري"
                                                  />
                                              </div>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      مبلغ رسو المزاد (د.ع)
                                                  </label>
                                                  <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*"
                                                      value={seizedPropertyAuctionResultAmountDraft}
                                                      onChange={(e) =>
                                                          setSeizedPropertyAuctionResultAmountDraft(
                                                              e.target.value.replace(/[^\d]/g, '')
                                                          )
                                                      }
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none text-right"
                                                      placeholder="مثال: 500000000"
                                                  />
                                              </div>
                                              <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                                  <label className="block text-[10px] text-slate-400 text-right mb-2">
                                                      مبلغ التأمينات القانونية المدفوعة (10%) (د.ع)
                                                  </label>
                                                  <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      pattern="[0-9]*"
                                                      value={seizedPropertyAuctionDepositAmountDraft}
                                                      onChange={(e) =>
                                                          setSeizedPropertyAuctionDepositAmountDraft(
                                                              e.target.value.replace(/[^\d]/g, '')
                                                          )
                                                      }
                                                      className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none text-right"
                                                      placeholder="مثال: 50000000"
                                                  />
                                              </div>
                                          </>
                                      ) : (
                                          <p className="text-[10px] text-slate-400 text-right leading-relaxed">
                                              سيتم تحويل حالة العقار إلى "لا راغب بالشراء" وإظهار زر طلب مزايدة جديدة.
                                          </p>
                                      )}

                                      <button
                                          type="button"
                                          onClick={saveSeizedPropertyAuctionSessionResult}
                                          className="w-full rounded-2xl border border-sky-500/35 bg-sky-600/15 px-4 py-3 text-[12px] font-black text-sky-100 hover:bg-sky-600/20"
                                      >
                                          حفظ النتيجة
                                      </button>
                                  </div>
                              </div>
                          </div>,
                          document.body
                      )
                    : null}

                {seizureMarkModalOpen &&
                seizureMarkModalEntityKind !== 'movable' &&
                typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
                              role="presentation"
                              onClick={(e) => {
                                  if (e.target === e.currentTarget) {
                                      setSeizureMarkModalOpen(false);
                                      setSeizureMarkModalEntityId(null);
                                      setSeizureMarkLetterNumberDraft('');
                                      setSeizureMarkDateDraft('');
                                      setSeizureMarkEntityDraft('');
                                  }
                              }}
                          >
                              <div
                                  className="w-full max-w-md rounded-3xl border-2 border-amber-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="rtl"
                                  role="dialog"
                                  aria-label="تسجيل كتاب تأييد وضع الإشارة"
                              >
                                  <div className="flex items-center justify-between border-b border-amber-500/20 p-4">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setSeizureMarkModalOpen(false);
                                              setSeizureMarkModalEntityId(null);
                                              setSeizureMarkLetterNumberDraft('');
                                              setSeizureMarkDateDraft('');
                                              setSeizureMarkEntityDraft('');
                                          }}
                                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                                          aria-label="إغلاق"
                                      >
                                          <X size={18} />
                                      </button>
                                      <p className="text-[12px] font-black text-amber-200">
                                          تسجيل كتاب تأييد وضع الإشارة
                                          {seizureMarkModalEntityKind === 'movable' ? ' — مال منقول' : ' — عقار'}
                                      </p>
                                      <span className="w-8" aria-hidden />
                                  </div>
                                  <div className="p-4 space-y-3">
                                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                                              رقم الكتاب
                                          </label>
                                          <input
                                              value={seizureMarkLetterNumberDraft}
                                              onChange={(e) => setSeizureMarkLetterNumberDraft(e.target.value)}
                                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                              placeholder="مثال: 123/تأ/2026"
                                          />
                                      </div>
                                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                                              تاريخ الكتاب
                                          </label>
                                          <input
                                              type="date"
                                              value={seizureMarkDateDraft}
                                              onChange={(e) => setSeizureMarkDateDraft(e.target.value)}
                                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                          />
                                      </div>
                                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                                              الجهة المجيبة
                                          </label>
                                          <input
                                              value={seizureMarkEntityDraft}
                                              onChange={(e) => setSeizureMarkEntityDraft(e.target.value)}
                                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                              placeholder="التسجيل العقاري / المرور"
                                          />
                                      </div>
                                      <button
                                          type="button"
                                          onClick={saveSeizureMarkConfirmation}
                                          className="w-full rounded-2xl border border-amber-500/35 bg-amber-600/15 px-4 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-600/20"
                                      >
                                          حفظ
                                      </button>
                                  </div>
                              </div>
                          </div>,
                          document.body
                      )
                    : null}

                {publicationModalOpen &&
                publicationModalEntityKind !== 'movable' &&
                typeof document !== 'undefined'
                    ? createPortal(
                          <div
                              className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                              style={{ zIndex: EXEC_MODAL_Z.nestedOverFollowUpPortal }}
                              role="presentation"
                              onClick={(e) => {
                                  if (e.target === e.currentTarget) {
                                      setPublicationModalOpen(false);
                                      setPublicationModalEntityId(null);
                                      setPublicationNewspaperNameDraft('');
                                      setPublicationDateYmdDraft('');
                                  }
                              }}
                          >
                              <div
                                  className="w-full max-w-md rounded-3xl border-2 border-amber-500/30 bg-[#0B1120] shadow-2xl shadow-black/50"
                                  onClick={(e) => e.stopPropagation()}
                                  dir="rtl"
                                  role="dialog"
                                  aria-label="تسجيل بيانات النشر والإعلان"
                              >
                                  <div className="flex items-center justify-between border-b border-amber-500/20 p-4">
                                      <button
                                          type="button"
                                          onClick={() => {
                                              setPublicationModalOpen(false);
                                              setPublicationModalEntityId(null);
                                              setPublicationNewspaperNameDraft('');
                                              setPublicationDateYmdDraft('');
                                          }}
                                          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                                          aria-label="إغلاق"
                                      >
                                          <X size={18} />
                                      </button>
                                      <p className="text-[12px] font-black text-amber-200">
                                          تسجيل بيانات النشر والإعلان
                                          {publicationModalEntityKind === 'movable' ? ' — مال منقول' : ' — عقار'}
                                      </p>
                                      <span className="w-8" aria-hidden />
                                  </div>
                                  <div className="p-4 space-y-3">
                                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                                              اسم الصحيفة
                                          </label>
                                          <input
                                              value={publicationNewspaperNameDraft}
                                              onChange={(e) => setPublicationNewspaperNameDraft(e.target.value)}
                                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                              placeholder="مثال: الصباح"
                                          />
                                      </div>
                                      <div className="rounded-2xl border border-white/10 bg-slate-900/35 p-3">
                                          <label className="block text-[10px] text-slate-400 text-right mb-2">
                                              تاريخ النشر
                                          </label>
                                          <input
                                              type="date"
                                              value={publicationDateYmdDraft}
                                              onChange={(e) => setPublicationDateYmdDraft(e.target.value)}
                                              className="w-full rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3 text-[12px] text-white outline-none"
                                          />
                                      </div>
                                      <button
                                          type="button"
                                          onClick={savePublicationDetails}
                                          className="w-full rounded-2xl border border-amber-500/35 bg-amber-600/15 px-4 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-600/20"
                                      >
                                          حفظ
                                      </button>
                                  </div>
                              </div>
                          </div>,
                          document.body
                      )
                    : null}

                    {/* BOTTOM SPACER FOR SMOOTH SCROLLING */}
                    <div className="h-6"></div>
                    
                </div>
                
                {showNotificationModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionDebtorNotificationMemoModalContainer
                    showNotificationModal={showNotificationModal}
                    setShowNotificationModal={setShowNotificationModal}
                    debtorNotificationDate={debtorNotificationDate}
                    setDebtorNotificationDate={setDebtorNotificationDate}
                    handleNotifyDebtor={handleNotifyDebtor}
                    getLocalTodayYmd={getLocalTodayYmd}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    notificationModalZIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
                />
                </Suspense>
                )}
                {showCoerciveModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionCoerciveActionsModalContainer
                    showCoerciveModal={showCoerciveModal}
                    setShowCoerciveModal={setShowCoerciveModal}
                    followupEmployeeFinancialSalaryOnlyCoercive={followupEmployeeFinancialSalaryOnlyCoercive}
                    followupMonetaryCoerciveLimitedOnly={followupMonetaryCoerciveLimitedOnly}
                    activeDebtorIsEmployee={activeDebtorIsEmployee}
                    executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                    daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                    remaining={remaining}
                    handleCoerciveAction={handleCoerciveAction}
                    isDebtorGovernmentEmployee={isDebtorGovernmentEmployee}
                    isDebtorFreelancer={isDebtorFreelancer}
                    isNonFinancialClaim={isNonFinancialClaim}
                    showToast={showToast}
                />
                </Suspense>
                )}

                
                {/* UNIFIED EXECUTION & ASSETS MODAL — lazy portal (نفس الشكل؛ chunk منفصل) */}
                {showUnifiedExecutionModal && (
                <FollowupModalContext.Provider
                    value={buildFollowupModalSnapshot({
        activeCoerciveActions,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        activeDebtorIsLegalEntity,
        activeFollowupDebtorKey,
        activeGroupEntries,
        activeNoticeState,
        activeSubFileId,
        activeTimelineEvents,
        appealPerspective,
        appendEvictionExecutorRequest,
        appendEvictionProcedure,
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
        followupModalSpecializationEffective,
        followupMonetaryCoerciveLimitedOnly,
        followupSalarySeizureLabel,
        followupSolidaryDebtorIndex,
        followupSpecialization,
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
        headerFields,
        hideCoerciveTabsForDebtorAgent,
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
        persistExecutionMerge,
        persistFollowupModalViewport,
        persistGuarantorFollowupDetails,
        personalTabLockedForEmployee,
        primaryDebtorKeyResolved,
        primaryDebtorWorkspaceKey,
        pushTimelineEvent,
        queueMicrotask,
        registerDebtorVoluntaryAttendance,
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
        showFollowupSolidaryDebtorTabs,
        showGuarantorInSeizureFollowupTab,
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
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        unifiedModalTab,
        viewExecutionData,
        voluntaryAttendanceCount,
        voluntaryEndOptimistic,
                    })}
                >
                    <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                        <LazyExecutionFollowupModalPortal />
                    </Suspense>
                </FollowupModalContext.Provider>
                )}

                {(showSolidaryCoerciveTargetModal ||
                    showEvictionExpenseModal ||
                    showEvictionLawyerFeeModal ||
                    showEvictionResidentialGraceModal) && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionSolidaryAndEvictionFollowupModalsContainer
                    showSolidaryCoerciveTargetModal={showSolidaryCoerciveTargetModal}
                    solidaryCoerciveActionPending={solidaryCoerciveActionPending}
                    setShowSolidaryCoerciveTargetModal={setShowSolidaryCoerciveTargetModal}
                    setSolidaryCoerciveActionPending={setSolidaryCoerciveActionPending}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    nestedOverUnifiedZIndex={EXEC_MODAL_Z.nestedOverUnified}
                    allDebtorsUnified={allDebtorsUnified}
                    coerciveSubjectRef={coerciveSubjectRef}
                    saveCoerciveActionRef={saveCoerciveActionRef}
                    buildInitialExecutorSeizureDetails={buildInitialExecutorSeizureDetails}
                    setShowCoerciveActionForm={setShowCoerciveActionForm}
                    showEvictionExpenseModal={showEvictionExpenseModal}
                    isEvictionExecutionModule={isEvictionExecutionModule}
                    setShowEvictionExpenseModal={setShowEvictionExpenseModal}
                    evictionExpensePayMode={evictionExpensePayMode}
                    setEvictionExpensePayMode={setEvictionExpensePayMode}
                    evictionExpenseAmount={evictionExpenseAmount}
                    setEvictionExpenseAmount={setEvictionExpenseAmount}
                    evictionExpenseNote={evictionExpenseNote}
                    setEvictionExpenseNote={setEvictionExpenseNote}
                    runEvictionExpenseSubmit={runEvictionExpenseSubmit}
                    showEvictionLawyerFeeModal={showEvictionLawyerFeeModal}
                    setShowEvictionLawyerFeeModal={setShowEvictionLawyerFeeModal}
                    parsedLawyerFees={financialLawyerFeesAmount}
                    lawyerFeeDisburseMode={lawyerFeeDisburseMode}
                    setLawyerFeeDisburseMode={setLawyerFeeDisburseMode}
                    lawyerFeeDisburseNotes={lawyerFeeDisburseNotes}
                    setLawyerFeeDisburseNotes={setLawyerFeeDisburseNotes}
                    runEvictionLawyerFeeSubmit={runEvictionLawyerFeeSubmit}
                    showEvictionResidentialGraceModal={showEvictionResidentialGraceModal}
                    setShowEvictionResidentialGraceModal={setShowEvictionResidentialGraceModal}
                    graceModalStartYmd={graceModalStartYmd}
                    setGraceModalStartYmd={setGraceModalStartYmd}
                    graceModalEndYmd={graceModalEndYmd}
                    setGraceModalEndYmd={setGraceModalEndYmd}
                    residentialVacateDeadlineMaxIso={residentialVacateDeadlineMaxIso}
                    residentialGraceModalShowPrimarySave={residentialGraceModalShowPrimarySave}
                    submitEvictionResidentialGraceFromModal={submitEvictionResidentialGraceFromModal}
                />
                </Suspense>
                )}


                {showHeirsNotificationModal && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                <LazyExecutionHeirsNotificationModalContainer
                    showHeirsNotificationModal={showHeirsNotificationModal}
                    setShowHeirsNotificationModal={setShowHeirsNotificationModal}
                    EXEC_MODAL_BACKDROP_STRONG={EXEC_MODAL_BACKDROP_STRONG}
                    heirsNotificationModalZIndex={EXEC_MODAL_Z.unifiedSummonsAndLegacyNotification}
                    activeDebtorHeirsForNotification={activeDebtorHeirsForNotification}
                    normalizeHeirWorkflowKey={normalizeHeirWorkflowKey}
                    heirsWorkflowByHeir={heirsWorkflowByHeir}
                    computeDaysRemaining={computeDaysRemaining}
                    computeDeadlineYmd={computeDeadlineYmd}
                    heirSummonsDatePickerOpenByHeir={heirSummonsDatePickerOpenByHeir}
                    setHeirSummonsDatePickerOpenByHeir={setHeirSummonsDatePickerOpenByHeir}
                    heirNoticeDateDrafts={heirNoticeDateDrafts}
                    setHeirNoticeDateDrafts={setHeirNoticeDateDrafts}
                    issueHeirMemoNotice={issueHeirMemoNotice}
                    closeHeirMemoManually={closeHeirMemoManually}
                    issueHeirSummons={issueHeirSummons}
                    markHeirSummonsAttended={markHeirSummonsAttended}
                    markHeirSummonsPeriodEnded={markHeirSummonsPeriodEnded}
                />
                </Suspense>
                )}
            {showGuarantorDetailsModal || showStayOfExecutionModal || Boolean(partyDeathModalParty) || showPauseModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionModalsContainer
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                isHistoricalMode={isHistoricalMode}
                executionId={executionId}
                executionData={viewExecutionData}
                executionStorageKey={executionStorageKey}
                storageCache={storageCache}
                showToast={showToast}
                setTimelineEvents={setTimelineEvents}
                GuarantorDetailsPostApprovalModal={LazyGuarantorDetailsPostApprovalModal}
                showGuarantorDetailsModal={showGuarantorDetailsModal}
                setShowGuarantorDetailsModal={setShowGuarantorDetailsModal}
                setGuarantorDetailsDecisionId={setGuarantorDetailsDecisionId}
                guarantorNameDraft={guarantorNameDraft}
                guarantorWorkplaceDraft={guarantorWorkplaceDraft}
                guarantorSalaryDraft={guarantorSalaryDraft}
                guarantorDeductionDraft={guarantorDeductionDraft}
                setGuarantorNameDraft={setGuarantorNameDraft}
                setGuarantorWorkplaceDraft={setGuarantorWorkplaceDraft}
                setGuarantorSalaryDraft={setGuarantorSalaryDraft}
                setGuarantorDeductionDraft={setGuarantorDeductionDraft}
                persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                StayOfExecutionModal={LazyStayOfExecutionModal}
                showStayOfExecutionModal={showStayOfExecutionModal}
                setShowStayOfExecutionModal={setShowStayOfExecutionModal}
                stayOfExecutionActive={stayOfExecutionActive}
                handleSpecialCasesStay={handleSpecialCasesStay}
                PartyDeathReportModal={LazyPartyDeathReportModal}
                partyDeathModalParty={partyDeathModalParty}
                setPartyDeathModalParty={setPartyDeathModalParty}
                setPartyDeathModalDecisionId={setPartyDeathModalDecisionId}
                handlePartyDeathSave={handlePartyDeathSave}
                creditorSubstitutionRequestStatus={creditorSubstitutionRequestStatus}
                handleRequestCreditorSubstitution={handleRequestCreditorSubstitution}
                debtorSubstitutionRequestStatus={debtorSubstitutionRequestStatus}
                handleRequestDebtorSubstitution={handleRequestDebtorSubstitution}
                X={X}
                showPauseModal={showPauseModal}
                setShowPauseModal={setShowPauseModal}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
                Pause={Pause}
                Play={Play}
                AlertCircle={AlertCircle}
                CheckCircle={CheckCircle}
                pauseReason={pauseReason}
                setPauseReason={setPauseReason}
            />
            </Suspense>
            ) : null}

            <AlimonyBeneficiaryDeathModal
                open={alimonyBeneficiaryDeathModalOpen}
                onClose={() => {
                    setAlimonyBeneficiaryDeathModalOpen(false);
                    setAlimonyBeneficiaryDeathModalProfile(null);
                }}
                profile={alimonyBeneficiaryDeathModalProfile ?? alimonyBeneficiaryProfile}
                onConfirm={handleAlimonyBeneficiaryDeathConfirm}
            />
            
            {showUnifiedSummonsModal ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyUnifiedSummonsModalContainer
                showUnifiedSummonsModal={showUnifiedSummonsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyUnifiedSummonsHub={LazyUnifiedSummonsHub}
                executionId={executionId}
                unifiedSummonsTargetDebtorKey={unifiedSummonsTargetDebtorKey}
                summonsHubInitialMainTab={summonsHubInitialMainTab}
                setSummonsHubInitialMainTab={setSummonsHubInitialMainTab}
                setSummonsContextDebtorKey={setSummonsContextDebtorKey}
                setShowUnifiedSummonsModal={setShowUnifiedSummonsModal}
                primaryDebtorKeyResolved={primaryDebtorKeyResolved}
                isEvictionExecutionModule={isEvictionExecutionModule}
                setManualGraceCalendarExtra={setManualGraceCalendarExtra}
                executionData={viewExecutionData}
                notificationCount={notificationCount}
                onUpdate={onUpdate}
                buildDebtorNoticePatchForKey={buildDebtorNoticePatchForKey}
                executionStorageKey={executionStorageKey}
                storageCache={storageCache}
                handleNotifyDebtor={handleNotifyDebtor}
                subsequentNoticeUnlocked={subsequentNoticeUnlocked}
                noticeKindGoalStrictBinding={noticeKindGoalStrictBinding}
                forcedSummoningAnalysis={forcedSummoningAnalysis}
                followupIsDebtorGovernmentEmployee={followupIsDebtorGovernmentEmployee}
                followupIsDebtorRetired={followupIsDebtorRetired}
                activeCoerciveActions={activeCoerciveActions}
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                registerDebtorVoluntaryAttendance={registerDebtorVoluntaryAttendance}
                openExecutionSeizuresTab={openExecutionSeizuresTab}
                followupDebtorSummonsProfile={followupDebtorSummonsProfile}
                summoningRound={summoningRound}
                debtorBrowserTabsMode={debtorBrowserTabsMode}
                followupEarnerForcedActionUnlocked={followupEarnerForcedActionUnlocked}
                earnerForcedActionUnlocked={earnerForcedActionUnlocked}
                forcedAttendanceIssued={forcedAttendanceIssued}
                handleForcedAttendance={handleForcedAttendance}
                debtorNotifiedForEvictionGrace={debtorNotifiedForEvictionGrace}
                voluntaryEndOptimistic={voluntaryEndOptimistic}
                isEvictionGraceExpiredCalendar={isEvictionGraceExpiredCalendar}
                handleDeclareEvictionVoluntaryPeriodEnd={handleDeclareEvictionVoluntaryPeriodEnd}
                isEvictionGraceEffectivelyExpired={isEvictionGraceEffectivelyExpired}
                unifiedCollectionApproved={unifiedCollectionApproved}
                parsedLawyerFees={financialLawyerFeesAmount}
                debtorEvaded={debtorEvaded}
                handleDebtorEvasion={handleDebtorEvasion}
                noticeVoluntaryPeriodEndOptimistic={noticeVoluntaryPeriodEndOptimistic}
                isGracePeriodExpiredNow={isGracePeriodExpiredNow}
                debtorAttendedVoluntarily={debtorAttendedVoluntarily}
                handleDeclareNoticeVoluntaryPeriodEnd={handleDeclareNoticeVoluntaryPeriodEnd}
                lawyerStartedPostNoticeExecution={lawyerStartedPostNoticeExecution}
                coerciveUiLocked={coerciveUiLocked}
                executionStatus={executionStatus}
                employeeAssignmentTabEnabled={employeeAssignmentTabEnabled}
                resolvedEmployeeSummonsAssignment={resolvedEmployeeSummonsAssignment ?? null}
                handleEmployeeAssignmentConfirm={handleEmployeeAssignmentConfirm}
                handleEmployeeAssignmentAttend={handleEmployeeAssignmentAttend}
                handleEmployeeAssignmentDeclareAbsent={handleEmployeeAssignmentDeclareAbsent}
                handleEmployeeAssignmentTerminate={handleEmployeeAssignmentTerminate}
                handleEmployeeAssignmentRequestInvestigation={handleEmployeeAssignmentRequestInvestigation}
                handleEmployeeRegisterArrestOrder={handleEmployeeRegisterArrestOrder}
                handleEmployeeAssignmentRequestForcedBring={handleEmployeeAssignmentRequestForcedBring}
                forcedBringDecisionState={forcedBringDecisionState}
                employeeForcedBringAwaitingPersonalOutcome={employeeForcedBringAwaitingPersonalOutcome}
                handleEmployeeAssignmentResolveForcedBringOutcome={
                    handleEmployeeAssignmentResolveForcedBringOutcome
                }
                handleEmployeeWarrantOutcome={handleEmployeeWarrantOutcome}
                getPublicationNoticeForDebtorKey={getPublicationNoticeForDebtorKey}
                handlePublicationNoticeRegister={handlePublicationNoticeRegister}
                handlePublicationNoticeTerminate={handlePublicationNoticeTerminate}
                handlePublicationNoticeDebtorAttended={handlePublicationNoticeDebtorAttended}
                activeDebtorNoticeScope={activeDebtorNoticeScope}
                scopedSummonsMarker={scopedSummonsMarker}
                terminateDebtorSummonsMarker={terminateDebtorSummonsMarker}
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                showToast={showToast}
            />
            </Suspense>
            ) : null}


            {/* 🆕 V9: PAYMENT CALCULATOR */}
            {showPaymentCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazyPaymentCalculator
                        isOpen
                        onClose={() => setShowPaymentCalculator(false)}
                        currentTotal={totalOwed}
                        onPayment={handlePaymentFromCalculator}
                    />
                </Suspense>
            )}
            
            {/* 🆕 V9: SETTLEMENT CALCULATOR */}
            {showSettlementCalculator && (
                <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
                    <LazySettlementCalculator
                        isOpen
                        onClose={() => setShowSettlementCalculator(false)}
                        currentTotal={totalOwed}
                        onSettlement={handleSettlementFromCalculator}
                    />
                </Suspense>
            )}
            
            {showLedgerModal && (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionFinancialLedgerPortalContainer
                showLedgerModal={showLedgerModal}
                executionData={viewExecutionData}
                executionId={executionId}
                parsedLawyerFees={financialLawyerFeesAmount}
                totalExecutionExpenses={total_execution_expenses}
                isEvictionExecutionModule={isEvictionExecutionModule}
                evictionCaseExpensesTotalForFinancial={evictionCaseExpensesTotalForFinancial}
                principalDebtAmount={financialPrincipalAmount}
                evictionCaseExpenses={evictionCaseExpenses}
                judicialCustodianSalariesExpenseIqd={judicialCustodianSalariesExpenseIqd}
                shouldCalculateExecutionFee={shouldCalculateExecutionFee}
                calculatedExecutionFee={calculatedExecutionFee}
                hasFinancialLedger={hasFinancialLedger}
                financialLedger={financialLedger}
                onClose={() => setShowLedgerModal(false)}
                readUnifiedFundsLedger={readUnifiedFundsLedger}
                filterUnifiedLawyerFeesHideFileDuplicate={filterUnifiedLawyerFeesHideFileDuplicate}
                filterUnifiedExpensesHideFileDuplicate={filterUnifiedExpensesHideFileDuplicate}
                formatUnifiedLedgerDate={formatUnifiedLedgerDate}
            />
            </Suspense>
            )}

            <ExecutionTransferFileNumberModal
                open={showTransferFileNumberChangeModal}
                initialFileNumber={String(executionData?.fileNumber || '').trim()}
                onClose={() => setShowTransferFileNumberChangeModal(false)}
                onValidationWarning={(message) => showToast(message, 'warning')}
                onConfirm={(nextNo) => {
                    persistExecutionMerge({
                        fileNumber: nextNo,
                        transferPendingFileNumberChange: false,
                    });
                    setShowTransferFileNumberChangeModal(false);
                }}
            />

            {showLinkedDossierTimeline && linkedDossierToView && (
                <LinkedDossierTimelineModal
                    dossier={linkedDossierToView}
                    onClose={() => { setShowLinkedDossierTimeline(false); setLinkedDossierToView(null); }}
                />
            )}
        </div>
    </div>
    );
});
