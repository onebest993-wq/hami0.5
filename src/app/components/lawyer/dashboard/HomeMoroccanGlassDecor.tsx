import React from 'react';
import { MoroccanGlassOverlay } from '@/app/components/shared/MoroccanGlassOverlay';
import type { HomeBlockPattern } from '@/app/services/settings/homeLayout';
import { shouldShowHomeMoroccanGlassDecor } from '@/app/services/settings/resolveHomeBlockStyle';

type HomeMoroccanGlassDecorProps = {
    pattern?: HomeBlockPattern;
    patternOpacity?: number;
};

/**
 * زخرفة رئيسية — تدرج ذهبي من critical CSS (بلا Tailwind مؤجّل).
 * على Android تُخفى عبر lawyerHomeFx-android.css لتطابق الشكل المستقر.
 */
export function HomeMoroccanGlassDecor({ pattern, patternOpacity = 0.045 }: HomeMoroccanGlassDecorProps) {
    if (!shouldShowHomeMoroccanGlassDecor(pattern)) return null;

    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (
            root.dataset.hamiNative === '1' &&
            root.dataset.hamiPlatform === 'android'
        ) {
            return null;
        }
    }

    return (
        <>
            <MoroccanGlassOverlay opacity={patternOpacity} className="z-0 hami-home-glass-decor" />
            <div
                className="hami-home-glass-decor hami-home-glass-wash absolute inset-0 z-0 pointer-events-none rounded-[inherit]"
                aria-hidden
            />
        </>
    );
}
