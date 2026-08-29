import { useState } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

/** Notes/tasks + grace/notification local state for workspace pipeline. */
export function useExecutionDashboardWorkspaceLocalUiState(executionData: ExecutionFile | null | undefined) {
    const [noteTitle, setNoteTitle] = useState<string>('');
    const [noteBody, setNoteBody] = useState<string>('');
    const [isTask, setIsTask] = useState<boolean>(false);
    const [taskDueDate, setTaskDueDate] = useState<string>('');
    const [taskStatus, setTaskStatus] = useState<'pending' | 'done'>('pending');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [savedNotesView, setSavedNotesView] = useState<'notes' | 'tasks_done'>('notes');

    const [timelineAccordionExpanded, setTimelineAccordionExpanded] = useState<boolean>(false);
    const [activeTimelineFilter, setActiveTimelineFilter] = useState<string>('الكل');

    const [gracePeriodActive, setGracePeriodActive] = useState<boolean>(
        executionData?.gracePeriodActive ?? true,
    );
    const [gracePeriodEnded, setGracePeriodEnded] = useState<boolean>(
        executionData?.gracePeriodEnded ?? false,
    );

    const [notificationCount, setNotificationCount] = useState<number>(
        executionData?.notificationCount || 0,
    );
    const [notificationPurpose, setNotificationPurpose] = useState<string>('');
    const [voluntaryEndOptimistic, setVoluntaryEndOptimistic] = useState(false);
    const [noticeVoluntaryPeriodEndOptimistic, setNoticeVoluntaryPeriodEndOptimistic] =
        useState(false);
    const [summonsMarkerPopoverOpen, setSummonsMarkerPopoverOpen] = useState(false);
    const [executionMemoBadgePopoverOpen, setExecutionMemoBadgePopoverOpen] = useState(false);
    const [summonsPurposeDraft, setSummonsPurposeDraft] = useState('');

    const [forcedAttendanceIssued, setForcedAttendanceIssued] = useState<boolean>(
        executionData?.forcedAttendanceIssued || false,
    );
    const [debtorEvaded, setDebtorEvaded] = useState<boolean>(executionData?.debtorEvaded || false);
    const [arrestWarrantUnlocked, setArrestWarrantUnlocked] = useState<boolean>(
        executionData?.arrestWarrantUnlocked || false,
    );

    const [creditorAttended, setCreditorAttended] = useState<boolean>(
        executionData?.creditorAttended ?? true,
    );
    const [executionPaused, setExecutionPaused] = useState<boolean>(
        executionData?.executionPaused || false,
    );

    const [lastActionDate, setLastActionDate] = useState<string | null>(
        executionData?.lastActionDate || null,
    );
    const [showStatuteWarning, setShowStatuteWarning] = useState<boolean>(false);

    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [permanentDeleteTimelineId, setPermanentDeleteTimelineId] = useState<string | null>(null);

    return {
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
        setCreditorAttended,
        executionPaused,
        setExecutionPaused,
        lastActionDate,
        setLastActionDate,
        showStatuteWarning,
        setShowStatuteWarning,
        showExecutionTrashModal,
        setShowExecutionTrashModal,
        permanentDeleteTimelineId,
        setPermanentDeleteTimelineId,
    };
}
