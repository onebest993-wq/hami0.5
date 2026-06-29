import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';

const prefetchHamiSettingsModule = vi.fn();
const loadSettingsSection = vi.fn(() => Promise.resolve({}));

vi.mock('@/app/runtime/hamiSettingsLoader', () => ({
    prefetchHamiSettingsModule: (...args: unknown[]) => prefetchHamiSettingsModule(...args),
}));

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoader', () => ({
    loadSettingsSection: (...args: unknown[]) => loadSettingsSection(...args),
    prefetchPersistedSettingsSection: vi.fn(),
    prefetchAllSettingsSections: vi.fn(),
}));

describe('settingsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmSettingsOnHover يحمّل chunk الإعدادات', () => {
        warmSettingsOnHover();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
    });

    it('warmSettingsOnOpen يحمّل shell والتبويب المحفوظ فوراً', () => {
        warmSettingsOnOpen();
        expect(prefetchHamiSettingsModule).toHaveBeenCalledTimes(1);
        expect(loadSettingsSection).toHaveBeenCalledTimes(1);
    });
});
