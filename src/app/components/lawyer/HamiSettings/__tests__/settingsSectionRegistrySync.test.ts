import { describe, expect, it } from 'vitest';
import { getResolvedSettingsSection, resetSettingsSectionRegistryForTests } from '../settingsSectionRegistry';

describe('settingsSectionRegistry appearance sync', () => {
    it('AppearanceSection متاح فوراً بلا انتظار lazy chunk', () => {
        resetSettingsSectionRegistryForTests();
        const appearance = getResolvedSettingsSection('appearance');
        expect(appearance).toBeTruthy();
        expect(typeof appearance).toBe('function');
    });
});
