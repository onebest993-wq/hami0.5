import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ForumTile } from '@/app/components/lawyer/dashboard/commandHub';

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

vi.mock('@/app/hooks/useLawyerProfileHeader', () => ({
    useLawyerProfileHeader: () => ({
        displayName: 'مطور حامي',
        title: 'المحامي والمستشار القانوني',
        avatarUrl: '',
    }),
}));

vi.mock('@/app/runtime/profileInstantPaint', () => ({
    beginProfileBackLock: vi.fn(),
    revealProfileWarmShell: vi.fn(),
}));

vi.mock('@/app/services/profile/profilePerfMetrics', () => ({
    markProfilePerfPhase: vi.fn(),
}));

describe('ForumTile', () => {
    it('بلاطة دخول بنفس غلاف المسارات — بلا صورة أو بود', () => {
        render(
            <ForumTile
                forumUnreadCount={0}
                onOpen={vi.fn()}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('home-dock-forum');
        expect(tile).toHaveAttribute('data-hami-layout-span', '1');
        expect(tile.className).not.toContain('hami-forum-meridian-shell');
        expect(tile.querySelector('.hami-forum-meridian-pod')).toBeNull();
        expect(tile.querySelector('img')).toBeNull();
        expect(tile.querySelector('svg')).toBeNull();
        expect(tile).toHaveTextContent('المنتدى');
        expect(tile.querySelector('.hami-hub-title-crystal')).not.toBeNull();
    });

    it('يبقي التسمية أثناء جلب الشارة — بلا مؤشر تحميل', () => {
        render(
            <ForumTile
                forumUnreadCount={0}
                onOpen={vi.fn()}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('home-dock-forum');
        expect(tile).toHaveTextContent('المنتدى');
        expect(screen.queryByTestId('home-dock-forum-loading')).toBeNull();
    });

    it('بعرض صف كامل: المنتدى والاسم على الجانبين والصورة في المنتصف', () => {
        const onOpen = vi.fn();
        const onOpenProfile = vi.fn();
        render(
            <ForumTile
                forumUnreadCount={0}
                onOpen={onOpen}
                onOpenProfile={onOpenProfile}
                reduceMotion
                layoutSpan={2}
                userId="lawyer-1"
                userMetadata={{ full_name: 'احمد مهدي الحسناوي' }}
            />,
        );

        const shell = screen.getByTestId('home-dock-forum-shell');
        expect(shell).toHaveAttribute('data-hami-layout-span', '2');
        expect(shell).toHaveAttribute('data-hami-block-border', '0');
        expect(shell.className).toContain('border-0');
        const forum = screen.getByTestId('home-dock-forum');
        expect(forum).toHaveTextContent('المنتدى');
        expect(forum.querySelector('.hami-hub-title-crystal')).not.toBeNull();
        expect(forum).not.toHaveTextContent('مطور حامي');
        /* الاسم من الجلسة/الكروم يبقى — لا قفزة إلى اسم الخطاف بعد التسوية */
        expect(screen.getByTestId('home-dock-forum-profile')).toHaveTextContent('احمد مهدي الحسناوي');
        const profile = screen.getByTestId('home-dock-forum-profile');
        expect(shell.firstElementChild).toBe(profile);
        const avatar = screen.getByTestId('home-dock-forum-profile-avatar');
        expect(avatar.className).toContain('hami-forum-tile-avatar-frame');
        expect(shell.className).toContain('hami-forum-profile-shell');
        expect(shell.className).toContain('overflow-visible');

        screen.getByTestId('home-dock-forum').click();
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onOpenProfile).not.toHaveBeenCalled();

        screen.getByTestId('home-dock-forum-profile').click();
        expect(onOpenProfile).toHaveBeenCalledTimes(1);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });
});
