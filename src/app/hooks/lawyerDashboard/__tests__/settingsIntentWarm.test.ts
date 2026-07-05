import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

const prefetchHamiSettingsModule = vi.fn();
const loadSettingsSection = vi.fn(() => Promise.resolve({}));
const prefetchAllSettingsSections = vi.fn();
const preloadAllSettingsSectionComponents = vi.fn(() => Promise.resolve());

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    prefetchHamiSettingsModule: (...args: unknown[]) => prefetchHamiSettingsModule(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoader', () => ({
    loadSettingsSection: (...args: unknown[]) => loadSettingsSection(...args),
    prefetchPersistedSettingsSection: vi.fn(),
    prefetchAllSettingsSections: (...args: unknown[]) => prefetchAllSettingsSections(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionRegistry', () => ({
    preloadAllSettingsSectionComponents: (...args: unknown[]) =>
        preloadAllSettingsSectionComponents(...args),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
}));

describe('settingsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmSettingsOnHover ي prefetch shell وجميع الأقسام', () => {
        warmSettingsOnHover();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchAllSettingsSections).toHaveBeenCalledTimes(1);
        expect(preloadAllSettingsSectionComponents).toHaveBeenCalledTimes(1);
    });

    it('warmSettingsOnOpen يحمّل shell والتبويبات فوراً', () => {
        warmSettingsOnOpen();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(loadSettingsSection).toHaveBeenCalled();
        expect(preloadAllSettingsSectionComponents).toHaveBeenCalledTimes(2);
    });
});
