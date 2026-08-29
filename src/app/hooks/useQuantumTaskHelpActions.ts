import { useCallback, type MutableRefObject } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import type { RequestTaskHelpParams } from '@/app/services/taskHelp/quantumTaskHelpActions';

function loadQuantumTaskHelpActions() {
    return import('@/app/services/taskHelp/quantumTaskHelpActions');
}

export function useQuantumTaskHelpActions(
    updateTask: (id: string, patch: Partial<LegalTask>) => void,
    tasksRef: MutableRefObject<LegalTask[]>,
) {
    const syncHelpFieldsToTask = useCallback(
        async (sourceTaskId: string, help: TaskHelpRequest, extra?: Partial<LegalTask>) => {
            const { helpFieldsPatchFromRequest } = await loadQuantumTaskHelpActions();
            updateTask(sourceTaskId, {
                ...helpFieldsPatchFromRequest(help),
                ...extra,
            });
        },
        [updateTask],
    );

    const requestTaskHelp = useCallback(
        async (params: RequestTaskHelpParams): Promise<TaskHelpRequest | null> => {
            const task = tasksRef.current.find((t) => t.id === params.taskId);
            if (!task) return null;
            const { executeRequestTaskHelp } = await loadQuantumTaskHelpActions();
            const created = await executeRequestTaskHelp(task, params);
            if (created) await syncHelpFieldsToTask(task.id, created);
            return created;
        },
        [syncHelpFieldsToTask, tasksRef],
    );

    const acceptTaskHelp = useCallback(
        async (
            helpRequestId: string,
            colleagueId: string,
            colleagueName?: string,
            sourceTaskId?: string,
        ): Promise<TaskHelpRequest> => {
            const { executeAcceptTaskHelp } = await loadQuantumTaskHelpActions();
            const accepted = await executeAcceptTaskHelp(
                helpRequestId,
                colleagueId,
                colleagueName,
            );
            const taskId = sourceTaskId ?? accepted.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, accepted);
            }
            return accepted;
        },
        [syncHelpFieldsToTask, tasksRef],
    );

    const addSharedTaskNote = useCallback(
        async (
            helpRequestId: string,
            authorId: string,
            noteText: string,
            authorName?: string,
            sourceTaskId?: string,
        ): Promise<TaskHelpRequest> => {
            const { executeAddSharedTaskNote } = await loadQuantumTaskHelpActions();
            const updated = await executeAddSharedTaskNote(
                helpRequestId,
                authorId,
                noteText,
                authorName,
            );
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask, tasksRef],
    );

    const markHelpCompleted = useCallback(
        async (helpRequestId: string, actorId: string, sourceTaskId?: string) => {
            const { executeMarkHelpCompleted } = await loadQuantumTaskHelpActions();
            const updated = await executeMarkHelpCompleted(helpRequestId, actorId);
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask, tasksRef],
    );

    const confirmHelpReview = useCallback(
        async (helpRequestId: string, actorId: string, sourceTaskId?: string) => {
            const { executeConfirmHelpReview } = await loadQuantumTaskHelpActions();
            const updated = await executeConfirmHelpReview(helpRequestId, actorId);
            const taskId = sourceTaskId ?? updated.sourceTaskId;
            if (tasksRef.current.some((t) => t.id === taskId)) {
                await syncHelpFieldsToTask(taskId, updated);
            }
            return updated;
        },
        [syncHelpFieldsToTask, tasksRef],
    );

    return {
        requestTaskHelp,
        acceptTaskHelp,
        addSharedTaskNote,
        markHelpCompleted,
        confirmHelpReview,
    };
}
