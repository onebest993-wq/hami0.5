// @ts-nocheck
/** Phase C Slice 24 — تعريف مجموعات scope local/rest (من slice 23) */

const LOCAL_GROUPS = {
    timeline: [
        'timelineAccordionExpanded', 'setTimelineAccordionExpanded', 'activeTimelineFilter', 'setActiveTimelineFilter',
        'timelineEvents', 'setTimelineEvents', 'timelineEditDraft', 'setTimelineEditDraft', 'timelineFilterOptions',
        'timelineDebtorMetadata', 'timelineRadarPreviewLimit', 'activeTimelineEvents', 'activeTimelineEventsDebtorScoped',
        'showOnlyActiveFileTimeline', 'setShowOnlyActiveFileTimeline', 'mergedTimelineEvents', 'mergeSimilarRecentTimelineEvent',
        'nextTimelineId', 'trashedCaseNotes', 'trashedCaseTasks', 'trashedTimelineEvents',
    ],
    execution: [
        'executionData', 'executionDataRef', 'executionId', 'viewExecutionData', 'currentFile', 'currentFileId', 'file',
        'fileNumber', 'fileYear', 'executionStatus', 'executionPaused', 'executionReportPrompt', 'executionAppealBanner',
        'executionMemoBadgePopoverOpen', 'onClose', 'onUpdate', 'activeSubFileId', 'docNumber', 'activeTabId', 'setActiveTabId',
        'childDossiers', 'subFiles', 'parentDossierId', 'parentExecutionFile', 'hasChildDossiers', 'visitChildNames',
        'linkedDossierToView', 'setLinkedDossierToView',
    ],
    seizure: [
        'seizedAssets', 'setSeizedAssets', 'seizureDraftsByDecisionId', 'setSeizureDraftsByDecisionId', 'seizureMatrix',
        'seizureMatrixLedgerParamsRef', 'seizureDetailCompletion', 'movableSeizureRegistryAssets', 'realEstateSeizureAssets',
        'realEstateSeizureRegistryAssets', 'salarySeizureRegistryAssets', 'thirdPartySeizureAssets', 'thirdPartySeizureRegistryAssets',
        'thirdPartySeizuresUi', 'setThirdPartySeizuresUi',
    ],
    notes: [
        'noteBody', 'setNoteBody', 'noteTitle', 'setNoteTitle', 'editingNoteId', 'editingAppointmentId', 'editingTaskId',
        'setEditingAppointmentId', 'setEditingTaskId', 'appointmentDateOnly', 'setAppointmentDateOnly', 'appointmentPurpose',
        'setAppointmentPurpose', 'setAppointmentTimeOptional', 'savedNotesSplit', 'savedNotesView', 'setSavedNotesView',
        'caseTasksPending', 'setCaseTasksPending', 'setIsTask', 'setTaskDueDate', 'setTaskStatus', 'isTask', 'dockPinnedNotes', 'dockPinnedTasks',
    ],
    financial: [
        'financialLedger', 'financialStatus', 'hasFinancialLedger', 'paidClientFees', 'paidCourtFees', 'paidDebt',
        'paidDirectorateFees', 'paymentAmount', 'paymentDate', 'setPaymentAmount', 'setPaymentDate', 'total_execution_expenses',
    ],
} as const;

const REST_GROUPS = {
    runtimeFns: ['getMilestoneTimelineSnapshot', 'todayYmd'],
    eviction: [
        'appendEvictionExecutorRequest', 'appendEvictionProcedure', 'evictionFullAddressField', 'evictionGraceBadgeInfo',
        'evictionGraceHidden', 'evictionGracePinned', 'evictionPremisesUseResolved', 'evictionProcedureLockHint',
        'evictionPropertyDistrict', 'evictionPropertyNumber', 'evictionPropertyTypeField', 'graceHiddenKey', 'gracePeriodEnded',
        'residentialGracePeriodSaved', 'residentialVacateDeadlineMaxIso',
        'toggleEvictionGracePinned', 'setEvictionGraceHidden',
    ],
    summons: [
        'setDebtorNotificationDate', 'setDebtorSummonsMarkerLocal', 'debtorNotificationDate', 'debtorSummonsMarkerLocal',
        'setSummonsMarkerPopoverOpen', 'setSummonsPurposeDraft', 'summonsMarkerPopoverOpen', 'summonsPurposeDraft', 'notificationCount',
        'noticeVoluntaryPeriodEndOptimistic', 'voluntaryEndOptimistic', 'dismissDebtorAbsenceBadge', 'syncRollingCalendarSessions',
    ],
    modals: [
        'activeCoerciveActions', 'setActiveCoerciveActions', 'saveCoerciveActionRef', 'setShowCoerciveActionForm', 'setShowCoerciveModal',
        'showCoerciveModal', 'showExecutionTrashModal', 'showExtraCreditors', 'showExtraDebtors',
        'showJudgmentMeta', 'showToast', 'setShowExecutionTrashModal', 'setShowExtraCreditors', 'setShowExtraDebtors',
        'setShowUnifiedSummonsModal', 'setIsPaused', 'setPauseReason', 'setManualGraceCalendarExtra',
    ],
    followupDerived: [
        'followupModalDebtorIsDeceased', 'followupModalDebtorIsEmployee', 'followupModalSpecializationEffectiveWithEarnerGate',
        'followupSpecializationWithEarnerGate', 'modalKasabTerminationEmphasis', 'modalResolvedEmployeeSummonsAssignment',
        'modalShowEmployeeAssignmentCoerciveBlock',
    ],
    claimDisplay: [
        'claimType', 'claimTypeArabicDisplay', 'classificationDisplay', 'headerFields', 'judgmentDateDisplay',
        'parentClaimTypeArabicDisplay', 'parentClassificationDisplay', 'parentHeaderFields', 'parentJudgmentDateDisplay',
        'parentShowJudgmentMeta', 'parsedClientFees', 'parsedCourtFees', 'parsedDirectorateFees', 'parsedLawyerFees',
        'partyBadgesExecutionId', 'initiator', 'appealPerspective', 'isPersonalStatusExecutionClaim', 'isRepresentingDebtor',
        'isUnifiedTabActive', 'hideCoerciveTabsForDebtorAgent', 'hideExecutiveDetentionJudgeCard', 'shouldShowGuarantorExternalHub',
        'kasabTerminationEmphasis', 'daysRemainingUntilDeadline',
    ],
    partyDeath: [
        'creditorDeathMenuLabel', 'creditorExtraMinorLabel', 'creditorExtraMinorNames', 'debtorDeathMenuLabel', 'debtorEmploymentToggleMenuLabel',
    ],
    debtorProfile: [
        'activeDebtorIsDeceased', 'activeDebtorIsEmployee', 'activeDebtorIsLegalEntity', 'debtorEvaded',
        'employeeForcedBringAwaitingPersonalOutcome', 'isDebtorRowEmployee',
    ],
    masterState: [
        'statusMetadata', 'forcedBringDecisionState', 'forcedAttendanceIssued', 'stayOfExecutionActive', 'statuteStatus',
        'standaloneExecutionMarks', 'unifiedCollectionApproved', 'isPaused', 'pauseReason', 'permanentDeleteTimelineId',
        'setPermanentDeleteTimelineId', 'isHistoricalMode', 'isAssignmentDeadlinePassed', 'activeGraceTasks',
        'policeAssistanceBadgeInfo', 'publicationNoticeDeadlineYmd',
    ],
    inaba: ['inabaCorrespondenceLog', 'inabaTargets', 'isInabaActive'],
    executor: [
        'executorScheduleContext', 'executorScheduleModalOpen', 'setExecutorScheduleContext', 'setExecutorScheduleModalOpen',
        'setExecutionStorageTick', 'setExecutionReportPrompt', 'setExecutionMemoBadgePopoverOpen',
    ],
    breakInv: [
        'breakInventoryFurnitureModalCtx', 'breakInventoryFurnitureModalOpen', 'setBreakInventoryFurnitureModalCtx', 'setBreakInventoryFurnitureModalOpen',
    ],
    judicial: [
        'judicialCustodianModalCtx', 'judicialCustodianModalOpen', 'setJudicialCustodianModalCtx', 'setJudicialCustodianModalOpen',
    ],
    financialAlimony: [
        'guarantorFollowupAwaitingDetailsSave', 'lawyerFeePayoutApproved', 'lawyerStartedPostNoticeExecution',
        'specificDeliveryConvertedAmount', 'specificDeliveryFinancialized', 'accumulatedAlimony', 'monthlyAlimony', 'alimonyBeneficiaryProfile',
    ],
    header: ['toggleHeaderExpanded', 'isHeaderExpanded'],
    runtimeConstants: ['useExecutionDashboardStore', 'voiceUserId', 'resolveCalendarUserId'],
} as const;

function pickGroup(f: Record<string, unknown>, keys: readonly string[]) {
    const g: Record<string, unknown> = {};
    for (const k of keys) {
        if (k in f) g[k] = f[k];
    }
    return g;
}

export function buildScopeLocalBundleGroups(f: Record<string, unknown>) {
    return {
        timeline: pickGroup(f, LOCAL_GROUPS.timeline),
        execution: pickGroup(f, LOCAL_GROUPS.execution),
        seizure: pickGroup(f, LOCAL_GROUPS.seizure),
        notes: pickGroup(f, LOCAL_GROUPS.notes),
        financial: pickGroup(f, LOCAL_GROUPS.financial),
    };
}

export function buildScopeRestBundleGroups(f: Record<string, unknown>) {
    const out: Record<string, Record<string, unknown>> = {};
    for (const [name, keys] of Object.entries(REST_GROUPS)) {
        out[name] = pickGroup(f, keys);
    }
    return out;
}

export const SCOPE_LOCAL_ALL_KEYS = Object.values(LOCAL_GROUPS).flat();
export const SCOPE_REST_ALL_KEYS = Object.values(REST_GROUPS).flat();
