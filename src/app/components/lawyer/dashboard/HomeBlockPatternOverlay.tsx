import React from 'react';

import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';

import type { HomeBlockStyleOverride, HomeCustomizableId } from '@/app/services/settings/homeLayout';

import { normalizeBackgroundPreset } from '@/app/services/settings/backgroundPresets';
import { resolveGlassPatternScale } from '@/app/services/settings/glassSurfacePaint';

import {

    BACKGROUND_PATTERN_OPACITY_MAX,

    normalizeBackgroundPatternOpacity,

    resolveHomeBlockPatternStyle,

} from '@/app/services/settings/surfaceAppearance';

import {

    resolveBlockPatternOpacity,

    resolveHomeBlockAccent,

} from '@/app/services/settings/resolveHomeBlockStyle';

import { resolvePatternThemePrimary, mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';

import { shouldRenderDecorativeLayers } from '@/app/runtime/mobileRuntimePolicy';



/** بلاطات hub — شفافية أخف قليلاً لكن مرئية */

const COMPACT_HUB_BLOCK_IDS = new Set<string>([

    'hubExecution',

    'hubLawsuit',

    'hubTransaction',

    'forum',

    'alerts',

]);



function scaleGlobalBlockPatternOpacity(raw: number, compact = false): number {

    const n = normalizeBackgroundPatternOpacity(raw);

    if (compact) return Math.min(BACKGROUND_PATTERN_OPACITY_MAX, n * 0.88);

    return n;

}



export function HomeBlockPatternOverlay({

    blockId,

    override,

    themePrimary,

}: {

    blockId?: HomeCustomizableId | string;

    override?: HomeBlockStyleOverride;

    themePrimary: string;

}) {

    const { settings } = useLawyerSettings();

    const appearance = mergeBlockScopedAppearance(settings.appearance, override);

    const userChoseBlockPreset = Boolean(override?.backgroundPreset);

    const globalPreset = normalizeBackgroundPreset(appearance.backgroundPreset);



    let presetId = override?.backgroundPreset;

    let usesGlobalPreset = false;



    const compactHub = Boolean(blockId && COMPACT_HUB_BLOCK_IDS.has(blockId));



    /* «خلفية البطاقة» — تُطبَّق دائماً على البطاقات بغضّ النظر عن patternApplyTarget */

    if (!presetId && globalPreset !== 'none') {

        presetId = globalPreset;

        usesGlobalPreset = true;

    }



    if (!presetId || presetId === 'none') return null;



    if (

        !userChoseBlockPreset &&

        !usesGlobalPreset &&

        !shouldRenderDecorativeLayers(settings.performance.litePerformance)

    ) {

        return null;

    }



    const accent = override?.accentColor?.trim()

        ? resolveHomeBlockAccent(override, themePrimary)

        : resolvePatternThemePrimary(appearance);



    let patternOpacity = resolveBlockPatternOpacity(override, appearance);

    if (usesGlobalPreset) {

        patternOpacity = scaleGlobalBlockPatternOpacity(patternOpacity, compactHub);

    }



    const patternStyle = resolveHomeBlockPatternStyle(

        normalizeBackgroundPreset(presetId),

        accent,

        patternOpacity * resolveGlassPatternScale(appearance.glassOpacity),

        appearance.themeMode,

    );

    if (!patternStyle) return null;



    return (

        <div

            className="hami-home-block-pattern absolute inset-0 pointer-events-none rounded-[inherit] z-[1]"

            style={patternStyle}

            aria-hidden

        />

    );

}


