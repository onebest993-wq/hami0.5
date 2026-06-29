import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { SETTINGS_NAV } from '@/app/services/settings';
import {
    SETTINGS_SECTION_STORAGE_KEY,
    persistSettingsSection,
    readPersistedSettingsSection,
} from '@/app/components/lawyer/HamiSettings/settingsSectionPersistence';

describe('settingsSectionPersistence', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('يُعيد المنظر افتراضياً', () => {
        expect(readPersistedSettingsSection()).toBe('appearance');
    });

    it('يحفظ ويستعيد تبويباً صالحاً', () => {
        persistSettingsSection('data');
        expect(sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY)).toBe('data');
        expect(readPersistedSettingsSection()).toBe('data');
    });

    it('يتجاهل قيماً غير مسجّلة في SETTINGS_NAV', () => {
        sessionStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, 'evil-tab');
        expect(readPersistedSettingsSection()).toBe('appearance');
    });

    it('SETTINGS_NAV يطابق أقسام الراوتر الأربعة', () => {
        expect(SETTINGS_NAV.map((item) => item.id)).toEqual([
            'appearance',
            'security',
            'data',
            'account',
        ]);
    });
});
