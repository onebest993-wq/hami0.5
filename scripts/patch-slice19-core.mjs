import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

const newImport = `import { useExecutionDashboardDebtorWorkspaceContext } from './executionDashboardCore/useExecutionDashboardDebtorWorkspaceContext';`;
if (!core.includes('useExecutionDashboardDebtorWorkspaceContext')) {
    core = core.replace(
        "import { useExecutionDashboardEvictionHeirsMemoHandlers } from './executionDashboardCore/useExecutionDashboardEvictionHeirsMemoHandlers';",
        `import { useExecutionDashboardEvictionHeirsMemoHandlers } from './executionDashboardCore/useExecutionDashboardEvictionHeirsMemoHandlers';
${newImport}`,
    );
}

// dossier lifecycle panel alias
if (!core.includes('const dossierLifecyclePanel =')) {
    core = core.replace(
        /    const \{\n        dossierStatusDraft,[\s\S]*?    \} = useExecutionDossierLifecyclePanelOrchestrator\(executionData\);/,
        `    const dossierLifecyclePanel = useExecutionDossierLifecyclePanelOrchestrator(executionData);

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
    } = dossierLifecyclePanel;`,
    );
}

// decisions orchestrator alias
if (!core.includes('const decisionsOrchestrator =')) {
    // already has alias - skip
}

// debtor workspace extraction
const workspaceHook = `    const debtorWorkspaceContext = useExecutionDashboardDebtorWorkspaceContext({
        executionData,
        creditors,
        debtors,
        executionDebtorTabIndex,
        setExecutionDebtorTabIndex,
        followupSolidaryDebtorIndex,
        setFollowupSolidaryDebtorIndex,
        mergedTimelineEvents,
        summonsContextDebtorKey,
        setNotificationCount,
        setDebtorSummonsMarkerLocal,
    });

    const {
        effectiveCreditors,
        effectiveDebtors,
        allDebtorsUnified,
        resolveDebtorSolidaryFlag,
        allDebtorsSolidary,
        isSolidaryLiability,
        debtorWorkspaceEntries,
        creditorWorkspaceEntries,
        creditorNamesTextList,
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
        liabilityGroupTabsMode,
        multiDebtorMode,
        debtorBrowserTabsMode,
        activeLiabilityGroup,
        activeGroupEntries,
        activeLiabilityGroupId,
        allDebtorRowsForLiability,
        activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved,
        showFollowupSolidaryDebtorTabs,
        effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        assignmentWorkspaceCtx,
        unifiedSummonsTargetDebtorKey,
        activeDebtorNoticeScope,
        scopedNotificationCount,
        scopedSummonsMarker,
        followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope,
    } = debtorWorkspaceContext;

`;

if (core.includes('const partyMultiplicityExec = executionData?.party_multiplicity;')) {
    core = core.replace(
        /    const effectiveCreditors = creditors \|\| \[\];\n    const effectiveDebtors = useMemo\([\s\S]*?    useExecutionDashboardScopedDebtorNoticeSync\(\{[\s\S]*?\}\);\n\n    const \{ activeDebtorIsEmployee/,
        workspaceHook + '    const { activeDebtorIsEmployee',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice19-core: OK');
console.log('core lines:', core.split('\n').length);
