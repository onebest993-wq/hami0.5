import type { ProcedureGuideApplyPayload } from '@/app/services/transactions/procedureGuideNavigation';
import type { TransactionDocumentOwnerTag } from '@/app/modules/transactionsThreading/types';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';

type ApplyProcedureGuideDeps = {
    addTask: (input: {
        transactionId: string;
        title: string;
        parentTaskId: string | null;
        deadline: string | null;
        notes?: string | null;
    }) => Promise<TransactionTask>;
    addDocument: (input: {
        transactionId: string;
        title: string;
        ownerTag: TransactionDocumentOwnerTag;
    }) => Promise<unknown>;
    refreshTransactionData: (transactionId: string) => Promise<void>;
};

/** يستورد خطوات الدليل + عناوين المستمسكات إلى معاملة جديدة */
export async function applyProcedureGuideToTransaction(
    transactionId: string,
    guide: ProcedureGuideApplyPayload,
    deps: ApplyProcedureGuideDeps,
): Promise<void> {
    const mapOldToNew = new Map<string, string>();
    const remaining = guide.steps.slice();
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
                deadline: null,
                notes: t.notes?.trim() ? t.notes : null,
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
                    deadline: null,
                    notes: t.notes?.trim() ? t.notes : null,
                });
                mapOldToNew.set(t.id, created.id);
            }
            remaining.length = 0;
        }
    }

    for (const doc of guide.documents) {
        const title = doc.title.trim();
        if (!title) continue;
        await deps.addDocument({
            transactionId,
            title,
            ownerTag: doc.ownerTag,
        });
    }

    await deps.refreshTransactionData(transactionId);
}
