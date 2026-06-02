import type { FontSize, Language, ShapeKey, ThemeKey, ThemeMode } from '@/app/types/common';

export const SETTINGS_SCHEMA_VERSION = 2 as const;

export type ViewMode = 'list' | 'grid';
export type AutoLockMinutes = 0 | 1 | 5 | 15 | 30 | 60;
export type { HomeSectionId } from './homeSections';

export interface AppearanceSettings {
    themeMode: ThemeMode;
    theme: ThemeKey;
    shape: ShapeKey;
    language: Language;
    fontSize: number;
    fontPreset: FontSize;
    glassOpacity: number;
    wallpaper?: string;
    brandColor: string;
    reduceMotion: boolean;
    highContrast: boolean;
}

export interface NotificationSettings {
    master: boolean;
    lawsuits: boolean;
    execution: boolean;
    calendar: boolean;
    community: boolean;
    financial: boolean;
    pushEnabled: boolean;
    sound: boolean;
    vibrate: boolean;
    quietHours: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
}

export interface SecuritySettings {
    privacyBlur: boolean;
    screenshotDeterrent: boolean;
    biometricLock: boolean;
    autoLockMinutes: AutoLockMinutes;
    decoyMode: boolean;
    maskSensitiveInPublic: boolean;
}

export interface WorkflowSettings {
    viewMode: ViewMode;
    watermark: boolean;
    autoSummary: boolean;
    smartAlerts: boolean;
    compactMode: boolean;
    defaultCourt: string;
    /** ترتيب أقسام الصفحة الرئيسية (تنبيهات، مركز القيادة، المفكرة). */
    homeSectionOrder: import('./homeSections').HomeSectionId[];
}

export interface DataSettings {
    autoSave: boolean;
    cloudSync: boolean;
    syncNotes: boolean;
    syncFiles: boolean;
    syncExecution: boolean;
    weeklyBackupReminder: boolean;
}

export interface PerformanceSettings {
    enableAnimations: boolean;
    prefetchScreens: boolean;
    devPerformanceMonitor: boolean;
}

/** Unified lawyer app settings (schema v2). */
export interface AppSettingsState {
    version: typeof SETTINGS_SCHEMA_VERSION;
    appearance: AppearanceSettings;
    notifications: NotificationSettings;
    security: SecuritySettings;
    workflow: WorkflowSettings;
    data: DataSettings;
    performance: PerformanceSettings;
}

export type SettingsSectionId =
    | 'appearance'
    | 'notifications'
    | 'security'
    | 'workflow'
    | 'data'
    | 'account'
    | 'advanced';

export interface SettingsNavItem {
    id: SettingsSectionId;
    label: string;
    labelEn: string;
    keywords: string[];
}
