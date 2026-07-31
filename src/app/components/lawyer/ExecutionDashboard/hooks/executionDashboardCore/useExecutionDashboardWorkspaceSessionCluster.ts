import { useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { useTodayYmd } from '../useTodayYmd';
import { useExecutionFollowupOrchestrator } from '../../orchestrators/useExecutionFollowupOrchestrator';
import { useExecutionCoercionOrchestrator } from '../../orchestrators/useExecutionCoercionOrchestrator';
import { useExecutionDossierLifecyclePanelOrchestrator } from '../../orchestrators/useExecutionDossierLifecyclePanelOrchestrator';
import type { ExecutionFile } from '@/app/types/execution';
import {
    useExecutionDashboardDebtorTabResetOnFileChange,
    useExecutionDashboardSummonsPopoverEscapeClose,
    useExecutionDashboardExecutionPausedSync,
    useExecutionDashboardSpecialRequestTemplateMenuDismiss,
    useExecutionDashboardPaidClientFeesSync,
    useExecutionDashboardDossierLifecycleDraftSync,
} from './useExecutionDashboardRuntimeSyncEffects';
import { useAdoptPersistedExecutionValue } from '../useAdoptPersistedExecutionValue';
import type { ExecutionDashboardCoreWorkspacePipelineInput } from './executionDashboardCoreWorkspacePipelineInput';

type FollowupOrchestratorBridge = {
    setExecutionDebtorTabIndex: (v: number | ((i: number) => number)) => void;
    specialRequestTemplateMenuOpen: boolean;
    specialRequestTemplateMenuRef: RefObject<HTMLElement | null>;
    setSpecialRequestTemplateMenuOpen: (v: boolean) => void;
    showUnifiedExecutionModalRef: MutableRefObject<boolean>;
    setShowUnifiedExecutionModal: (show: boolean) => void;
};

type CoercionOrchestratorBridge = {
    setActiveNoticeState: Dispatch<SetStateAction<ExecutionFile['activeNoticeState']>>;
};

export function useExecutionDashboardWorkspaceSessionCluster(
    p: ExecutionDashboardCoreWorkspacePipelineInput,
) {
    const todayYmd = useTodayYmd();

    const [noteTitle, setNoteTitle] = useState('');
    const [noteBody, setNoteBody] = useState('');
    const [isTask, setIsTask] = useState(false);
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'done'>('pending');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');

    const showUnifiedExecutionModal = p.modals.showUnifiedExecutionModal;
    const followupOrchestrator = useExecutionFollowupOrchestrator({
        showUnifiedExecutionModal,
        executionData: p.executionData,
        setExecutionModal: p.setExecutionModal,
        executionDashboardFileId: p.executionDashboardFileId,
    }) as FollowupOrchestratorBridge;

    useExecutionDashboardDebtorTabResetOnFileChange(
        p.executionData?.id,
        followupOrchestrator.setExecutionDebtorTabIndex,
    );

    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState('الكل');
    const [gracePeriodActive, setGracePeriodActive] = useState(
        p.executionData?.gracePeriodActive ?? true,
    );
    const [gracePeriodEnded, setGracePeriodEnded] = useState(
        p.executionData?.gracePeriodEnded ?? false,
    );
    const [notificationCount, setNotificationCount] = useState(
        p.executionData?.notificationCount || 0,
    );
    // هذه الحقول تُحفظ في لقطة الإضبارة — يجب أن تتبنّى القيمة المحفوظة عند
    // تبديل الملف النشط أو الكتابة الخارجية، وإلا بُعثت أعلام قديمة عند الحفظ.
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.gracePeriodActive ?? true,
        setGracePeriodActive,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.gracePeriodEnded ?? false,
        setGracePeriodEnded,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.notificationCount || 0,
        setNotificationCount,
    );
    const [notificationPurpose, setNotificationPurpose] = useState('');
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] =
        useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    useExecutionDashboardSummonsPopoverEscapeClose(
        summonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setSummonsMarkerPopoverOpen,
        setExecutionMemoBadgePopoverOpen,
    );

    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState(
        p.executionData?.forcedAttendanceIssued || false,
    );
    const [debtorEvaded, setDebtorEvaded] = useState(p.executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState(
        p.executionData?.arrestWarrantUnlocked || false,
    );
    const [creditorAttended, setCreditorAttended] = useState(
        p.executionData?.creditorAttended ?? true,
    );
    const [executionPaused, setExecutionPaused] = useState(
        p.executionData?.executionPaused || false,
    );
    useExecutionDashboardExecutionPausedSync(p.executionData, setExecutionPaused);
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.forcedAttendanceIssued || false,
        setForcedAttendanceIssued,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.debtorEvaded || false,
        setDebtorEvaded,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.arrestWarrantUnlocked || false,
        setArrestWarrantUnlocked,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.creditorAttended ?? true,
        setCreditorAttended,
    );

    const showUnifiedSummonsModal = p.modals.showUnifiedSummonsModal;
    const setShowUnifiedSummonsModal = (show: boolean) =>
        p.setExecutionModal('showUnifiedSummonsModal', show);

    const coercionOrchestrator = useExecutionCoercionOrchestrator(
        p.executionFileKey,
        p.executionData,
    ) as CoercionOrchestratorBridge;

    const [lastActionDate, setLastActionDate] = useState(
        p.executionData?.lastActionDate || null,
    );
    useAdoptPersistedExecutionValue(
        p.executionData?.id,
        p.executionData?.lastActionDate || null,
        setLastActionDate,
    );
    const [showStatuteWarning, setShowStatuteWarning] = useState(false);
    const dossierLifecyclePanel = useExecutionDossierLifecyclePanelOrchestrator(p.executionData);

    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [permanentDeleteTimelineId, setPermanentDeleteTimelineId] = useState<string | null>(null);

    const [paidDebt, setPaidDebt] = useState(0);
    const paidDebtRef = useRef(paidDebt);
    paidDebtRef.current = paidDebt;
    const [paidCourtFees, setPaidCourtFees] = useState(0);
    const [paidDirectorateFees, setPaidDirectorateFees] = useState(0);
    const [paidClientFees, setPaidClientFees] = useState(0);

    useExecutionDashboardSpecialRequestTemplateMenuDismiss(
        followupOrchestrator.specialRequestTemplateMenuOpen,
        followupOrchestrator.specialRequestTemplateMenuRef,
        followupOrchestrator.setSpecialRequestTemplateMenuOpen,
    );

    useExecutionDashboardPaidClientFeesSync(p.executionData, setPaidClientFees);

    useExecutionDashboardDossierLifecycleDraftSync({
        executionData: p.executionData,
        setDossierStatusDraft: dossierLifecyclePanel.setDossierStatusDraft,
        setDossierReasonDraft: dossierLifecyclePanel.setDossierReasonDraft,
        setDossierDateDraft: dossierLifecyclePanel.setDossierDateDraft,
    });

    return {
        todayYmd,
        noteTitle,
        setNoteTitle,
        noteBody,
        setNoteBody,
        isTask,
        setIsTask,
        taskDueDate,
        setTaskDueDate,
        taskStatus,
        setTaskStatus,
        editingTaskId,
        setEditingTaskId,
        editingNoteId,
        setEditingNoteId,
        savedNotesView,
        setSavedNotesView,
        showUnifiedExecutionModal,
        followupOrchestrator,
        timelineAccordionExpanded,
        setTimelineAccordionExpanded,
        activeTimelineFilter,
        setActiveTimelineFilter,
        gracePeriodActive,
        setGracePeriodActive,
        gracePeriodEnded,
        setGracePeriodEnded,
        notificationCount,
        setNotificationCount,
        notificationPurpose,
        setNotificationPurpose,
        voluntaryEndOptimistic,
        setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        summonsMarkerPopoverOpen,
        setSummonsMarkerPopoverOpen,
        executionMemoBadgePopoverOpen,
        setExecutionMemoBadgePopoverOpen,
        summonsPurposeDraft,
        setSummonsPurposeDraft,
        forcedAttendanceIssued,
        setForcedAttendanceIssued,
        debtorEvaded,
        setDebtorEvaded,
        arrestWarrantUnlocked,
        setArrestWarrantUnlocked,
        creditorAttended,
        executionPaused,
        setExecutionPaused,
        showUnifiedSummonsModal,
        setShowUnifiedSummonsModal,
        coercionOrchestrator,
        lastActionDate,
        setLastActionDate,
        showStatuteWarning,
        setShowStatuteWarning,
        dossierLifecyclePanel,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        permanentDeleteTimelineId,
        setPermanentDeleteTimelineId,
        paidDebt,
        setPaidDebt,
        paidDebtRef,
        paidCourtFees,
        setPaidCourtFees,
        paidDirectorateFees,
        setPaidDirectorateFees,
        paidClientFees,
        setPaidClientFees,
    };
}
