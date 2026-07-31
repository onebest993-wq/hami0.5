import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { applySettingsToDom } from '../apply';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import { shouldAllowIntentWarm } from '../settingsRuntime';
import type { AppSettingsState } from '../types';

function baseSettings(partial?: Partial<AppSettingsState>): AppSettingsState {
    return {
        ...LAWYER_SETTINGS_V2_DEFAULTS,
        ...partial,
        appearance: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
            ...(partial?.appearance ?? {}),
        },
        performance: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
            ...(partial?.performance ?? {}),
        },
        security: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.security,
            ...(partial?.security ?? {}),
        },
        data: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.data,
            ...(partial?.data ?? {}),
        },
        homeLayout: {
            ...LAWYER_SETTINGS_V2_DEFAULTS.homeLayout,
            ...(partial?.homeLayout ?? {}),
        },
    };
}

describe('performance settings → DOM + intent warm', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-lite');
        document.documentElement.removeAttribute('data-hami-reduce-motion');
        document.documentElement.removeAttribute('data-hami-animations');
        document.documentElement.removeAttribute('data-hami-prefetch');
        document.documentElement.classList.remove('reduce-motion');
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-lite');
        document.documentElement.removeAttribute('data-hami-reduce-motion');
        document.documentElement.removeAttribute('data-hami-animations');
        document.documentElement.removeAttribute('data-hami-prefetch');
        document.documentElement.classList.remove('reduce-motion');
    });

    it('applySettingsToDom يضبط lite / animations / prefetch / reduceMotion', () => {
        applySettingsToDom(
            baseSettings({
                appearance: { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance, reduceMotion: true },
                performance: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                    litePerformance: 'on',
                    enableAnimations: true,
                    prefetchScreens: false,
                },
            }),
        );
        expect(document.documentElement.dataset.hamiLite).toBe('1');
        expect(document.documentElement.dataset.hamiReduceMotion).toBe('1');
        expect(document.documentElement.dataset.hamiAnimations).toBe('0');
        expect(document.documentElement.dataset.hamiPrefetch).toBe('0');
        expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
    });

    it('إيقاف الحركات يطفئ animations مع الإبقاء على reduceMotion من المفتاح', () => {
        applySettingsToDom(
            baseSettings({
                appearance: { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance, reduceMotion: false },
                performance: {
                    ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                    litePerformance: 'off',
                    enableAnimations: false,
                    prefetchScreens: true,
                },
            }),
        );
        expect(document.documentElement.dataset.hamiLite).toBe('0');
        expect(document.documentElement.dataset.hamiReduceMotion).toBe('1');
        expect(document.documentElement.dataset.hamiAnimations).toBe('0');
        expect(document.documentElement.dataset.hamiPrefetch).toBe('1');
    });

    it('shouldAllowIntentWarm يحترم prefetch و lite', () => {
        document.documentElement.dataset.hamiLite = '0';
        expect(
            shouldAllowIntentWarm(
                baseSettings({
                    performance: {
                        ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                        prefetchScreens: true,
                        litePerformance: 'off',
                    },
                }),
            ),
        ).toBe(true);

        expect(
            shouldAllowIntentWarm(
                baseSettings({
                    performance: {
                        ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                        prefetchScreens: false,
                        litePerformance: 'off',
                    },
                }),
            ),
        ).toBe(false);

        document.documentElement.dataset.hamiLite = '1';
        expect(
            shouldAllowIntentWarm(
                baseSettings({
                    performance: {
                        ...LAWYER_SETTINGS_V2_DEFAULTS.performance,
                        prefetchScreens: true,
                        litePerformance: 'on',
                    },
                }),
            ),
        ).toBe(false);
    });
});
