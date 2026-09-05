import { useCallback, type SetStateAction } from 'react';
import type {
    DocumentRequirementItem,
    LegalSubTask,
    LegalSubTaskPlanStatus,
    LegalTask,
} from '@/app/types/TaskEngine';
import {
    clampTaskText,
    MAX_NESTED_ITEMS,
    MAX_TASK_LINE_LENGTH,
    MAX_TASK_LOCATION_LENGTH,
} from '@/app/services/tasks/taskInputGuard';
import { newTaskId } from '@/app/services/tasks/quantumPendingTaskFactory';

type SetTasks = (updater: SetStateAction<LegalTask[]>) => void;

function withPlanStatus(st: LegalSubTask, status: LegalSubTaskPlanStatus): LegalSubTask {
    return {
        ...st,
        planStatus: status,
        isCompleted: status === 'done',
    };
}

export function useQuantumTaskNestedMutations(setTasks: SetTasks) {
    const addSubTask = useCallback(
        (parentId: string, title: string, location: string | null) => {
            const t = clampTaskText(title, MAX_TASK_LINE_LENGTH);
            if (!t) return;
            const sub: LegalSubTask = {
                id: newTaskId(),
                title: t,
                location: location == null ? null : clampTaskText(location, MAX_TASK_LOCATION_LENGTH) || null,
                isCompleted: false,
                kind: 'branch',
                planStatus: 'pending',
            };
            setTasks((prev) =>
                prev.map((task) =>
                    task.id === parentId
                        ? { ...task, subTasks: [...task.subTasks, sub].slice(0, MAX_NESTED_ITEMS) }
                        : task,
                ),
            );
        },
        [setTasks],
    );

    const toggleSubTaskComplete = useCallback(
        (parentId: string, subTaskId: string) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.map((st) => {
                            if (st.id !== subTaskId) return st;
                            const nextDone = !st.isCompleted;
                            return {
                                ...st,
                                isCompleted: nextDone,
                                planStatus: nextDone ? 'done' : 'pending',
                            };
                        }),
                    };
                }),
            );
        },
        [setTasks],
    );

    const setSubTaskPlanStatus = useCallback(
        (parentId: string, subTaskId: string, status: LegalSubTaskPlanStatus) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.map((st) =>
                            st.id === subTaskId ? withPlanStatus(st, status) : st,
                        ),
                    };
                }),
            );
        },
        [setTasks],
    );

    const renameSubTask = useCallback(
        (parentId: string, subTaskId: string, title: string) => {
            const t = clampTaskText(title, MAX_TASK_LINE_LENGTH);
            if (!t) return;
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.map((st) =>
                            st.id === subTaskId ? { ...st, title: t } : st,
                        ),
                    };
                }),
            );
        },
        [setTasks],
    );

    const removeSubTask = useCallback(
        (parentId: string, subTaskId: string) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.filter((st) => st.id !== subTaskId),
                    };
                }),
            );
        },
        [setTasks],
    );

    const setSubTaskLocation = useCallback(
        (parentId: string, subTaskId: string, location: string | null) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        subTasks: task.subTasks.map((st) =>
                            st.id === subTaskId
                                ? {
                                      ...st,
                                      location:
                                          location == null
                                              ? null
                                              : clampTaskText(location, MAX_TASK_LOCATION_LENGTH) ||
                                                null,
                                  }
                                : st,
                        ),
                    };
                }),
            );
        },
        [setTasks],
    );

    const addDocumentRequirement = useCallback(
        (parentId: string, text: string) => {
            const tx = clampTaskText(text, MAX_TASK_LINE_LENGTH);
            if (!tx) return;
            const item: DocumentRequirementItem = {
                id: newTaskId(),
                text: tx,
                isChecked: false,
            };
            setTasks((prev) =>
                prev.map((task) =>
                    task.id === parentId
                        ? {
                              ...task,
                              documentRequirements: [...task.documentRequirements, item].slice(
                                  0,
                                  MAX_NESTED_ITEMS,
                              ),
                          }
                        : task,
                ),
            );
        },
        [setTasks],
    );

    const toggleDocumentRequirement = useCallback(
        (parentId: string, itemId: string) => {
            setTasks((prev) =>
                prev.map((task) => {
                    if (task.id !== parentId) return task;
                    return {
                        ...task,
                        documentRequirements: task.documentRequirements.map((d) =>
                            d.id === itemId ? { ...d, isChecked: !d.isChecked } : d,
                        ),
                    };
                }),
            );
        },
        [setTasks],
    );

    return {
        addSubTask,
        toggleSubTaskComplete,
        setSubTaskPlanStatus,
        renameSubTask,
        removeSubTask,
        setSubTaskLocation,
        addDocumentRequirement,
        toggleDocumentRequirement,
    };
}
