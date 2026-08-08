import { describe, expect, it } from 'vitest';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';
import {
    buildGlobalGlassTransparencySettingsPatch,
    clearBlockGlassOpacityOverrides,
} from '../applyGlobalGlassTransparency';

describe('applyGlobalGlassTransparency', () => {
    it('يضبط الشفافية العامة ويزيل تجاوزات الأقسام', () => {
        const prev = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            appearance: { ...LAWYER_SETTINGS_V2_DEFAULTS.appearance, glassOpacity: 0.92 },
            homeLayout: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.homeLayout,
                overrides: {
                    hubExecution: { glassOpacity: 0.5, span: 2 },
                    forum: { glassOpacity: 0.4 },
                },
            },
        };

        const next = buildGlobalGlassTransparencySettingsPatch(prev, 'light');

        expect(next.appearance.glassOpacity).toBe(0.1);
        expect(next.homeLayout.overrides.hubExecution).toEqual({ span: 2 });
        expect(next.homeLayout.overrides.forum).toBeUndefined();
    });

    it('clearBlockGlassOpacityOverrides يحافظ على حقول التخطيط الأخرى', () => {
        const cleared = clearBlockGlassOpacityOverrides({
            hubExecution: { glassOpacity: 0.6, span: 2 },
        });
        expect(cleared.hubExecution).toEqual({ span: 2 });
    });
});
