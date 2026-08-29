import { useState } from 'react';
import type { EditSubTaskDraft } from './TasksManagerModals';
import type { DetailPanel, WeekAddState } from './types';

/** حالة ألواح/حوارات مدير المهام — منفصلة عن أوامر الحفظ والعرض */
export function useTasksManagerUiState() {
    const [weekAdd, setWeekAdd] = useState<WeekAddState>(null);
    const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
    const [snoozePanelOpen, setSnoozePanelOpen] = useState(false);
    const [reminderModalTaskId, setReminderModalTaskId] = useState<string | null>(null);
    const [reminderSnoozeCustom, setReminderSnoozeCustom] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editSubTasks, setEditSubTasks] = useState<EditSubTaskDraft[]>([]);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [showCompletedArchive, setShowCompletedArchive] = useState(false);
    const [helpTaskId, setHelpTaskId] = useState<string | null>(null);
    const [helpInboxOpen, setHelpInboxOpen] = useState(false);
    const [postponeTaskId, setPostponeTaskId] = useState<string | null>(null);
    const [postponeDateYmd, setPostponeDateYmd] = useState('');

    return {
        weekAdd,
        setWeekAdd,
        detailPanel,
        setDetailPanel,
        snoozePanelOpen,
        setSnoozePanelOpen,
        reminderModalTaskId,
        setReminderModalTaskId,
        reminderSnoozeCustom,
        setReminderSnoozeCustom,
        editOpen,
        setEditOpen,
        editTaskId,
        setEditTaskId,
        editTitle,
        setEditTitle,
        editLocation,
        setEditLocation,
        editSubTasks,
        setEditSubTasks,
        deleteConfirmId,
        setDeleteConfirmId,
        showCompletedArchive,
        setShowCompletedArchive,
        helpTaskId,
        setHelpTaskId,
        helpInboxOpen,
        setHelpInboxOpen,
        postponeTaskId,
        setPostponeTaskId,
        postponeDateYmd,
        setPostponeDateYmd,
    };
}
