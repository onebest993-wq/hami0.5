import React from 'react';
import { MoroccanGlassOverlay } from '@/app/components/shared/MoroccanGlassOverlay';
import type { HomeBlockPattern } from '@/app/services/settings/homeLayout';
import { shouldShowHomeMoroccanGlassDecor } from '@/app/services/settings/resolveHomeBlockStyle';

type HomeMoroccanGlassDecorProps = {
    pattern?: HomeBlockPattern;
    patternOpacity?: number;
};

/** نقش zellige + تدرج ذهبي — مثل MoroccanGlassFrame في الملف الشخصي */
export function HomeMoroccanGlassDecor({ pattern, patternOpacity = 0.07 }: HomeMoroccanGlassDecorProps) {
    if (!shouldShowHomeMoroccanGlassDecor(pattern)) return null;

    return (
        <>
            <MoroccanGlassOverlay opacity={patternOpacity} className="z-0" />
            <div
                className="absolute inset-0 z-0 bg-gradient-to-br from-[#E6C673]/[0.06] via-transparent to-indigo-500/[0.04] pointer-events-none rounded-[inherit]"
                aria-hidden
            />
        </>
    );
}
