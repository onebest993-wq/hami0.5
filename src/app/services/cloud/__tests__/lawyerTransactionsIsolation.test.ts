import { describe, expect, it } from 'vitest';
import { mergeLocalTransactionsPreservingOtherUsers } from '@/app/services/cloud/lawyerTransactionsCloud';

describe('mergeLocalTransactionsPreservingOtherUsers', () => {
    it('يبقي معاملات المستخدمين الآخرين عند حفظ شريحة المستخدم الحالي', () => {
        const allLocal = [
            { id: 'a', userId: 'u1', title: 'أ' },
            { id: 'b', userId: 'u2', title: 'ب' },
        ];
        const merged = mergeLocalTransactionsPreservingOtherUsers(allLocal, 'u1', [
            { id: 'a', userId: 'u1', title: 'أ-محدث' },
        ]);
        expect(merged).toEqual(
            expect.arrayContaining([
                { id: 'b', userId: 'u2', title: 'ب' },
                { id: 'a', userId: 'u1', title: 'أ-محدث' },
            ]),
        );
        expect(merged).toHaveLength(2);
    });
});
