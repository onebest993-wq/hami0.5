import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmSettingsOnHover, warmSettingsOnOpen, primeSettingsShellForOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

const prefetchHamiSettingsModule = vi.fn();
const prefetchSettingsOverlayEntry = vi.fn();
const prefetchSettingsDialogs = vi.fn();
const prefetchSecondarySettingsSections = vi.fn();

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    prefetchHamiSettingsModule: (...args: unknown[]) => prefetchHamiSettingsModule(...args),
}));

vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: (...args: unknown[]) => prefetchSettingsOverlayEntry(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsDialogPrefetch', () => ({
    prefetchSettingsDialogs: (...args: unknown[]) => prefetchSettingsDialogs(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoad', () => ({
    prefetchSecondarySettingsSections: (...args: unknown[]) =>
        prefetchSecondarySettingsSections(...args),
}));

vi.mock('@/app/services/settings/intentWarmGate', () => ({
    shouldAllowIntentWarmFromDom: () => true,
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: () => false,
}));

describe('settingsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmSettingsOnHover يسخّن الشِل والبوابة وكل التبويبات بلا حوارات منفصلة', () => {
        warmSettingsOnHover();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(1);
        expect(prefetchSecondarySettingsSections).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsDialogs).not.toHaveBeenCalled();
    });

    it('warmSettingsOnOpen و prime يحمّلان الشِل وكل التبويبات فوراً', () => {
        warmSettingsOnOpen();
        primeSettingsShellForOpen();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(2);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(2);
        expect(prefetchSecondarySettingsSections).toHaveBeenCalledTimes(2);
        expect(prefetchSettingsDialogs).not.toHaveBeenCalled();
    });
});
