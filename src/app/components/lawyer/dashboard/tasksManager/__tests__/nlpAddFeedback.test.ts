import { describe, expect, it } from 'vitest';
import { buildNlpAddFeedback } from '@/app/components/lawyer/dashboard/tasksManager/nlpAddFeedback';
import type { LegalTask } from '@/app/types/TaskEngine';
import { startOfLocalDay } from '@/app/utils/nlpParser';

function task(partial: Partial<LegalTask> & Pick<LegalTask, 'title'>): LegalTask {
    return {
        id: 't1',
        rawText: partial.title,
        title: partial.title,
        location: partial.location ?? null,
        parsedDate: partial.parsedDate ?? null,
        reminderAt: null,
        isFatalDeadline: partial.isFatalDeadline ?? false,
        linkedCaseId: partial.linkedCaseId ?? null,
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [],
        documentRequirements: [],
        expenses: [],
    };
}

describe('buildNlpAddFeedback', () => {
    it('returns default when no hints', () => {
        expect(buildNlpAddFeedback(task({ title: 'مهمة بسيطة' }))).toBe('تمت إضافة المهمة');
    });

    it('includes location date and fatal hints', () => {
        const msg = buildNlpAddFeedback(
            task({
                title: 'جلسة',
                location: 'محكمة الكرخ',
                parsedDate: startOfLocalDay(new Date(2026, 5, 28)),
                isFatalDeadline: true,
                linkedCaseId: 'ملف 12',
            }),
        );
        expect(msg).toContain('محكمة الكرخ');
        expect(msg).toContain('حتمي');
        expect(msg).toContain('ملف 12');
    });
});
