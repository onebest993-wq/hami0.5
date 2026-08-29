import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ForumTile } from '@/app/components/lawyer/dashboard/commandHub';
import { LawyerDashboardCommunityOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry';
import { CommunityScreenAccessGate } from '@/app/components/lawyer/CommunityScreen/components/CommunityScreenAccessGate';
import { ForumApiService } from '@/app/services/forumApiService';
import { useCommunityPostsFeedDeepLink } from '@/app/components/lawyer/CommunityScreen/hooks/useCommunityPostsFeedDeepLink';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';

vi.mock('@/app/context/lawyerSettings/lawyerSettingsHooks', () => ({
    useLawyerSettingsAppearance: () => ({
        glassOpacity: 0.92,
        homeContainerBorder: true,
        brandColor: '#E6C673',
    }),
}));

vi.mock('@/app/components/lawyer/dashboard/HomeBlockPatternOverlay', () => ({
    HomeBlockPatternOverlay: () => null,
}));

vi.mock('@/app/components/lawyer/CommunityScreen/CommunityScreenHost', () => ({
    CommunityScreenHost: () => <div data-testid="forum-community-host" />,
}));

vi.mock('@/app/components/lawyer/CommunityScreen/forumOverlayPortal', () => ({
    getForumOverlayPortalRoot: () => null,
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        getPostById: vi.fn(() => Promise.resolve(null)),
    },
}));

describe('سيناريوهات قسم المنتدى — بلاطة + طبقة + بوابة + keepAlive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.documentElement.removeAttribute('data-hami-forum-open');
    });

    it('النقر على البلاطة يفتح المنتدى وprefetch عند الدخول بالمؤشر', () => {
        const onOpen = vi.fn();
        const onPrefetch = vi.fn();
        render(
            <ForumTile
                forumUnreadCount={4}
                onOpen={onOpen}
                onPrefetch={onPrefetch}
                reduceMotion
                layoutSpan={1}
            />,
        );
        const tile = screen.getByTestId('home-dock-forum');
        expect(tile).toHaveAttribute('aria-label', expect.stringContaining('4 غير مقروء'));
        fireEvent.pointerEnter(tile);
        expect(onPrefetch).toHaveBeenCalled();
        fireEvent.click(tile);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('وضع التحرير يعطّل الفتح والشارة', () => {
        const onOpen = vi.fn();
        render(
            <ForumTile
                forumUnreadCount={9}
                onOpen={onOpen}
                reduceMotion
                layoutSpan={1}
                interactionDisabled
            />,
        );
        const tile = screen.getByTestId('home-dock-forum');
        expect(tile).toBeDisabled();
        expect(tile.querySelector('.hami-hub-unread-pip')).toBeNull();
        fireEvent.click(tile);
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('Host دافئ مغلق: الطبقة مخفية وinert ولا تُركَّب بلا هوية', () => {
        const overlays = {
            showCommunity: false,
            communityHostMounted: true,
            communitySessionKey: 0,
            resetCommunityScreen: vi.fn(),
            communityDeepLink: null,
            closeCommunity: vi.fn(),
            openProfileTab: vi.fn(),
        };
        const { rerender, container } = render(
            <LawyerDashboardCommunityOverlayEntry
                shell={{
                    userId: 'lawyer-1',
                    authUserId: 'lawyer-1',
                    lawyerShellAccess: true,
                    onLogout: () => undefined,
                    shapeClass: '',
                    theme: { bg: '#0A0F1C' },
                }}
                overlays={overlays as never}
            />,
        );
        const host = screen.getByTestId('forum-overlay-host');
        expect(host).toHaveAttribute('hidden');
        expect(host).toHaveAttribute('aria-hidden', 'true');
        expect(host).toHaveAttribute('data-forum-layer-open', '0');
        expect(host).toHaveAttribute('inert');

        rerender(
            <LawyerDashboardCommunityOverlayEntry
                shell={{
                    userId: 'lawyer-1',
                    authUserId: 'lawyer-1',
                    lawyerShellAccess: true,
                    onLogout: () => undefined,
                    shapeClass: '',
                    theme: { bg: '#0A0F1C' },
                }}
                overlays={{ ...overlays, showCommunity: true } as never}
            />,
        );
        expect(screen.getByTestId('forum-overlay-host')).toHaveAttribute('data-forum-layer-open', '1');
        expect(screen.getByTestId('forum-community-host')).toBeInTheDocument();

        rerender(
            <LawyerDashboardCommunityOverlayEntry
                shell={{
                    userId: '',
                    lawyerShellAccess: false,
                    onLogout: () => undefined,
                    shapeClass: '',
                    theme: { bg: '#0A0F1C' },
                }}
                overlays={overlays as never}
            />,
        );
        expect(container.querySelector('[data-testid="forum-overlay-host"]')).toBeNull();
    });

    it('ستارة html المفتوحة تُظهر Host الدافئ حتى قبل showCommunity', () => {
        document.documentElement.setAttribute('data-hami-forum-open', '1');
        const overlays = {
            showCommunity: false,
            communityHostMounted: true,
            communitySessionKey: 0,
            resetCommunityScreen: vi.fn(),
            communityDeepLink: null,
            closeCommunity: vi.fn(),
            openProfileTab: vi.fn(),
        };
        render(
            <LawyerDashboardCommunityOverlayEntry
                shell={{
                    userId: 'lawyer-1',
                    authUserId: 'lawyer-1',
                    lawyerShellAccess: true,
                    onLogout: () => undefined,
                    shapeClass: '',
                    theme: { bg: '#0A0F1C' },
                }}
                overlays={overlays as never}
            />,
        );
        const host = screen.getByTestId('forum-overlay-host');
        expect(host).not.toHaveAttribute('hidden');
        expect(host).toHaveAttribute('data-forum-layer-open', '1');
        expect(host.getAttribute('aria-hidden')).not.toBe('true');
        expect(host.className).toContain('hami-forum-overlay-layer--visible');
    });

    it('بوابة الضيف: رجوع + دخول + تسجيل', () => {
        const onBack = vi.fn();
        render(
            <CommunityScreenAccessGate
                showLoadingShell={false}
                canAccessLawyerForum={false}
                onBack={onBack}
            />,
        );
        fireEvent.click(screen.getByTestId('forum-access-back'));
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('forum-access-go-login')).toBeInTheDocument();
        expect(screen.getByTestId('forum-access-go-register')).toBeInTheDocument();
    });

    it('deep link لا يطلب الشبكة بينما السطح مغلق', async () => {
        function Probe() {
            const postsRef = useRef([]);
            const deep = useRef(false);
            useCommunityPostsFeedDeepLink({
                initialPostId: 'post-9',
                loadingPosts: false,
                postsRef,
                applyPostsUpdate: () => undefined,
                deepLinkHandledRef: deep,
                onActivateForumSectionRef: { current: undefined },
                onOpenCommentsRef: { current: undefined },
                surfaceOpen: false,
            });
            return null;
        }
        render(<Probe />);
        await Promise.resolve();
        expect(ForumApiService.getPostById).not.toHaveBeenCalled();
    });
});
