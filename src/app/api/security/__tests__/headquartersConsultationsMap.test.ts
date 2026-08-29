import { describe, expect, it } from 'vitest';
import { mapHeadquartersConsultation } from '../headquartersConsultationsMap.ts';

describe('mapHeadquartersConsultation', () => {
    it('يخفي اسم المنشور المجهول ويعدّ التعليقات كعروض', () => {
        const mapped = mapHeadquartersConsultation({
            id: 'post-1',
            authorName: 'سرّي',
            isAnonymous: true,
            content: 'نص الاستشارة',
            createdAt: '2026-08-01T00:00:00.000Z',
            comments: [{ authorName: 'محامي' }, { authorName: '  ' }],
        });
        expect(mapped).toMatchObject({
            id: 'post-1',
            name: 'مجهول',
            content: 'نص الاستشارة',
            isLawyer: false,
            pinned: false,
            locked: false,
            replyCount: 2,
            offers: [
                { lawyerName: 'محامي', price: 0 },
                { lawyerName: '—', price: 0 },
            ],
        });
    });

    it('يرفض معرّفاً فارغاً أو أطول من الحد', () => {
        expect(mapHeadquartersConsultation({ id: '  ' })).toBeNull();
        expect(mapHeadquartersConsultation({ id: 'x'.repeat(81) })).toBeNull();
    });

    it('لا يضع authorId في الحمولة', () => {
        const mapped = mapHeadquartersConsultation({
            id: 'p2',
            authorName: 'علوي',
            content: 'سؤال',
            createdAt: 'not-a-date',
        });
        expect(mapped?.name).toBe('علوي');
        expect(mapped?.time).toBe('—');
        expect(mapped?.replyCount).toBe(0);
        expect(mapped).not.toHaveProperty('authorId');
    });
});
