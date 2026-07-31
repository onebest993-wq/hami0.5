import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileLoader } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileLoader';
import {
    invalidateProfileWarmCache,
    setProfileWarmCache,
} from '@/app/services/profile/profileWarmCache';

vi.mock('@/app/services/profile/profileCloudLoader', () => ({
    fetchLawyerProfile: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn() },
}));

import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';

const stableUserMeta = { fullName: 'اختبار' };

const baseProfile = {
    header: { name: 'أحمد', title: 'محامٍ', coverImage: '', profileImage: '' },
    sections: [],
};

describe('useProfileLoader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateProfileWarmCache();
        vi.mocked(fetchLawyerProfile).mockResolvedValue(baseProfile as never);
    });

    it('يبدأ بلا تحميل عند وجود كاش دافئ', () => {
        setProfileWarmCache('u1', baseProfile as never);
        const { result } = renderHook(() => useProfileLoader('u1', 'u1', true, stableUserMeta, undefined));
        expect(result.current.loading).toBe(false);
        expect(result.current.profile?.header.name).toBe('أحمد');
    });

    it('يطبّق displayNameHint للزائر عند غياب الاسم', async () => {
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: '', title: '', coverImage: '', profileImage: '' },
            sections: [],
        } as never);

        const { result } = renderHook(() =>
            useProfileLoader('visitor-1', 'viewer-me', false, stableUserMeta, 'اسم من المنتدى'),
        );

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile?.header.name).toBe('اسم من المنتدى');
    });

    it('لا يمسح الملف المعروض عند إعادة loadProfile لنفس المستخدم مع كاش', async () => {
        setProfileWarmCache('u1', baseProfile as never);
        const { result, rerender } = renderHook(() =>
            useProfileLoader('u1', 'u1', true, stableUserMeta, undefined),
        );

        expect(result.current.loading).toBe(false);
        expect(result.current.profile?.header.name).toBe('أحمد');

        rerender();

        expect(result.current.loading).toBe(false);
        expect(result.current.profile?.header.name).toBe('أحمد');
    });

    it('يلغي نتيجة التحميل المتأخرة عند تبديل profileUserId', async () => {
        let resolveSlow: (value: unknown) => void = () => undefined;
        const slowPromise = new Promise((resolve) => {
            resolveSlow = resolve;
        });
        vi.mocked(fetchLawyerProfile)
            .mockImplementationOnce(() => slowPromise as never)
            .mockResolvedValueOnce({
                header: { name: 'بعد التبديل', title: '', coverImage: '', profileImage: '' },
                sections: [],
            } as never);

        const { result, rerender } = renderHook(
            ({ userId }: { userId: string }) => useProfileLoader(userId, userId, true, stableUserMeta, undefined),
            { initialProps: { userId: 'u-slow' } },
        );

        rerender({ userId: 'u-fast' });
        await waitFor(() => expect(result.current.profile?.header.name).toBe('بعد التبديل'));

        resolveSlow({
            header: { name: 'قديم متأخر', title: '', coverImage: '', profileImage: '' },
            sections: [],
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(result.current.profile?.header.name).toBe('بعد التبديل');
    });

    it('يحدّث من حدث LAWYER_PROFILE_UPDATED عند تطابق userId', async () => {
        const { result } = renderHook(() => useProfileLoader('u1', 'u1', true, stableUserMeta, undefined));
        await waitFor(() => expect(result.current.loading).toBe(false));

        const updated = {
            header: { name: 'محدّث', title: '', coverImage: '', profileImage: '' },
            sections: [],
        };
        setProfileWarmCache('u1', updated as never);
        vi.mocked(fetchLawyerProfile).mockResolvedValue(updated as never);

        window.dispatchEvent(new CustomEvent('hami:lawyer-profile-updated', { detail: { userId: 'u1' } }));

        await waitFor(() => expect(result.current.profile?.header.name).toBe('محدّث'));
    });

    it('يعيد التحميل من السحابة عند LAWYER_PROFILE_UPDATED بلا كاش دافئ جديد', async () => {
        const { result } = renderHook(() => useProfileLoader('u1', 'u1', true, stableUserMeta, undefined));
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.profile?.header.name).toBe('أحمد');

        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'من السحابة', title: '', coverImage: '', profileImage: '' },
            sections: [],
        } as never);

        const callsBefore = vi.mocked(fetchLawyerProfile).mock.calls.length;
        window.dispatchEvent(new CustomEvent('hami:lawyer-profile-updated', { detail: { userId: 'u1' } }));

        await waitFor(() => expect(result.current.profile?.header.name).toBe('من السحابة'));
        expect(vi.mocked(fetchLawyerProfile).mock.calls.length).toBeGreaterThan(callsBefore);
    });

    it('يُخفّي الهاتف للزائر وفق privacy حتى من warm cache', () => {
        setProfileWarmCache('other-lawyer', {
            header: {
                name: 'زائر',
                title: 'محامٍ',
                coverImage: '',
                profileImage: '',
                phone: '07501234567',
            },
            sections: [],
            customization: {
                privacy: {
                    showPhoneMeta: false,
                    showCityMeta: true,
                    showSyndicate: true,
                    showContactChannels: true,
                    showGallery: true,
                    showCustomBlocks: true,
                    hiddenContactIds: [],
                },
                appearance: { accentColor: 'gold', material: 'glass' },
                customBlocks: [],
            },
        } as never);

        const { result } = renderHook(() =>
            useProfileLoader('other-lawyer', 'viewer-me', false, stableUserMeta, undefined),
        );

        expect(result.current.loading).toBe(false);
        expect(result.current.profile?.header.phone).toBe('');
    });
});
