import { describe, expect, it, vi } from 'vitest';
import {
    FORUM_SHELL_FEATURE,
    formatForumUnreadBadge,
    openLawyerForumFromShell,
    shouldShowForumUnreadBadge,
} from '@/app/services/forum/forumShellNavigation';

describe('forumShellNavigation', () => {
    it('opens forum when signed in', () => {
        const onOpen = vi.fn();
        expect(openLawyerForumFromShell({ signedIn: true, onOpen })).toBe(true);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('blocks forum when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(openLawyerForumFromShell({ signedIn: false, onOpen, onSignedOut })).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('formats unread badge', () => {
        expect(FORUM_SHELL_FEATURE).toBe('المنتدى القانوني');
        expect(shouldShowForumUnreadBadge(0)).toBe(false);
        expect(shouldShowForumUnreadBadge(2)).toBe(true);
        expect(formatForumUnreadBadge(120)).toBe('99+');
        expect(formatForumUnreadBadge(7)).toBe('7');
    });
});
