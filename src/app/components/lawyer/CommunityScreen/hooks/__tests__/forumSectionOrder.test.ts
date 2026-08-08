import { describe, expect, it } from 'vitest';
import { resolveForumSectionSwipe } from '@/app/components/lawyer/CommunityScreen/forumSectionOrder';

describe('resolveForumSectionSwipe', () => {
    it('ينتقل من المنتدى إلى المجموعات عند السحب لليسار', () => {
        expect(resolveForumSectionSwipe('forum', -80, 4)).toBe('groups');
    });

    it('ينتقل من المجموعات إلى المستودع عند السحب لليسار', () => {
        expect(resolveForumSectionSwipe('groups', -72, 8)).toBe('repository');
    });

    it('يعود من المستودع إلى المجموعات عند السحب لليمين', () => {
        expect(resolveForumSectionSwipe('repository', 90, 6)).toBe('groups');
    });

    it('يتجاهل السحب العمودي', () => {
        expect(resolveForumSectionSwipe('forum', -12, 120)).toBeNull();
    });

    it('لا يتجاوز حدود الأقسام', () => {
        expect(resolveForumSectionSwipe('forum', 90, 4)).toBeNull();
        expect(resolveForumSectionSwipe('repository', -90, 4)).toBeNull();
    });
});
