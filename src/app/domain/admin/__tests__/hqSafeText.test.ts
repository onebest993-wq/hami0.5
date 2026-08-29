import { describe, expect, it } from 'vitest';
import { clampHqCount, isHqAbortError, stripHqControlChars } from '../hqSafeText';

describe('hqSafeText', () => {
    it('يزيل محارف التحكم ويقطع الطول', () => {
        expect(stripHqControlChars('  بغداد\n', 80)).toBe('بغداد');
        expect(stripHqControlChars('resend\u0000', 32)).toBe('resend');
        expect(stripHqControlChars('abcdefghij', 4)).toBe('abcd');
        expect(stripHqControlChars(null, 8)).toBe('');
    });

    it('يحصر الأعداد السالبة والكسرية والضخمة', () => {
        expect(clampHqCount(-1)).toBe(0);
        expect(clampHqCount(2.9)).toBe(2);
        expect(clampHqCount(Number.POSITIVE_INFINITY)).toBe(0);
        expect(clampHqCount(2_000_000_000)).toBe(1_000_000_000);
    });

    it('يميّز الإلغاء من خطأ حقيقي', () => {
        const ac = new AbortController();
        ac.abort();
        expect(isHqAbortError(new Error('nope'), ac.signal)).toBe(true);
        const aborted = new Error('aborted');
        aborted.name = 'AbortError';
        expect(isHqAbortError(aborted)).toBe(true);
        expect(isHqAbortError(new Error('down'))).toBe(false);
    });
});
