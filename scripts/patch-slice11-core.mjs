import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let src = fs.readFileSync(path, 'utf8');

const employmentOld = `    /** تبديل موظف ↔ كاسب — \`useExecutionDashboardStore.toggleDebtorEmploymentStatus\` + دمج الملف */
    const handleDebtorEmploymentToggle = useCallback(`;
const employmentNew = `    const { handleDebtorEmploymentToggle } = useExecutionDashboardDebtorEmploymentHandlers({
        executionDataRef,
        debtorWorkspaceEntries,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });

    const __removedHandleDebtorEmploymentToggle = useCallback(`;

if (!src.includes(employmentOld)) throw new Error('employment block not found');
src = src.replace(employmentOld, employmentNew);

// Remove employment useCallback body until exIdForPersonalDecisions
src = src.replace(
    /\n    const __removedHandleDebtorEmploymentToggle = useCallback\([\s\S]*?\n    \);\n\n    const exIdForPersonalDecisions/,
    '\n    const exIdForPersonalDecisions',
);

const notifyStart = '    const handleNotifyDebtor = (';
const notifyEnd = '    const activeDebtorHeirsForNotification = useActiveDebtorHeirsForNotification(';
const notifyReplacement = `    const { handleNotifyDebtor } = useExecutionDashboardNotifyDebtorHandler({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        notificationPurpose,
        notificationCount,
        subsequentNoticeUnlocked,
        isEvictionExecutionModule,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setDebtorNotificationDate,
        setLastActionDate,
        setActiveNoticeState,
        setNoticeVoluntaryPeriodEndOptimistic,
        setVoluntaryEndOptimistic,
        setNotificationCount,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setNotificationPurpose,
        setSummonsMarkerPopoverOpen,
    });

    const {
        activeDebtorHeirsForNotification,
        heirsWorkflowByHeir,
        normalizeHeirWorkflowKey,
        computeDeadlineYmd,
        computeDaysRemaining,
        openHeirsNotificationCenter,
        issueHeirMemoNotice,
        markHeirMemoAttended,
        closeHeirMemoManually,
        issueHeirSummons,
        requestHeirInvestigationCourt,
        markHeirAttendedAfterInvestigation,
        issueHeirArrestWarrant,
        markHeirSummonsAttended,
        markHeirSummonsPeriodEnded,
    } = useExecutionDashboardHeirsNotificationHandlers({
        executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeDebtorIsDeceased,
        heirNoticeDateDrafts,
        decisionsStorageExecutionId,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setHeirNoticeDateDrafts,
        setHeirSummonsDatePickerOpenByHeir,
        setShowHeirsNotificationModal,
    });

    useExecutionDashboardDecisionsHeirsModalExclusivity(
        showDecisionsModal,
        showHeirsNotificationModal,
        setShowHeirsNotificationModal,
    );
    useExecutionDashboardHeirsInvestigationSync({
        executionData,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    });

    const __removedHeirsBlock = useActiveDebtorHeirsForNotification(`;

const i0 = src.indexOf(notifyStart);
const i1 = src.indexOf(notifyEnd);
if (i0 < 0 || i1 < 0) throw new Error('notify block not found');
src = src.slice(0, i0) + notifyReplacement + src.slice(i1);

// Remove heirs inline block up to clearDebtorSummonsMarker
src = src.replace(
    /\n    const __removedHeirsBlock = useActiveDebtorHeirsForNotification\([\s\S]*?\n    \);\n\n    const clearDebtorSummonsMarker/,
    '\n    const clearDebtorSummonsMarker',
);

const summonsStart = '    const clearDebtorSummonsMarker = useCallback(() => {';
const summonsEnd = '    /** مهلة الرضا من آلة الحالة';
const summonsReplacement = `    const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleDebtorEvasion,
    } = useExecutionDashboardDebtorSummonsCoerciveHandlers({
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        debtorSummonsMarkerLocal,
        summonsPurposeDraft,
        forcedSummoningAnalysis,
        activeDebtorNameResolved,
        activeFollowupDebtorKey,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        setDebtorSummonsMarkerLocal,
        setSummonsMarkerPopoverOpen,
        setForcedAttendanceIssued,
        setActiveNoticeState,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setInvestigationCourtRequested,
        setInvestigationPathDebtorPresent,
        setInvestigationMemoIssued,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
        setDebtorArrested,
        setEarnerFeeCollectionSm,
    });

    /** مهلة الرضا من آلة الحالة`;

const j0 = src.indexOf(summonsStart);
const j1 = src.indexOf(summonsEnd);
if (j0 < 0 || j1 < 0) throw new Error('summons block not found');
src = src.slice(0, j0) + summonsReplacement + src.slice(j1);

fs.writeFileSync(path, src, 'utf8');
console.log('patched', path);
