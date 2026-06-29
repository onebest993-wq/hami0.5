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

const newImports = `import { useExecutionDashboardParentDossierPersistence } from './executionDashboardCore/useExecutionDashboardParentDossierPersistence';
import { buildExecutionDashboardCoreScopeBagsFromFragments } from './executionDashboardCore/buildExecutionDashboardCoreScopeBagsFromInput';
import {
    followupTabAssemblyScopeFragment,
    runtimeBindingsScopeFragment,
    notesTasksHandlersScopeFragment,
} from './executionDashboardCore/executionDashboardCoreScopeBagFragments';`;

if (!core.includes('useExecutionDashboardParentDossierPersistence')) {
    core = core.replace(
        "import { groupExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/groupExecutionDashboardCoreScopeBagInput.generated';",
        `${newImports}`,
    );
}

// --- fix phoneBodyFingerprint corruption ---
core = core.replace(
    `    const {
        phoneBodyFingerprint,    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardLazyChunkSetup({`,
    `    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardLazyChunkSetup({`,
);

// --- followup tab assembly alias ---
if (!core.includes('const followupTabAssembly = useExecutionDashboardFollowupTabAssembly(')) {
    core = core.replace(
        '    } = useExecutionDashboardFollowupTabAssembly({',
        `    } = followupTabAssembly;

    const followupTabAssembly = useExecutionDashboardFollowupTabAssembly({`,
    );
    // fix order - assignment must come AFTER hook call
    core = core.replace(
        `    const {
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
    } = followupTabAssembly;

    const followupTabAssembly = useExecutionDashboardFollowupTabAssembly({`,
        `    const followupTabAssembly = useExecutionDashboardFollowupTabAssembly({`,
    );
    core = core.replace(
        `        hideCoerciveTabsForDebtorAgent,
    });

    const timelineFilterOptions = useMemo(`,
        `        hideCoerciveTabsForDebtorAgent,
    });

    const {
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
    } = followupTabAssembly;

    const timelineFilterOptions = useMemo(`,
    );
}

// --- runtime bindings alias ---
if (!core.includes('const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings(')) {
    core = core.replace(
        `    const {
        insertTimelineEventToSupabase,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        seizedAssetsModalExecutionId,
        totalExecutionExpenses,
        initialFileNumber,
    } = useExecutionDashboardCoreScopeRuntimeBindings({`,
        `    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings({`,
    );
    core = core.replace(
        `        setActiveCoerciveActions,
    });

    const {
        followupScopeBag,`,
        `        setActiveCoerciveActions,
    });

    const {
        insertTimelineEventToSupabase,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        seizedAssetsModalExecutionId,
        totalExecutionExpenses,
        initialFileNumber,
    } = scopeRuntimeBindings;

    const {
        followupScopeBag,`,
    );
}

// --- notes tasks handlers alias ---
if (!core.includes('const notesTasksHandlers = useExecutionDashboardNotesTasksHandlers(')) {
    core = core.replace(
        `    const {
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
    } = useExecutionDashboardNotesTasksHandlers({`,
        `    const notesTasksHandlers = useExecutionDashboardNotesTasksHandlers({`,
    );
    core = core.replace(
        `        closeUnifiedSeizureLog,
    });

    const voiceUserId = useMemo(() => resolveCalendarUserId(null), []);`,
        `        closeUnifiedSeizureLog,
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
    } = notesTasksHandlers;

    const voiceUserId = useMemo(() => resolveCalendarUserId(null), []);`,
    );
}

// --- remove inline hasApprovedCollectionDecision ---
core = core.replace(
    `    const hasApprovedCollectionDecision = useMemo(() => {
        if (!Array.isArray(executionCopilotDecisions)) return false;
        return executionCopilotDecisions.some(
            (r: any) => r?.requestKind === 'unified_collection' && r?.executorOutcome === 'approved'
        );
    }, [executionCopilotDecisions]);

`,
    '',
);

// --- parent dossier persistence ---
const parentHook = `    const {
        persistParentDossierMerge,
        parentIsEvictionForExpandedHeader,
        openParentDossierMetaEdit,
    } = useExecutionDashboardParentDossierPersistence({
        parentDossierId,
        parentExecutionFile,
        onUpdate,
        setExecutionStorageTick,
        showToast,
    });

`;

if (core.includes('const persistParentDossierMerge = useCallback(')) {
    core = replaceBetween(
        core,
        '    const persistParentDossierMerge = useCallback(',
        '    /** مصدر موحّد لتحديث المدينين — يفضّل البيانات المدمجة في الملف على props المتأخرة */',
        parentHook,
        'parent dossier hook',
    );
    core = core.replace(
        `    const parentIsEvictionForExpandedHeader = String(parentExecutionFile?.claimType ?? '').includes('تخلية');

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

`,
        '',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice17-core: OK');
console.log('core lines:', core.split('\n').length);
