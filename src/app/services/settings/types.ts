import type { FontSize, Language, ShapeKey, ThemeKey, ThemeMode } from '@/app/types/common';
import type { BackgroundPresetId } from './backgroundPresets';

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
    /** إظهار إطار ثابت لبطاقات لوحة القيادة — يبقى مرئياً عند الشفافية المنخفضة */
    homeContainerBorder: boolean;
    wallpaper?: string;
    /** زخرفة خلفية خفيفة للوحة — بدل ألوان صلبة */
    backgroundPreset: BackgroundPresetId;
    /** شفافية طبقة الزخرفة 0.12–0.72 */
    backgroundPatternOpacity: number;
    /** ضبابية الزخرفة 0–6px */
    backgroundPatternBlur: number;
    brandColor: string;
    reduceMotion: boolean;
    highContrast: boolean;
}

export interface SecuritySettings {
    privacyBlur: boolean;
    screenshotDeterrent: boolean;
    biometricLock: boolean;
    autoLockMinutes: AutoLockMinutes;
    /** عزل التطبيق — لا طلبات شبكة خارجية ولا API */
    localOnlyMode: boolean;
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
}

/** Unified lawyer app settings (schema v2). */
export interface AppSettingsState {
    version: typeof SETTINGS_SCHEMA_VERSION;
    appearance: AppearanceSettings;
    security: SecuritySettings;
    data: DataSettings;
    performance: PerformanceSettings;
}

export type SettingsSectionId = 'appearance' | 'security' | 'data' | 'account';

export interface SettingsNavItem {
    id: SettingsSectionId;
    label: string;
    labelEn: string;
    keywords: string[];
}
