import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HomeWidgetSlotSkeleton } from '@/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import type { AppearanceSettings } from '@/app/services/settings/types';

vi.mock('@/app/components/lawyer/dashboard/HomeBlockPatternOverlay', () => ({
    HomeBlockPatternOverlay: () => null,
}));

vi.mock('@/app/components/lawyer/dashboard/peekForumFirstPaintChrome', () => ({
    peekForumFirstPaintChrome: () => ({
        displayName: 'محامي الاختبار',
        profileInitial: 'م',
        avatarUrl: '',
        showInitial: true,
        isLoaded: true,
    }),
}));

const appearance = {
    glassOpacity: 0.92,
    homeContainerBorder: true,
} as AppearanceSettings;

function forumRowSlot(): HomeMainGridSlot {
    return {
        id: 'forum',
        span: 2,
        override: undefined,
        style: {},
    };
}

describe('HomeWidgetSlotSkeleton — صف المنتدى', () => {
    it('لمس ربع الملف لا يفتح المنتدى — فقط وجه المنتدى', () => {
        const onActivate = vi.fn();
        render(
            <HomeWidgetSlotSkeleton
                slot={forumRowSlot()}
                appearance={appearance}
                themePrimary="#E6C673"
                onActivate={onActivate}
            />,
        );

        fireEvent.click(screen.getByTestId('home-dock-forum-profile'));
        expect(onActivate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('home-dock-forum'));
        expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('الغلاف ليس زراً — الوجه زر أصلي ≥44px', () => {
        render(
            <HomeWidgetSlotSkeleton
                slot={forumRowSlot()}
                appearance={appearance}
                themePrimary="#E6C673"
                onActivate={vi.fn()}
            />,
        );

        const shell = screen.getByTestId('home-dock-forum-shell');
        expect(shell.tagName).toBe('DIV');
        expect(shell).not.toHaveAttribute('role', 'button');
        const forum = screen.getByTestId('home-dock-forum');
        expect(forum.tagName).toBe('BUTTON');
        expect(forum.className).toMatch(/min-h-\[44px]/);
        expect(screen.getByTestId('home-dock-forum-profile').tagName).toBe('DIV');
    });
});
