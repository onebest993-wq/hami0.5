import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

const prefetchHamiSettingsModule = vi.fn();
const loadSettingsSection = vi.fn(() => Promise.resolve({}));
const prefetchAllSettingsSections = vi.fn();
const prefetchPersistedSettingsSection = vi.fn();
const preloadAllSettingsSectionComponents = vi.fn(() => Promise.resolve());
const readPersistedSettingsSection = vi.fn(() => 'appearance');

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    prefetchHamiSettingsModule: (...args: unknown[]) => prefetchHamiSettingsModule(...args),
}));

const prefetchSettingsOverlayEntry = vi.fn();
vi.mock('@/app/runtime/settingsOverlayEntryLoader', () => ({
    prefetchSettingsOverlayEntry: (...args: unknown[]) => prefetchSettingsOverlayEntry(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoader', () => ({
    loadSettingsSection: (...args: unknown[]) => loadSettingsSection(...args),
    prefetchPersistedSettingsSection: (...args: unknown[]) => prefetchPersistedSettingsSection(...args),
    prefetchAllSettingsSections: (...args: unknown[]) => prefetchAllSettingsSections(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionRegistry', () => ({
    preloadAllSettingsSectionComponents: (...args: unknown[]) =>
        preloadAllSettingsSectionComponents(...args),
    resolveSettingsSectionComponent: (section: string) => loadSettingsSection(section),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionPersistence', () => ({
    readPersistedSettingsSection: (...args: unknown[]) => readPersistedSettingsSection(...args),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => {
        fn();
        return () => undefined;
    },
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
        readPersistedSettingsSection.mockReturnValue('appearance');
    });

    it('warmSettingsOnHover ي prefetch shell والبوابة والقسم المحفوظ', async () => {
        warmSettingsOnHover();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(prefetchPersistedSettingsSection).toHaveBeenCalled();
        });
    });

    it('warmSettingsOnOpen يحمّل shell والتبويبات فوراً', async () => {
        warmSettingsOnOpen();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOverlayEntry).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(loadSettingsSection).toHaveBeenCalled();
            expect(preloadAllSettingsSectionComponents).toHaveBeenCalled();
        });
    });
});
