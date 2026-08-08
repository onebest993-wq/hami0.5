// @ts-nocheck
/** Phase C Slice 27 — workspace orchestrators + timeline/seizure/coercive state */
import { useState, useRef, useMemo, useCallback } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isMovablePropertySeizureRow } from '../../helpers/seizureUtils';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { getPersonalCoerciveSubtypeOutcome } from '@/app/utils/executorSeizureDecisionQueue';
import type { TimelineEvent, SeizedAsset, RealEstateSeizureAsset, ThirdPartySeizureAsset, StandaloneExecutionMark, ExecutionFile } from '@/app/types/execution';
import { defaultEvictionEarnerFeeCollectionSM, type EvictionEarnerFeeCollectionSM } from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type { ScheduledDateSavePayload } from '@/app/components/lawyer/ExecutionDashboard/types';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
} from '@/app/utils/executorApprovalWorkflow';
import { useTodayYmd } from '../useTodayYmd';
import { useToastSystem } from '../useToastSystem';
import { useMergedTimelineEvents } from '../useMergedTimelineEvents';
import { useCaseTasksAndNotes } from '../useCaseTasksAndNotes';
import { useSeizureRegistryAssets } from '../useSeizureRegistryAssets';
import { useThirdPartySeizuresUi } from '../useThirdPartySeizuresUi';
import { useSeizureApprovalToast } from '../useSeizureApprovalToast';
import { useExecutionFollowupOrchestrator } from '../../orchestrators/useExecutionFollowupOrchestrator';
import { useExecutionCoercionOrchestrator } from '../../orchestrators/useExecutionCoercionOrchestrator';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../../orchestrators/useExecutionDossierLifecyclePanelOrchestrator';
import { useExecutionSeizureOrchestrator } from '../../orchestrators/useExecutionSeizureOrchestrator';
import { useExecutionDecisionsOrchestrator } from '../../orchestrators/useExecutionDecisionsOrchestrator';
import { useExecutionFinancialOrchestrator } from '../../orchestrators/useExecutionFinancialOrchestrator';
import { useExecutionDashboardSalarySeizureTabRows } from './useExecutionDashboardSalarySeizureTabRows';
import { useExecutionDashboardOpenDecisionsModalBridge } from './useExecutionDashboardOpenDecisionsModalBridge';
import { useExecutionDashboardEvictionGraceUiState } from './useExecutionDashboardTimelineAndGraceSync';
import {
    useExecutionDashboardDebtorTabResetOnFileChange,
    useExecutionDashboardSummonsPopoverEscapeClose,
    useExecutionDashboardExecutionPausedSync,
    useExecutionDashboardSpecialRequestTemplateMenuDismiss,
    useExecutionDashboardPaidClientFeesSync,
    useExecutionDashboardDossierLifecycleDraftSync,
    useExecutionDashboardDebtorNotificationSync,
    useExecutionDashboardLegacyNoticeStateBackfill,
    useExecutionDashboardEarnerFeeSmSync,
    useExecutionDashboardStandaloneMarksSync,
    useExecutionDashboardPerformanceMonitor,
} from './useExecutionDashboardRuntimeSyncEffects';
import {
    useExecutionDashboardSubDossierTimelineLifecycle,
    useExecutionDashboardExecutionFileCoerciveRefresh,
} from './useExecutionDashboardSubDossierTimelineLifecycle';
import {
    useExecutionDecisionOutcomeToastBridge,
    useExecutionToastBridge,
} from '../useExecutionDashboardWindowBridge';


import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';


export function useExecutionDashboardCoreWorkspacePipeline(p: ExecutionDashboardCoreWorkspacePipelineInput) {
    const {
        modals,
        executionData,
        executionDataRef,
        executionFileKey,
        executionDashboardFileId,
        executionId,
        decisionsStorageExecutionId,
        executionStorageTick,
        setExecutionModal,
        showDecisionsModal,
        setShowDecisionsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        setShowCoerciveModal,
        subFiles,
        activeSubFileId,
        isInabaActive,
        parentDossierId,
    } = p;

	const todayYmd = useTodayYmd();
    
    // 🆕 V16: TASK ENGINE STATE
    const [noteTitle, setNoteTitle] = useState<string>('');
    const [noteBody, setNoteBody] = useState<string>('');
    const [isTask, setIsTask] = useState<boolean>(false);
    const [taskDueDate, setTaskDueDate] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'done'>('pending');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
	const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');
    
    // NEW: Unified Execution & Assets Modal with Tabs
    const showUnifiedExecutionModal = modals.showUnifiedExecutionModal;
    const followupOrchestrator = useExecutionFollowupOrchestrator({
        showUnifiedExecutionModal,
        executionData,
        setExecutionModal,
        executionDashboardFileId,
    });
    

    useExecutionDashboardDebtorTabResetOnFileChange(executionData?.id, followupOrchestrator.setExecutionDebtorTabIndex);

    // NEW: Timeline Accordion    // NEW: Timeline Accordion (Relocated below Tools Grid)
    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState<boolean>(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState<string>('الكل');
    
    // CRITICAL: Grace Period Global State (restored from localStorage if available)
    const [gracePeriodActive, setGracePeriodActive] = useState<boolean>(executionData?.gracePeriodActive ?? true);
    const [gracePeriodEnded, setGracePeriodEnded] = useState<boolean>(executionData?.gracePeriodEnded ?? false);
    
    // 🆕 V8: DEBTOR NOTIFICATION PIPELINE (Initial vs Subsequent)
    const [notificationCount, setNotificationCount] = useState<number>(executionData?.notificationCount || 0);
    const [notificationPurpose, setNotificationPurpose] = useState<string>('');
    /** إعلان انتهاء المدة الرضائية قبل وصول تحديث executionData من الأب */
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    /** مثل أعلاه — لمسار الإضبارات غير التخلية */
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] = useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    useExecutionDashboardSummonsPopoverEscapeClose(
        summonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
    );
    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState<boolean>(executionData?.forcedAttendanceIssued || false);
    const [debtorEvaded, setDebtorEvaded] = useState<boolean>(executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState<boolean>(executionData?.arrestWarrantUnlocked || false);
    
    const [creditorAttended, setCreditorAttended] = useState<boolean>(executionData?.creditorAttended ?? true);
    const [executionPaused, setExecutionPaused] = useState<boolean>(executionData?.executionPaused || false);
    useExecutionDashboardExecutionPausedSync(executionData, setExecutionPaused);
    
    // 🆕 V9: UNIFIED SUMMONS HUB STATE
    const showUnifiedSummonsModal = modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) => setExecutionModal('showUnifiedSummonsModal', show);
    
    const coercionOrchestrator = useExecutionCoercionOrchestrator(executionFileKey, executionData);
    

    // ===========================
    // 7-YEAR STATUTE OF LIMITATIONS TRACKER
    // ===========================
    const [lastActionDate, setLastActionDate] = useState<string | null>(executionData?.lastActionDate || null);
    const [showStatuteWarning, setShowStatuteWarning] = useState<boolean>(false);

    const dossierLifecyclePanel = useExecutionDossierLifecyclePanelOrchestrator(executionData);

    

    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [permanentDeleteTimelineId, setPermanentDeleteTimelineId] = useState<string | null>(null);

    const [paidDebt, setPaidDebt] = useState<number>(0);
    const paidDebtRef = useRef<number>(paidDebt);
    paidDebtRef.current = paidDebt;
    const [paidCourtFees, setPaidCourtFees] = useState<number>(0);
    const [paidDirectorateFees, setPaidDirectorateFees] = useState<number>(0);
    const [paidClientFees, setPaidClientFees] = useState<number>(0);

    useExecutionDashboardSpecialRequestTemplateMenuDismiss(
        followupOrchestrator.specialRequestTemplateMenuOpen,
        followupOrchestrator.specialRequestTemplateMenuRef,
        followupOrchestrator.setSpecialRequestTemplateMenuOpen,
    );

    useExecutionDashboardPaidClientFeesSync(executionData, setPaidClientFees);

    useExecutionDashboardDossierLifecycleDraftSync({
        executionData,
        setDossierStatusDraft: dossierLifecyclePanel.setDossierStatusDraft,
        setDossierReasonDraft: dossierLifecyclePanel.setDossierReasonDraft,
        setDossierDateDraft: dossierLifecyclePanel.setDossierDateDraft,
    });

    const [noteText, setNoteText] = useState<string>('');
    const [appointmentPurpose, setAppointmentPurpose] = useState<string>('');
    const [appointmentDateOnly, setAppointmentDateOnly] = useState<string>('');
    const [appointmentTimeOptional, setAppointmentTimeOptional] = useState<string>('');
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
    const [executionReportPrompt, setExecutionReportPrompt] = useState<null | { onConfirm: () => void }>(
        null
    );

    // 🆕 V12: FINANCIAL LEDGER HISTORY
    const [financialLedger, setFinancialLedger] = useState<Array<{
        id: string;
        date: string;
        type: 'payment' | 'fee' | 'settlement';
        amount: number;
        description: string;
        balance: number;
    }>>(executionData?.financialLedger || []);
    const financialLedgerRef = useRef(financialLedger);
    financialLedgerRef.current = financialLedger;
    const hasFinancialLedger = financialLedger.length > 0;
    const showLedgerModal = modals.showLedgerModal;
    const setShowLedgerModal = (show: boolean) => setExecutionModal('showLedgerModal', show);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(getLocalTodayYmd());
    const [debtorNotificationDate, setDebtorNotificationDate] = useState<string | null>(null);
    /** +يوم تقويمي واحد بقرار المحامي (مربع التمديد) — يُحفظ مع isHolidayExtension في الملف */
    const [manualGraceCalendarExtra, setManualGraceCalendarExtra] = useState<boolean>(false);

    useExecutionDashboardDebtorNotificationSync({
        executionData,
        setDebtorNotificationDate,
        setManualGraceCalendarExtra,
    });

    useExecutionDashboardLegacyNoticeStateBackfill({
        executionData,
        setActiveNoticeState: coercionOrchestrator.setActiveNoticeState,
    });

    // 🆕 V10.5: استبدال Toast القديم بنظام Toast الجديد (سيتم استخدام ExecutionToasts بدلاً من showToast)
    // ✅ FIXED: Proper types
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(executionData?.timelineEvents || []);
    const timelineEventsRef = useRef<TimelineEvent[]>(timelineEvents);
    timelineEventsRef.current = timelineEvents;
    /** يُعبَّأ بعد تعريف `persistExecutionMerge` — لاستدعاء الدمج من `executorApprovalActions` المعرف سابقاً */
    const persistExecutionMergeRef = useRef<((patch: Record<string, unknown>) => void) | null>(null);
    const pushTimelineEventRef = useRef<((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null>(
        null
    );
    /** لقطات الملف لدمج قائمة الحراس دون إغلاق قديم على `executionData` */
    const executionFileSnapshotRef = useRef<ExecutionFile | null>(null);
    const [earnerFeeCollectionSm, setEarnerFeeCollectionSm] = useState<EvictionEarnerFeeCollectionSM>(() =>
        defaultEvictionEarnerFeeCollectionSM()
    );
    const [caseNotesLog, setCaseNotesLog] = useState<NonNullable<ExecutionFile['caseNotesLog']>>(
        executionData?.caseNotesLog ?? []
    );

    useExecutionDashboardEarnerFeeSmSync(executionData, setEarnerFeeCollectionSm);

    const [caseTasksPending, setCaseTasksPending] = useState<NonNullable<ExecutionFile['caseTasksPending']>>(
        executionData?.caseTasksPending ?? []
    );
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
    } = useExecutionDashboardEvictionGraceUiState(executionData, executionId);

    const activeTimelineEvents = useMemo(
        () => timelineEvents.filter((e) => !e.trashedAt),
        [timelineEvents]
    );

    /** دمج أحداث الإضبارة الفرعية مع الإضبارة الأم — مع إضافة source badge */
    const [showOnlyActiveFileTimeline, setShowOnlyActiveFileTimeline] = useState(false);
    const mergedTimelineEvents = useMergedTimelineEvents(
        activeTimelineEvents,
        subFiles as any[],
        showOnlyActiveFileTimeline,
        activeSubFileId,
        parentDossierId,
    );

    const activeCaseNotesLog = useMemo(
        () => caseNotesLog.filter((n) => !n.trashedAt),
        [caseNotesLog]
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
        [activeCaseNotesLog]
    );
    const dockPinnedTasks = useMemo(
        () => caseTasksPending.filter((t) => !t.trashedAt && Boolean(t.pinned)),
        [caseTasksPending]
    );

    const nextTimelineId = useCallback(
        () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        []
    );
    
    // 🆕 V7: SEIZED ASSETS & COERCIVE ACTIONS STATE
    // ✅ FIXED: Proper types
    const [seizedAssets, setSeizedAssets] = useState<SeizedAsset[]>(executionData?.seizedAssets || []);
    const seizedAssetsSnapshotRef = useRef<SeizedAsset[]>(seizedAssets);
    seizedAssetsSnapshotRef.current = seizedAssets;

    const [realEstateSeizureAssets, setRealEstateSeizureAssets] = useState<RealEstateSeizureAsset[]>(
        executionData?.realEstateSeizureAssets ?? []
    );
    const realEstateSeizureSnapshotRef = useRef<RealEstateSeizureAsset[]>(realEstateSeizureAssets);
    realEstateSeizureSnapshotRef.current = realEstateSeizureAssets;

    const [thirdPartySeizureAssets, setThirdPartySeizureAssets] = useState<ThirdPartySeizureAsset[]>(
        executionData?.thirdPartySeizureAssets ?? []
    );
    const thirdPartySeizureSnapshotRef = useRef<ThirdPartySeizureAsset[]>(thirdPartySeizureAssets);
    thirdPartySeizureSnapshotRef.current = thirdPartySeizureAssets;

    const [standaloneExecutionMarks, setStandaloneExecutionMarks] = useState<StandaloneExecutionMark[]>(
        executionData?.standaloneExecutionMarks ?? []
    );
    const standaloneExecutionMarksSnapshotRef = useRef<StandaloneExecutionMark[]>(standaloneExecutionMarks);
    standaloneExecutionMarksSnapshotRef.current = standaloneExecutionMarks;
    useExecutionDashboardStandaloneMarksSync(
        executionData,
        executionStorageTick,
        setStandaloneExecutionMarks,
    );

    const getMilestoneTimelineSnapshot = useCallback(
        () =>
            buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current,
                financialLedger: financialLedgerRef.current,
                seizedAssets: seizedAssetsSnapshotRef.current,
            }),
        []
    );

    const [seizureDraftsByDecisionId, setSeizureDraftsByDecisionId] = useState<
        Record<string, SeizedAsset>
    >(() => executionData?.seizureDraftsByDecisionId ?? {});

    const seizureDraftsByDecisionIdRef = useRef(seizureDraftsByDecisionId);
    seizureDraftsByDecisionIdRef.current = seizureDraftsByDecisionId;
    const [activeCoerciveActions, setActiveCoerciveActions] = useState<string[]>(executionData?.activeCoerciveActions || []);

    useExecutionDashboardSubDossierTimelineLifecycle({
        activeSubFileId,
        isInabaActive,
        parentDossierId,
        executionData,
        executionDashboardFileId,
        executionStorageTick,
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

    const [showCoerciveActionForm, setShowCoerciveActionForm] = useState<string | null>(null); // null | 'salary' | 'property' | 'travel' | 'imprisonment'
    /** بعد موافقة المنفذ على طلب الحجز — إكمال الحقول التفصيلية في النافذة نفسها */
    const [seizureDetailCompletion, setSeizureDetailCompletion] = useState<{
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null>(null);
    const saveCoerciveActionRef = useRef<(actionType: string, details: Record<string, string>) => void>(
        () => {}
    );
    const focusSeizurePropertyInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureMovableInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureThirdPartyInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});
    const focusSeizureNoticeInlineRef = useRef<(decisionId: string, subject?: string) => void>(() => {});

    const seizureOrchestrator = useExecutionSeizureOrchestrator({
        executionData,
        executionId,
        decisionsStorageExecutionId,
        executionDataRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
    });
    

    const approvedSeizedAssets = useMemo(
        () => (seizedAssets || []).filter((asset) => String(asset?.status || '') !== 'pending'),
        [seizedAssets]
    );
    const movableSeizureRegistryAssets = useMemo(
        () =>
            (seizedAssets || []).filter(
                (a) => String(a?.status || '') !== 'pending' && isMovablePropertySeizureRow(a)
            ),
        [seizedAssets]
    );
    const { salarySeizureRegistryAssets, realEstateSeizureRegistryAssets, thirdPartySeizureRegistryAssets } =
        useSeizureRegistryAssets(seizedAssets, realEstateSeizureAssets, thirdPartySeizureAssets);

    const salarySeizureTabRows = useExecutionDashboardSalarySeizureTabRows({
        salarySeizureRegistryAssets,
        seizureDraftsByDecisionId: seizureDraftsByDecisionId as Record<string, SeizedAsset>,
        executionData,
        decisionsStorageExecutionId,
        executionId,
    });

    const [isPaused, setIsPaused] = useState<boolean>(executionData?.isPaused ?? false);
    const [pauseReason, setPauseReason] = useState<string>(executionData?.pauseReason ?? '');

    const [executionFeeAdded, setExecutionFeeAdded] = useState<boolean>(executionData?.executionFeeAdded ?? false);

    const {
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        showToast,
        hideToast,
        showToastRef,
    } = useToastSystem(executionData?.id, executionId);

    useExecutionDecisionOutcomeToastBridge({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        showUnifiedExecutionModalRef: followupOrchestrator.showUnifiedExecutionModalRef,
        showToastRef,
    });
    useExecutionToastBridge(showToastRef);

    const decisionsOrchestrator = useExecutionDecisionsOrchestrator({
        showDecisionsModal,
        setShowDecisionsModal,
    });
    const {
        decisionsReloadEpoch,
        setDecisionsReloadEpoch,
        decisionsModalBootHubTab,
        setDecisionsModalBootHubTab,
        decisionsModalBootListTab,
        setDecisionsModalBootListTab,
        decisionsModalScrollToDecisionId,
        setDecisionsModalScrollToDecisionId,
        appealsModalScrollToDecisionId,
        setAppealsModalScrollToDecisionId,
        clearDecisionsModalBootState,
        openDecisionsModalWithBoot,
    } = decisionsOrchestrator;

    const forcedBringDecisionState = useMemo(
        () => getPersonalCoerciveSubtypeOutcome(executionData?.id ?? executionId, 'forced_bring_in'),
        [executionData?.id, executionId, decisionsReloadEpoch]
    );

    const employeeForcedBringAwaitingPersonalOutcome = useMemo(
        () =>
            Boolean(
                forcedBringDecisionState.approved &&
                    executionData?.forced_bring_in_personal_outcome !== 'brought' &&
                    executionData?.forced_bring_in_personal_outcome !== 'absconded'
            ),
        [forcedBringDecisionState.approved, executionData?.forced_bring_in_personal_outcome]
    );

    useExecutionDashboardExecutionFileCoerciveRefresh({
        executionData,
        setSeizedAssets,
        setActiveCoerciveActions,
        setSeizureDraftsByDecisionId,
        setForcedAttendanceIssued,
        setActiveNoticeState: coercionOrchestrator.setActiveNoticeState,
        setCaseTasksPending,
    });
    
    // 🆕 V10.8: EXECUTION FEE INJECTION STATE
    const [executionFeeInjected, setExecutionFeeInjected] = useState<boolean>(executionData?.executionFeeInjected || false);
    
    const financialOrchestrator = useExecutionFinancialOrchestrator({
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
    });

const {
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        financialHubAutoOpenMode,
        setFinancialHubAutoOpenMode,
        financialHubSeizedMovableId,
        setFinancialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    } = financialOrchestrator;



    useExecutionDashboardOpenDecisionsModalBridge({
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        executionData,
        setShowExecutionFinancialHub,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setShowUnifiedSummonsModal,
        setShowNotesModal,
        setShowDocumentsModal,
        setShowAppointmentModal,
        setShowTimelineModal,
        setShowNotificationModal,
        openDecisionsModalWithBoot,
    });

    const { thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch } =
        useThirdPartySeizuresUi(executionData);

    useSeizureApprovalToast({
        executionDataId: executionData?.id,
        executionId,
        showToast,
    });
    
    // 🆕 V10.5: PERFORMANCE MONITORING
    useExecutionDashboardPerformanceMonitor();
    
    // 🚀 V11.0: REMOVED - validation moved to initial state for better performance
    
    // ✅ IMPORTANT: Don't use early returns - use conditional rendering in JSX instead
    // This avoids hooks order violations with useMemo calls that come after
    
    // ===========================

    return { todayYmd, noteTitle, setNoteTitle, noteBody, setNoteBody, isTask, setIsTask, taskDueDate, setTaskDueDate, taskStatus, setTaskStatus, editingTaskId, setEditingTaskId, editingNoteId, setEditingNoteId, savedNotesView, setSavedNotesView, showUnifiedExecutionModal, followupOrchestrator, timelineAccordionExpanded, setTimelineAccordionExpanded, activeTimelineFilter, setActiveTimelineFilter, gracePeriodActive, setGracePeriodActive, gracePeriodEnded, setGracePeriodEnded, notificationCount, setNotificationCount, notificationPurpose, setNotificationPurpose, voluntaryEndOptimistic, setVoluntaryEndOptimistic, noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic, summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen, executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen, summonsPurposeDraft, setSummonsPurposeDraft, forcedAttendanceIssued, setForcedAttendanceIssued, debtorEvaded, setDebtorEvaded, arrestWarrantUnlocked, setArrestWarrantUnlocked, creditorAttended, executionPaused, setExecutionPaused, showUnifiedSummonsModal, setShowUnifiedSummonsModal, coercionOrchestrator, lastActionDate, setLastActionDate, showStatuteWarning, setShowStatuteWarning, dossierLifecyclePanel, showExecutionTrashModal, setShowExecutionTrashModal, permanentDeleteTimelineId, setPermanentDeleteTimelineId, paidDebt, paidDebtRef, paidCourtFees, setPaidCourtFees, paidDirectorateFees, setPaidDirectorateFees, paidClientFees, setPaidClientFees, noteText, setNoteText, appointmentPurpose, setAppointmentPurpose, appointmentDateOnly, setAppointmentDateOnly, appointmentTimeOptional, setAppointmentTimeOptional, editingAppointmentId, setEditingAppointmentId, appointmentContext, setAppointmentContext, executorScheduleModalOpen, setExecutorScheduleModalOpen, executorScheduleContext, setExecutorScheduleContext, breakInventoryFurnitureModalOpen, setBreakInventoryFurnitureModalOpen, breakInventoryFurnitureModalCtx, setBreakInventoryFurnitureModalCtx, judicialCustodianModalOpen, setJudicialCustodianModalOpen, judicialCustodianModalCtx, setJudicialCustodianModalCtx, executionReportPrompt, setExecutionReportPrompt, financialLedger, financialLedgerRef, hasFinancialLedger, showLedgerModal, setShowLedgerModal, paymentAmount, setPaymentAmount, paymentDate, setPaymentDate, debtorNotificationDate, setDebtorNotificationDate, manualGraceCalendarExtra, setManualGraceCalendarExtra, timelineEvents, setTimelineEvents, timelineEventsRef, persistExecutionMergeRef, pushTimelineEventRef, executionFileSnapshotRef, earnerFeeCollectionSm, setEarnerFeeCollectionSm, caseNotesLog, setCaseNotesLog, caseNotesLogRef, caseTasksPending, setCaseTasksPending, caseTasksPendingRef, evictionGracePinned, setEvictionGracePinned, evictionGraceHidden, setEvictionGraceHidden, toggleEvictionGracePinned, gracePinnedKey, graceHiddenKey, activeTimelineEvents, showOnlyActiveFileTimeline, setShowOnlyActiveFileTimeline, mergedTimelineEvents, completedTaskTitles, savedNotesSplit, activeCaseTasksPendingAll, activeGraceTasks, activeCaseTasksPending, trashedTimelineEvents, trashedCaseNotes, trashedCaseTasks, dockPinnedNotes, dockPinnedTasks, nextTimelineId, seizedAssets, setSeizedAssets, seizedAssetsSnapshotRef, realEstateSeizureAssets, setRealEstateSeizureAssets, realEstateSeizureSnapshotRef, thirdPartySeizureAssets, setThirdPartySeizureAssets, thirdPartySeizureSnapshotRef, standaloneExecutionMarks, setStandaloneExecutionMarks, standaloneExecutionMarksSnapshotRef, getMilestoneTimelineSnapshot, seizureDraftsByDecisionId, setSeizureDraftsByDecisionId, seizureDraftsByDecisionIdRef, activeCoerciveActions, setActiveCoerciveActions, showCoerciveActionForm, setShowCoerciveActionForm, seizureDetailCompletion, setSeizureDetailCompletion, saveCoerciveActionRef, focusSeizurePropertyInlineRef, focusSeizureMovableInlineRef, focusSeizureThirdPartyInlineRef, focusSeizureNoticeInlineRef, seizureOrchestrator, approvedSeizedAssets, movableSeizureRegistryAssets, salarySeizureRegistryAssets, realEstateSeizureRegistryAssets, thirdPartySeizureRegistryAssets, salarySeizureTabRows, isPaused, setIsPaused, pauseReason, setPauseReason, executionFeeAdded, toastVisible, toastMessage, toastType, toastEpoch, showToast, hideToast, showToastRef, decisionsOrchestrator, decisionsReloadEpoch, setDecisionsReloadEpoch, decisionsModalBootHubTab, setDecisionsModalBootHubTab, decisionsModalBootListTab, setDecisionsModalBootListTab, decisionsModalScrollToDecisionId, setDecisionsModalScrollToDecisionId, appealsModalScrollToDecisionId, setAppealsModalScrollToDecisionId, clearDecisionsModalBootState, openDecisionsModalWithBoot, forcedBringDecisionState, employeeForcedBringAwaitingPersonalOutcome, executionFeeInjected, setExecutionFeeInjected, financialOrchestrator, isFinancialCenterExpanded, setIsFinancialCenterExpanded, activeFinancialTab, setActiveFinancialTab, showExecutionFinancialHub, setShowExecutionFinancialHub, financialHubAutoOpenMode, setFinancialHubAutoOpenMode, financialHubSeizedMovableId, setFinancialHubSeizedMovableId, financialHubSeizedPropertyId, setFinancialHubSeizedPropertyId, openFinancialHubLedger, thirdPartySeizuresUi, setThirdPartySeizuresUi, applyThirdPartySeizuresFromPatch };
}
