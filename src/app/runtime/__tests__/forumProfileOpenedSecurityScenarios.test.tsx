import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ForumTileProfileName } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileName';
import { ForumTileProfileQuarterFallback } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback';
import { ProfileContactChannel } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactChannel';
import { ProfileHeroIdentityZone } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroIdentityZone';
import { sanitizeProfileMediaUrl, sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import { buildProfileContactTarget } from '@/app/services/profile/profileContactNavigation';
import { clampProfileDisplayName, safeProfileContactClipboardText, sanitizeProfileActionsForPersist } from '@/app/services/profile/profileContactInputSecurity';
import { redactProfileKvValueForViewer } from '@/app/services/profile/profileKvReadRedact';
import { canViewProfilePage } from '@/app/services/profile/profilePageAccess';
import { resolveLawyerDisplayName } from '@/app/services/profile/resolveLawyerDisplayName';
import { PROFILE_SAFE_IMAGE_ACCEPT, uploadProfileMedia } from '@/app/services/profileMediaService';
import { mergeUserIdentityUiState, resetUserIdentityUiStateForTests, getUserIdentityUiState } from '@/app/services/profile/userIdentityUiState';
import { messageForGeolocationFailure } from '@/app/services/profile/profileGeolocation';
import type { ProfileAction } from '@/app/services/lawyer-cloud';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/app/runtime/screenshotDeterrentRuntime', () => ({
    withAllowedClipboardAction: async (fn: () => unknown) => await fn(),
}));
vi.mock('@/app/services/storage/lawyerStorageRuntime', () => ({
    LawyerStorage: { uploadSmartFile: vi.fn(), getSignedUrl: vi.fn() },
}));
vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: vi.fn() },
}));
vi.mock('@/app/services/forum/forumFollowRepository', () => ({
    ForumFollowRepository: { isFollowing: vi.fn().mockResolvedValue(false) },
}));

function contact(type: ProfileAction['type'], value: string): ProfileAction {
    return { id: 'c1', type, label: type, value };
}

function sampleVisitorProfile(): LawyerProfileData {
    return {
        header: {
            name: 'أحمد',
            title: 'محامٍ',
            coverImage: '',
            profileImage: 'https://cdn.example/a.jpg',
            profileImagePath: 'secret/path',
            phone: '07501234567',
            city: 'بغداد',
            syndicateId: 'SY-1',
        },
        sections: [
            {
                id: 'actions-1',
                type: 'actions',
                data: [{ id: 'a1', type: 'call', label: 'هاتف', value: '07501234567' }],
            },
        ],
        customization: {
            privacy: {
                pageAccess: 'private',
                showPhoneMeta: false,
                showCityMeta: true,
                showSyndicate: true,
                showContactChannels: true,
                showGallery: true,
                showCustomBlocks: true,
                hiddenContactIds: ['a1'],
            },
            appearance: { accentColor: 'gold', material: 'glass' },
            customBlocks: [],
        },
    } as LawyerProfileData;
}

describe('مسار بلاطة المنتدى إلى الملف المفتوح — سيناريوهات أمان وسلوك', () => {
    beforeEach(() => {
        resetUserIdentityUiStateForTests();
        vi.stubGlobal('navigator', {
            clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
        });
    });

    it('1) البلاطة: XSS يبقى نصاً، javascript/SVG بلا صورة، السحب لا يفتح', () => {
        const xss = '<img src=x onerror=alert(1)>';
        render(<ForumTileProfileName displayName={xss} />);
        expect(screen.getByText(xss)).toBeTruthy();
        expect(document.querySelector('img')).toBeNull();

        expect(sanitizeProfileMediaUrl('javascript:alert(1)')).toBeUndefined();
        expect(sanitizeProfileMediaUrl('https://cdn.example.com/avatar.svg')).toBeUndefined();
        expect(sanitizeProfilePlainText('<script>alert(1)</script>سارة', 80)).toBe('سارة');

        const onOpenProfile = vi.fn();
        render(
            <ForumTileProfileQuarterFallback
                displayName={xss}
                avatarUrl="javascript:alert(1)"
                showInitial={false}
                onOpenProfile={onOpenProfile}
            />,
        );
        const tile = screen.getByTestId('home-dock-forum-profile');
        expect(tile.querySelector('img')).toBeNull();
        fireEvent.pointerDown(tile, { button: 0, clientX: 8, clientY: 8 });
        fireEvent.pointerMove(tile, { clientX: 8, clientY: 40 });
        fireEvent.click(tile, { clientX: 8, clientY: 40 });
        expect(onOpenProfile).not.toHaveBeenCalled();
    });

    it('2) الهوية: الاسم يُنقّى والصورة الخطرة تُرفض', () => {
        mergeUserIdentityUiState({
            userId: 'u1',
            displayName: '<b>أحمد مهدي</b>',
            avatarUrl: 'javascript:alert(1)',
            profileInitial: '<i>أ</i>',
            isLoaded: true,
        });
        const state = getUserIdentityUiState('u1');
        expect(state?.displayName).toBe('أحمد مهدي');
        expect(state?.avatarUrl).toBe('');
        expect(state?.profileInitial).toBe('أ');
        expect(resolveLawyerDisplayName('<img src=x onerror=alert(1)>ليث', 'lawyer-1')).toBe('ليث');
        expect(clampProfileDisplayName('<script>z</script>نور')).toBe('نور');
    });

    it('3) الملف المفتوح: الاسم العام لا يُفسَّر HTML', () => {
        render(
            <ProfileHeroIdentityZone
                isEditing={false}
                readOnly
                draft={null}
                setDraft={() => undefined}
                displayNamePublic={'<img src=x onerror=alert(1)>سارة العلوي'}
                syndicateIdPublic="123"
                showSyndicate={false}
            />,
        );
        expect(document.querySelector('img')).toBeNull();
        expect(screen.getByText('<img src=x onerror=alert(1)>سارة العلوي')).toBeTruthy();
    });

    it('4) التواصل: http/javascript/حقن البريد مرفوضة والنسخ لا يسرّب مخططاً خطراً', () => {
        expect(buildProfileContactTarget(contact('website', 'http://evil.test'))).toBeNull();
        expect(buildProfileContactTarget(contact('website', 'javascript:alert(1)'))).toBeNull();
        expect(buildProfileContactTarget(contact('email', 'a@b.com?bcc=evil'))).toBeNull();
        expect(buildProfileContactTarget(contact('website', 'hami.iq'))?.startsWith('https://')).toBe(true);
        expect(safeProfileContactClipboardText('javascript:alert(1)')).toBe('');
        expect(safeProfileContactClipboardText('data:text/html,hi')).toBe('');
        expect(() => sanitizeProfileActionsForPersist([contact('website', 'javascript:alert(1)')])).toThrow();

        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal('navigator', { clipboard: { writeText } });
        render(<ProfileContactChannel action={contact('website', 'javascript:alert(1)')} />);
        fireEvent.click(screen.getByRole('button', { name: 'نسخ' }));
        expect(writeText).not.toHaveBeenCalled();
    });

    it('5) الرفع: SVG وimage/* خارج قائمة القبول والخدمة', async () => {
        expect(PROFILE_SAFE_IMAGE_ACCEPT).not.toContain('image/*');
        expect(PROFILE_SAFE_IMAGE_ACCEPT.toLowerCase()).not.toContain('svg');
        await expect(
            uploadProfileMedia('u1', new File(['x'], 'x.svg', { type: 'image/svg+xml' })),
        ).rejects.toThrow();
    });

    it('6) الزائر: صفحة خاصة مغلقة، KV بلا هاتف ولا مسار تخزين', async () => {
        expect(canViewProfilePage({ pageAccess: 'private', isOwner: false, isFollowing: true })).toBe(false);
        expect(canViewProfilePage({ pageAccess: 'followers', isOwner: false, isFollowing: false })).toBe(false);
        const out = (await redactProfileKvValueForViewer(
            'profile:owner-1',
            'visitor-9',
            sampleVisitorProfile(),
        )) as LawyerProfileData;
        expect(out.header.phone).toBe('');
        expect(out.header.profileImagePath).toBeUndefined();
    });

    it('7) سياق غير آمن: رسالة تحديد الموقع تصرّح بالحاجة إلى HTTPS', () => {
        expect(messageForGeolocationFailure(new Error('insecure'))).toMatch(/HTTPS/);
    });
});
