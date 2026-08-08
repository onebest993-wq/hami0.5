import { describe, expect, it } from 'vitest';
import {
    collapseLegacyThemeApplyTarget,
    normalizeAppearanceLanguage,
    normalizeAppearancePatternBlur,
} from '@/app/services/settings/appearanceNormalize';
import { migrateLawyerSettings } from '@/app/services/settings/migrate';

describe('appearanceNormalize', () => {
    it('يوحّد اللغة إلى العربية', () => {
        expect(normalizeAppearanceLanguage('en')).toBe('ar');
        expect(normalizeAppearanceLanguage(undefined)).toBe('ar');
    });

    it('يُصفّر blur الزخرفة غير المستخدم', () => {
        expect(normalizeAppearancePatternBlur(4)).toBe(0);
    });

    it('يوحّد themeApplyTarget إلى board مع الحفاظ على ألوان البطاقات', () => {
        expect(
            collapseLegacyThemeApplyTarget({
                theme: 'gold',
                cardTheme: 'navy',
                patternTheme: 'crimson',
                themeApplyTarget: 'both',
            }),
        ).toEqual({
            themeApplyTarget: 'board',
            cardTheme: 'navy',
            patternTheme: 'crimson',
        });
    });

    it('يتجاهل الأهداف القديمة ويوحّد اللوحة', () => {
        expect(
            collapseLegacyThemeApplyTarget({
                theme: 'gold',
                themeApplyTarget: 'patterns',
            }),
        ).toEqual({
            themeApplyTarget: 'board',
            cardTheme: 'gold',
            patternTheme: 'gold',
        });
    });
});

describe('migrateLawyerSettings appearance cleanup', () => {
    it('يوحّد اللغة وboth عند التحميل', () => {
        const migrated = migrateLawyerSettings({
            version: 2,
            appearance: {
                language: 'en',
                themeApplyTarget: 'both',
                theme: 'gold',
                cardTheme: 'navy',
            },
        });
        expect(migrated.appearance.language).toBe('ar');
        expect(migrated.appearance.themeApplyTarget).toBe('board');
        expect(migrated.appearance.patternApplyTarget).toBe('blocks');
        expect(migrated.appearance.cardTheme).toBe('navy');
        expect(migrated.appearance.backgroundPatternBlur).toBe(0);
    });
});
