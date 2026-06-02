import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    applyAutoRedaction,
    normalizeTagLabel,
    deriveTagsFromContent,
    formatRelativeTime,
} from '../utils';
import { AUTO_REDACTION_TOKEN } from '../constants';

describe('applyAutoRedaction', () => {
    it('يُنقّح البريد الإلكتروني', () => {
        const { redacted, changed } = applyAutoRedaction('تواصل عبر ahmed@example.com للمزيد');
        expect(redacted).toContain(AUTO_REDACTION_TOKEN);
        expect(redacted).not.toContain('ahmed@example.com');
        expect(changed).toBe(true);
    });

    it('يُنقّح رقم الموبايل العراقي', () => {
        const cases = ['07901234567', '+96479012345678', '0790-123-4567'];
        for (const phone of cases) {
            const { redacted, changed } = applyAutoRedaction(`اتصل بي على ${phone}`);
            expect(changed).toBe(true);
            expect(redacted).toContain(AUTO_REDACTION_TOKEN);
        }
    });

    it('يُنقّح أرقام طويلة (هوية)', () => {
        const { redacted, changed } = applyAutoRedaction('رقم البطاقة 1234567890123');
        expect(changed).toBe(true);
        expect(redacted).toContain(AUTO_REDACTION_TOKEN);
        expect(redacted).not.toContain('1234567890123');
    });

    it('لا يُنقّح نصاً عادياً نظيفاً', () => {
        const text = 'استشارة قانونية حول قضية تنفيذ مدنية';
        const { redacted, changed } = applyAutoRedaction(text);
        expect(changed).toBe(false);
        expect(redacted).toBe(text);
    });

    it('يُنقّح عدة عناصر في نص واحد', () => {
        const text = 'تواصل: a@b.co أو 07712345678 أو 999888777666';
        const { redacted, changed } = applyAutoRedaction(text);
        expect(changed).toBe(true);
        const tokenCount = redacted.split(AUTO_REDACTION_TOKEN).length - 1;
        expect(tokenCount).toBeGreaterThanOrEqual(2);
    });
});

describe('normalizeTagLabel', () => {
    it('يُحوّل المسافات إلى _', () => {
        expect(normalizeTagLabel('أحوال شخصية')).toBe('أحوال_شخصية');
    });

    it('يُزيل علامات الترقيم', () => {
        expect(normalizeTagLabel('تنفيذ!@#')).toBe('تنفيذ');
    });

    it('يحفظ الأرقام والحروف العربية واللاتينية', () => {
        expect(normalizeTagLabel('قانون2024')).toBe('قانون2024');
    });

    it('يُقصّ المسافات الطرفية', () => {
        expect(normalizeTagLabel('  مدني  ')).toBe('مدني');
    });
});

describe('deriveTagsFromContent', () => {
    it('يكتشف وسم «تنفيذ»', () => {
        const tags = deriveTagsFromContent('قضية تنفيذ حكم على عقار');
        expect(tags).toContain('#تنفيذ');
        expect(tags).toContain('#عقاري');
    });

    it('يكتشف وسم «أحوال_شخصية»', () => {
        const tags = deriveTagsFromContent('دعوى طلاق ونفقة');
        expect(tags).toContain('#أحوال_شخصية');
    });

    it('يكتشف وسم «جنائي»', () => {
        const tags = deriveTagsFromContent('قضية جناية مخدرات');
        expect(tags).toContain('#جنائي');
    });

    it('يكتشف وسم «شركات»', () => {
        const tags = deriveTagsFromContent('شركة محدودة المسؤولية مع شريك');
        expect(tags).toContain('#شركات');
    });

    it('لا يكتشف وسوماً من نص خارج المجال', () => {
        const tags = deriveTagsFromContent('سلام عليكم');
        expect(tags).toEqual([]);
    });

    it('لا يُكرّر الوسوم', () => {
        const tags = deriveTagsFromContent('عقار عقار عقاري عقاري');
        const unique = new Set(tags);
        expect(tags.length).toBe(unique.size);
    });
});

describe('formatRelativeTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('يُعيد «الآن» للأقل من دقيقة', () => {
        const iso = new Date('2026-01-15T11:59:30.000Z').toISOString();
        expect(formatRelativeTime(iso)).toBe('الآن');
    });

    it('يُعيد «قبل N دقيقة»', () => {
        const iso = new Date('2026-01-15T11:50:00.000Z').toISOString();
        expect(formatRelativeTime(iso)).toBe('قبل 10 دقيقة');
    });

    it('يُعيد «قبل N ساعة»', () => {
        const iso = new Date('2026-01-15T09:00:00.000Z').toISOString();
        expect(formatRelativeTime(iso)).toBe('قبل 3 ساعة');
    });

    it('يُعيد «قبل N يوم»', () => {
        const iso = new Date('2026-01-10T12:00:00.000Z').toISOString();
        expect(formatRelativeTime(iso)).toBe('قبل 5 يوم');
    });

    it('يُعيد سلسلة فارغة للتاريخ غير الصالح', () => {
        expect(formatRelativeTime('not-a-date')).toBe('');
    });
});
