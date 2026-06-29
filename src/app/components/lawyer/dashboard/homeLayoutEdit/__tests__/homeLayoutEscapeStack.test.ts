import { describe, expect, it } from 'vitest';
import { resolveHomeLayoutEscapeAction } from '@/app/components/lawyer/dashboard/homeLayoutEdit/homeLayoutEscapeStack';

describe('resolveHomeLayoutEscapeAction', () => {
    it('يلغي السحب أولاً', () => {
        expect(
            resolveHomeLayoutEscapeAction({ dragging: true, selectedBlockId: 'forum' }),
        ).toBe('cancel-drag');
    });

    it('يغلق ورقة التخصيص قبل الخروج من الوضع', () => {
        expect(resolveHomeLayoutEscapeAction({ dragging: false, selectedBlockId: 'forum' })).toBe(
            'close-customizer',
        );
    });

    it('يخرج من وضع التخصيص عند عدم وجود طبقات', () => {
        expect(resolveHomeLayoutEscapeAction({ dragging: false, selectedBlockId: null })).toBe(
            'exit-edit',
        );
    });
});
