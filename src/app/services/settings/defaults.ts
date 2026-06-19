import type { AppSettingsState } from './types';

import { SETTINGS_SCHEMA_VERSION } from './types';



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

        backgroundPreset: 'moroccan-zellige',

        backgroundPatternOpacity: 0.32,

        backgroundPatternBlur: 0,

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

        weeklyBackupReminder: true,

    },

    performance: {

        enableAnimations: true,

        prefetchScreens: true,

    },

};

