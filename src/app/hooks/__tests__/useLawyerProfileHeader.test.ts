import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';

vi.mock('@/app/services/profile/profileCloudLoader', () => ({
    fetchLawyerProfile: vi.fn(),
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    peekProfileWarmCache: vi.fn(() => null),
}));

import { fetchLawyerProfile } from '@/app/services/profile/profileCloudLoader';
import { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCache';

const stableMeta = { fullName: 'E2E Dev' };

describe('useLawyerProfileHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(peekProfileWarmCache).mockReturnValue(null);
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

    it('يطبّق الكاش الدافئ فوراً دون fetch أولي', () => {
        vi.mocked(peekProfileWarmCache).mockReturnValue({
            header: { name: 'من الكاش', title: 'مستشار', profileImage: '' },
            sections: [],
        } as never);

        const { result } = renderHook(() => useLawyerProfileHeader('u1', stableMeta));

        expect(result.current.displayName).toBe('من الكاش');
        expect(fetchLawyerProfile).not.toHaveBeenCalled();
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
});
