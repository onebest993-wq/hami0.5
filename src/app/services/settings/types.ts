import type { FontSize, Language, ShapeKey, ThemeKey, ThemeMode } from '@/app/types/common';
import type { BackgroundPresetId } from './backgroundPresets';
import type { HomeLayoutSettings } from './homeLayout';

export type { HomeLayoutSettings };
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
    /** تطبيق السمة على الواجهة و/أو الوثائق */
    themeApplyTarget?: 'ui' | 'docs' | 'both';
    /** تطبيق نمط الخلفية: واجهة / وثائق / كلاهما / أقسام (كتل) فقط */
    patternApplyTarget?: 'ui' | 'docs' | 'both' | 'blocks';
    /** @deprecated — تُخزَّن في lawyer_wallpaper فقط، لا في حالة React */
    wallpaper?: string;
    /** نبضة تحديث بعد رفع/حذف الخلفية دون تخزين blob في الذاكرة */
    wallpaperStamp?: number;
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
}

export type LitePerformanceMode = 'auto' | 'on' | 'off';

export interface PerformanceSettings {
    enableAnimations: boolean;
    prefetchScreens: boolean;
    /** auto = يُفعّل على الأجهزة المتواضعة — يقلّل الضبابية والتحميل المسبق */
    litePerformance: LitePerformanceMode;
}

/** Unified lawyer app settings (schema v2). */
export interface AppSettingsState {
    version: typeof SETTINGS_SCHEMA_VERSION;
    appearance: AppearanceSettings;
    security: SecuritySettings;
    data: DataSettings;
    performance: PerformanceSettings;
    homeLayout: HomeLayoutSettings;
}

export type SettingsSectionId = 'appearance' | 'security' | 'data' | 'account';

export interface SettingsNavItem {
    id: SettingsSectionId;
    label: string;
    labelEn: string;
    keywords: string[];
}
