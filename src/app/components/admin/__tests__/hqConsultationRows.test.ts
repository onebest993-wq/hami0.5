import { describe, expect, it } from 'vitest';
import { sanitizeHqConsultationRow } from '../hqConsultationRows';

const POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee21';

describe('hqConsultationRows', () => {
    it('يرفض منشوراً غير UUID ويأخذ عدّ الردود لا الأسماء', () => {
        expect(sanitizeHqConsultationRow({ id: 'post-1', name: 'س', content: 'ن' })).toBeNull();
        const row = sanitizeHqConsultationRow({
            id: POST,
            name: 'سائل\u0000',
            content: 'نص',
            time: '١ آب',
            pinned: true,
            locked: false,
            replyCount: 4,
            offers: [{ lawyerName: 'يجب أن يُتجاهل', price: 9 }],
        });
        expect(row).toEqual({
            id: POST,
            name: 'سائل',
            content: 'نص',
            time: '١ آب',
            pinned: true,
            locked: false,
            replyCount: 4,
        });
        expect(row).not.toHaveProperty('offers');
    });
});
