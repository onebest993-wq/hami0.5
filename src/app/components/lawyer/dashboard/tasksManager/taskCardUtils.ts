import type { LegalTask } from '@/app/types/TaskEngine';
import type { DetailPanel } from './types';

export type TaskCardProps = {
    task: LegalTask;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    now: Date;
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleFatal: (id: string) => void;
    onToggleFieldCurtainPin: (id: string) => void;
    onSetLocation: (id: string, location: string | null) => void;
    locationPickFor: string | null;
    onToggleLocationPicker: (taskId: string | null) => void;
    fatalPulse?: boolean;
    detailPanel: DetailPanel;
    setDetailPanel: (p: DetailPanel) => void;
    addSubTask: (parentId: string, title: string, location: string | null) => void;
    toggleSubTaskComplete: (parentId: string, subId: string) => void;
    setSubTaskLocation: (parentId: string, subId: string, location: string | null) => void;
    addDocumentRequirement: (parentId: string, text: string) => void;
    toggleDocumentRequirement: (parentId: string, itemId: string) => void;
    addExpense: (parentId: string, amount: number, label: string) => void;
    onEditRequest: (task: LegalTask) => void;
    onDeleteRequest: (task: LegalTask) => void;
    onReminderBadgeClick: (task: LegalTask) => void;
};

export function taskRevision(task: LegalTask): string {
    return [
        task.id,
        task.title,
        task.location ?? '',
        task.status,
        task.completedAt?.getTime() ?? '',
        task.isFatalDeadline ? '1' : '0',
        task.pinnedToFieldCurtain ? '1' : '0',
        task.parsedDate?.getTime() ?? '',
        task.reminderAt?.getTime() ?? '',
        task.subTasks.map((st) => `${st.id}:${st.isCompleted}:${st.title}`).join('|'),
        task.documentRequirements.map((d) => `${d.id}:${d.isChecked}`).join('|'),
        task.expenses.map((e) => `${e.id}:${e.amount}`).join('|'),
        task.voiceRef ?? '',
        task.voiceTranscript ?? '',
        task.voiceDurationSec ?? '',
    ].join('~');
}

export function areTaskCardPropsEqual(prev: TaskCardProps, next: TaskCardProps): boolean {
    if (prev.fatalPulse !== next.fatalPulse) return false;
    if (prev.locationPickFor !== next.locationPickFor) return false;
    if (prev.lawsuitFiles !== next.lawsuitFiles || prev.executionFiles !== next.executionFiles) return false;
    if (prev.now.toDateString() !== next.now.toDateString()) return false;
    if (taskRevision(prev.task) !== taskRevision(next.task)) return false;
    const prevPanel = prev.detailPanel?.taskId === prev.task.id ? prev.detailPanel.kind : null;
    const nextPanel = next.detailPanel?.taskId === next.task.id ? next.detailPanel.kind : null;
    return prevPanel === nextPanel;
}
