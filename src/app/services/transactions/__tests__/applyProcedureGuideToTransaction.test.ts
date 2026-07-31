import { describe, expect, it } from 'vitest';
import { applyProcedureGuideToTransaction } from '@/app/services/transactions/applyProcedureGuideToTransaction';

describe('applyProcedureGuideToTransaction', () => {
    it('ينشئ المهام الشجرية وعناوين المستمسكات', async () => {
        const createdTasks: Array<{ title: string; parentTaskId: string | null; notes: string | null }> = [];
        const createdDocs: Array<{ title: string; ownerTag: string }> = [];
        let idSeq = 0;

        await applyProcedureGuideToTransaction(
            'tx-new',
            {
                v: 1,
                steps: [
                    { id: 'old-1', title: 'أصل', parentTaskId: null, notes: 'ملاحظة' },
                    { id: 'old-2', title: 'فرع', parentTaskId: 'old-1' },
                ],
                documents: [{ title: 'هوية', ownerTag: 'للموكل' }],
            },
            {
                addTask: async (input) => {
                    idSeq += 1;
                    createdTasks.push({
                        title: input.title,
                        parentTaskId: input.parentTaskId,
                        notes: input.notes ?? null,
                    });
                    return {
                        id: `new-${idSeq}`,
                        transactionId: input.transactionId,
                        title: input.title,
                        status: 'pending' as never,
                        parentTaskId: input.parentTaskId,
                        notes: input.notes ?? null,
                        deadline: null,
                        officialReference: null,
                        createdAt: '2026-01-01T00:00:00.000Z',
                        completedAt: null,
                    };
                },
                addDocument: async (input) => {
                    createdDocs.push({ title: input.title, ownerTag: input.ownerTag });
                    return {};
                },
                refreshTransactionData: async () => undefined,
            },
        );

        expect(createdTasks).toEqual([
            { title: 'أصل', parentTaskId: null, notes: 'ملاحظة' },
            { title: 'فرع', parentTaskId: 'new-1', notes: null },
        ]);
        expect(createdDocs).toEqual([{ title: 'هوية', ownerTag: 'للموكل' }]);
    });
});
