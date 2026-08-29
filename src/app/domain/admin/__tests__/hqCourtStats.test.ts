import { describe, expect, it } from 'vitest';
import { HQ_COURT_STATS_CAP, sanitizeHqCourtRows } from '../hqCourtStats';

describe('sanitizeHqCourtRows', () => {
    it('يطهّر الاسم ويدمج المحكمة المكررة ويحدّ العدد', () => {
        expect(sanitizeHqCourtRows(null)).toEqual([]);
        expect(
            sanitizeHqCourtRows([
                { court: '  بغداد\n', lawsuits: 2.9, transactions: -1 },
                { court: 'بغداد', lawsuits: 1, transactions: 4 },
                { court: '', lawsuits: 9, transactions: 9 },
            ]),
        ).toEqual([{ court: 'بغداد', lawsuits: 3, transactions: 4 }]);

        const many = Array.from({ length: HQ_COURT_STATS_CAP + 8 }, (_, i) => ({
            court: `محكمة-${i}`,
            lawsuits: 1,
            transactions: 0,
        }));
        expect(sanitizeHqCourtRows(many)).toHaveLength(HQ_COURT_STATS_CAP);
    });
});
