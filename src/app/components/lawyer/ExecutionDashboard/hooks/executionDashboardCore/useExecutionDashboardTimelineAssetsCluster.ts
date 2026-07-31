import { useCallback, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import {
    defaultEvictionEarnerFeeCollectionSM,
    type EvictionEarnerFeeCollectionSM,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
    ScheduledDateSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import { getLocalTodayYmd } from './executionDashboardCoreDate';
import { isMovablePropertySeizureRow } from '../../helpers/seizureUtils';
import { useMergedTimelineEvents } from '../useMergedTimelineEvents';
import { useCaseTasksAndNotes } from '../useCaseTasksAndNotes';
import { useSeizureRegistryAssets } from '../useSeizureRegistryAssets';
import { useExecutionDashboardSalarySeizureTabRows } from './useExecutionDashboardSalarySeizureTabRows';
import { useExecutionDashboardEvictionGraceUiState } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardDebtorNotificationSync,
    useExecutionDashboardLegacyNoticeStateBackfill,
    useExecutionDashboardEarnerFeeSmSync,
    useExecutionDashboardStandaloneMarksSync,
} from './useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDashboardSubDossierTimelineLifecycle,
    useExecutionDashboardExecutionFileCoerciveRefresh,
} from './useExecutionDashboardSubDossierTimelineLifecycle';
import { useExecutionSeizureOrchestrator } from '../../orchestrators/useExecutionSeizureOrchestrator';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';

type CoercionBridge = {
    setActiveNoticeState: Dispatch<SetStateAction<ExecutionFile['activeNoticeState']>>;
};

type CaseNotesLog = NonNullable<ExecutionFile['caseNotesLog']>;
type CaseTasksPending = NonNullable<ExecutionFile['caseTasksPending']>;

/** بيانات قديمة/فاسدة قد تخزّن الحقول كمصفوفة غير صحيحة — `|| []` / `?? []` لا يكفيان */
function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function asCaseNotesLog(value: unknown): CaseNotesLog {
    return asArray(value);
}

function asCaseTasksPending(value: unknown): CaseTasksPending {
    return asArray(value);
}

function asRecord<T extends Record<string, unknown>>(value: unknown): T {
    return value != null && typeof value === 'object' && !Array.isArray(value)
        ? (value as T)
        : ({} as T);
}

/** يطبّع prev قبل أي updater وظيفي حتى لا ينهار spread/filter على كائن فاسد */
function makeArrayStateSetter<T>(
    setRaw: Dispatch<SetStateAction<T[]>>,
): Dispatch<SetStateAction<T[]>> {
    return (update) => {
        setRaw((prev) => {
            const base = asArray<T>(prev);
            return asArray<T>(typeof update === 'function' ? update(base) : update);
        });
    };
}

export function useExecutionDashboardTimelineAssetsCluster(input: {
    p: ExecutionDashboardCoreWorkspacePipelineInput;
    coercionOrchestrator: CoercionBridge;
    setForcedAttendanceIssued: Dispatch<SetStateAction<boolean>>;
}) {
    const { p, coercionOrchestrator, setForcedAttendanceIssued } = input;

    const [noteText, setNoteText] = useState('');
    const [appointmentPurpose, setAppointmentPurpose] = useState('');
    const [appointmentDateOnly, setAppointmentDateOnly] = useState('');
    const [appointmentTimeOptional, setAppointmentTimeOptional] = useState('');
    const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
    const [appointmentContext, setAppointmentContext] = useState<
        null | { kind: 'police_assistance'; decisionId: string; agencyName: string }
    >(null);
    const [executorScheduleModalOpen, setExecutorScheduleModalOpen] = useState(false);
    const [executorScheduleContext, setExecutorScheduleContext] = useState<null | {
        requestTitle: string;
        onSaved: (payload: ScheduledDateSavePayload) => void;
    }>(null);
    const [breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen] = useState(false);
    const [breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx] = useState<null | {
        decisionId: string;
        requestTitle: string;
        onSaved: (payload: BreakInventoryFurnitureSavePayload) => void;
        onFinalize: () => void;
    }>(null);
    const [judicialCustodianModalOpen, setJudicialCustodianModalOpen] = useState(false);
    const [judicialCustodianModalCtx, setJudicialCustodianModalCtx] = useState<null | {
        requestTitle: string;
        onSaved: (payload: JudicialCustodianSavePayload) => void;
        initialName?: string;
        initialSalary?: string;
    }>(null);
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | {
        onConfirm: () => void;
    }>(null);

    type FinancialLedgerRow = {
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    };
    const [financialLedgerRaw, setFinancialLedgerRaw] = useState<FinancialLedgerRow[]>(() =>
        asArray(p.executionData?.financialLedger),
    );
    const setFinancialLedger = useCallback(makeArrayStateSetter(setFinancialLedgerRaw), []);
    const financialLedger = asArray<FinancialLedgerRow>(financialLedgerRaw);
    const financialLedgerRef = useRef(financialLedger);
    financialLedgerRef.current = financialLedger;
    const hasFinancialLedger = financialLedger.length > 0;
    const showLedgerModal = p.modals.showLedgerModal;
    const setShowLedgerModal = (show: boolean) => p.setExecutionModal('showLedgerModal', show);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(getLocalTodayYmd());
    const [debtorNotificationDate, setDebtorNotificationDate] = useState<string | null>(null);
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState(false);

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
        p.subFiles as any[],
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

    const [seizedAssetsRaw, setSeizedAssetsRaw] = useState<SeizedAsset[]>(() =>
        asArray(p.executionData?.seizedAssets),
    );
    const setSeizedAssets = useCallback(makeArrayStateSetter(setSeizedAssetsRaw), []);
    const seizedAssets = asArray<SeizedAsset>(seizedAssetsRaw);
    const seizedAssetsSnapshotRef = useRef<SeizedAsset[]>(seizedAssets);
    seizedAssetsSnapshotRef.current = seizedAssets;

    const [realEstateSeizureAssetsRaw, setRealEstateSeizureAssetsRaw] = useState<
        RealEstateSeizureAsset[]
    >(() => asArray(p.executionData?.realEstateSeizureAssets));
    const setRealEstateSeizureAssets = useCallback(
        makeArrayStateSetter(setRealEstateSeizureAssetsRaw),
        [],
    );
    const realEstateSeizureAssets = asArray<RealEstateSeizureAsset>(realEstateSeizureAssetsRaw);
    const realEstateSeizureSnapshotRef = useRef<RealEstateSeizureAsset[]>(realEstateSeizureAssets);
    realEstateSeizureSnapshotRef.current = realEstateSeizureAssets;

    const [thirdPartySeizureAssetsRaw, setThirdPartySeizureAssetsRaw] = useState<
        ThirdPartySeizureAsset[]
    >(() => asArray(p.executionData?.thirdPartySeizureAssets));
    const setThirdPartySeizureAssets = useCallback(
        makeArrayStateSetter(setThirdPartySeizureAssetsRaw),
        [],
    );
    const thirdPartySeizureAssets = asArray<ThirdPartySeizureAsset>(thirdPartySeizureAssetsRaw);
    const thirdPartySeizureSnapshotRef = useRef<ThirdPartySeizureAsset[]>(thirdPartySeizureAssets);
    thirdPartySeizureSnapshotRef.current = thirdPartySeizureAssets;

    const [standaloneExecutionMarksRaw, setStandaloneExecutionMarksRaw] = useState<
        StandaloneExecutionMark[]
    >(() => asArray(p.executionData?.standaloneExecutionMarks));
    const setStandaloneExecutionMarks = useCallback(
        makeArrayStateSetter(setStandaloneExecutionMarksRaw),
        [],
    );
    const standaloneExecutionMarks = asArray<StandaloneExecutionMark>(standaloneExecutionMarksRaw);
    const standaloneExecutionMarksSnapshotRef = useRef<StandaloneExecutionMark[]>(
        standaloneExecutionMarks,
    );
    standaloneExecutionMarksSnapshotRef.current = standaloneExecutionMarks;
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

    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null);
    const [seizureDetailCompletion, setSeizureDetailCompletion] = useState<{
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null>(null);
    const saveCoerciveActionRef = useRef<(actionType: string, details: Record<string, string>) => void>(
        () => {},
    );
    const focusSeizurePropertyInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureMovableInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureThirdPartyInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );
    const focusSeizureNoticeInlineRef = useRef<(decisionId: string, subject?: string) => void>(
        () => {},
    );

    const seizureOrchestrator = useExecutionSeizureOrchestrator({
        executionData: p.executionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionDataRef: p.executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
    });

    const approvedSeizedAssets = useMemo(
        () => seizedAssets.filter((asset) => String(asset?.status || '') !== 'pending'),
        [seizedAssets],
    );
    const movableSeizureRegistryAssets = useMemo(
        () =>
            seizedAssets.filter(
                (asset) => String(asset?.status || '') !== 'pending' && isMovablePropertySeizureRow(asset),
            ),
        [seizedAssets],
    );

    const {
        salarySeizureRegistryAssets,
        realEstateSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
    } = useSeizureRegistryAssets(seizedAssets, realEstateSeizureAssets, thirdPartySeizureAssets);

    const salarySeizureTabRows = useExecutionDashboardSalarySeizureTabRows({
        salarySeizureRegistryAssets,
        seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
        executionData: p.executionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionId: p.executionId,
    });

    useExecutionDashboardExecutionFileCoerciveRefresh({
        executionData: p.executionData,
        setSeizedAssets,
        setActiveCoerciveActions,
        setSeizureDraftsByDecisionId,
        setForcedAttendanceIssued,
        setActiveNoticeState: coercionOrchestrator.setActiveNoticeState,
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
        showCoerciveActionForm,
        setShowCoerciveActionForm,
        seizureDetailCompletion,
        setSeizureDetailCompletion,
        saveCoerciveActionRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        seizureOrchestrator,
        approvedSeizedAssets,
        movableSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        realEstateSeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
        salarySeizureTabRows,
    };
}
