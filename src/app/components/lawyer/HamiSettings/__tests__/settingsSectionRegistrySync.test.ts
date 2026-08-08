import { describe, expect, it } from 'vitest';
import {
    getResolvedSettingsSection,
    resetSettingsSectionRegistryForTests,
} from '../settingsSectionRegistry';

const ALL_SECTIONS = ['appearance', 'security', 'data', 'account'] as const;

describe('settingsSectionRegistry sync', () => {
    it('كل التبويبات متاحة فوراً بلا lazy chunk', () => {
        resetSettingsSectionRegistryForTests();
        for (const id of ALL_SECTIONS) {
            const section = getResolvedSettingsSection(id);
            expect(section, id).toBeTruthy();
            expect(typeof section === 'function' || typeof section === 'object').toBe(true);
        }
    });
});
