import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { redactPiiText, sanitizeTaskForPublic } from '../taskSanitizer';

function baseTask(partial: Partial<LegalTask> = {}): LegalTask {
    return {
        id: 't1',
        rawText: 'جلسة للموكل أحمد علي رقم القضية 12345678901',
        title: 'جلسة للموكل أحمد علي رقم القضية 12345678901',
        location: 'محكمة الكرخ',
        parsedDate: new Date('2026-08-01T00:00:00.000Z'),
        reminderAt: null,
        isFatalDeadline: false,
        linkedCaseId: 'case-secret',
        status: 'pending',
        completedAt: null,
        pinnedToFieldCurtain: false,
        fieldCurtainPinnedAt: null,
        subTasks: [{ id: 's1', title: 'تقديم لائحة', location: null, isCompleted: false }],
        documentRequirements: [{ id: 'd1', text: 'هوية الموكل', isChecked: false }],
        expenses: [{ id: 'e1', amount: 10000, label: 'رسم' }],
        voiceRef: 'hami-voice-ref:x',
        voiceTranscript: 'نص سري',
        voiceDurationSec: 12,
        ...partial,
    };
}

describe('redactPiiText', () => {
    it('redacts long digit ids and client-name patterns', () => {
        const out = redactPiiText('الموكل سامي ورقم القضية 123456789012');
        expect(out).toContain('[محذوف]');
        expect(out).not.toMatch(/123456789012/);
        expect(out).not.toContain('سامي');
    });
});

describe('sanitizeTaskForPublic', () => {
    it('marks sanitised, prefixes title, and strips confidential payload fields from output', () => {
        const result = sanitizeTaskForPublic(baseTask());
        expect(result.isSanitised).toBe(true);
        expect(result.title.startsWith('[طلب مساعدة عامة]')).toBe(true);
        expect(result.location).toBe('محكمة الكرخ');
        expect(result.dueDate).toBe('2026-08-01T00:00:00.000Z');
        expect(result.instructions).toContain('تقديم لائحة');
        expect(result.title).not.toMatch(/12345678901/);
        expect(result.rawText).not.toContain('case-secret');
    });
});
