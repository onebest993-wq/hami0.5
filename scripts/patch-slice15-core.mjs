import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function replaceBetween(text, startMarker, endMarker, replacement, label) {
    const start = text.indexOf(startMarker);
    if (start < 0) throw new Error(`${label}: start not found`);
    const end = text.indexOf(endMarker, start);
    if (end < 0) throw new Error(`${label}: end not found`);
    return text.slice(0, start) + replacement + text.slice(end);
}

const newImports = `import { useExecutionDashboardFollowupTabAssembly } from './executionDashboardCore/useExecutionDashboardFollowupTabAssembly';
import { useExecutionDashboardCoreScopeRuntimeBindings } from './executionDashboardCore/useExecutionDashboardCoreScopeRuntimeBindings';
import { buildExecutionDashboardModalScope } from './executionDashboardCore/buildExecutionDashboardModalScope';
import { mergeExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/mergeExecutionDashboardCoreScopeBagInput';`;

if (!core.includes('useExecutionDashboardFollowupTabAssembly')) {
    core = core.replace(
        "import { useExecutionDashboardExecutorApprovalActions } from './executionDashboardCore/useExecutionDashboardExecutorApprovalActions';",
        `import { useExecutionDashboardExecutorApprovalActions } from './executionDashboardCore/useExecutionDashboardExecutorApprovalActions';
${newImports}`,
    );
}

// --- followup tab assembly ---
const followupHook = `    const {
        executionDomainContext,
        followupSpecialization,
        followupSpecializationEffective,
        showPersonalCoerciveFollowupTab,
        showSalarySeizureInFollowupModal,
        followupSalarySeizureLabel,
        showEmployeeCompulsoryProceduresBanner,
        activeFollowupDebtorKey,
        personalTabUnlockByDebtor,
        setPersonalTabUnlockByDebtor,
        employeePersonalTabUnlockStorageKey,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        modalEmployeeCoerciveDetentionRestricted,
        modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        modalPersonalTabLockedForEmployee,
        followupTabsRestricted,
        followupSectionTabOrder,
        followupModalTabs,
        isFollowupTabActive,
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    } = useExecutionDashboardFollowupTabAssembly({
        executionData,
        viewExecutionData,
        executionId,
        decisionsStorageExecutionId,
        claimType,
        activeDebtorIsDeceased,
        activeDebtorIsLegalEntity,
        activeDebtorIsEmployee,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        followupModalSpecializationEffective,
        modalShowEmployeeAssignmentCoerciveBlock,
        followupAssignmentWorkspaceCtx,
        primaryDebtorWorkspaceKey,
        employeeAssignmentPhaseForCoercive,
        employeeCompulsoryBannerDismissed,
        setEmployeeCompulsoryBannerDismissed,
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        dossierFileKey,
        setShowUnifiedExecutionModal,
        followupModalBodyScrollRef,
        followupModalSectionTabsRef,
        followupModalOpenGenerationRef,
        seizureMatrixRef,
        openSeizureRequestsTabRef,
        hideCoerciveTabsForDebtorAgent,
    });

`;

core = replaceBetween(
    core,
    '    const executionDomainContext = useMemo(',
    '    useExecutionDashboardDebtorBrowserTabsClamp({',
    followupHook,
    'followup tab assembly',
);

// --- scope runtime bindings ---
const runtimeHook = `    const {
        insertTimelineEventToSupabase,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        seizedAssetsModalExecutionId,
        totalExecutionExpenses,
        initialFileNumber,
    } = useExecutionDashboardCoreScopeRuntimeBindings({
        isEvictionExecutionModule,
        executionData,
        executionId,
        file,
        executorApprovalActions,
        total_execution_expenses,
        setSeizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        activeCoerciveActions,
        setActiveCoerciveActions,
    });

`;

core = replaceBetween(
    core,
    '    const insertTimelineEventToSupabase = useCallback(',
    '    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({',
    runtimeHook +
        '    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({',
    'scope runtime bindings',
);

// Fix duplicate if replace added extra
core = core.replace(
    runtimeHook + '    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({',
    runtimeHook + '    const followupScopeBag = buildExecutionDashboardFollowupScopeBag({',
);

// --- modal scope (before lazy chunk setup) ---
if (!core.includes('buildExecutionDashboardModalScope({')) {
    core = core.replace(
        '    const executionModalFlags = {',
        `    const { executionModalFlags, executionModalSetters } = buildExecutionDashboardModalScope({
        modals,
        setExecutionModal,
        showUnifiedExecutionModal: modals.showUnifiedExecutionModal,
        showDecisionsModal: modals.showDecisionsModal,
        showDocumentsModal: modals.showDocumentsModal,
        showTimelineModal: modals.showTimelineModal,
        showCoerciveModal: modals.showCoerciveModal,
        showNotificationModal: modals.showNotificationModal,
        showUnifiedSummonsModal: modals.showUnifiedSummonsModal,
        showPaymentModal: modals.showPaymentModal,
        showSeizedAssetsModal: modals.showSeizedAssetsModal,
        showNotesModal: modals.showNotesModal,
        showAppointmentModal: modals.showAppointmentModal,
        showPaymentCalculator: modals.showPaymentCalculator,
        showSettlementCalculator: modals.showSettlementCalculator,
        showPauseModal: modals.showPauseModal,
        showLedgerModal: modals.showLedgerModal,
        showEditDossierMetaModal: modals.showEditDossierMetaModal,
        showEvictionExpenseModal: modals.showEvictionExpenseModal,
        showEvictionLawyerFeeModal: modals.showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal: modals.showEvictionResidentialGraceModal,
        showGuarantorDetailsModal: modals.showGuarantorDetailsModal,
        showHeirsNotificationModal: modals.showHeirsNotificationModal,
        showLinkedDossierTimeline,
        showRealEstateSeizureModal: modals.showRealEstateSeizureModal,
        showSolidaryCoerciveTargetModal: modals.showSolidaryCoerciveTargetModal,
        showStayOfExecutionModal: modals.showStayOfExecutionModal,
        showTransferFileNumberChangeModal,
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
    });

    const __REMOVE_executionModalFlags = {`,
    );

    core = replaceBetween(
        core,
        '    const __REMOVE_executionModalFlags = {',
        '    const {\n        phoneBodyFingerprint,',
        `    const {
        phoneBodyFingerprint,`,
        'remove inline modal flags',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice15-core: OK (part 1)');
console.log('lines:', core.split('\n').length);
