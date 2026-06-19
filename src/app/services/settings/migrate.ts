import type { ThemeKey, ShapeKey, ThemeMode } from '@/app/types/common';

import { LAWYER_SETTINGS_V2_DEFAULTS } from './defaults';

import { normalizeBackgroundPreset } from './backgroundPresets';

import {

    normalizeBackgroundPatternBlur,
    normalizeBackgroundPatternOpacity,
    normalizeGlassOpacity,
} from './surfaceAppearance';

import type { AppSettingsState } from './types';

import { SETTINGS_SCHEMA_VERSION } from './types';



/** الواجهة تدعم الوضع الداكن فقط — يُحوَّل أي وضع فاتح/تلقائي محفوظ. */

function normalizeThemeMode(_mode: unknown): ThemeMode {

    return 'dark';

}



type LegacyFlat = Partial<{

    version: number;

    themeMode: AppSettingsState['appearance']['themeMode'];

    theme: ThemeKey;

    shape: ShapeKey;

    language: AppSettingsState['appearance']['language'];

    biometric: boolean;

    glassOpacity: number;

    wallpaper: string;

    fontSize: number;

    autoSave: boolean;

    cloudSync: boolean;

    privacyBlur: boolean;

    brandColor: string;

    appearance: AppSettingsState['appearance'];

    security: AppSettingsState['security'];

    data: AppSettingsState['data'];

    performance: AppSettingsState['performance'];

}>;



function deepMerge<T>(base: T, patch: Partial<T>): T {

    const out = { ...(base as unknown as Record<string, unknown>) };

    const patchObj = patch as unknown as Record<string, unknown>;

    for (const key of Object.keys(patchObj)) {

        const val = patchObj[key];

        if (val === undefined) continue;

        const baseVal = out[key];

        if (

            val &&

            typeof val === 'object' &&

            !Array.isArray(val) &&

            baseVal &&

            typeof baseVal === 'object' &&

            !Array.isArray(baseVal)

        ) {

            out[key] = deepMerge(baseVal as Record<string, unknown>, val as Record<string, unknown>);

        } else {

            out[key] = val;

        }

    }

    return out as unknown as T;

}



function normalizeAppSettings(merged: AppSettingsState): AppSettingsState {

    return {

        version: SETTINGS_SCHEMA_VERSION,

        appearance: {

            ...merged.appearance,

            themeMode: normalizeThemeMode(merged.appearance.themeMode),

            backgroundPreset: normalizeBackgroundPreset(merged.appearance.backgroundPreset),

            backgroundPatternOpacity: normalizeBackgroundPatternOpacity(merged.appearance.backgroundPatternOpacity),

            backgroundPatternBlur: normalizeBackgroundPatternBlur(merged.appearance.backgroundPatternBlur),

            glassOpacity: normalizeGlassOpacity(merged.appearance.glassOpacity),

            homeContainerBorder: merged.appearance.homeContainerBorder !== false,

        },

        security: {

            ...merged.security,

            localOnlyMode: merged.security.localOnlyMode === true,

        },

        data: { ...merged.data },

        performance: { ...merged.performance },

    };

}



/** Load v2 settings or migrate legacy `lawyer_settings` + theme keys. */

export function migrateLawyerSettings(

    raw: unknown,

    themeKey?: ThemeKey | null,

    shapeKey?: ShapeKey | null,

): AppSettingsState {

    if (raw && typeof raw === 'object') {

        const obj = raw as LegacyFlat & Record<string, unknown>;

        if (obj.version === SETTINGS_SCHEMA_VERSION && obj.appearance) {

            const merged = deepMerge(LAWYER_SETTINGS_V2_DEFAULTS, obj as unknown as Partial<AppSettingsState>);

            return normalizeAppSettings(merged);

        }



        const migrated: Partial<AppSettingsState> = {

            appearance: {

                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,

                themeMode: normalizeThemeMode(obj.themeMode ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.themeMode),

                theme: themeKey ?? obj.theme ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme,

                shape: shapeKey ?? obj.shape ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.shape,

                language: obj.language ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.language,

                fontSize: typeof obj.fontSize === 'number' ? obj.fontSize : LAWYER_SETTINGS_V2_DEFAULTS.appearance.fontSize,

                glassOpacity: normalizeGlassOpacity(obj.glassOpacity ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.glassOpacity),

                wallpaper: obj.wallpaper,

                backgroundPreset: normalizeBackgroundPreset(

                    (obj.appearance as AppSettingsState['appearance'] | undefined)?.backgroundPreset,

                ),

                brandColor: obj.brandColor ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.brandColor,

            },

            security: {

                ...LAWYER_SETTINGS_V2_DEFAULTS.security,

                privacyBlur: obj.privacyBlur ?? LAWYER_SETTINGS_V2_DEFAULTS.security.privacyBlur,

                biometricLock: obj.biometric ?? LAWYER_SETTINGS_V2_DEFAULTS.security.biometricLock,

            },

            data: {

                ...LAWYER_SETTINGS_V2_DEFAULTS.data,

                autoSave: obj.autoSave ?? LAWYER_SETTINGS_V2_DEFAULTS.data.autoSave,

                cloudSync: obj.cloudSync ?? LAWYER_SETTINGS_V2_DEFAULTS.data.cloudSync,

            },

        };

        return normalizeAppSettings(deepMerge(LAWYER_SETTINGS_V2_DEFAULTS, migrated));

    }



    const base = { ...LAWYER_SETTINGS_V2_DEFAULTS };

    if (themeKey) base.appearance = { ...base.appearance, theme: themeKey };

    if (shapeKey) base.appearance = { ...base.appearance, shape: shapeKey };

    return base;

}

