import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProfilePageAccess } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageAccess';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

function flushAccessBusyFrames(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

describe('useProfilePageAccess', () => {
    it('يطلق الحفظ دون إبقاء الزر مشغولاً حتى انتهاء الشبكة', async () => {
        let resolveSave!: (ok: boolean) => void;
        const saveCustomization = vi.fn(
            () =>
                new Promise<boolean>((resolve) => {
                    resolveSave = resolve;
                }),
        );
        const { result } = renderHook(() =>
            useProfilePageAccess({
                isOwnProfile: true,
                profileUserId: 'u1',
                viewerId: 'u1',
                customization: defaultProfilePageCustomization(),
                saveCustomization,
            }),
        );

        await act(async () => {
            result.current.cyclePageAccess();
        });
        expect(saveCustomization).toHaveBeenCalledTimes(1);

        await act(async () => {
            await flushAccessBusyFrames();
        });
        expect(result.current.accessBusy).toBe(false);

        resolveSave(true);
    });
});
