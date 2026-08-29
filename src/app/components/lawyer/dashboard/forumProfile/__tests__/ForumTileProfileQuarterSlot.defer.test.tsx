import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { HOME_MAIN_GRID_PAINTED_EVENT } from '@/app/bootstrap/bootEventNames';
import { ForumTileProfileQuarterSlot } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterSlot';

vi.mock('@/app/runtime/forumTileProfileQuarterLoader', () => ({
    getCachedForumTileProfileQuarter: () => null,
    loadForumTileProfileQuarterModule: () =>
        Promise.resolve({
            ForumTileProfileQuarter: ({ seedDisplayName }: { seedDisplayName?: string }) => (
                <button type="button" data-testid="home-dock-forum-profile-live">
                    {seedDisplayName ?? 'حي'}
                </button>
            ),
        }),
}));

vi.mock('@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback', () => ({
    ForumTileProfileQuarterFallback: ({
        displayName,
        identitySettled,
    }: {
        displayName?: string;
        identitySettled?: boolean;
    }) => (
        <button
            type="button"
            data-testid="home-dock-forum-profile"
            data-identity-settled={identitySettled ? '1' : '0'}
        >
            {displayName ?? 'م'}
        </button>
    ),
}));

describe('ForumTileProfileQuarterSlot — تأجيل المقطع بعد طلاء الشبكة', () => {
    beforeEach(() => {
        window.__hamiHomeMainGridPainted__ = false;
    });

    afterEach(() => {
        window.__hamiHomeMainGridPainted__ = false;
    });

    it('يعرض Fallback قبل الطلاء ثم يرقّي بعد الحدث', async () => {
        render(
            <ForumTileProfileQuarterSlot
                userId="lawyer-1"
                disabled={false}
                onOpenProfile={() => undefined}
                chrome={{
                    displayName: 'أحمد',
                    profileInitial: 'أ',
                    avatarUrl: '',
                    showInitial: true,
                    isLoaded: true,
                }}
            />,
        );

        expect(screen.getByTestId('home-dock-forum-profile')).toHaveAttribute(
            'data-identity-settled',
            '1',
        );
        expect(screen.queryByTestId('home-dock-forum-profile-live')).toBeNull();

        await act(async () => {
            window.__hamiHomeMainGridPainted__ = true;
            window.dispatchEvent(new Event(HOME_MAIN_GRID_PAINTED_EVENT));
        });

        expect(await screen.findByTestId('home-dock-forum-profile-live')).toHaveTextContent('أحمد');
    });
});
