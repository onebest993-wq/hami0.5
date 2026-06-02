import { describe, expect, it } from 'vitest';
import { suggestedFutureActionForAlert } from '../alertFutureActions';

describe('suggestedFutureActionForAlert', () => {
    it('جلسة قادمة — تحضير دفوع', () => {
        expect(
            suggestedFutureActionForAlert({ type: 'HEARING', target: 'lawsuit' }),
        ).toBe('⚖️ تحضير دفوع الجلسة');
    });

    it('مهمة ميدان — استعراض التفاصيل', () => {
        expect(
            suggestedFutureActionForAlert({
                type: 'DEADLINE',
                target: 'schedule',
                calendarSource: { module: 'task', entityId: 't1' },
            }),
        ).toBe('📋 استعراض تفاصيل المهمة');
    });
});
