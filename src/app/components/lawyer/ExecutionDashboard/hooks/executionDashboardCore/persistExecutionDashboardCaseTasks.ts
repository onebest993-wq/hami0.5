import { syncExecutionTaskDue } from '@/app/services/calendarDossierSync';
import type { ExecutionFile } from '@/app/types/execution';

export function persistNewCaseTask(input: {
    taskData: { title: string; body: string; dueDate: string; steps?: unknown[] };
    caseTasksPendingRef: { current: unknown[] };
    setCaseTasksPending: (tasks: unknown[]) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
}): void {
    const now = new Date().toISOString();
    const newId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTask = {
        id: newId,
        title: input.taskData.title,
        body: input.taskData.body,
        dueDate: input.taskData.dueDate,
        createdAt: now,
        steps: input.taskData.steps,
    };
    const nextTasks = [...(input.caseTasksPendingRef.current as unknown[]), newTask];
    input.setCaseTasksPending(nextTasks);
    const persisted = input.persistExecutionMerge({ caseTasksPending: nextTasks });
    if (persisted === false) {
        input.showToast('تعذّر حفظ المهمة — أعد المحاولة', 'error');
        return;
    }
    syncExecutionTaskDue({
        executionId: input.currentFileId,
        task: newTask,
        caseNo:
            String(input.executionData?.fileNumber ?? input.executionData?.caseNo ?? input.file?.fileNumber ?? '').trim() ||
            undefined,
        clientName:
            String(
                input.executionData?.creditors?.[0]?.name ??
                    input.executionData?.clientName ??
                    input.file?.creditors?.[0]?.name ??
                    '',
            ).trim() || undefined,
    });
    input.showToast('تم حفظ المهمة', 'success');
}

export function persistUpdatedCaseTask(input: {
    taskId: string;
    updates: Partial<{ title: string; body: string; dueDate: string; steps?: unknown[] }>;
    caseTasksPendingRef: { current: Array<{ id: string; title: string; dueDate?: string; trashedAt?: string | null }> };
    setCaseTasksPending: (tasks: unknown[]) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
}): void {
    const nextTasks = input.caseTasksPendingRef.current.map((t) =>
        t.id === input.taskId ? { ...t, ...input.updates } : t,
    );
    input.setCaseTasksPending(nextTasks);
    input.persistExecutionMerge({ caseTasksPending: nextTasks });
    const updated = nextTasks.find((t) => t.id === input.taskId);
    if (updated) {
        syncExecutionTaskDue({
            executionId: input.currentFileId,
            task: updated,
            caseNo:
                String(
                    input.executionData?.fileNumber ?? input.executionData?.caseNo ?? input.file?.fileNumber ?? '',
                ).trim() || undefined,
            clientName:
                String(
                    input.executionData?.creditors?.[0]?.name ??
                        input.executionData?.clientName ??
                        input.file?.creditors?.[0]?.name ??
                        '',
                ).trim() || undefined,
        });
    }
}
