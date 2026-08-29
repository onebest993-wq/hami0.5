import { describe, expect, it } from 'vitest';
import {
    FORUM_TILE_PROFILE_SCROLL_SLOP_PX,
    isForumTileProfilePointerScroll,
} from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';

describe('isForumTileProfilePointerScroll', () => {
    it('تحت العتبة ليس تمريرًا', () => {
        expect(
            isForumTileProfilePointerScroll({ x: 0, y: 0 }, { clientX: 4, clientY: 4 }),
        ).toBe(false);
    });

    it('فوق العتبة تمرير — لا يُفتح الملف', () => {
        expect(
            isForumTileProfilePointerScroll(
                { x: 0, y: 0 },
                { clientX: 0, clientY: FORUM_TILE_PROFILE_SCROLL_SLOP_PX + 1 },
            ),
        ).toBe(true);
    });
});
