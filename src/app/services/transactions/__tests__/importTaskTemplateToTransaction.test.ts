import { describe, expect, it, vi } from 'vitest';
import type { TaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import {
    canImportTaskTemplate,
    importTaskTemplateToTransaction,
} from '@/app/services/transactions/importTaskTemplateToTransaction';

describe('importTaskTemplateToTransaction', () => {
    it('canImportTaskTemplate يرفض القراءة فقط ويسمح بالإضافة مع وجود مهام', () => {
        expect(canImportTaskTemplate({ isReadOnly: true, existingTaskCount: 0 })).toBe(false);
        expect(canImportTaskTemplate({ isReadOnly: false, existingTaskCount: 2 })).toBe(true);
        expect(canImportTaskTemplate({ isReadOnly: false, existingTaskCount: 0 })).toBe(true);
    });

    it('يستورد مهام القالب مع الحفاظ على التسلسل', async () => {
        const addTask = vi.fn(async (input: { title: string; parentTaskId: string | null }) => ({
            id: `new-${input.title}`,
            transactionId: 'tx-1',
            title: input.title,
            status: 'Pending',
            parentTaskId: input.parentTaskId,
            notes: null,
            deadline: null,
            officialReference: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            completedAt: null,
        }));
        const refreshTransactionData = vi.fn(async () => undefined);

        const template: TaskTemplate = {
            id: 'tpl-1',
            name: 'قالب',
            createdAt: '2026-01-01T00:00:00.000Z',
            tasks: [
                { id: 'a', title: 'root', parentTaskId: null, deadline: null },
                { id: 'b', title: 'child', parentTaskId: 'a', deadline: null },
            ],
        };

        await importTaskTemplateToTransaction('tx-1', template, { addTask, refreshTransactionData });

        expect(addTask).toHaveBeenCalledTimes(2);
        expect(addTask.mock.calls[1]?.[0]?.parentTaskId).toBe('new-root');
        expect(refreshTransactionData).toHaveBeenCalledWith('tx-1');
    });
});
