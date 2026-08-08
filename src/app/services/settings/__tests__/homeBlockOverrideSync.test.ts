import { describe, expect, it } from 'vitest';
import {
    buildClearConflictingAppearancePatch,
    hasConflictingAppearanceOverrides,
    stripConflictingAppearanceOverrides,
} from '@/app/services/settings/homeBlockOverrideSync';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';

describe('homeBlockOverrideSync', () => {
    it('يكتشف تجاوزات المظهر المتعارضة مع الإعدادات العامة', () => {
        expect(hasConflictingAppearanceOverrides(undefined)).toBe(false);
        expect(hasConflictingAppearanceOverrides({ visible: false })).toBe(false);
        expect(hasConflictingAppearanceOverrides({ pattern: 'solid' })).toBe(false);
        expect(hasConflictingAppearanceOverrides({ backgroundPreset: 'moroccan-zellige' })).toBe(false);
        expect(hasConflictingAppearanceOverrides({ glassOpacity: 0.5 })).toBe(false);
        expect(hasConflictingAppearanceOverrides({ accentColor: '#E6C673' })).toBe(true);
        expect(hasConflictingAppearanceOverrides({ shape: 'pill' })).toBe(true);
    });

    it('يزيل حقول المظهر العام ويبقي حقول التخطيط', () => {
        const input: HomeBlockStyleOverride = {
            accentColor: '#E6C673',
            backgroundPreset: 'moroccan-zellige',
            patternOpacity: 0.4,
            glassOpacity: 0.6,
            shape: 'pill',
            containerBorder: false,
            visible: false,
            span: 2,
            dockLiftPx: 12,
            pattern: 'rim',
        };
        expect(stripConflictingAppearanceOverrides(input)).toEqual({
            backgroundPreset: 'moroccan-zellige',
            patternOpacity: 0.4,
            glassOpacity: 0.6,
            containerBorder: false,
            visible: false,
            span: 2,
            dockLiftPx: 12,
            pattern: 'rim',
        });
    });

    it('يبني patch لمسح تجاوزات المظهر المتعارضة', () => {
        const patch = buildClearConflictingAppearancePatch();
        expect(patch.accentColor).toBeUndefined();
        expect(patch.backgroundPreset).toBeUndefined();
        expect(patch.patternOpacity).toBeUndefined();
        expect(patch.glassOpacity).toBeUndefined();
        expect(patch.shape).toBeUndefined();
        expect(patch.containerBorder).toBeUndefined();
    });

    it('يزيل تجاوزات المظهر القديمة عند strip', () => {
        expect(stripConflictingAppearanceOverrides({
            accentColor: '#E6C673',
            cardTheme: 'navy',
            patternOpacity: 0.4,
            visible: false,
        })).toEqual({
            cardTheme: 'navy',
            patternOpacity: 0.4,
            visible: false,
        });
    });
});
