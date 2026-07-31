import type { AppSettingsState } from './types';

import { SETTINGS_SCHEMA_VERSION } from './types';
import { HOME_LAYOUT_DEFAULTS } from './homeLayoutDefaults';



export const LAWYER_SETTINGS_V2_DEFAULTS: AppSettingsState = {

    version: SETTINGS_SCHEMA_VERSION,

    appearance: {

        themeMode: 'dark',

        theme: 'gold',

        shape: 'pill',

        language: 'ar',

        fontSize: 16,

        fontPreset: 'medium',

        glassOpacity: 0.92,

        homeContainerBorder: true,

        backgroundPreset: 'none',

        backgroundPatternOpacity: 0.32,

        backgroundPatternBlur: 0,

        themeApplyTarget: 'both',

        /* الزخارف للأقسام فقط — عبر تخصيص الواجهة، لا من إعدادات اللوحة */
        patternApplyTarget: 'blocks',

        brandColor: '#D4BC82',

        reduceMotion: false,

        highContrast: false,

    },

    security: {

        privacyBlur: true,

        screenshotDeterrent: true,

        biometricLock: false,

        autoLockMinutes: 5,

        localOnlyMode: false,

    },

    data: {

        autoSave: true,

        cloudSync: false,

        syncNotes: false,

        syncFiles: false,

        syncExecution: false,

    },

    performance: {

        enableAnimations: true,

        prefetchScreens: true,

        litePerformance: 'auto',

    },

    homeLayout: { ...HOME_LAYOUT_DEFAULTS, overrides: {} },

};

