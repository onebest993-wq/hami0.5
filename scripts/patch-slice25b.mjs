import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

const start = core.indexOf('    const dynamicExpenses = useDynamicExpenses();');
const end = core.indexOf('    const graceAndSummoning = useExecutionDashboardGraceAndSummoning({');
if (start < 0 || end <= start) {
    console.error('claim pipeline block not found', start, end);
    process.exit(1);
}

const replacement = `    const claimFinancialLedger = useExecutionDashboardCoreClaimFinancialLedgerPipeline({
        executionData,
        viewExecutionData,
        executionId,
        claimType,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        evictionCaseExpensesSum,
        liabilityGroupTabsMode,
        activeLiabilityGroup,
        allDebtorRowsForLiability,
        activeTimelineEvents,
        decisionsStorageExecutionId,
        debtorNotificationDate,
        effectiveDebtors,
        executionFileKey,
        decisionsReloadEpoch,
        persistExecutionMergeRef,
        executionDataRef,
        setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft,
        setTimelineEvents,
        nextTimelineId,
        showToast,
        applyThirdPartySeizuresFromPatch,
        pushTimelineEventRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef: followupOrchestrator.openSeizureRequestsTabRef,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setEvictionAssetsTabUnlocked: followupOrchestrator.setEvictionAssetsTabUnlocked,
        seizedAssetsSnapshotRef,
        setSeizedAssets,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeDebtorIsEmployee,
        docType,
        classification,
        activeDebtorEntityKind,
        activeDebtorIsDeceased,
        followupSpecialization,
        followupSectionTabOrder,
        followupModalTabs,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        setUnifiedModalTab: followupOrchestrator.setUnifiedModalTab,
        showUnifiedExecutionModal,
        unifiedModalTab: followupOrchestrator.unifiedModalTab,
        hideCoerciveTabsForDebtorAgent,
        showPersonalCoerciveFollowupTab,
        setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
        setSolidaryCoerciveActionPending: followupOrchestrator.setSolidaryCoerciveActionPending,
        followupModalChipTablistRef: followupOrchestrator.followupModalChipTablistRef,
        followupModalDebtorTabsRef: followupOrchestrator.followupModalDebtorTabsRef,
        isSolidaryLiability,
        allDebtorsUnified,
        seizureMatrixRef: followupOrchestrator.seizureMatrixRef,
    });

    const {
        parsedDebtAmount,
        parsedLawyerFees,
        parsedExecutionFee,
        parsedClientFees,
        parsedCourtFees,
        parsedDirectorateFees,
        total_execution_expenses,
        claimFinancials,
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
        seizureMatrixLedgerParamsRef,
        debtorNotifiedForEvictionGrace,
        isAlimonyClaim,
        isHybridFeesNonMonetary,
        monetaryExecutionStrictPathFlag,
        monetaryStrictForSummoningEngine,
        ledgerSync,
        remainingBalanceForSeizure,
        settlementGuarantorGate,
        seizureMatrix,
        isPersonalStatusExecutionClaim,
        followupSeizureTabs,
        showGuarantorInSeizureFollowupTab,
        effectiveFollowupSectionTabOrder,
        effectiveFollowupModalTabs,
        openSeizureRequestsTab,
    } = claimFinancialLedger;

`;

core = core.slice(0, start) + replacement + core.slice(end);

const importLine =
    "import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './executionDashboardCore/useExecutionDashboardCoreClaimFinancialLedgerPipeline';";
if (!core.includes('useExecutionDashboardCoreClaimFinancialLedgerPipeline')) {
    core = core.replace(
        "import { useExecutionDashboardSeizureLedgerOutcomeEffects } from './executionDashboardCore/useExecutionDashboardSeizureLedgerOutcomeEffects';",
        importLine + "\nimport { useExecutionDashboardSeizureLedgerOutcomeEffects } from './executionDashboardCore/useExecutionDashboardSeizureLedgerOutcomeEffects';",
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice25b OK, core lines:', core.split('\n').length);
