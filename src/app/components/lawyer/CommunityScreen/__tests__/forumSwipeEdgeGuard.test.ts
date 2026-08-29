import { describe, expect, it } from 'vitest';
import {
    FORUM_SYSTEM_GESTURE_EDGE_PX,
    isForumSwipeFromSystemGestureEdge,
} from '../forumSwipeEdgeGuard';

describe('isForumSwipeFromSystemGestureEdge', () => {
    it('يحمي حافتي الشاشة لإيماءة رجوع النظام', () => {
        expect(isForumSwipeFromSystemGestureEdge(8, 390)).toBe(true);
        expect(isForumSwipeFromSystemGestureEdge(390 - 8, 390)).toBe(true);
        expect(isForumSwipeFromSystemGestureEdge(31, 390)).toBe(true);
        expect(isForumSwipeFromSystemGestureEdge(32, 390)).toBe(false);
    });
});
