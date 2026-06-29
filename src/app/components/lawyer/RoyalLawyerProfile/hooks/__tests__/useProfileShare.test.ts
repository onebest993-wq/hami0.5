import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileShare } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileShare';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/services/platform/nativeShare', () => ({
    shareNative: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
    },
}));

import { shareNative } from '@/app/services/platform/nativeShare';
import { SmartToast } from '@/app/components/ui/SmartToast';

const privacy = defaultProfilePageCustomization().privacy;

describe('useProfileShare', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض toast عند غياب بيانات عامة', async () => {
        const { result } = renderHook(() =>
            useProfileShare({
                displayName: '   ',
                isOwner: false,
                privacy,
                visibleActions: [],
            }),
        );

        await act(async () => {
            await result.current.shareProfile();
        });

        expect(shareNative).not.toHaveBeenCalled();
        expect(SmartToast.info).toHaveBeenCalledWith('لا بيانات عامة للمشاركة');
    });

    it('ينسخ بنجاح ويعرض toast', async () => {
        vi.mocked(shareNative).mockResolvedValue('copied');

        const { result } = renderHook(() =>
            useProfileShare({
                displayName: 'أحمد',
                isOwner: true,
                ownerAuthEmail: 'a@test.com',
                privacy,
                visibleActions: [],
            }),
        );

        await act(async () => {
            await result.current.shareProfile();
        });

        expect(shareNative).toHaveBeenCalled();
        expect(SmartToast.success).toHaveBeenCalledWith('تم نسخ بطاقة التعريف');
    });

    it('يعرض toast عند إلغاء المشاركة', async () => {
        vi.mocked(shareNative).mockResolvedValue('cancelled');

        const { result } = renderHook(() =>
            useProfileShare({
                displayName: 'سارة',
                isOwner: true,
                privacy,
                visibleActions: [],
            }),
        );

        await act(async () => {
            await result.current.shareProfile();
        });

        expect(SmartToast.info).toHaveBeenCalledWith('لم يتم المشاركة');
    });
});
