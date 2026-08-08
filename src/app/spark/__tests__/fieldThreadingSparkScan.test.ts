import { describe, expect, it } from 'vitest';
import { scanFieldTasksForSpark } from '@/app/spark/engine/fieldTasksSparkScan';
import { scanThreadingForSpark } from '@/app/spark/engine/threadingSparkScan';
import {
    TransactionStatus,
    TransactionTaskStatus,
} from '@/app/modules/transactionsThreading/types';

describe('fieldTasksSparkScan', () => {
    it('يكتشف مهمة حرجة اليوم', () => {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const hits = scanFieldTasksForSpark([
            {
                id: 't-1',
                rawText: 'جلسة',
                title: 'حضور جلسة',
                location: null,
                parsedDate: today,
                reminderAt: null,
                isFatalDeadline: true,
                linkedCaseId: null,
                status: 'pending',
                completedAt: null,
                pinnedToFieldCurtain: false,
                fieldCurtainPinnedAt: null,
                subTasks: [],
                documentRequirements: [],
                expenses: [],
                voiceRef: null,
                voiceTranscript: null,
                voiceDurationSec: null,
            },
        ]);
        expect(hits).toHaveLength(1);
        expect(hits[0].nudge.kind).toBe('field.fatal_deadline');
    });
});

describe('threadingSparkScan', () => {
    it('يكتشف معاملة متوقفة', () => {
        const hits = scanThreadingForSpark(
            [
                {
                    id: 'tx-1',
                    title: 'تجديد إجازة',
                    clientName: 'أحمد',
                    targetDepartment: 'جوازات',
                    status: TransactionStatus.Paused,
                    agreedFees: 0,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-02',
                },
            ],
            [],
        );
        expect(hits.some((h) => h.nudge.kind === 'threading.transaction_paused')).toBe(true);
    });

    it('يكتشف مهمة معلّقة بمهلة قريبة', () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 1);
        const hits = scanThreadingForSpark(
            [
                {
                    id: 'tx-2',
                    title: 'معاملة',
                    clientName: 'زينب',
                    targetDepartment: 'عدل',
                    status: TransactionStatus.Active,
                    agreedFees: 100,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-02',
                },
            ],
            [
                {
                    id: 'task-1',
                    transactionId: 'tx-2',
                    title: 'تقديم طلب',
                    status: TransactionTaskStatus.Pending,
                    parentTaskId: null,
                    notes: null,
                    deadline: deadline.toISOString(),
                    officialReference: null,
                    createdAt: '2026-01-01',
                    completedAt: null,
                },
            ],
        );
        expect(hits.some((h) => h.nudge.kind === 'threading.task_deadline_near')).toBe(true);
    });
});
