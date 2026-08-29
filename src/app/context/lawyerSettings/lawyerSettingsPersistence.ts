import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import {
    loadPersistedWallpaper,
    persistWallpaper,
} from '@/app/services/settings/apply';
import { getLawyerSettingsSnapshot, publishLawyerSettingsLive } from '@/app/services/settings/settingsSnapshot';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from '@/app/services/settings/types';

export const BOOT_DEFAULT_SETTINGS = LAWYER_SETTINGS_V2_DEFAULTS;

export async function loadInitialSettingsAsync(): Promise<AppSettingsState> {
    const { migrateLawyerSettings } = await import('@/app/services/settings/migrate');
    const migrated = migrateLawyerSettings(
        persistenceRepository.load('lawyer_settings'),
        persistenceRepository.load<ThemeKey>('lawyer_theme'),
        persistenceRepository.load<ShapeKey>('lawyer_shape'),
    );
    if (migrated.appearance.wallpaper) {
        persistWallpaper(migrated.appearance.wallpaper);
    }
    const hasWallpaper = Boolean(loadPersistedWallpaper());
    return {
        ...migrated,
        appearance: {
            ...migrated.appearance,
            wallpaper: undefined,
            wallpaperStamp: hasWallpaper ? 1 : undefined,
        },
    };
}

/** الصورة تُحفظ في lawyer_wallpaper — لا نكرّرها داخل lawyer_settings */
export function stripWallpaperForStorage(state: AppSettingsState): AppSettingsState {
    if (!state.appearance.wallpaper) return state;
    return { ...state, appearance: { ...state.appearance, wallpaper: undefined } };
}

/** تجنّب إعادة رسم الواجهة إذا لم يتغيّر ترتيب/إظهار الحاويات */
export function homeLayoutStableKey(layout: AppSettingsState['homeLayout']): string {
    return JSON.stringify({
        placements: layout.placements,
        dockVisible: layout.dockVisible,
        quickNoteVisible: layout.quickNoteVisible,
        dockHiddenWidgetIds: layout.dockHiddenWidgetIds,
        overrides: layout.overrides,
    });
}

/** مقارنة كاملة عند hydrate — لا تتخطَّ تغييرات security/data/performance */
export function settingsHydrateEqual(a: AppSettingsState, b: AppSettingsState): boolean {
    return (
        a.version === b.version &&
        homeLayoutStableKey(a.homeLayout) === homeLayoutStableKey(b.homeLayout) &&
        JSON.stringify({ ...a.appearance, wallpaper: undefined }) ===
            JSON.stringify({ ...b.appearance, wallpaper: undefined }) &&
        JSON.stringify(a.security) === JSON.stringify(b.security) &&
        JSON.stringify(a.data) === JSON.stringify(b.data) &&
        JSON.stringify(a.performance) === JSON.stringify(b.performance)
    );
}

/** لقطة قرص خفيفة لأول رسم — DOM مسبقاً من index؛ لا نمنع paint بـ useLayoutEffect. */
export function readProviderBootSettings(): AppSettingsState {
    try {
        return getLawyerSettingsSnapshot();
    } catch {
        return BOOT_DEFAULT_SETTINGS;
    }
}

/** تطبيق إعدادات من جسر أصلي (Compose) — يُزامن React + التخزين. */
export function applyLawyerSettingsPatchExternal(
    mutator: (prev: AppSettingsState) => AppSettingsState,
): AppSettingsState {
    const prev = getLawyerSettingsSnapshot();
    const next = mutator(prev);
    persistenceRepository.save('lawyer_settings', stripWallpaperForStorage(next));
    publishLawyerSettingsLive(next);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hami:settings-external-commit', { detail: next }));
    }
    return next;
}
