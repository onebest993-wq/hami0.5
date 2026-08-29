import { describe, expect, it } from 'vitest';
import {
    formatHqDate,
    formatHqDateTime,
    formatHqRemaining,
    formatHqWaitingSince,
} from '@/app/components/admin/hqFormat';

describe('formatHqRemaining', () => {
    const now = Date.parse('2026-08-27T21:00:00.000Z');

    it('يصف المدة المتبقية بالأيام', () => {
        expect(formatHqRemaining('2026-09-26T21:00:00.000Z', now)).toBe('30 أيام');
    });

    it('يعلن انتهاء الصلاحية', () => {
        expect(formatHqRemaining('2026-08-01T00:00:00.000Z', now)).toBe('انتهت الصلاحية');
    });

    it('لا يكشف أسراراً ولا يفشل على تاريخ فارغ', () => {
        expect(formatHqRemaining('', now)).toBe('غير معروف');
    });

    it('يعرض تاريخ الإنشاء بلا وقت', () => {
        expect(formatHqDate('not-a-date')).toBe('—');
        expect(formatHqDate('2026-08-27T21:00:00.000Z')).not.toBe('—');
    });

    it('يعرض عمر الطلب من تاريخ التقديم', () => {
        expect(formatHqWaitingSince('2026-08-27T20:00:00.000Z', now)).toBe('منذ ساعة');
        expect(formatHqWaitingSince('', now)).toBe('');
    });

    it('يصدّر التاريخ مع الوقت — استيراد المقر يعتمد الاسم صراحة', () => {
        expect(formatHqDateTime('not-a-date')).toBe('—');
        expect(formatHqDateTime('2026-08-27T21:00:00.000Z')).not.toBe('—');
        expect(formatHqDateTime('2026-08-27T21:00:00.000Z')).not.toBe(formatHqDate('2026-08-27T21:00:00.000Z'));
    });
});
