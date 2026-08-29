import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';

type ImportTaskTemplateDeps = {
    addTask: (input: {
        transactionId: string;
        title: string;
        parentTaskId: string | null;
        deadline: string | null;
    }) => Promise<TransactionTask>;
    refreshTransactionData: (transactionId: string) => Promise<void>;
};

export function canImportTaskTemplate(params: { isReadOnly: boolean; existingTaskCount?: number }): boolean {
    return !params.isReadOnly;
}

export async function importTaskTemplateToTransaction(
    transactionId: string,
    template: TaskTemplate,
    deps: ImportTaskTemplateDeps,
): Promise<void> {
    const mapOldToNew = new Map<string, string>();
    const remaining = template.tasks.slice();
    let guard = 0;

    while (remaining.length && guard < 200) {
        guard += 1;
        let progressed = false;
        for (let i = 0; i < remaining.length; i += 1) {
            const t = remaining[i];
            const canCreate = !t.parentTaskId || mapOldToNew.has(t.parentTaskId);
            if (!canCreate) continue;
            const parentTaskId = t.parentTaskId ? mapOldToNew.get(t.parentTaskId)! : null;
            const created = await deps.addTask({
                transactionId,
                title: t.title,
                parentTaskId,
                deadline: t.deadline ?? null,
            });
            mapOldToNew.set(t.id, created.id);
            remaining.splice(i, 1);
            i -= 1;
            progressed = true;
        }
        if (!progressed) {
            for (const t of remaining) {
                const created = await deps.addTask({
                    transactionId,
                    title: t.title,
                    parentTaskId: null,
                    deadline: t.deadline ?? null,
                });
                mapOldToNew.set(t.id, created.id);
            }
            remaining.length = 0;
        }
    }

    await deps.refreshTransactionData(transactionId);
}
