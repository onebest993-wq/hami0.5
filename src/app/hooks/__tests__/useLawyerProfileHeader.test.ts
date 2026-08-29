import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';

vi.mock('@/app/services/profile/profileCloudLoader', () => ({
    fetchLawyerProfile: vi.fn(),
}));

vi.mock('@/app/services/profile/profileWarmCacheStore', () => ({
    getProfileWarmCacheRaw: vi.fn(() => null),
    setProfileWarmCacheRaw: vi.fn(),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: vi.fn(() => null),
}));

import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { getProfileWarmCacheRaw } from '@/app/services/profile/profileWarmCacheStore';

const stableMeta = { name: 'أحمد' };

describe('useLawyerProfileHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getProfileWarmCacheRaw).mockReturnValue(null);
        vi.mocked(fetchLawyerProfile).mockReset();
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: '', title: '', profileImage: '' },
            sections: [],
        } as never);
    });

    it('يستخدم الاسم الافتراضي بدون userId', () => {
        const { result } = renderHook(() => useLawyerProfileHeader(undefined, undefined));
        expect(result.current.displayName).toBe('المحامي');
    });

    it('يحمّل الاسم والصورة من ProfileDB', async () => {
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'أحمد علي', title: 'محامٍ', profileImage: 'https://cdn/a.jpg' },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', stableMeta));

        await waitFor(() => expect(result.current.displayName).toBe('أحمد علي'));
        expect(result.current.avatarUrl).toBe('https://cdn/a.jpg');
        expect(result.current.title).toBe('محامٍ');
        expect(fetchLawyerProfile).toHaveBeenCalledWith('u1', 'u1');
    });

    it('يطبّق الكاش الدافئ فوراً ثم يجلب التحديث في الخلفية', async () => {
        vi.mocked(getProfileWarmCacheRaw).mockReturnValue({
            header: { name: 'من الكاش', title: 'مستشار', profileImage: '' },
            sections: [],
        } as never);
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'من الكاش', title: 'مستشار', profileImage: '' },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', stableMeta));

        expect(result.current.displayName).toBe('من الكاش');
        expect(result.current.title).toBe('مستشار');
        await waitFor(() => expect(fetchLawyerProfile).toHaveBeenCalledWith('u1', 'u1'));
    });

    it('يرفض صورة غير آمنة من السحابة ويبقي الحقل فارغاً', async () => {
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: {
                name: 'أحمد',
                title: 'محامٍ',
                profileImage: 'javascript:alert(1)',
            },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', stableMeta));

        await waitFor(() => expect(result.current.title).toBe('محامٍ'));
        expect(result.current.displayName).toBe('');
        expect(result.current.avatarUrl).toBe('');
    });

    it('يحدّث الهيدر عند LAWYER_PROFILE_UPDATED لنفس المستخدم', async () => {
        vi.mocked(fetchLawyerProfile)
            .mockResolvedValueOnce({
                header: { name: 'قديم', title: '', profileImage: '' },
                sections: [],
            } as never)
            .mockResolvedValueOnce({
                header: { name: 'جديد', title: '', profileImage: '' },
                sections: [],
            } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', stableMeta));
        await waitFor(() => expect(result.current.displayName).toBe('قديم'));

        window.dispatchEvent(
            new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId: 'u1' } }),
        );

        await waitFor(() => expect(result.current.displayName).toBe('جديد'));
        expect(fetchLawyerProfile).toHaveBeenCalledTimes(2);
        expect(fetchLawyerProfile).toHaveBeenNthCalledWith(1, 'u1', 'u1');
        expect(fetchLawyerProfile).toHaveBeenNthCalledWith(2, 'u1', 'u1');
    });

    it('لا يعيد الجلب عند metadata جديدة بنفس المحتوى', async () => {
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'ثابت', title: '', profileImage: '' },
            sections: [],
        } as never);

        const { rerender } = renderHook(
            ({ meta }: { meta: Record<string, unknown> }) => useLawyerProfileHeader('u1', meta),
            { initialProps: { meta: { fullName: 'E2E Dev' } } },
        );

        await waitFor(() => expect(fetchLawyerProfile).toHaveBeenCalledTimes(1));

        rerender({ meta: { fullName: 'E2E Dev' } });
        await waitFor(() => expect(fetchLawyerProfile).toHaveBeenCalledTimes(1));
    });

    it('لا يختصر الاسم الكامل إلى بادئة بعد جلب الملف', async () => {
        vi.mocked(getProfileWarmCacheRaw).mockReturnValue({
            header: { name: 'أحمد مهدي', title: '', profileImage: '' },
            sections: [],
        } as never);
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'أحمد', title: '', profileImage: '' },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', { name: 'أحمد' }));

        expect(result.current.displayName).toBe('أحمد مهدي');
        await waitFor(() => expect(fetchLawyerProfile).toHaveBeenCalledWith('u1', 'u1'));
        expect(result.current.displayName).toBe('أحمد مهدي');
    });

    it('لا يثبّت اسم JWT القصير قبل الاسم الكامل من الملف', async () => {
        vi.mocked(fetchLawyerProfile).mockResolvedValue({
            header: { name: 'أحمد مهدي', title: '', profileImage: '' },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', { name: 'أحمد' }));

        expect(result.current.displayName).toBe('');
        await waitFor(() => expect(result.current.displayName).toBe('أحمد مهدي'));
    });
});
