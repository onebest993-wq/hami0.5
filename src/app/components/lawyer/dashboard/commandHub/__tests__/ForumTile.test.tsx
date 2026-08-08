import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ForumTile } from '@/app/components/lawyer/dashboard/commandHub/CommandHubTiles';

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsAppearance: () => ({
        glassOpacity: 0.92,
        homeContainerBorder: true,
        brandColor: '#E6C673',
    }),
}));

vi.mock('@/app/components/lawyer/dashboard/HomeBlockPatternOverlay', () => ({
    HomeBlockPatternOverlay: () => null,
}));

vi.mock('@/app/components/lawyer/dashboard/HomeMoroccanGlassDecor', () => ({
    HomeMoroccanGlassDecor: () => null,
}));

describe('ForumTile meridian', () => {
    it('بود لوني وعنوان بسطر واحد — نقل نوعي عن المستطيل', () => {
        render(
            <ForumTile
                forumUnreadCount={0}
                onOpen={vi.fn()}
                reduceMotion
                themePrimary="#E6C673"
                layoutSpan={2}
            />,
        );

        const tile = screen.getByTestId('home-dock-forum');
        expect(tile).toHaveAttribute('data-hami-layout-span', '2');
        expect(tile.className).toContain('hami-forum-meridian-shell');
        expect(tile.querySelector('.hami-forum-meridian-pod')).not.toBeNull();
        expect(tile.querySelector('.hami-forum-meridian-emblem')).not.toBeNull();
        expect(tile.querySelector('img')).toBeNull();
        expect(tile.querySelector('.hami-forum-meridian-title')).toHaveTextContent('المنتدى');
        expect(tile.querySelector('.hami-forum-meridian-title')?.className).toContain('hami-hub-title-crystal');
        expect(tile.querySelector('.hami-forum-meridian-shear')).not.toBeNull();
    });

    it('يبقي شكل Meridian ثابتاً أثناء جلب الشارة — بلا تبديل محتوى', () => {
        render(
            <ForumTile
                forumUnreadCount={0}
                forumUnreadLoading
                onOpen={vi.fn()}
                reduceMotion
                themePrimary="#E6C673"
                layoutSpan={2}
            />,
        );

        const tile = screen.getByTestId('home-dock-forum');
        expect(tile.querySelector('.hami-forum-meridian-pod')).not.toBeNull();
        expect(tile.querySelector('.hami-forum-meridian-title')).toHaveTextContent('المنتدى');
        expect(tile.querySelector('.hami-forum-meridian-title')?.className).toContain('hami-hub-title-crystal');
        expect(screen.queryByTestId('home-dock-forum-loading')).toBeNull();
    });
});
