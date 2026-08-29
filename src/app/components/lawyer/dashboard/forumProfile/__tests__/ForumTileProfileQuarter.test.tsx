import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ForumTileProfileQuarter } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter';
import { ForumTileProfileQuarterFallback } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback';
import { ForumTileProfileName } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileName';
import { resetUserIdentityUiStateForTests } from '@/app/services/profile/userIdentityUiState';
import {
    resetPublicVerifiedBadgeStoreForTests,
    writePublicVerifiedBadge,
} from '@/app/services/auth/publicVerifiedBadgeStore';

const headerState = vi.hoisted(() => ({
    displayName: 'مطور حامي',
    title: 'المحامي والمستشار القانوني',
    avatarUrl: '',
}));

vi.mock('@/app/hooks/useLawyerProfileHeader', () => ({
    useLawyerProfileHeader: () => headerState,
}));

vi.mock('@/app/runtime/profileInstantPaint', () => ({
    beginProfileBackLock: vi.fn(),
    revealProfileWarmShell: vi.fn(),
}));

vi.mock('@/app/services/profile/profilePerfMetrics', () => ({
    markProfilePerfPhase: vi.fn(),
}));

const NAME = 'احمد مهدي الحسناوي';

function renderQuarter(
    overrides: Partial<React.ComponentProps<typeof ForumTileProfileQuarter>> = {},
) {
    const onOpenProfile = vi.fn();
    const onPrimeProfile = vi.fn();
    const onPrimeProfilePress = vi.fn();
    const view = render(
        <ForumTileProfileQuarter
            userId="lawyer-1"
            userMetadata={{ full_name: NAME }}
            disabled={false}
            onOpenProfile={onOpenProfile}
            onPrimeProfile={onPrimeProfile}
            onPrimeProfilePress={onPrimeProfilePress}
            seedDisplayName={NAME}
            {...overrides}
        />,
    );
    return { ...view, onOpenProfile, onPrimeProfile, onPrimeProfilePress };
}

describe('ForumTileProfileQuarter — بلاطة الاسم/الصورة', () => {
    beforeEach(() => {
        resetUserIdentityUiStateForTests();
        headerState.displayName = 'مطور حامي';
        headerState.title = 'المحامي والمستشار القانوني';
        headerState.avatarUrl = '';
    });

    afterEach(() => {
        resetUserIdentityUiStateForTests();
        resetPublicVerifiedBadgeStoreForTests();
    });

    it('يعرض اسم الجلسة ولا يقفز لاسم الخطاف', () => {
        renderQuarter();
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveTextContent(NAME);
        expect(tile).not.toHaveTextContent('مطور حامي');
        expect(tile).toHaveAttribute('aria-label', `الملف المهني — ${NAME}`);
        expect(tile).toHaveAttribute('aria-controls', 'lawyer-dashboard-profile-surface');
        expect(tile.className).toMatch(/min-h-\[44px\]/);
        expect(tile.className).toMatch(/min-w-\[44px\]/);
    });

    it('يبقى اسم HTML كنص لا عقدة', () => {
        const xss = '<img src=x onerror=alert(1)>';
        render(<ForumTileProfileName displayName={xss} />);
        expect(screen.getByText(xss)).toBeTruthy();
        expect(document.querySelector('img')).toBeNull();
    });

    it('يفتح الملف من pointerup بعد pointerdown ولا يكرر عند click', () => {
        const { onOpenProfile, onPrimeProfilePress } = renderQuarter();
        const tile = screen.getByTestId('home-dock-forum-profile');
        fireEvent.pointerDown(tile, { button: 0, clientX: 8, clientY: 8, pointerId: 1 });
        fireEvent.pointerUp(tile, { button: 0, clientX: 8, clientY: 8, pointerId: 1 });
        fireEvent.click(tile, { clientX: 8, clientY: 8 });
        expect(onOpenProfile).toHaveBeenCalledTimes(1);
        expect(onPrimeProfilePress).toHaveBeenCalled();
    });

    it('تمرير الإصبع على البلاطة لا يفتح الملف', () => {
        const { onOpenProfile } = renderQuarter();
        const tile = screen.getByTestId('home-dock-forum-profile');
        const down = new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 8,
            clientY: 8,
            pointerId: 1,
        });
        const move = new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            clientX: 8,
            clientY: 40,
            pointerId: 1,
        });
        const up = new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 8,
            clientY: 40,
            pointerId: 1,
        });
        tile.dispatchEvent(down);
        tile.dispatchEvent(move);
        tile.dispatchEvent(up);
        fireEvent.click(tile, { clientX: 8, clientY: 40 });
        expect(onOpenProfile).not.toHaveBeenCalled();
    });

    it('يفتح من click لوحة المفاتيح عندما لا يسبق pointer', () => {
        const { onOpenProfile } = renderQuarter();
        fireEvent.click(screen.getByTestId('home-dock-forum-profile'));
        expect(onOpenProfile).toHaveBeenCalledTimes(1);
    });

    it('لا يفتح وهو معطّل ولا يستقبل تبويب', () => {
        const { onOpenProfile } = renderQuarter({ disabled: true });
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toBeDisabled();
        expect(tile).toHaveAttribute('tabIndex', '-1');
        fireEvent.pointerDown(tile, { button: 0 });
        fireEvent.click(tile);
        expect(onOpenProfile).not.toHaveBeenCalled();
    });

    it('بلا صورة: data-avatar-expected=0 ولا img — الكشف لا ينتظر إطاراً فارغاً', () => {
        renderQuarter();
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveAttribute('data-avatar-expected', '0');
        expect(tile).toHaveAttribute('data-identity-settled', '1');
        expect(screen.getByTestId('home-dock-forum-profile-avatar').querySelector('img')).toBeNull();
    });

    it('يرفض javascript: في الصورة ويُظهر الوجه الاحتياطي', () => {
        renderQuarter({
            userMetadata: { full_name: NAME, avatar_url: 'javascript:alert(1)' },
        });
        expect(screen.getByTestId('home-dock-forum-profile-avatar').querySelector('img')).toBeNull();
        expect(screen.getByTestId('home-dock-forum-profile')).toHaveAttribute(
            'data-avatar-expected',
            '0',
        );
    });

    it('الاسم الطويل يبقى في الشجرة (القصّ بصري عبر CSS)', () => {
        const longName = 'احمد مهدي الحسناوي بن عبد الله بن محمد بن علي الحسناوي النجفي';
        renderQuarter({
            userId: 'lawyer-long-name',
            userMetadata: { full_name: longName },
            seedDisplayName: longName,
        });
        const nameEl = screen
            .getByTestId('home-dock-forum-profile')
            .querySelector('.hami-forum-tile-name');
        expect(nameEl?.textContent).toBe(longName);
    });

    it('صورة الشبكة تظهر فوق الحرف بتلاشي بعد التحميل', () => {
        renderQuarter({
            userId: 'lawyer-net-avatar',
            userMetadata: { full_name: NAME, avatar_url: 'https://cdn.example/a.jpg' },
        });
        const frame = screen.getByTestId('home-dock-forum-profile-avatar');
        const img = frame.querySelector('img');
        expect(img).toBeTruthy();
        expect(img).toHaveAttribute('src', 'https://cdn.example/a.jpg');
        expect(img).toHaveAttribute('decoding', 'sync');
        expect(img).toHaveAttribute('fetchpriority', 'high');
        expect(frame.textContent).toContain('ا');
        fireEvent.load(img as HTMLImageElement);
        expect((img as HTMLImageElement).style.opacity).toBe('1');
        expect(screen.getByTestId('home-dock-forum-profile')).toHaveAttribute(
            'data-avatar-expected',
            '1',
        );
    });

    it('حساب جديد بلا اسم: الهوية جاهزة والحرف م وليس جاري التحميل', () => {
        headerState.displayName = '';
        renderQuarter({
            userId: 'lawyer-new-nameless',
            userMetadata: { accountType: 'lawyer', verificationStatus: 'pending' },
            seedDisplayName: '',
        });
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveAttribute('data-identity-settled', '1');
        expect(tile).not.toHaveAttribute('aria-busy');
        expect(tile).toHaveAttribute('aria-label', 'الملف المهني — المحامي');
        expect(screen.getByTestId('home-dock-forum-profile-avatar')).toHaveTextContent('م');
    });

    it('لا يظهر علامة التوثيق من اعتماد الهوية وحده', () => {
        render(
            <ForumTileProfileQuarter
                userId="lawyer-new-1"
                userMetadata={{ full_name: NAME, verificationStatus: 'active' }}
                disabled={false}
                onOpenProfile={vi.fn()}
                onPrimeProfile={vi.fn()}
                onPrimeProfilePress={vi.fn()}
                seedDisplayName={NAME}
            />,
        );
        expect(screen.queryByTestId('accredited-lawyer-mark')).toBeNull();
    });

    it('يظهر علامة التوثيق على صورة الغلاف بعد وضع المقر لها', () => {
        writePublicVerifiedBadge('lawyer-new-1', true);
        render(
            <ForumTileProfileQuarter
                userId="lawyer-new-1"
                userMetadata={{ full_name: NAME }}
                disabled={false}
                onOpenProfile={vi.fn()}
                onPrimeProfile={vi.fn()}
                onPrimeProfilePress={vi.fn()}
                seedDisplayName={NAME}
            />,
        );
        expect(screen.getByTestId('accredited-lawyer-mark')).toBeInTheDocument();
    });
});

describe('ForumTileProfileQuarterFallback', () => {
    it('بدون صورة: data-avatar-expected=0 حتى لا يعلق إعلان طلاء المنزل', () => {
        render(
            <ForumTileProfileQuarterFallback displayName={NAME} avatarUrl="" showInitial={false} />,
        );
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveAttribute('data-avatar-expected', '0');
        expect(tile).toHaveAttribute('data-identity-settled', '0');
        expect(tile).toHaveAttribute('aria-busy', 'true');
        expect(screen.getByTestId('home-dock-forum-profile-avatar').querySelector('img')).toBeNull();
    });

    it('بعد استقرار الهوية لا يبقى مشغولاً', () => {
        render(
            <ForumTileProfileQuarterFallback
                displayName={NAME}
                identitySettled
                avatarUrl=""
                showInitial={false}
            />,
        );
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveAttribute('data-identity-settled', '1');
        expect(tile).not.toHaveAttribute('aria-busy');
    });

    it('مع صورة: data-avatar-expected=1 ويفتح عند النقر', () => {
        const onOpenProfile = vi.fn();
        render(
            <ForumTileProfileQuarterFallback
                displayName={NAME}
                avatarUrl="https://cdn.example/a.jpg"
                onOpenProfile={onOpenProfile}
            />,
        );
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile).toHaveAttribute('data-avatar-expected', '1');
        expect(screen.getByTestId('home-dock-forum-profile-avatar').querySelector('img')).toBeNull();
        expect(tile.tagName).toBe('BUTTON');
        fireEvent.click(tile);
        expect(onOpenProfile).toHaveBeenCalledTimes(1);
    });

    it('لا يفك data: الثقيل في الهيكل الاحتياطي ولا يعلق الكشف', () => {
        const heavy = `data:image/jpeg;base64,${'A'.repeat(80)}`;
        render(
            <ForumTileProfileQuarterFallback
                displayName={NAME}
                avatarUrl={heavy}
                onOpenProfile={vi.fn()}
            />,
        );
        expect(screen.getByTestId('home-dock-forum-profile-avatar').querySelector('img')).toBeNull();
        expect(screen.getByTestId('home-dock-forum-profile')).toHaveAttribute(
            'data-avatar-expected',
            '0',
        );
    });
});
