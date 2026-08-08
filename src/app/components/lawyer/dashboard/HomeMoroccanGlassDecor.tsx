import React from 'react';
import { MoroccanGlassOverlay } from '@/app/components/shared/MoroccanGlassOverlay';
import type { HomeBlockStyleOverride, HomeBlockPattern } from '@/app/services/settings/homeLayout';
import { normalizeBackgroundPreset } from '@/app/services/settings/backgroundPresets';
import {
    resolveBlockPatternOpacity,
    shouldShowHomeMoroccanGlassDecor,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { resolvePatternThemePrimary } from '@/app/services/settings/themeResolve';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';

type HomeMoroccanGlassDecorProps = {
    pattern?: HomeBlockPattern;
    patternOpacity?: number;
    blockOverride?: HomeBlockStyleOverride;
    /** بلاطات الدوك: طبقة زجاج إضافية تُثقل compositing — نُخفّيها */
    blockId?: string;
};

/**
 * زخرفة رئيسية — تدرج ذهبي من critical CSS (بلا Tailwind مؤجّل).
 * على Android تُخفى عبر lawyerHomeFx-android.css لتطابق الشكل المستقر.
 */
export function HomeMoroccanGlassDecor({
    pattern,
    patternOpacity,
    blockOverride,
    blockId,
}: HomeMoroccanGlassDecorProps) {
    const { settings } = useLawyerSettings();
    const globalCardPattern = normalizeBackgroundPreset(settings.appearance.backgroundPreset);
    /* عند اختيار زخرفة من الإعدادات — لا نركّب zellige افتراضي فوقها */
    if (globalCardPattern !== 'none') return null;

    if (blockId?.startsWith('dock')) return null;

    if (!shouldShowHomeMoroccanGlassDecor(pattern ?? blockOverride?.pattern)) return null;

    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (root.dataset.hamiNative === '1' && root.dataset.hamiPlatform === 'android') {
            return null;
        }
    }

    const resolvedPatternOpacity =
        patternOpacity ??
        resolveBlockPatternOpacity(blockOverride, settings.appearance);
    const decorOpacity = Math.min(0.22, Math.max(0.04, 0.04 + resolvedPatternOpacity * 0.18));
    const patternAccent = resolvePatternThemePrimary(settings.appearance);

    return (
        <>
            <MoroccanGlassOverlay
                opacity={decorOpacity}
                accent={patternAccent}
                className="z-0 hami-home-glass-decor"
            />
            <div
                className="hami-home-glass-decor hami-home-glass-wash absolute inset-0 z-0 pointer-events-none rounded-[inherit]"
                aria-hidden
            />
        </>
    );
}
