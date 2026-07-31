import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsLifecycle } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsLifecycle';

const markSettingsPerfPhase = vi.fn();
const reportSettingsPerf = vi.fn();
const observeSettingsSectionInteractive = vi.fn();

vi.mock('@/app/services/settings/settingsPerfMetrics', () => ({
    markSettingsPerfPhase: (...args: unknown[]) => markSettingsPerfPhase(...args),
    reportSettingsPerf: (...args: unknown[]) => reportSettingsPerf(...args),
}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    isHamiSettingsModuleResolved: () => true,
}));

vi.mock('@/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive', () => ({
    observeSettingsSectionInteractive: (...args: unknown[]) => observeSettingsSectionInteractive(...args),
}));

describe('useSettingsLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        observeSettingsSectionInteractive.mockReturnValue(() => undefined);
        vi.useFakeTimers();
    });

    it('يسجّل first-paint عند الفتح', () => {
        renderHook(() => useSettingsLifecycle(true, 'appearance', 'user-1'));
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('first-paint');
    });

    it('لا يسجّل first-paint عند الإغلاق', () => {
        renderHook(() => useSettingsLifecycle(false, 'appearance', 'user-1'));
        expect(markSettingsPerfPhase).not.toHaveBeenCalled();
    });

    it('يراقب تفاعل القسم النشط ويبلّغ interactive', () => {
        const onHydrated = vi.fn();
        renderHook(() => useSettingsLifecycle(true, 'security', 'user-1', onHydrated));

        expect(observeSettingsSectionInteractive).toHaveBeenCalledWith(
            expect.objectContaining({ activeSection: 'security' }),
        );

        const call = observeSettingsSectionInteractive.mock.calls[0]?.[0] as {
            onInteractive: () => void;
        };
        call.onInteractive();
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('interactive');
        expect(reportSettingsPerf).toHaveBeenCalled();
        expect(onHydrated).toHaveBeenCalled();
    });

    it('fallback يبلّغ interactive بعد 1200ms', () => {
        renderHook(() => useSettingsLifecycle(true, 'data', 'user-1'));
        vi.advanceTimersByTime(1_200);
        expect(markSettingsPerfPhase).toHaveBeenCalledWith('interactive');
    });
});
