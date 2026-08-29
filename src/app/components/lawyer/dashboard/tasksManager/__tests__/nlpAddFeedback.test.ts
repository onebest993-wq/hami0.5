import { describe, expect, it } from 'vitest';
import { buildNlpAddFeedback } from '@/app/components/lawyer/dashboard/tasksManager/nlpAddFeedback';
import { startOfLocalDay } from '@/app/utils/nlpParser';
import { legalTaskStub } from '@/app/services/tasks/__tests__/legalTaskStub';

function task(partial: Parameters<typeof legalTaskStub>[0] & { title: string }) {
    return legalTaskStub({ id: 't1', ...partial });
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
