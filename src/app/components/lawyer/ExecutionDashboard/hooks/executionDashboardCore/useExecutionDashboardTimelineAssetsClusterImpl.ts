import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
    ExecutionFile,
    SeizedAsset,
    TimelineEvent,
} from '@/app/types/execution';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import {
    defaultEvictionEarnerFeeCollectionSM,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import { useTimelineAssetsSeizureTail } from './useTimelineAssetsSeizureTail';
import { useMergedTimelineEvents } from '../useMergedTimelineEvents';
import { useCaseTasksAndNotes } from '../useCaseTasksAndNotes';
import { useExecutionDashboardEvictionGraceUiState } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardDebtorNotificationSync,
    useExecutionDashboardLegacyNoticeStateBackfill,
    useExecutionDashboardEarnerFeeSmSync,
    useExecutionDashboardStandaloneMarksSync,
} from './useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDashboardSubDossierTimelineLifecycle,
} from './useExecutionDashboardSubDossierTimelineLifecycle';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';

import {
    asArray,
    asCaseNotesLog,
    asCaseTasksPending,
    asRecord,
    makeArrayStateSetter,
    type CaseNotesLog,
    type CaseTasksPending,
    type CoercionBridge,
} from './timelineAssetsClusterHelpers';
import { useTimelineAssetsScheduleModals } from './useTimelineAssetsScheduleModals';
import {
    useTimelineAssetsFinancialLedger,
    useTimelineAssetsSeizureCollections,
} from './useTimelineAssetsFinancialLedger';

export function useExecutionDashboardTimelineAssetsClusterImpl(input: {
    p: ExecutionDashboardCoreWorkspacePipelineInput;
    coercionOrchestrator: CoercionBridge;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
}) {
    const { p, coercionOrchestrator, setForcedAttendanceIssued } = input;

    const scheduleModals = useTimelineAssetsScheduleModals();
    const {
        noteText, setNoteText,
        appointmentPurpose, setAppointmentPurpose,
        appointmentDateOnly, setAppointmentDateOnly,
        appointmentTimeOptional, setAppointmentTimeOptional,
        editingAppointmentId, setEditingAppointmentId,
        appointmentContext, setAppointmentContext,
        executorScheduleModalOpen, setExecutorScheduleModalOpen,
        executorScheduleContext, setExecutorScheduleContext,
        breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen,
        breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx,
        judicialCustodianModalOpen, setJudicialCustodianModalOpen,
        judicialCustodianModalCtx, setJudicialCustodianModalCtx,
        executionReportPrompt, setExecutionReportPrompt,
    } = scheduleModals;

    const {
        financialLedger,
        financialLedgerRef,
        setFinancialLedger,
        hasFinancialLedger,
        showLedgerModal,
        setShowLedgerModal,
        paymentAmount,
        setPaymentAmount,
        paymentDate,
        setPaymentDate,
        debtorNotificationDate,
        setDebtorNotificationDate,
        manualGraceCalendarExtra,
        setManualGraceCalendarExtra,
    } = useTimelineAssetsFinancialLedger({
        executionData: p.executionData,
        modals: p.modals,
        setExecutionModal: p.setExecutionModal,
    });

    useExecutionDashboardDebtorNotificationSync({
        executionData: p.executionData,
        setDebtorNotificationDate,
        setManualGraceCalendarExtra,
    });

    useExecutionDashboardLegacyNoticeStateBackfill({
        executionData: p.executionData,
        setActiveNoticeState: coercionOrchestrator.setActiveNoticeState,
    });

    const [timelineEventsRaw, setTimelineEventsRaw] = useState<TimelineEvent[]>(() =>
        asArray(p.executionData?.timelineEvents),
    );
    const setTimelineEvents = useCallback(makeArrayStateSetter(setTimelineEventsRaw), []);
    const timelineEvents = asArray<TimelineEvent>(timelineEventsRaw);
    const timelineEventsRef = useRef<TimelineEvent[]>(timelineEvents);
    timelineEventsRef.current = timelineEvents;
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(
        null,
    );
    const pushTimelineEventRef = useRef<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >(null);
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    const [earnerFeeCollectionSm, setEarnerFeeCollectionSm] = useState<EvictionEarnerFeeCollectionSM>(
        () => defaultEvictionEarnerFeeCollectionSM(),
    );
    const [caseNotesLogRaw, setCaseNotesLogRaw] = useState<CaseNotesLog>(() =>
        asCaseNotesLog(p.executionData?.caseNotesLog),
    );

    useExecutionDashboardEarnerFeeSmSync(p.executionData, setEarnerFeeCollectionSm);

    const [caseTasksPendingRaw, setCaseTasksPendingRaw] = useState<CaseTasksPending>(() =>
        asCaseTasksPending(p.executionData?.caseTasksPending),
    );

    // أي كاتب (hydrate / trash / append) قد يستلم prev فاسداً من التخزين — نطبّع عند كل كتابة
    const setCaseNotesLog = useCallback(makeArrayStateSetter(setCaseNotesLogRaw), []);
    const setCaseTasksPending = useCallback(makeArrayStateSetter(setCaseTasksPendingRaw), []);

    const caseNotesLog = asCaseNotesLog(caseNotesLogRaw);
    const caseTasksPending = asCaseTasksPending(caseTasksPendingRaw);
    const caseNotesLogRef = useRef(caseNotesLog);
    caseNotesLogRef.current = caseNotesLog;
    const caseTasksPendingRef = useRef(caseTasksPending);
    caseTasksPendingRef.current = caseTasksPending;

    const {
        evictionGracePinned,
        setEvictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        toggleEvictionGracePinned,
        gracePinnedKey,
        graceHiddenKey,
    } = useExecutionDashboardEvictionGraceUiState(p.executionData, p.executionId);

    const activeTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => !e.trashedAt),
        [timelineEvents],
    );
    const [showOnlyActiveFileTimeline, setShowOnlyActiveFileTimeline] = useState(false);
    const mergedTimelineEvents = useMergedTimelineEvents(
        activeTimelineEvents,
        p.subFiles as Array<{ id: string; fileNumber?: string; timelineEvents?: TimelineEvent[] }>,
        showOnlyActiveFileTimeline,
        p.activeSubFileId,
        p.parentDossierId,
    );

    const activeCaseNotesLog = useMemo(
        () => caseNotesLog.filter((n) => !n.trashedAt),
        [caseNotesLog],
    );
    const {
        completedTaskTitles,
        savedNotesSplit,
        activeCaseTasksPendingAll,
        activeGraceTasks,
        activeCaseTasksPending,
        trashedTimelineEvents,
        trashedCaseNotes,
        trashedCaseTasks,
    } = useCaseTasksAndNotes(timelineEvents, activeCaseNotesLog, caseTasksPending, caseNotesLog);

    const dockPinnedNotes = useMemo(
        () => activeCaseNotesLog.filter((n) => Boolean(n.pinned)),
        [activeCaseNotesLog],
    );
    const dockPinnedTasks = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt && Boolean(t.pinned)),
        [caseTasksPending],
    );

    const nextTimelineId = useCallback(
        () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        [],
    );

    const {
        seizedAssets,
        setSeizedAssets,
        seizedAssetsSnapshotRef,
        realEstateSeizureAssets,
        setRealEstateSeizureAssets,
        realEstateSeizureSnapshotRef,
        thirdPartySeizureAssets,
        setThirdPartySeizureAssets,
        thirdPartySeizureSnapshotRef,
        standaloneExecutionMarks,
        setStandaloneExecutionMarks,
        standaloneExecutionMarksSnapshotRef,
    } = useTimelineAssetsSeizureCollections({ executionData: p.executionData });
    useExecutionDashboardStandaloneMarksSync(
        p.executionData,
        p.executionStorageTick,
        setStandaloneExecutionMarks,
    );

    const getMilestoneTimelineSnapshot = useCallback(
        () =>
            buildExecutionTimelineSnapshot({
                executionData: p.executionDataRef.current,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            }),
        [p.executionDataRef],
    );

    const [seizureDraftsByDecisionId, setSeizureDraftsByDecisionId] = useState<
        Record<string, SeizedAsset>
    >(() => asRecord(p.executionData?.seizureDraftsByDecisionId));
    const seizureDraftsByDecisionIdRef = useRef(seizureDraftsByDecisionId);
    seizureDraftsByDecisionIdRef.current = asRecord(seizureDraftsByDecisionId);
    const [activeCoerciveActionsRaw, setActiveCoerciveActionsRaw] = useState<string[]>(() =>
        asArray(p.executionData?.activeCoerciveActions),
    );
    const setActiveCoerciveActions = useCallback(
        makeArrayStateSetter(setActiveCoerciveActionsRaw),
        [],
    );
    const activeCoerciveActions = asArray<string>(activeCoerciveActionsRaw);

    useExecutionDashboardSubDossierTimelineLifecycle({
        activeSubFileId: p.activeSubFileId,
        isInabaActive: p.isInabaActive,
        parentDossierId: p.parentDossierId,
        executionData: p.executionData,
        executionDashboardFileId: p.executionDashboardFileId,
        setShowOnlyActiveFileTimeline,
        setTimelineEvents,
        persistExecutionMergeRef,
        setCaseNotesLog,
        setCaseTasksPending,
        setSeizedAssets,
        setSeizureDraftsByDecisionId,
        setActiveCoerciveActions,
        setRealEstateSeizureAssets,
    });

    const seizureTail = useTimelineAssetsSeizureTail({
        p,
        coercionOrchestrator,
        setForcedAttendanceIssued,
        seizedAssets,
        setSeizedAssets,
        realEstateSeizureAssets,
        thirdPartySeizureAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        setActiveCoerciveActions,
        setCaseTasksPending,
    });

    return {
        noteText,
        setNoteText,
        appointmentPurpose,
        setAppointmentPurpose,
        appointmentDateOnly,
        setAppointmentDateOnly,
        appointmentTimeOptional,
        setAppointmentTimeOptional,
        editingAppointmentId,
        setEditingAppointmentId,
        appointmentContext,
        setAppointmentContext,
        executorScheduleModalOpen,
        setExecutorScheduleModalOpen,
        executorScheduleContext,
        setExecutorScheduleContext,
        breakInventoryFurnitureModalOpen,
        setBreakInventoryFurnitureModalOpen,
        breakInventoryFurnitureModalCtx,
        setBreakInventoryFurnitureModalCtx,
        judicialCustodianModalOpen,
        setJudicialCustodianModalOpen,
        judicialCustodianModalCtx,
        setJudicialCustodianModalCtx,
        executionReportPrompt,
        setExecutionReportPrompt,
        financialLedger,
        setFinancialLedger,
        financialLedgerRef,
        hasFinancialLedger,
        showLedgerModal,
        setShowLedgerModal,
        paymentAmount,
        setPaymentAmount,
        paymentDate,
        setPaymentDate,
        debtorNotificationDate,
        setDebtorNotificationDate,
        manualGraceCalendarExtra,
        setManualGraceCalendarExtra,
        timelineEvents,
        setTimelineEvents,
        timelineEventsRef,
        persistExecutionMergeRef,
        pushTimelineEventRef,
        executionFileSnapshotRef,
        earnerFeeCollectionSm,
        setEarnerFeeCollectionSm,
        caseNotesLog,
        setCaseNotesLog,
        caseNotesLogRef,
        caseTasksPending,
        setCaseTasksPending,
        caseTasksPendingRef,
        evictionGracePinned,
        setEvictionGracePinned,
        evictionGraceHidden,
        setEvictionGraceHidden,
        toggleEvictionGracePinned,
        gracePinnedKey,
        graceHiddenKey,
        activeTimelineEvents,
        showOnlyActiveFileTimeline,
        setShowOnlyActiveFileTimeline,
        mergedTimelineEvents,
        completedTaskTitles,
        savedNotesSplit,
        activeCaseTasksPendingAll,
        activeGraceTasks,
        activeCaseTasksPending,
        trashedTimelineEvents,
        trashedCaseNotes,
        trashedCaseTasks,
        dockPinnedNotes,
        dockPinnedTasks,
        nextTimelineId,
        seizedAssets,
        setSeizedAssets,
        seizedAssetsSnapshotRef,
        realEstateSeizureAssets,
        setRealEstateSeizureAssets,
        realEstateSeizureSnapshotRef,
        thirdPartySeizureAssets,
        setThirdPartySeizureAssets,
        thirdPartySeizureSnapshotRef,
        standaloneExecutionMarks,
        setStandaloneExecutionMarks,
        standaloneExecutionMarksSnapshotRef,
        getMilestoneTimelineSnapshot,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureDraftsByDecisionIdRef,
        activeCoerciveActions,
        setActiveCoerciveActions,
        ...seizureTail,
    };
}
