/**
 * Phase C Slice 27 — استخراج hooks + manifest + patch core
 */
import fs from 'fs';
import path from 'path';
import { writeCoreRuntimeVarKeys } from './lib/writeCoreRuntimeVarKeys.mjs';

const ROOT = process.cwd();
const corePath = path.join(
    ROOT,
    'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts',
);
const coreDir = path.join(ROOT, 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore');

const core = fs.readFileSync(corePath, 'utf8');
const coreLines = core.split('\n');

function lineRange(start1, end1) {
    return coreLines.slice(start1 - 1, end1).join('\n');
}

function findLineIncludes(substr, minLine = 1) {
    for (let i = minLine - 1; i < coreLines.length; i++) {
        if (coreLines[i].includes(substr)) return i + 1;
    }
    throw new Error(`marker not found: ${substr}`);
}

const wsStart = coreLines.findIndex((l) => l.includes('const todayYmd = useTodayYmd()')) + 1;
const wsEndLine = findLineIncludes('OMNIBUS 1:1 DATA BINDING') - 1;
const graceStart = findLineIncludes('const graceAndSummoning = useExecutionDashboardGraceAndSummoning');
const graceEnd = findLineIncludes('useExecutionDashboardGraceLifecycleEffects({', graceStart) + 12;
const persistStart = findLineIncludes('const debtorSummonsProfileBundle = useDebtorSummonsProfile');
const persistEnd = findLineIncludes('useExecutionDashboardDeceasedDebtorCoerciveReset({', persistStart) + 10;

const runtimeStart = coreLines.findIndex((l) => l.trim() === 'const coreRuntimeVars = {');
const runtimeEnd = coreLines.findIndex((l, i) => i > runtimeStart && l.trim() === '};');

const runtimeKeys = [];
for (let i = runtimeStart + 1; i < runtimeEnd; i++) {
    const m = coreLines[i].match(/^\s{8}([A-Za-z_$][\w$]*),?\s*$/);
    if (m) runtimeKeys.push(m[1]);
}

writeCoreRuntimeVarKeys(runtimeKeys);

fs.writeFileSync(
    path.join(coreDir, 'buildExecutionDashboardCoreRuntimeVars.ts'),
    `// @ts-nocheck
import { pickKeysFromRuntimeBag } from './pickKeysFromRuntimeBag';
import { CORE_RUNTIME_VAR_KEYS } from './executionDashboardCoreRuntimeVarKeys.generated';

export function buildExecutionDashboardCoreRuntimeVars(sources: Record<string, unknown>) {
    return pickKeysFromRuntimeBag(sources, CORE_RUNTIME_VAR_KEYS);
}
`,
    'utf8',
);

const WS_IMPORTS = `import { useState, useRef, useMemo, useCallback } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isMovablePropertySeizureRow } from '../helpers';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/personalCoerciveSubtypeOutcome';
import type { TimelineEvent, SeizedAsset, RealEstateSeizureAsset, ThirdPartySeizureAsset, StandaloneExecutionMark, ExecutionFile } from '@/app/types/execution';
import { defaultEvictionEarnerFeeCollectionSM, type EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollection';
import type { ScheduledDateSavePayload } from '@/app/components/lawyer/ExecutionDashboard/types';
import type { BreakInventoryFurnitureSavePayload } from '@/app/components/lawyer/ExecutionDashboard/components/BreakInventoryFurnitureModal';
import type { JudicialCustodianSavePayload } from '@/app/components/lawyer/ExecutionDashboard/components/JudicialCustodianModal';
import { useTodayYmd } from '../useTodayYmd';
import { useToastSystem } from '../useToastSystem';
import { useMergedTimelineEvents } from '../useMergedTimelineEvents';
import { useCaseTasksAndNotes } from '../useCaseTasksAndNotes';
import { useSeizureRegistryAssets } from '../useSeizureRegistryAssets';
import { useThirdPartySeizuresUi } from '../useThirdPartySeizuresUi';
import { useSeizureApprovalToast } from '../useSeizureApprovalToast';
import { useExecutionFollowupOrchestrator } from '../useExecutionFollowupOrchestrator';
import { useExecutionCoercionOrchestrator } from '../useExecutionCoercionOrchestrator';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../useExecutionDossierLifecyclePanelOrchestrator';
import { useExecutionSeizureOrchestrator } from '../useExecutionSeizureOrchestrator';
import { useExecutionDecisionsOrchestrator } from '../useExecutionDecisionsOrchestrator';
import { useExecutionFinancialOrchestrator } from '../useExecutionFinancialOrchestrator';
import { useExecutionDashboardSalarySeizureTabRows } from './useExecutionDashboardSalarySeizureTabRows';
import { useExecutionDashboardOpenDecisionsModalBridge } from './useExecutionDashboardOpenDecisionsModalBridge';
import { useExecutionDashboardEvictionGraceUiState } from './useExecutionDashboardEvictionGraceUiState';
import {
    useExecutionDashboardDebtorTabResetOnFileChange,
    useExecutionDashboardSummonsPopoverEscapeClose,
    useExecutionDashboardExecutionPausedSync,
    useExecutionDashboardSpecialRequestTemplateMenuDismiss,
    useExecutionDashboardPaidClientFeesSync,
    useExecutionDashboardDossierLifecycleDraftSync,
    useExecutionDashboardDebtorNotificationSync,
    useExecutionDashboardLegacyNoticeStateBackfill,
    useExecutionDashboardEarnerFeeSmSync,
    useExecutionDashboardStandaloneMarksSync,
    useExecutionDashboardSubDossierTimelineLifecycle,
    useExecutionDashboardExecutionFileCoerciveRefresh,
    useExecutionDecisionOutcomeToastBridge,
    useExecutionToastBridge,
    useExecutionDashboardPerformanceMonitor,
} from './useExecutionDashboardRuntimeSyncEffects';
`;

const WS_DESTRUCT = `    const {
        modals,
        executionData,
        executionDataRef,
        executionFileKey,
        executionDashboardFileId,
        executionId,
        executionStorageTick,
        setExecutionModal,
        showDecisionsModal,
        setShowDecisionsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        setShowCoerciveModal,
        subFiles,
        activeSubFileId,
        isInabaActive,
        parentDossierId,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        executionFileSnapshotRef,
    } = p;
`;

const wsBody = lineRange(wsStart, wsEndLine);
const wsReturnKeys = [
    'todayYmd', 'noteTitle', 'setNoteTitle', 'noteBody', 'setNoteBody', 'isTask', 'setIsTask',
    'taskDueDate', 'setTaskDueDate', 'taskStatus', 'setTaskStatus', 'editingTaskId', 'setEditingTaskId',
    'editingNoteId', 'setEditingNoteId', 'savedNotesView', 'setSavedNotesView', 'showUnifiedExecutionModal',
    'followupOrchestrator', 'timelineAccordionExpanded', 'setTimelineAccordionExpanded',
    'activeTimelineFilter', 'setActiveTimelineFilter', 'gracePeriodActive', 'setGracePeriodActive',
    'gracePeriodEnded', 'setGracePeriodEnded', 'notificationCount', 'setNotificationCount',
    'notificationPurpose', 'setNotificationPurpose', 'voluntaryEndOptimistic', 'setVoluntaryEndOptimistic',
    'noticeVoluntaryPeriodEndOptimistic', 'setNoticeVoluntaryPeriodEndOptimistic',
    'summonsMarkerPopoverOpen', 'setSummonsMarkerPopoverOpen', 'executionMemoBadgePopoverOpen',
    'setExecutionMemoBadgePopoverOpen', 'summonsPurposeDraft', 'setSummonsPurposeDraft',
    'forcedAttendanceIssued', 'setForcedAttendanceIssued', 'debtorEvaded', 'setDebtorEvaded',
    'arrestWarrantUnlocked', 'setArrestWarrantUnlocked', 'creditorAttended', 'executionPaused',
    'setExecutionPaused', 'showUnifiedSummonsModal', 'setShowUnifiedSummonsModal', 'coercionOrchestrator',
    'lastActionDate', 'setLastActionDate', 'showStatuteWarning', 'setShowStatuteWarning',
    'dossierLifecyclePanel', 'showExecutionTrashModal', 'setShowExecutionTrashModal',
    'permanentDeleteTimelineId', 'setPermanentDeleteTimelineId', 'paidDebt', 'paidDebtRef',
    'paidCourtFees', 'setPaidCourtFees', 'paidDirectorateFees', 'setPaidDirectorateFees',
    'paidClientFees', 'setPaidClientFees', 'noteText', 'setNoteText', 'appointmentPurpose',
    'setAppointmentPurpose', 'appointmentDateOnly', 'setAppointmentDateOnly', 'appointmentTimeOptional',
    'setAppointmentTimeOptional', 'editingAppointmentId', 'setEditingAppointmentId', 'appointmentContext',
    'setAppointmentContext', 'executorScheduleModalOpen', 'setExecutorScheduleModalOpen',
    'executorScheduleContext', 'setExecutorScheduleContext', 'breakInventoryFurnitureModalOpen',
    'setBreakInventoryFurnitureModalOpen', 'breakInventoryFurnitureModalCtx',
    'setBreakInventoryFurnitureModalCtx', 'judicialCustodianModalOpen', 'setJudicialCustodianModalOpen',
    'judicialCustodianModalCtx', 'setJudicialCustodianModalCtx', 'executionReportPrompt',
    'setExecutionReportPrompt', 'financialLedger', 'financialLedgerRef', 'hasFinancialLedger',
    'showLedgerModal', 'setShowLedgerModal', 'paymentAmount', 'setPaymentAmount', 'paymentDate',
    'setPaymentDate', 'debtorNotificationDate', 'setDebtorNotificationDate', 'manualGraceCalendarExtra',
    'setManualGraceCalendarExtra', 'timelineEvents', 'setTimelineEvents', 'timelineEventsRef',
    'persistExecutionMergeRef', 'pushTimelineEventRef', 'executionFileSnapshotRef', 'earnerFeeCollectionSm',
    'setEarnerFeeCollectionSm', 'caseNotesLog', 'setCaseNotesLog', 'caseNotesLogRef', 'caseTasksPending',
    'setCaseTasksPending', 'caseTasksPendingRef', 'evictionGracePinned', 'setEvictionGracePinned',
    'evictionGraceHidden', 'setEvictionGraceHidden', 'toggleEvictionGracePinned', 'gracePinnedKey',
    'graceHiddenKey', 'activeTimelineEvents', 'showOnlyActiveFileTimeline', 'setShowOnlyActiveFileTimeline',
    'mergedTimelineEvents', 'completedTaskTitles', 'savedNotesSplit', 'activeCaseTasksPendingAll',
    'activeGraceTasks', 'activeCaseTasksPending', 'trashedTimelineEvents', 'trashedCaseNotes',
    'trashedCaseTasks', 'dockPinnedNotes', 'dockPinnedTasks', 'nextTimelineId', 'seizedAssets',
    'setSeizedAssets', 'seizedAssetsSnapshotRef', 'realEstateSeizureAssets', 'setRealEstateSeizureAssets',
    'realEstateSeizureSnapshotRef', 'thirdPartySeizureAssets', 'setThirdPartySeizureAssets',
    'thirdPartySeizureSnapshotRef', 'standaloneExecutionMarks', 'setStandaloneExecutionMarks',
    'standaloneExecutionMarksSnapshotRef', 'getMilestoneTimelineSnapshot', 'seizureDraftsByDecisionId',
    'setSeizureDraftsByDecisionId', 'seizureDraftsByDecisionIdRef', 'activeCoerciveActions',
    'setActiveCoerciveActions', 'showCoerciveActionForm', 'setShowCoerciveActionForm',
    'seizureDetailCompletion', 'setSeizureDetailCompletion', 'saveCoerciveActionRef',
    'focusSeizurePropertyInlineRef', 'focusSeizureMovableInlineRef', 'focusSeizureThirdPartyInlineRef',
    'focusSeizureNoticeInlineRef', 'seizureOrchestrator', 'approvedSeizedAssets',
    'movableSeizureRegistryAssets', 'salarySeizureRegistryAssets', 'realEstateSeizureRegistryAssets',
    'thirdPartySeizureRegistryAssets', 'salarySeizureTabRows', 'isPaused', 'setIsPaused', 'pauseReason',
    'setPauseReason', 'executionFeeAdded', 'toastVisible', 'toastMessage', 'toastType', 'toastEpoch',
    'showToast', 'hideToast', 'showToastRef', 'decisionsOrchestrator', 'decisionsReloadEpoch',
    'setDecisionsReloadEpoch', 'decisionsModalBootHubTab', 'setDecisionsModalBootHubTab',
    'decisionsModalBootListTab', 'setDecisionsModalBootListTab', 'decisionsModalScrollToDecisionId',
    'setDecisionsModalScrollToDecisionId', 'appealsModalScrollToDecisionId',
    'setAppealsModalScrollToDecisionId', 'clearDecisionsModalBootState', 'openDecisionsModalWithBoot',
    'forcedBringDecisionState', 'employeeForcedBringAwaitingPersonalOutcome', 'executionFeeInjected',
    'setExecutionFeeInjected', 'financialOrchestrator', 'isFinancialCenterExpanded',
    'setIsFinancialCenterExpanded', 'activeFinancialTab', 'setActiveFinancialTab',
    'showExecutionFinancialHub', 'setShowExecutionFinancialHub', 'financialHubAutoOpenMode',
    'setFinancialHubAutoOpenMode', 'financialHubSeizedMovableId', 'setFinancialHubSeizedMovableId',
    'financialHubSeizedPropertyId', 'setFinancialHubSeizedPropertyId', 'openFinancialHubLedger',
    'thirdPartySeizuresUi', 'setThirdPartySeizuresUi', 'applyThirdPartySeizuresFromPatch',
];

const wsHook = `// @ts-nocheck
/** Phase C Slice 27 — workspace orchestrators + timeline/seizure/coercive state */
${WS_IMPORTS}

export function useExecutionDashboardCoreWorkspacePipeline(p: {
    modals: {
        showUnifiedExecutionModal: boolean;
        showUnifiedSummonsModal: boolean;
        showLedgerModal: boolean;
    };
    executionData: ExecutionFile | null | undefined;
    executionDataRef: { current: ExecutionFile | null | undefined };
    executionFileKey: string;
    executionDashboardFileId: string;
    executionId: string | undefined;
    executionStorageTick: number;
    setExecutionModal: (key: string, show: boolean) => void;
    showDecisionsModal: boolean;
    setShowDecisionsModal: (show: boolean) => void;
    setShowNotesModal: (show: boolean) => void;
    setShowDocumentsModal: (show: boolean) => void;
    setShowAppointmentModal: (show: boolean) => void;
    setShowTimelineModal: (show: boolean) => void;
    setShowNotificationModal: (show: boolean) => void;
    setShowCoerciveModal: (show: boolean) => void;
    subFiles: unknown[];
    activeSubFileId: string | null;
    isInabaActive: boolean;
    parentDossierId: string | null;
    persistExecutionMergeRef: { current: ((patch: Record<string, unknown>) => void) | null };
    pushTimelineEventRef: { current: unknown };
    executionFileSnapshotRef: { current: ExecutionFile | null };
}) {
${WS_DESTRUCT}
${wsBody}

    return { ${wsReturnKeys.join(', ')} };
}
`;

fs.writeFileSync(path.join(coreDir, 'useExecutionDashboardCoreWorkspacePipeline.ts'), wsHook, 'utf8');

// Grace + master + eviction pipeline
const GRACE_IMPORTS = `import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { getResidentialVacateDeadlineMaxIso, isVacateDeadlinePassed } from '@/app/utils/evictionResidentialVacate';
import { hasApprovedLawyerFeePayout, hasApprovedUnifiedCollection } from '@/app/utils/executorDecisionOutcomes';
import { applyEarnerFinancialPersonalCoerciveOverlay } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import { useExecutionDashboardGraceAndSummoning } from './useExecutionDashboardGraceAndSummoning';
import { useEarnerFinancialPersonalCoerciveFlags } from '../executionDashboardEarnerFinancialCoerciveGate';
import { useExecutionDashboardOtherPartyMirror } from './useExecutionDashboardOtherPartyMirror';
import { useStatuteOfLimitations } from '../useStatuteOfLimitations';
import { useMasterState } from '../useMasterState';
import { useExecutionDashboardCoerciveUiState } from './useExecutionDashboardCoerciveUiState';
import { useDossierDeathStatus } from '../useDossierDeathStatus';
import { useEvictionProcedureLockHint } from '../useEvictionProcedureLockHint';
import { useEvictionBadges } from '../useEvictionBadges';
import { useExecutionDashboardGraceLifecycleEffects } from './useExecutionDashboardGraceLifecycleEffects';
`;

const graceBody = lineRange(graceStart, graceEnd);
const graceReturnKeys = [
    'graceAndSummoning', 'generalMemoGraceAnchor', 'daysSinceNoticeCalculated', 'daysRemainingInGracePeriod',
    'isGracePeriodExpiredNow', 'evictionGraceAnchorDate', 'isEvictionGraceExpiredCalendar',
    'isEvictionGraceEffectivelyExpired', 'daysRemainingInEvictionGrace', 'isEvictionGraceExpiredNow',
    'forcedSummoningAnalysis', 'shouldCalculateExecutionFee', 'calculatedExecutionFee', 'totalWithExecutionFee',
    'remaining', 'isInBreach', 'earnerFinancialPersonalCoerciveActive', 'hideExecutiveDetentionJudgeCard',
    'followupSpecializationWithEarnerGate', 'followupModalSpecializationEffectiveWithEarnerGate',
    'unifiedCollectionApproved', 'otherPartyCreditorMirrorProps', 'statuteStatus', 'masterState',
    'executionStatusRaw', 'executionStatus', 'statusMetadata', 'stayOfExecutionActive', 'coerciveUiState',
    'coerciveUiLocked', 'dividedActiveDebtorCleared', 'executionCoerciveButtonDisabled', 'dossierStatusUi',
    'coerciveDossierLocked', 'executionActionsGridLocked', 'executionToolsTimelineLockedUi',
    'evictionProcedureLocked', 'isDebtorDeceasedForEvictionHeirs', 'creditorDeathMarked', 'debtorDeathMarked',
    'creditorDeathMenuLabel', 'debtorDeathMenuLabel', 'heirSubstitutionAllowed', 'ongoingAlimonyClaim',
    'alimonyBeneficiaryProfile', 'lawyerFeePayoutApproved', 'notifDateForEvictionVacate',
    'residentialVacateDeadlineMaxIso', 'notificationLayerOkEviction', 'isResidentialVacateGraceFinished',
    'evictionVacateLayerOk', 'evictionProcedureLockHint', 'evictionGraceBadgeInfo', 'policeAssistanceBadgeInfo',
];

const graceHook = `// @ts-nocheck
/** Phase C Slice 27 — grace / master state / coercive UI / eviction badges */
${GRACE_IMPORTS}

export function useExecutionDashboardCoreGraceMasterEvictionPipeline(p: Record<string, unknown>) {
    const {
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
        coercionOrchestrator,
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
        activeDebtorIsEmployee,
        followupSpecializationEffective,
        followupModalSpecializationEffective,
        followupModalDebtorIsEmployee,
        decisionsReloadEpoch,
        isRepresentingDebtor,
        decisionsStorageExecutionId,
        followupSpecialization,
        showPersonalCoerciveFollowupTab,
        showGuarantorInSeizureFollowupTab,
        isPersonalStatusExecutionClaim,
        isAlimonyClaimType,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        remainingBalanceForSeizure,
        viewExecutionData,
        settlementGuarantorGate,
        activeDebtorIsDeceased,
        assignmentWorkspaceCtx,
        primaryDebtorKeyResolved,
        personalTabLockedForEmployee,
        remaining,
        lastActionDate,
        dossierLifecycleRow,
        executionPaused,
        isPaused,
        pauseReason,
        executionFeeAdded,
        activeDebtorSolidary,
        allDebtorsUnified,
        followupOrchestrator,
        isHistoricalMode,
        debtorNotifiedForEvictionGrace,
        evictionPremisesUseResolved,
        todayYmd,
        timelineEventsRef,
        gracePeriodEnded,
        setGracePeriodEnded,
        setGracePeriodActive,
        showToastRef,
        showToast,
    } = p as any;

${graceBody}

    return { ${graceReturnKeys.join(', ')} };
}
`;

fs.writeFileSync(path.join(coreDir, 'useExecutionDashboardCoreGraceMasterEvictionPipeline.ts'), graceHook, 'utf8');

// Persist + handler mid pipeline
const PERSIST_IMPORTS = `import type { ExecutionFile } from '@/app/types/execution';
import { useDebtorSummonsProfile } from '../useDebtorSummonsProfile';
import { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';
import { useExecutionDashboardSaveExecutionData } from './useExecutionDashboardSaveExecutionData';
import { useExecutionDashboardExecutorApprovalActions } from './useExecutionDashboardExecutorApprovalActions';
import { useExecutionDashboardPushSeizureAuctionCalendarAppointment } from './useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from './useExecutionDashboardPendingExecutorDecisionOpeners';
import { useExecutionDashboardPersistExecutionMerge } from './useExecutionDashboardPersistExecutionMerge';
import { useExecutionTrashAndPins } from '../useExecutionTrashAndPins';
import { usePartyEditWorkflow } from '../usePartyEditWorkflow';
import {
    useExecutionDashboardExecutionFeeExemptionToast,
    useExecutionDashboardStatuteWarning,
    useExecutionDashboardFieldVisitScheduledListener,
    useExecutionDashboardMaritalFurnitureFinancialSync,
    useExecutionDashboardTimelineDedupeSync,
    useExecutionDashboardSeizureRequestCreatedListener,
    useExecutionDashboardGuarantorDecisionSync,
    useExecutionDashboardDeceasedDebtorCoerciveReset,
} from './useExecutionDashboardRuntimeSyncEffects';
`;

const persistBody = lineRange(persistStart, persistEnd);
const persistReturnKeys = [
    'debtorSummonsProfileBundle', 'debtorOccupation', 'isDebtorGovernmentEmployee', 'isDebtorFreelancer',
    'isDebtorRetired', 'debtorSummonsProfile', 'followupDebtorSummonsProfile', 'followupIsDebtorGovernmentEmployee',
    'followupIsDebtorRetired', 'showSalaryCaptureForEmployee', 'subsequentNoticeFlow', 'earnerForcedActionUnlocked',
    'followupEarnerForcedActionUnlocked', 'baseSubsequentNoticeUnlocked', 'evictionSubsequentNoticeUnlocked',
    'subsequentNoticeUnlocked', 'anyExecutorDecisionResolvedForMemoBadge', 'primaryDebtorTaklifActive',
    'primaryMemoNoticeBadge', 'primaryDebtorNoticeYmdResolved', 'showDebtorUnservedMemoBadge',
    'primaryDebtorAbsenceBadge', 'showDebtorSummonsAttendanceBadge', 'noticeKindGoalStrictBinding',
    'employeeAssignmentTabEnabled', 'resolvedEmployeeSummonsAssignment', 'showEmployeeAssignmentCoerciveBlock',
    'employeeFinancialSalaryOnlyCoercive', 'monetaryCoerciveLimitedOnly', 'followupEmployeeFinancialSalaryOnlyCoercive',
    'followupMonetaryCoerciveLimitedOnly', 'followupGarnishmentAmountPreview', 'saveExecutionData',
    'executorApprovalActions', 'pushSeizureAuctionCalendarAppointment', 'pendingExecutorOpeners',
    'tryOpenPendingBreakInventoryLedger', 'tryOpenPendingCustodianDetails', 'persistExecutionMergeBinding',
    'persistExecutionMerge', 'trashAndPinsHandlers', 'timelineEditDraft', 'setTimelineEditDraft',
    'moveTimelineEventToTrash', 'toggleTimelineEventPin', 'requestEditTimelineEvent', 'restoreTimelineEventFromTrash',
    'permanentlyDeleteTimelineEvent', 'moveCaseNoteToTrash', 'moveCaseTaskToTrash', 'toggleCaseNotePin',
    'toggleCaseTaskPin', 'saveTimelineEditDraft', 'restoreCaseNoteFromTrash', 'permanentlyDeleteCaseNote',
    'restoreCaseTaskFromTrash', 'permanentlyDeleteCaseTask', 'partyEditWorkflow', 'editPartyTarget',
    'setEditPartyTarget', 'partyEditDraft', 'setPartyEditDraft', 'partyEditHeirDeleteConfirmIdx',
    'setPartyEditHeirDeleteConfirmIdx', 'heirsQuickView', 'setHeirsQuickView', 'openEditParty',
    'buildPartyHeirsRows', 'openHeirsQuickView', 'savePartyEditDraft', 'removeHeirFromPartyEditDraftAtIndex',
    'togglePartyEditHeirClient',
];

const persistHook = `// @ts-nocheck
/** Phase C Slice 27 — summons profile + persist/save + trash/party edit sync */
${PERSIST_IMPORTS}

export function useExecutionDashboardCorePersistHandlerPipeline(p: Record<string, unknown>) {
    const ctx = p as any;
    const {
        effectiveDebtors,
        financialPrincipalAmount,
        financialLawyerFeesAmount,
        claimType,
        isNonFinancialClaim,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
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
        coercionOrchestrator,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        lawyerStartedPostNoticeExecution,
        noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic,
        isEvictionGraceEffectivelyExpired,
        activeCoerciveActions,
        activeDebtorNoticeScope,
        debtorSummonsMarkerLocal,
        monetaryExecutionStrictPathFlag,
        isAlimonyClaim,
        executionExtras,
        unifiedSummonsTargetDebtorKey,
        activeDebtorIsDeceased,
        primaryDebtorKeyResolved,
        debtorNotifiedForEvictionGrace,
        remaining,
        daysSinceNoticeCalculated,
        executionFeeInjected,
        showToast,
        statuteStatus,
        showStatuteWarning,
        setShowStatuteWarning,
        lastActionDate,
        timelineEvents,
        caseNotesLog,
        caseTasksPending,
        financialLedger,
        gracePeriodActive,
        gracePeriodEnded,
        seizedAssets,
        seizureDraftsByDecisionId,
        realEstateSeizureAssets,
        debtorEvaded,
        arrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        paidDebt,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerFeeCollectionSm,
        followupOrchestrator,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        executionFileSnapshotRef,
        setShowDecisionsModal,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
        decisionsStorageExecutionId,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        setExecutionStorageTick,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        caseNotesLogRef,
        caseTasksPendingRef,
        setPermanentDeleteTimelineId,
        viewExecutionData,
        isHistoricalMode,
        persistExecutionMerge,
        activeSubFileId,
        parentDossierId,
        setSeizureDraftsByDecisionId,
        seizedAssetsSnapshotRef,
        maritalFurnitureItemsForFollowup,
        setActiveCoerciveActions,
    } = ctx;

${persistBody}

    return { ${persistReturnKeys.join(', ')} };
}
`;

fs.writeFileSync(path.join(coreDir, 'useExecutionDashboardCorePersistHandlerPipeline.ts'), persistHook, 'utf8');

console.log('Generated hooks + manifest');
console.log('  workspace', wsStart, '-', wsEndLine);
console.log('  grace', graceStart, '-', graceEnd);
console.log('  persist', persistStart, '-', persistEnd);
console.log('  runtime keys', runtimeKeys.length);
