import { useEffect, useMemo, type MutableRefObject } from 'react';
import {
    applySettingsToDom,
    consumeSettingsDomFastPath,
    loadPersistedWallpaper,
} from '@/app/services/settings/apply';
import { invalidateLawyerSettingsCache } from '@/app/services/settings/settingsSnapshot';
import type { AppSettingsState } from '@/app/services/settings/types';

export function useLawyerSettingsDomSync(
    settings: AppSettingsState,
    settingsHydrated: boolean,
    settingsRef: MutableRefObject<AppSettingsState>,
) {
    const domSettingsSignature = useMemo(
        () =>
            JSON.stringify({
                theme: settings.appearance.theme,
                cardTheme: settings.appearance.cardTheme,
                patternTheme: settings.appearance.patternTheme,
                themeApplyTarget: settings.appearance.themeApplyTarget,
                patternApplyTarget: settings.appearance.patternApplyTarget,
                shape: settings.appearance.shape,
                brandColor: settings.appearance.brandColor,
                glassOpacity: settings.appearance.glassOpacity,
                wallpaper: loadPersistedWallpaper() ? '1' : '0',
                wallpaperStamp: settings.appearance.wallpaperStamp ?? 0,
                backgroundPreset: settings.appearance.backgroundPreset,
                backgroundPatternOpacity: settings.appearance.backgroundPatternOpacity,
                backgroundPatternBlur: settings.appearance.backgroundPatternBlur,
                homeContainerBorder: settings.appearance.homeContainerBorder,
                language: settings.appearance.language,
                themeMode: settings.appearance.themeMode,
                localOnlyMode: settings.security.localOnlyMode,
            }),
        [settings.appearance, settings.security.localOnlyMode],
    );

    useEffect(() => {
        if (!settingsHydrated) return;
        if (consumeSettingsDomFastPath()) return;
        invalidateLawyerSettingsCache();
        applySettingsToDom(settingsRef.current);
    }, [domSettingsSignature, settingsHydrated]);
}
