import type { ThemeKey, ShapeKey } from '@/app/types/common';
import { LAWYER_SETTINGS_V2_DEFAULTS } from './defaults';
import { normalizeHomeSectionOrder } from './homeSections';
import type { AppSettingsState } from './types';
import { SETTINGS_SCHEMA_VERSION } from './types';

type LegacyFlat = Partial<{
    version: number;
    themeMode: AppSettingsState['appearance']['themeMode'];
    theme: ThemeKey;
    shape: ShapeKey;
    language: AppSettingsState['appearance']['language'];
    notifications: boolean;
    biometric: boolean;
    glassOpacity: number;
    wallpaper: string;
    fontSize: number;
    autoSave: boolean;
    cloudSync: boolean;
    privacyBlur: boolean;
    watermark: boolean;
    viewMode: 'list' | 'grid';
    autoSummary: boolean;
    smartAlerts: boolean;
    brandColor: string;
    appearance: AppSettingsState['appearance'];
    security: AppSettingsState['security'];
    workflow: AppSettingsState['workflow'];
    data: AppSettingsState['data'];
    performance: AppSettingsState['performance'];
    notificationsChannels: AppSettingsState['notifications'];
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

/** Load v2 settings or migrate legacy `lawyer_settings` + theme keys. */
export function migrateLawyerSettings(
    raw: unknown,
    themeKey?: ThemeKey | null,
    shapeKey?: ShapeKey | null,
): AppSettingsState {
    if (raw && typeof raw === 'object') {
        const obj = raw as LegacyFlat;
        if (obj.version === SETTINGS_SCHEMA_VERSION && obj.appearance) {
            const merged = deepMerge(LAWYER_SETTINGS_V2_DEFAULTS, obj as unknown as Partial<AppSettingsState>);
            const legacyWorkflow = obj.workflow as
                | (AppSettingsState['workflow'] & { dashboardSectionOrder?: unknown })
                | undefined;
            return {
                ...merged,
                workflow: {
                    ...merged.workflow,
                    homeSectionOrder: normalizeHomeSectionOrder(
                        legacyWorkflow?.homeSectionOrder ?? legacyWorkflow?.dashboardSectionOrder,
                    ),
                },
            };
        }

        const migrated: Partial<AppSettingsState> = {
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                themeMode: obj.themeMode ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.themeMode,
                theme: themeKey ?? obj.theme ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.theme,
                shape: shapeKey ?? obj.shape ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.shape,
                language: obj.language ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.language,
                fontSize: typeof obj.fontSize === 'number' ? obj.fontSize : LAWYER_SETTINGS_V2_DEFAULTS.appearance.fontSize,
                glassOpacity: obj.glassOpacity ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.glassOpacity,
                wallpaper: obj.wallpaper,
                brandColor: obj.brandColor ?? LAWYER_SETTINGS_V2_DEFAULTS.appearance.brandColor,
            },
            notifications: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.notifications,
                master: obj.notifications ?? LAWYER_SETTINGS_V2_DEFAULTS.notifications.master,
            },
            security: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.security,
                privacyBlur: obj.privacyBlur ?? LAWYER_SETTINGS_V2_DEFAULTS.security.privacyBlur,
                biometricLock: obj.biometric ?? LAWYER_SETTINGS_V2_DEFAULTS.security.biometricLock,
            },
            workflow: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.workflow,
                viewMode: obj.viewMode ?? LAWYER_SETTINGS_V2_DEFAULTS.workflow.viewMode,
                watermark: obj.watermark ?? LAWYER_SETTINGS_V2_DEFAULTS.workflow.watermark,
                autoSummary: obj.autoSummary ?? LAWYER_SETTINGS_V2_DEFAULTS.workflow.autoSummary,
                smartAlerts: obj.smartAlerts ?? LAWYER_SETTINGS_V2_DEFAULTS.workflow.smartAlerts,
            },
            data: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.data,
                autoSave: obj.autoSave ?? LAWYER_SETTINGS_V2_DEFAULTS.data.autoSave,
                cloudSync: obj.cloudSync ?? LAWYER_SETTINGS_V2_DEFAULTS.data.cloudSync,
            },
        };
        return deepMerge(LAWYER_SETTINGS_V2_DEFAULTS, migrated);
    }

    const base = { ...LAWYER_SETTINGS_V2_DEFAULTS };
    if (themeKey) base.appearance = { ...base.appearance, theme: themeKey };
    if (shapeKey) base.appearance = { ...base.appearance, shape: shapeKey };
    return base;
}
