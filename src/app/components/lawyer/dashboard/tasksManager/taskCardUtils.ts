import type { LegalSubTaskPlanStatus, LegalTask } from '@/app/types/TaskEngine';
import { legalTaskUiSignature } from '@/app/services/tasks/legalTaskUiSignature';
import type { DetailPanel } from './types';
import type { TaskListOrdinal } from './TaskListOrdinalBadge';

export type TaskCardProps = {
    task: LegalTask;
    listOrdinal?: TaskListOrdinal;
    lawsuitFiles?: unknown[];
    executionFiles?: unknown[];
    now: Date;
    onCompleteRequest: (task: LegalTask) => void;
    onReopenTask: (task: LegalTask) => void;
    onToggleFatal: (id: string) => void;
    onToggleFieldCurtainPin: (id: string) => void;
    detailPanel: DetailPanel;
    setDetailPanel: (p: DetailPanel | ((prev: DetailPanel) => DetailPanel)) => void;
    addSubTask: (parentId: string, title: string, location: string | null) => void;
    toggleSubTaskComplete: (parentId: string, subId: string) => void;
    setSubTaskPlanStatus: (parentId: string, subId: string, status: LegalSubTaskPlanStatus) => void;
    renameSubTask: (parentId: string, subId: string, title: string) => void;
    removeSubTask: (parentId: string, subId: string) => void;
    addDocumentRequirement: (parentId: string, text: string) => void;
    toggleDocumentRequirement: (parentId: string, itemId: string) => void;
    onEditRequest: (task: LegalTask) => void;
    onDeleteRequest: (task: LegalTask) => void;
    onReminderBadgeClick: (task: LegalTask) => void;
    onRequestHelp?: (task: LegalTask) => void;
    onPostponeRequest?: (task: LegalTask) => void;
};

function taskRevision(task: LegalTask): string {
    return legalTaskUiSignature(task);
}

export function areTaskCardPropsEqual(prev: TaskCardProps, next: TaskCardProps): boolean {
    if (prev.listOrdinal?.index !== next.listOrdinal?.index || prev.listOrdinal?.total !== next.listOrdinal?.total) {
        return false;
    }
    if (prev.lawsuitFiles !== next.lawsuitFiles || prev.executionFiles !== next.executionFiles) return false;
    if (prev.now.toDateString() !== next.now.toDateString()) return false;
    if (taskRevision(prev.task) !== taskRevision(next.task)) return false;
    const prevPanel = prev.detailPanel?.taskId === prev.task.id ? prev.detailPanel.kind : null;
    const nextPanel = next.detailPanel?.taskId === next.task.id ? next.detailPanel.kind : null;
    return prevPanel === nextPanel;
}
