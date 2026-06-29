import fs from 'fs';

const configPath = 'scripts/scope-bag-fragment-config.mjs';
let config = fs.readFileSync(configPath, 'utf8');

const REST_FRAGMENTS = [
    {
        fn: 'scopeStaticFnsScopeFragment',
        var: 'executionDashboardCoreStaticScopeFns',
        keys: [
            'buildDebtorSummonsMarkerPatchForKey',
            'buildEmployeeAssignmentPatchForDebtorKey',
            'buildPublicationNoticePatchForDebtorKey',
            'computeTaklifDeadlineYmd',
            'getDebtorSummonsMarkerForKey',
            'getDebtorSummonsProfile',
            'getEmployeeAssignmentForDebtorKey',
            'getExecutionPartyDisplayName',
            'getLocalTodayYmd',
            'getPersonalCoerciveSubtypeOutcome',
            'getPublicationNoticeForDebtorKey',
        ],
    },
    {
        fn: 'queueMicrotaskScopeFragment',
        var: 'executionDashboardCoreQueueMicrotask',
        binding: true,
        keys: ['queueMicrotask'],
    },
    {
        fn: 'scopeRuntimeFnsScopeFragment',
        var: 'scopeRuntimeFnsBundle',
        keys: ['getMilestoneTimelineSnapshot', 'todayYmd'],
    },
    {
        fn: 'evictionProceduresScopeFragment',
        var: 'evictionProceduresHandlers',
        keys: ['appendEvictionExecutorRequest', 'appendEvictionProcedure'],
    },
    {
        fn: 'summonsNoticeScopeFragment',
        var: 'summonsNoticeBundle',
        keys: [
            'setDebtorNotificationDate',
            'setDebtorSummonsMarkerLocal',
            'debtorNotificationDate',
            'debtorSummonsMarkerLocal',
            'setSummonsMarkerPopoverOpen',
            'setSummonsPurposeDraft',
            'summonsMarkerPopoverOpen',
            'summonsPurposeDraft',
            'notificationCount',
            'noticeVoluntaryPeriodEndOptimistic',
            'voluntaryEndOptimistic',
            'dismissDebtorAbsenceBadge',
            'syncRollingCalendarSessions',
        ],
    },
    {
        fn: 'evictionGraceUiScopeFragment',
        var: 'evictionGraceUiBundle',
        keys: [
            'evictionFullAddressField',
            'evictionGraceBadgeInfo',
            'evictionGraceHidden',
            'evictionGracePinned',
            'evictionPremisesUseResolved',
            'evictionProcedureLockHint',
            'evictionPropertyDistrict',
            'evictionPropertyNumber',
            'evictionPropertyTypeField',
            'graceHiddenKey',
            'gracePeriodEnded',
            'residentialGraceAllowsFieldwork',
            'residentialGracePeriodSaved',
            'residentialVacateDeadlineMaxIso',
            'showResidentialEvictionGraceControl',
            'showResidentialGraceEarlyEndRequest',
            'toggleEvictionGracePinned',
            'setEvictionGraceHidden',
        ],
    },
    {
        fn: 'coerciveModalUiScopeFragment',
        var: 'coerciveModalUiBundle',
        keys: [
            'activeCoerciveActions',
            'setActiveCoerciveActions',
            'saveCoerciveActionRef',
            'setShowCoerciveActionForm',
            'setShowCoerciveModal',
            'showCoerciveModal',
        ],
    },
    {
        fn: 'modalFlagsScopeFragment',
        var: 'modalFlagsBundle',
        keys: [
            'showBreakInventoryRequest',
            'showExecutionTrashModal',
            'showExtraCreditors',
            'showExtraDebtors',
            'showJudgmentMeta',
            'showToast',
            'setShowExecutionTrashModal',
            'setShowExtraCreditors',
            'setShowExtraDebtors',
            'setShowUnifiedSummonsModal',
            'setIsPaused',
            'setPauseReason',
            'setManualGraceCalendarExtra',
        ],
    },
    {
        fn: 'followupModalDerivedScopeFragment',
        var: 'followupModalDerivedBundle',
        keys: [
            'followupModalDebtorIsDeceased',
            'followupModalDebtorIsEmployee',
            'followupModalSpecializationEffectiveWithEarnerGate',
            'followupSpecializationWithEarnerGate',
            'modalKasabTerminationEmphasis',
            'modalResolvedEmployeeSummonsAssignment',
            'modalShowEmployeeAssignmentCoerciveBlock',
        ],
    },
    {
        fn: 'claimDisplayScopeFragment',
        var: 'claimDisplayBundle',
        keys: [
            'claimType',
            'claimTypeArabicDisplay',
            'classificationDisplay',
            'headerFields',
            'judgmentDateDisplay',
            'parentClaimTypeArabicDisplay',
            'parentClassificationDisplay',
            'parentHeaderFields',
            'parentJudgmentDateDisplay',
            'parentShowJudgmentMeta',
            'parsedClientFees',
            'parsedCourtFees',
            'parsedDirectorateFees',
            'parsedLawyerFees',
            'partyBadgesExecutionId',
            'initiator',
            'appealPerspective',
            'isPersonalStatusExecutionClaim',
            'isRepresentingDebtor',
            'isUnifiedTabActive',
            'hideCoerciveTabsForDebtorAgent',
            'hideExecutiveDetentionJudgeCard',
            'shouldShowGuarantorExternalHub',
            'kasabTerminationEmphasis',
            'firstActiveAppealDecisionId',
            'daysRemainingUntilDeadline',
        ],
    },
    {
        fn: 'partyDeathLabelsScopeFragment',
        var: 'partyDeathLabelsBundle',
        keys: [
            'creditorDeathMenuLabel',
            'creditorExtraMinorLabel',
            'creditorExtraMinorNames',
            'debtorDeathMenuLabel',
            'debtorEmploymentToggleMenuLabel',
        ],
    },
    {
        fn: 'debtorProfileScopeFragment',
        var: 'debtorProfileBundle',
        keys: [
            'activeDebtorIsDeceased',
            'activeDebtorIsEmployee',
            'activeDebtorIsLegalEntity',
            'debtorEvaded',
            'employeeForcedBringAwaitingPersonalOutcome',
            'isDebtorRowEmployee',
        ],
    },
    {
        fn: 'masterStateScopeFragment',
        var: 'masterStateBundle',
        keys: [
            'statusMetadata',
            'forcedBringDecisionState',
            'forcedAttendanceIssued',
            'stayOfExecutionActive',
            'statuteStatus',
            'standaloneExecutionMarks',
            'unifiedCollectionApproved',
            'isPaused',
            'pauseReason',
            'permanentDeleteTimelineId',
            'setPermanentDeleteTimelineId',
            'isHistoricalMode',
            'isAssignmentDeadlinePassed',
            'activeGraceTasks',
            'policeAssistanceBadgeInfo',
            'publicationNoticeDeadlineYmd',
        ],
    },
    {
        fn: 'inabaScopeFragment',
        var: 'inabaBundle',
        keys: ['inabaCorrespondenceLog', 'inabaTargets', 'isInabaActive'],
    },
    {
        fn: 'executorScheduleScopeFragment',
        var: 'executorScheduleBundle',
        keys: [
            'executorScheduleContext',
            'executorScheduleModalOpen',
            'setExecutorScheduleContext',
            'setExecutorScheduleModalOpen',
            'setExecutionStorageTick',
            'setExecutionReportPrompt',
            'setExecutionMemoBadgePopoverOpen',
        ],
    },
    {
        fn: 'breakInventoryModalScopeFragment',
        var: 'breakInventoryModalBundle',
        keys: [
            'breakInventoryFurnitureModalCtx',
            'breakInventoryFurnitureModalOpen',
            'setBreakInventoryFurnitureModalCtx',
            'setBreakInventoryFurnitureModalOpen',
        ],
    },
    {
        fn: 'judicialCustodianModalScopeFragment',
        var: 'judicialCustodianModalBundle',
        keys: [
            'judicialCustodianModalCtx',
            'judicialCustodianModalOpen',
            'setJudicialCustodianModalCtx',
            'setJudicialCustodianModalOpen',
        ],
    },
    {
        fn: 'financialAlimonyScopeFragment',
        var: 'financialAlimonyBundle',
        keys: [
            'guarantorFollowupAwaitingDetailsSave',
            'lawyerFeePayoutApproved',
            'lawyerStartedPostNoticeExecution',
            'specificDeliveryConvertedAmount',
            'specificDeliveryFinancialized',
            'accumulatedAlimony',
            'monthlyAlimony',
            'alimonyBeneficiaryProfile',
        ],
    },
    {
        fn: 'headerUiScopeFragment',
        var: 'headerUiBundle',
        keys: ['toggleHeaderExpanded', 'isHeaderExpanded'],
    },
    {
        fn: 'runtimeConstantsScopeFragment',
        var: 'runtimeConstantsBundle',
        keys: ['useExecutionDashboardStore', 'voiceUserId', 'FollowupModalContext', 'resolveCalendarUserId'],
    },
];

if (config.includes('scopeUtilityFnsScopeFragment')) {
    console.log('extend-scope-bag-slice21-rest: already applied');
    process.exit(0);
}

// extend debtor workspace fragment
if (!config.includes("'effectiveCreditors',")) {
    config = config.replace(
        "'effectiveFollowupDebtorEntry',\n        ],\n    },",
        "'effectiveFollowupDebtorEntry',\n            'effectiveCreditors',\n            'effectiveDebtors',\n            'creditorWorkspaceEntries',\n            'debtorsSectionRef',\n        ],\n    },",
    );
}

// extend guarantor followup fragment
config = config.replace(
    /fn: 'guarantorFollowupHandlersScopeFragment',[\s\S]*?keys: \[([\s\S]*?)\],/,
    (m, keysBlock) => {
        if (keysBlock.includes('requestFollowupSeizureDecision')) return m;
        return m.replace(
            keysBlock,
            keysBlock.trimEnd() + "\n            'requestFollowupSeizureDecision',",
        );
    },
);

const insert = REST_FRAGMENTS.map((f) => {
    const bindingLine = f.binding ? `\n        binding: true,` : '';
    const keysJson = JSON.stringify(f.keys, null, 12).replace(/^/gm, '    ');
    return `    {
        fn: '${f.fn}',
        var: '${f.var}',${bindingLine}
        keys: ${keysJson},
    },`;
}).join('\n');

config = config.replace(
    '/** Phase C Slice 20 — rest collector spreads (keys picked via scopeBagPick) */',
    insert + '\n    /** Phase C Slice 20 — rest collector spreads (keys picked via scopeBagPick) */',
);

fs.writeFileSync(configPath, config, 'utf8');
console.log('extend-scope-bag-slice21-rest: added', REST_FRAGMENTS.length, 'rest fragments');
