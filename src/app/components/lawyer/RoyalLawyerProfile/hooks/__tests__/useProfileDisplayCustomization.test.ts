import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileDisplayCustomization } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileDisplayCustomization';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

vi.mock('@/app/services/profile/profileThemeRuntime', () => ({
    applyProfileRootTheme: vi.fn(),
}));

import { applyProfileRootTheme } from '@/app/services/profile/profileThemeRuntime';

describe('useProfileDisplayCustomization', () => {
    const saveCustomization = vi.fn(async () => true);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يعرض التخصيص المحفوظ خارج الاستوديو', () => {
        const base = defaultProfilePageCustomization();
        const customization = {
            ...base,
            appearance: { ...base.appearance, material: 'glass' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: false,
                saveCustomization,
            }),
        );

        expect(result.current.displayCustomization.appearance.material).toBe('glass');
    });

    it('يطبّق معاينة المسودة بعد debounce في الاستوديو', () => {
        const customization = defaultProfilePageCustomization();
        const nextDraft = {
            ...customization,
            appearance: { ...customization.appearance, material: 'metallic' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        act(() => {
            result.current.handleSettingsDraftChange(nextDraft);
        });

        expect(applyProfileRootTheme).toHaveBeenCalledWith(nextDraft.appearance);

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(result.current.displayCustomization.appearance.material).toBe('metallic');
    });

    it('يحفظ عبر handleSettingsSave', async () => {
        const customization = defaultProfilePageCustomization();
        const next = {
            ...customization,
            appearance: { ...customization.appearance, accentColor: 'emerald' as const },
        };

        const { result } = renderHook(() =>
            useProfileDisplayCustomization({
                customization,
                isEditing: false,
                settingsOpen: true,
                saveCustomization,
            }),
        );

        await act(async () => {
            await result.current.handleSettingsSave(next);
        });

        expect(saveCustomization).toHaveBeenCalledWith(next);
        expect(result.current.displayCustomization.appearance.accentColor).toBe('emerald');
    });
});
