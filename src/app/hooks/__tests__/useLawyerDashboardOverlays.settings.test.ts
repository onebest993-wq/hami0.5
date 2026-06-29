import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    loadHamiSettingsModule: vi.fn(() => Promise.resolve({})),
    prefetchHamiSettingsModule: vi.fn(),
}));

/** @deprecated — استخدم useLawyerDashboardSettings.test.ts */
describe('useLawyerDashboardOverlays — الإعدادات (legacy)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('يُعاد توجيه الاختبار إلى useLawyerDashboardSettings', async () => {
        const { result } = renderHook(() => useLawyerDashboardSettings('lawyer-1'));
        await act(async () => {
            result.current.openSettings();
            await Promise.resolve();
        });
        expect(result.current.showSettings).toBe(true);
    });
});
