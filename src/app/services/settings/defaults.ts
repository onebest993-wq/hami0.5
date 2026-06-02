import type { AppSettingsState } from './types';
import { SETTINGS_SCHEMA_VERSION } from './types';
import { HOME_SECTION_ORDER_DEFAULT } from './homeSections';

export const LAWYER_SETTINGS_V2_DEFAULTS: AppSettingsState = {
    version: SETTINGS_SCHEMA_VERSION,
    appearance: {
        themeMode: 'dark',
        theme: 'gold',
        shape: 'pill',
        language: 'ar',
        fontSize: 16,
        fontPreset: 'medium',
        glassOpacity: 0.85,
        brandColor: '#E6C673',
        reduceMotion: false,
        highContrast: false,
    },
    notifications: {
        master: true,
        lawsuits: true,
        execution: true,
        calendar: true,
        community: true,
        financial: true,
        pushEnabled: true,
        sound: true,
        vibrate: true,
        quietHours: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
    },
    security: {
        privacyBlur: true,
        screenshotDeterrent: true,
        biometricLock: false,
        autoLockMinutes: 5,
        decoyMode: false,
        maskSensitiveInPublic: true,
    },
    workflow: {
        viewMode: 'list',
        watermark: false,
        autoSummary: false,
        smartAlerts: true,
        compactMode: false,
        defaultCourt: '',
        homeSectionOrder: [...HOME_SECTION_ORDER_DEFAULT],
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
        devPerformanceMonitor: false,
    },
};
