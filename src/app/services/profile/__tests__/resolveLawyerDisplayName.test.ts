import { describe, expect, it } from 'vitest';
import { resolveLawyerDisplayName, preferRicherLawyerDisplayName, resolveFirstPaintLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { DEV_MOCK_LAWYER_NAME, GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

describe('resolveLawyerDisplayName', () => {
    it('uses guest mock name when profile has stale demo label', () => {
        expect(resolveLawyerDisplayName('محامٍ تجريبي', GUEST_LAWYER_ID, {})).toBe(DEV_MOCK_LAWYER_NAME);
    });

    it('keeps custom profile name for guest when set', () => {
        expect(resolveLawyerDisplayName('سارة العراقي', GUEST_LAWYER_ID, {})).toBe('سارة العراقي');
    });

    it('يركب الاسم من given_name و family_name عند غياب full_name', () => {
        expect(
            resolveLawyerDisplayName(undefined, 'lawyer-1', {
                given_name: 'أحمد',
                family_name: 'مهدي',
            }),
        ).toBe('أحمد مهدي');
    });

    it('يفضّل full_name الأطول على name القصير في بيانات الجلسة', () => {
        expect(
            resolveLawyerDisplayName(undefined, 'lawyer-1', {
                name: 'أحمد',
                full_name: 'أحمد مهدي',
            }),
        ).toBe('أحمد مهدي');
    });

    it('preferRicherLawyerDisplayName لا يرجع من الكامل إلى البادئة', () => {
        expect(preferRicherLawyerDisplayName('أحمد', 'أحمد مهدي')).toBe('أحمد مهدي');
        expect(preferRicherLawyerDisplayName('أحمد مهدي', 'أحمد')).toBe('أحمد مهدي');
        expect(preferRicherLawyerDisplayName('احمد', 'أحمد مهدي')).toBe('أحمد مهدي');
        expect(preferRicherLawyerDisplayName('أحمد مهدي', 'احمد')).toBe('أحمد مهدي');
        expect(preferRicherLawyerDisplayName('قديم', 'جديد')).toBe('جديد');
    });

    it('أول طلاء يتجاهل name القصير وينتظر الكامل أو الملف', () => {
        expect(
            resolveFirstPaintLawyerDisplayName(undefined, 'lawyer-1', { name: 'أحمد' }),
        ).toBe('');
        expect(
            resolveFirstPaintLawyerDisplayName(undefined, 'lawyer-1', {
                name: 'أحمد',
                full_name: 'أحمد مهدي',
            }),
        ).toBe('أحمد مهدي');
        expect(resolveFirstPaintLawyerDisplayName('أحمد مهدي', 'lawyer-1', { name: 'أحمد' })).toBe(
            'أحمد مهدي',
        );
        expect(resolveFirstPaintLawyerDisplayName('أحمد', 'lawyer-1', { name: 'أحمد' })).toBe('');
        expect(
            resolveFirstPaintLawyerDisplayName('أحمد', 'lawyer-1', { fullName: 'اختبار' }),
        ).toBe('أحمد');
        expect(
            resolveFirstPaintLawyerDisplayName('احمد', 'lawyer-1', { full_name: 'أحمد مهدي' }),
        ).toBe('أحمد مهدي');
        expect(resolveFirstPaintLawyerDisplayName('احمد', 'lawyer-1', { name: 'احمد' })).toBe('');
    });

    it('ينزع الوسوم من اسم العرض', () => {
        expect(resolveLawyerDisplayName('<img src=x onerror=alert(1)>أحمد', 'lawyer-1')).toBe('أحمد');
    });
});
