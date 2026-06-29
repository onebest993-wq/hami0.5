import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

const newImport = `import { useExecutionDashboardEvictionHeirsMemoHandlers } from './executionDashboardCore/useExecutionDashboardEvictionHeirsMemoHandlers';`;
if (!core.includes('useExecutionDashboardEvictionHeirsMemoHandlers')) {
    core = core.replace(
        "import { useExecutionDashboardParentDossierPersistence } from './executionDashboardCore/useExecutionDashboardParentDossierPersistence';",
        `import { useExecutionDashboardParentDossierPersistence } from './executionDashboardCore/useExecutionDashboardParentDossierPersistence';
${newImport}`,
    );
}

function wrapDestructuredHook(coreText, varName, hookName) {
    if (coreText.includes(`const ${varName} = ${hookName}`)) return coreText;
    const pattern = `} = ${hookName}({`;
    const idx = coreText.indexOf(pattern);
    if (idx < 0) return coreText;
    const openBrace = coreText.lastIndexOf('const {', idx);
    const destructure = coreText.slice(openBrace, idx + 1);
    const hookStart = coreText.indexOf(`${hookName}({`, idx);
    const hookEnd = coreText.indexOf('});', hookStart) + 3;
    const hookCall = coreText.slice(hookStart, hookEnd);
    const replacement = `const ${varName} = ${hookCall}\n\n${destructure} = ${varName};\n\n`;
    return coreText.slice(0, openBrace) + replacement + coreText.slice(hookEnd);
}

// trash and pins
if (!core.includes('const trashAndPinsHandlers =')) {
    core = core.replace(
        /    const \{\n        timelineEditDraft,[\s\S]*?    \} = useExecutionTrashAndPins\(\{/,
        `    const trashAndPinsHandlers = useExecutionTrashAndPins({`,
    );
    core = core.replace(
        `        setPermanentDeleteTimelineId,
    });

    const {
        editPartyTarget,`,
        `        setPermanentDeleteTimelineId,
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
    } = trashAndPinsHandlers;

    const {
        editPartyTarget,`,
    );
}

// grace and summoning
if (!core.includes('const graceAndSummoning =')) {
    core = core.replace(
        /    const \{\n        generalMemoGraceAnchor,[\s\S]*?    \} = useExecutionDashboardGraceAndSummoning\(\{/,
        `    const graceAndSummoning = useExecutionDashboardGraceAndSummoning({`,
    );
    core = core.replace(
        `        manualGraceCalendarExtra,
    });

    const otherPartyCreditorMirrorProps = useExecutionDashboardOtherPartyMirror({`,
        `        manualGraceCalendarExtra,
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
    } = graceAndSummoning;

    const otherPartyCreditorMirrorProps = useExecutionDashboardOtherPartyMirror({`,
    );
}

// ledger sync
if (!core.includes('const ledgerSync =')) {
    core = core.replace(
        `    const { remainingBalanceForSeizure, settlementGuarantorGate } = useExecutionDashboardLedgerSync({`,
        `    const ledgerSync = useExecutionDashboardLedgerSync({`,
    );
    core = core.replace(
        `        setSeizedAssets,
    });

    const {
        showGuarantorInSeizureFollowupTab,`,
        `        setSeizedAssets,
    });

    const { remainingBalanceForSeizure, settlementGuarantorGate } = ledgerSync;

    const followupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({`,
    );
    core = core.replace(
        `    const followupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({`,
        `    const {
        showGuarantorInSeizureFollowupTab,`,
    );
}

// followup seizure tabs - redo if broken
if (!core.includes('const followupSeizureTabs =')) {
    core = core.replace(
        /    const \{\n        showGuarantorInSeizureFollowupTab,[\s\S]*?    \} = useExecutionDashboardFollowupSeizureTabs\(\{/,
        `    const followupSeizureTabs = useExecutionDashboardFollowupSeizureTabs({`,
    );
    core = core.replace(
        `        solidaryDebtorCount: allDebtorsUnified.length,
    });

    const graceAndSummoning = useExecutionDashboardGraceAndSummoning({`,
        `        solidaryDebtorCount: allDebtorsUnified.length,
    });

    const {
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    } = followupSeizureTabs;

    const graceAndSummoning = useExecutionDashboardGraceAndSummoning({`,
    );
}

// coercive ui
if (!core.includes('const coerciveUiState =')) {
    core = core.replace(
        /    const \{\n        coerciveUiLocked,[\s\S]*?    \} = useExecutionDashboardCoerciveUiState\(\{/,
        `    const coerciveUiState = useExecutionDashboardCoerciveUiState({`,
    );
    core = core.replace(
        `        isHistoricalMode,
    });

    const {
        isDebtorDeceasedForEvictionHeirs,`,
        `        isHistoricalMode,
    });

    const {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        evictionProcedureLocked,
    } = coerciveUiState;

    const {
        isDebtorDeceasedForEvictionHeirs,`,
    );
}

// persist / push
if (!core.includes('const persistExecutionMergeBinding =')) {
    core = core.replace(
        `    const { persistExecutionMerge } = useExecutionDashboardPersistExecutionMerge({`,
        `    const persistExecutionMergeBinding = useExecutionDashboardPersistExecutionMerge({`,
    );
    core = core.replace(
        `    });

    persistExecutionMergeRef.current = persistExecutionMerge;`,
        `    });

    const { persistExecutionMerge } = persistExecutionMergeBinding;

    persistExecutionMergeRef.current = persistExecutionMerge;`,
    );
}
if (!core.includes('const pushTimelineEventBinding =')) {
    core = core.replace(
        `    const { pushTimelineEvent } = useExecutionDashboardPushTimelineEvent({`,
        `    const pushTimelineEventBinding = useExecutionDashboardPushTimelineEvent({`,
    );
    core = core.replace(
        `    });

    pushTimelineEventRef.current = pushTimelineEvent;`,
        `    });

    const { pushTimelineEvent } = pushTimelineEventBinding;

    pushTimelineEventRef.current = pushTimelineEvent;`,
    );
}

// pending openers
if (!core.includes('const pendingExecutorOpeners =')) {
    core = core.replace(
        `    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        useExecutionDashboardPendingExecutorDecisionOpeners({`,
        `    const pendingExecutorOpeners = useExecutionDashboardPendingExecutorDecisionOpeners({`,
    );
    core = core.replace(
        `        openJudicialCustodianCompletion,
        });

    useExecutionDashboardFieldVisitScheduledListener({`,
        `        openJudicialCustodianCompletion,
        });

    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        pendingExecutorOpeners;

    useExecutionDashboardFieldVisitScheduledListener({`,
    );
}

const wrapHooks = [
    ['partyDeathHandlers', 'useExecutionDashboardPartyDeathHandlers'],
    ['voluntaryPeriodHandlers', 'useExecutionDashboardVoluntaryPeriodHandlers'],
    ['employeeAssignmentHandlers', 'useExecutionDashboardEmployeeAssignmentHandlers'],
    ['publicationNoticeHandlers', 'useExecutionDashboardPublicationNoticeHandlers'],
    ['stayHandlers', 'useExecutionDashboardStayHandlers'],
    ['dossierFollowupHandlers', 'useExecutionDashboardDossierFollowupHandlers'],
    ['heirsNotificationHandlers', 'useExecutionDashboardHeirsNotificationHandlers'],
    ['debtorSummonsCoerciveHandlers', 'useExecutionDashboardDebtorSummonsCoerciveHandlers'],
    ['evictionResidentialGraceHandlers', 'useExecutionDashboardEvictionResidentialGraceHandlers'],
    ['policeAssistanceHandlers', 'useExecutionDashboardPoliceAssistanceHandlers'],
    ['breakInventoryHandlers', 'useExecutionDashboardBreakInventoryHandlers'],
    ['guarantorFollowupHandlers', 'useExecutionDashboardGuarantorFollowupHandlers'],
    ['evictionFinancialHandlers', 'useExecutionDashboardEvictionFinancialHandlers'],
    ['moduleExpenseHandlers', 'useExecutionDashboardModuleExpenseHandlers'],
    ['followupSeizureHandlers', 'useExecutionDashboardFollowupSeizureHandlers'],
    ['seizureAssetModalHandlers', 'useExecutionDashboardSeizureAssetModalHandlers'],
    ['thirdPartyReceiveHandlers', 'useExecutionDashboardThirdPartyReceiveHandlers'],
    ['coerciveActionBridge', 'useExecutionDashboardCoerciveActionBridge'],
    ['coerciveActionHandlers', 'useExecutionDashboardCoerciveActionHandlers'],
    ['standaloneMarkHandlers', 'useExecutionDashboardStandaloneMarkHandlers'],
    ['seizureReleaseHandlers', 'useExecutionDashboardSeizureReleaseHandlers'],
    ['parentDossierPersistence', 'useExecutionDashboardParentDossierPersistence'],
];

for (const [varName, hookName] of wrapHooks) {
    core = wrapDestructuredHook(core, varName, hookName);
}

// single-return hooks
if (!core.includes('const gracePeriodEndHandler =')) {
    core = core.replace(
        `    const { handleEndGracePeriod } = useExecutionDashboardGracePeriodEndHandler({`,
        `    const gracePeriodEndHandler = useExecutionDashboardGracePeriodEndHandler({`,
    );
    core = core.replace(
        `        setLastActionDate,
    });

        const { appendEvictionProcedure } = useEvictionProcedures(`,
        `        setLastActionDate,
    });

    const { handleEndGracePeriod } = gracePeriodEndHandler;

        const { appendEvictionProcedure } = useEvictionProcedures(`,
    );
}

if (!core.includes('const debtorEmploymentHandler =')) {
    core = core.replace(
        `    const { handleDebtorEmploymentToggle } = useExecutionDashboardDebtorEmploymentHandlers({`,
        `    const debtorEmploymentHandler = useExecutionDashboardDebtorEmploymentHandlers({`,
    );
    core = core.replace(
        `        setTimelineEvents,
    });

    const exIdForPersonalDecisions = executionData?.id ?? executionId;`,
        `        setTimelineEvents,
    });

    const { handleDebtorEmploymentToggle } = debtorEmploymentHandler;

    const exIdForPersonalDecisions = executionData?.id ?? executionId;`,
    );
}

if (!core.includes('const paymentHandlers =')) {
    core = core.replace(
        /    const \{\n        handlePayment,[\s\S]*?useExecutionDashboardPaymentHandlers\(\{/,
        `    const paymentHandlers = useExecutionDashboardPaymentHandlers({`,
    );
    core = core.replace(
        `        setShowPaymentModal,
        });

    const notifyDebtorHandler = useExecutionDashboardNotifyDebtorHandler({`,
        `        setShowPaymentModal,
        });

    const {
        handlePayment,
        handlePaymentFromCalculator,
        handleFundsLedgerPayment,
        handleSettlementFromCalculator,
    } = paymentHandlers;

    const notifyDebtorHandler = useExecutionDashboardNotifyDebtorHandler({`,
    );
}

if (!core.includes('const notifyDebtorHandler =')) {
    core = core.replace(
        `    const { handleNotifyDebtor } = useExecutionDashboardNotifyDebtorHandler({`,
        `    const notifyDebtorHandler = useExecutionDashboardNotifyDebtorHandler({`,
    );
    core = core.replace(
        `        setSummonsMarkerPopoverOpen,
    });

    const heirsNotificationHandlers = useExecutionDashboardHeirsNotificationHandlers({`,
        `        setSummonsMarkerPopoverOpen,
    });

    const { handleNotifyDebtor } = notifyDebtorHandler;

    const heirsNotificationHandlers = useExecutionDashboardHeirsNotificationHandlers({`,
    );
}

if (!core.includes('const appointmentHandler =')) {
    core = core.replace(
        `    const { handleSaveAppointment } = useExecutionDashboardAppointmentHandlers({`,
        `    const appointmentHandler = useExecutionDashboardAppointmentHandlers({`,
    );
    core = core.replace(
        `        setEditingAppointmentId,
    });

    const paymentHandlers = useExecutionDashboardPaymentHandlers({`,
        `        setEditingAppointmentId,
    });

    const { handleSaveAppointment } = appointmentHandler;

    const paymentHandlers = useExecutionDashboardPaymentHandlers({`,
    );
}

core = core.replace(
    `        const { saveThirdPartySeizureForDecision } = useExecutionDashboardThirdPartySeizureHandlers({`,
    `    const thirdPartySeizureHandlers = useExecutionDashboardThirdPartySeizureHandlers({`,
);
if (core.includes('thirdPartySeizureHandlers')) {
    core = core.replace(
        `        setThirdPartySeizuresUi,
    });

    useExecutionDashboardSupabaseTimelineHydrate({`,
        `        setThirdPartySeizuresUi,
    });

    const { saveThirdPartySeizureForDecision } = thirdPartySeizureHandlers;

    useExecutionDashboardSupabaseTimelineHydrate({`,
    );
}

core = core.replace(
    `    const { realEstateModalInitial, saveRealEstateSeizureFromModal } =
        useExecutionDashboardRealEstateSeizureModalHandlers({`,
    `    const realEstateSeizureHandlers = useExecutionDashboardRealEstateSeizureModalHandlers({`,
);
core = core.replace(
    `        setShowRealEstateSeizureModal,
        });

        const thirdPartySeizureHandlers = useExecutionDashboardThirdPartySeizureHandlers({`,
    `        setShowRealEstateSeizureModal,
        });

    const { realEstateModalInitial, saveRealEstateSeizureFromModal } = realEstateSeizureHandlers;

    const thirdPartySeizureHandlers = useExecutionDashboardThirdPartySeizureHandlers({`,
);

core = wrapDestructuredHook(core, 'salarySeizurePatch', 'useExecutionDashboardSalarySeizurePatch');

// eviction heirs memo
if (core.includes('const handleEvictionHeirsNotificationDateChange = useCallback(')) {
    core = core.replace(
        /    const handleEvictionHeirsNotificationDateChange = useCallback\([\s\S]*?\}, \[appendEvictionProcedure, evictionHeirsNotificationDateYmd\]\);\n\n/,
        `    const evictionHeirsMemoHandlers = useExecutionDashboardEvictionHeirsMemoHandlers({
        evictionHeirsNotificationDateYmd,
        setEvictionHeirsNotificationDateYmd,
        persistExecutionMerge,
        appendEvictionProcedure,
    });

    const {
        handleEvictionHeirsNotificationDateChange,
        handleIssueHeirsExecutionNoticeMemo,
    } = evictionHeirsMemoHandlers;

`,
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice18-core: OK');
console.log('core lines:', core.split('\n').length);
