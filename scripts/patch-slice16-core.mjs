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

const newImports = `import { useExecutionDashboardSaveExecutionData } from './executionDashboardCore/useExecutionDashboardSaveExecutionData';
import { useExecutionDashboardCoerciveUiState } from './executionDashboardCore/useExecutionDashboardCoerciveUiState';
import { useExecutionDashboardPendingExecutorDecisionOpeners } from './executionDashboardCore/useExecutionDashboardPendingExecutorDecisionOpeners';
import { useExecutionDashboardPushSeizureAuctionCalendarAppointment } from './executionDashboardCore/useExecutionDashboardPushSeizureAuctionCalendarAppointment';
import { useExecutionDashboardPropertyInlineSaveContext } from './executionDashboardCore/useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardJudicialCustodianRemove } from './executionDashboardCore/useExecutionDashboardJudicialCustodianRemove';`;

if (!core.includes('useExecutionDashboardSaveExecutionData')) {
    core = core.replace(
        "import { mergeExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/mergeExecutionDashboardCoreScopeBagInput';",
        `import { mergeExecutionDashboardCoreScopeBagInput } from './executionDashboardCore/mergeExecutionDashboardCoreScopeBagInput';
${newImports}`,
    );
}

// --- coercive UI state ---
const coerciveHook = `    const {
        coerciveUiLocked,
        dividedActiveDebtorCleared,
        executionCoerciveButtonDisabled,
        dossierStatusUi,
        coerciveDossierLocked,
        executionActionsGridLocked,
        executionToolsTimelineLockedUi,
        evictionProcedureLocked,
    } = useExecutionDashboardCoerciveUiState({
        executionPaused,
        isPaused,
        stayOfExecutionActive,
        activeDebtorSolidary,
        allDebtorsUnifiedLength: allDebtorsUnified.length,
        activeDebtorCleared: Boolean(allDebtorsUnified[executionDebtorTabIndex]?.cleared),
        dossierStatus: dossierLifecycleRow?.dossierStatus,
        isHistoricalMode,
    });

`;

if (core.includes('buildExecutionCoerciveUiFlags({')) {
    core = replaceBetween(
        core,
        '    const {\n        coerciveUiLocked,',
        '    /** تخلية: إظهار أدوات مذكرة إخبار الورثة عند وفاة المدين */',
        coerciveHook,
        'coercive ui hook',
    );
    core = core.replace(
        `    /**
     * محضر المتابعة والأدوات الجبرية: تُقفَل فقط عند الإيقاف/الاستئخار — لا تُعطَّل لمجرد انتهاء الإضبارة
     * (سياسة Zero-Lock بعد وفاة المدين؛ مسؤولية المحامي).
     */
    /** تعطيل أزرار أدوات الإضبارة (عدا مركز الحالات الخاصة) */
    const executionActionsGridLocked = stayOfExecutionActive;
    const executionToolsTimelineLockedUi = executionActionsGridLocked || isHistoricalMode;
`,
        '',
    );
    core = core.replace(
        `    /** التخلية الميدانية: لا تُقفَل لمجرد حالة آلة حياة الإضبارة؛ فقط عند موقف قانوني (إيقاف/استئخار). */
    const evictionProcedureLocked = coerciveUiLocked;

`,
        '',
    );
}

// --- save execution data ---
const saveHook = `    const saveExecutionData = useExecutionDashboardSaveExecutionData({
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

`;

if (core.includes('const saveExecutionData = useCallback(() => {')) {
    core = replaceBetween(
        core,
        '    const saveExecutionData = useCallback(() => {',
        '    const executorApprovalActions = useExecutionDashboardExecutorApprovalActions({',
        saveHook,
        'save hook',
    );
    core = core.replace('    useExecutionDashboardSaveOnUnmount(saveExecutionData);\n\n', '');
}

// --- push seizure auction calendar ---
const pushAuctionHook = `    const pushSeizureAuctionCalendarAppointment =
        useExecutionDashboardPushSeizureAuctionCalendarAppointment(executorApprovalActions);

`;

if (core.includes('const pushSeizureAuctionCalendarAppointment = useCallback(')) {
    core = replaceBetween(
        core,
        '    const pushSeizureAuctionCalendarAppointment = useCallback(',
        '    const tryOpenPendingBreakInventoryLedger = useCallback(',
        pushAuctionHook,
        'push auction hook',
    );
}

// --- pending executor decision openers ---
const pendingOpenersHook = `    const { tryOpenPendingBreakInventoryLedger, tryOpenPendingCustodianDetails } =
        useExecutionDashboardPendingExecutorDecisionOpeners({
            executionId,
            decisionsStorageExecutionId,
            executorApprovalActions,
            setShowDecisionsModal,
            openBreakInventoryCompletion,
            openJudicialCustodianCompletion,
        });

`;

if (core.includes('const tryOpenPendingBreakInventoryLedger = useCallback(')) {
    core = replaceBetween(
        core,
        '    const tryOpenPendingBreakInventoryLedger = useCallback(',
        '    useExecutionDashboardFieldVisitScheduledListener({',
        pendingOpenersHook,
        'pending openers hook',
    );
}

// --- judicial custodian remove ---
const custodianRemoveHook = `    const removeJudicialCustodianEntry = useExecutionDashboardJudicialCustodianRemove({
        executionData,
        persistExecutionMerge,
        showToast,
    });

`;

if (core.includes('const removeJudicialCustodianEntry = useCallback(')) {
    core = replaceBetween(
        core,
        '    const removeJudicialCustodianEntry = useCallback(',
        '    const { pushTimelineEvent } = useExecutionDashboardPushTimelineEvent({',
        custodianRemoveHook,
        'custodian remove hook',
    );
}

// --- property inline save context ---
const propertyInlineHook = `    const propertyInlineSaveCtx = useExecutionDashboardPropertyInlineSaveContext({
        decisionsStorageExecutionId,
        executionDataId: executionData?.id,
        executionId,
        showToast,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        linkSeizureAuctionToAppointments,
        pushSeizureAuctionCalendarAppointment,
    });

`;

if (core.includes('const propertyInlineSaveCtx = useMemo((): PropertyInlineSaveContext => {')) {
    core = replaceBetween(
        core,
        '    const propertyInlineSaveCtx = useMemo((): PropertyInlineSaveContext => {',
        '    const { realEstateModalInitial, saveRealEstateSeizureFromModal } =',
        propertyInlineHook,
        'property inline hook',
    );
}

// drop unused imports if safe
core = core.replace(
    "import { buildExecutionCoerciveUiFlags } from './executionDashboardCore/executionDashboardCoerciveUi';\n",
    '',
);
core = core.replace(
    "import { persistExecutionDashboardSnapshot } from './executionDashboardCore/persistExecutionDashboardSnapshot';\n",
    '',
);
if (!core.includes('useExecutionDashboardSaveOnUnmount(')) {
    core = core.replace(
        /import \{([^}]*?)useExecutionDashboardSaveOnUnmount,\s*/s,
        'import {$1',
    );
    core = core.replace(/,\s*useExecutionDashboardSaveOnUnmount\s*/g, '');
}
if (!core.includes('PropertyInlineSaveContext')) {
    core = core.replace(
        "import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';\n",
        '',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice16-core: OK');
console.log('core lines:', core.split('\n').length);
