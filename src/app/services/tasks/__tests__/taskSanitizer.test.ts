import { describe, expect, it } from 'vitest';
import type { LegalTask } from '@/app/types/TaskEngine';
import { redactPiiText, sanitizeTaskForPublic, stripTaskHtml } from '../taskSanitizer';

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

describe('stripTaskHtml (L3 explicit HTML defense)', () => {
    it('strips arbitrary HTML tags including script blocks', () => {
        const poisoned = '<b>مرحبا</b> <script>alert(1)</script> <img src=x onerror=alert(2) />';
        const clean = stripTaskHtml(poisoned);
        expect(clean).not.toMatch(/<script/i);
        expect(clean).not.toMatch(/<\/?[a-z]/i);
        expect(clean).toContain('مرحبا');
    });

    it('handles unclosed tags and null/undefined safely', () => {
        expect(stripTaskHtml('<div>نص غير مغلق')).toBe('نص غير مغلق');
        expect(stripTaskHtml(null as unknown as string)).toBe('');
        expect(stripTaskHtml(undefined as unknown as string)).toBe('');
    });
});

describe('redactPiiText PII patterns (L5 TP-03 5/5 regex)', () => {
    it('L5.1 redacts email addresses', () => {
        const out = redactPiiText('تواصل عبر mohanned@example.com من فضلك');
        expect(out).not.toMatch(/mohanned@example\.com/);
        expect(out).toContain('[محذوف]');
    });

    it('L5.2 redacts Iraq 7xxxx mobile numbers (+964/0 prefixes)', () => {
        expect(redactPiiText('اتصل: +964 770 123 4567')).not.toMatch(/770[\s-]?123[\s-]?4567/);
        expect(redactPiiText('جوال: 0781-555-9999')).not.toMatch(/0?781/);
    });

    it('L5.3 redacts 10-16 digit numeric runs (ids/cards)', () => {
        const out = redactPiiText('رقم الهوية 123456789012 والبطاقة 9876-5432-1098-7654');
        expect(out).not.toMatch(/123456789012/);
        expect(out).not.toMatch(/9876/);
    });

    it('L5.4 redacts الموكل/المدعي/المدعى عليه name patterns', () => {
        const out = redactPiiText('الموكل سامي المجيد و المدعي علي عبدالله');
        expect(out).not.toContain('سامي');
        expect(out).not.toContain('عبدالله');
    });

    it('L5.5 redacts رقم القضية / رقم الإضبارة / قضية رقم patterns', () => {
        const out = redactPiiText('رقم القضية: 2024/12345 وقضية رقم 9876-C');
        expect(out).not.toMatch(/2024\/12345/);
        expect(out).not.toMatch(/9876/);
    });

    it('calls stripTaskHtml first before any PII regex (L3 before L5 order)', () => {
        const mixed = '<script>x</script> test@ex.com <b>الموكل زيد</b>';
        const out = redactPiiText(mixed);
        expect(out).not.toMatch(/<script/);
        expect(out).not.toMatch(/test@ex\.com/);
        expect(out).not.toContain('زيد');
    });
});
