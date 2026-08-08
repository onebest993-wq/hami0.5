import { describe, expect, it, beforeEach } from 'vitest';
import {
    applyAppearanceThemeToDom,
    consumeSettingsDomFastPath,
    markSettingsDomFastPath,
    resetSettingsDomFastPathForTests,
} from '../apply';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import type { AppSettingsState } from '../types';

describe('appearance DOM fast path', () => {
    beforeEach(() => {
        resetSettingsDomFastPathForTests();
        document.documentElement.dataset.hamiTheme = 'gold';
    });

    it('applyAppearanceThemeToDom يحدّث الثيم فوراً', () => {
        const settings: AppSettingsState = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                theme: 'navy',
                cardTheme: 'navy',
                patternTheme: 'navy',
                brandColor: '#6B9FD4',
            },
        };

        applyAppearanceThemeToDom(settings);

        expect(document.documentElement.dataset.hamiTheme).toBe('navy');
        expect(document.documentElement.style.getPropertyValue('--hami-brand')).toBe('#6B9FD4');
    });

    it('consumeSettingsDomFastPath يبتلع إعادة التطبيق الكاملة التالية', () => {
        markSettingsDomFastPath();
        expect(consumeSettingsDomFastPath()).toBe(true);
        expect(consumeSettingsDomFastPath()).toBe(false);
    });
});
