import { describe, expect, it } from 'vitest';
import { FONT_PRESETS, normalizeFontPreset, normalizeFontSizePx } from '../nav';
import { migrateLawyerSettings } from '../migrate';
import { SETTINGS_SCHEMA_VERSION } from '../types';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '../defaults';

describe('font presets', () => {
    it('يعرض ثلاثة أحجام فقط — بلا «واضح»', () => {
        expect(FONT_PRESETS).toHaveLength(3);
        expect(FONT_PRESETS.map((p) => p.id)).toEqual(['small', 'medium', 'large']);
        expect(FONT_PRESETS.map((p) => p.label)).not.toContain('واضح');
    });

    it('يحوّل xlarge و20px إلى كبير/18', () => {
        expect(normalizeFontPreset('xlarge', 20)).toBe('large');
        expect(normalizeFontSizePx(20)).toBe(18);
        expect(normalizeFontSizePx(19)).toBe(18);
    });

    it('يُثبّت حجم الخط على الافتراضي (متوسط/16px) عند التحميل', () => {
        const migrated = migrateLawyerSettings({
            version: SETTINGS_SCHEMA_VERSION,
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                fontPreset: 'xlarge',
                fontSize: 20,
            },
            security: LAWYER_SETTINGS_V2_DEFAULTS.security,
            data: LAWYER_SETTINGS_V2_DEFAULTS.data,
            performance: LAWYER_SETTINGS_V2_DEFAULTS.performance,
            homeLayout: LAWYER_SETTINGS_V2_DEFAULTS.homeLayout,
        });
        expect(migrated.appearance.fontPreset).toBe('medium');
        expect(migrated.appearance.fontSize).toBe(16);
    });
});
