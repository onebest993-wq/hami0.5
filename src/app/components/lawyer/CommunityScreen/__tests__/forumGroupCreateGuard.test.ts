import { describe, expect, it } from 'vitest';
import { resolveForumGroupCreateFields } from '../forumGroupCreateGuard';

describe('resolveForumGroupCreateFields', () => {
    it('يرفض الزائر غير المسجّل', () => {
        expect(resolveForumGroupCreateFields('مجموعة قانونية', 'وصف واضح للمجموعة المهنية', null)).toEqual({
            ok: false,
            warning: 'سجّل الدخول لإنشاء مجموعة',
        });
    });

    it('يرفض الاسم القصير والوصف القصير', () => {
        expect(resolveForumGroupCreateFields('أب', 'وصف طويل بما يكفي هنا', 'u1')).toEqual({
            ok: false,
            warning: 'اسم المجموعة قصير جداً (3 أحرف على الأقل)',
        });
        expect(resolveForumGroupCreateFields('مجموعة', 'قصير', 'u1')).toEqual({
            ok: false,
            warning: 'اكتب وصفاً أوضح للمجموعة (10 أحرف على الأقل)',
        });
    });

    it('يقبل حقلاً صالحاً بعد القصّ', () => {
        expect(
            resolveForumGroupCreateFields('  ضرائب  ', '  وصف مجموعة الضرائب العراقية  ', 'u1'),
        ).toEqual({
            ok: true,
            name: 'ضرائب',
            description: 'وصف مجموعة الضرائب العراقية',
        });
    });
});
