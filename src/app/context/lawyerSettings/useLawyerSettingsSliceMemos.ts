import { useMemo } from 'react';
import type { AppSettingsState } from '@/app/services/settings/types';
import { homeLayoutStableKey } from './lawyerSettingsPersistence';

export function useLawyerSettingsSliceMemos(settings: AppSettingsState) {
    const appearanceStable = useMemo(
        () => settings.appearance,
        [
            settings.appearance.themeMode,
            settings.appearance.theme,
            settings.appearance.cardTheme,
            settings.appearance.patternTheme,
            settings.appearance.themeApplyTarget,
            settings.appearance.patternApplyTarget,
            settings.appearance.shape,
            settings.appearance.language,
            settings.appearance.fontSize,
            settings.appearance.fontPreset,
            settings.appearance.glassOpacity,
            settings.appearance.homeContainerBorder,
            settings.appearance.wallpaperStamp,
            settings.appearance.backgroundPreset,
            settings.appearance.backgroundPatternOpacity,
            settings.appearance.backgroundPatternBlur,
            settings.appearance.brandColor,
            settings.appearance.reduceMotion,
            settings.appearance.highContrast,
        ],
    );

    const securityStable = useMemo(
        () => settings.security,
        [
            settings.security.privacyBlur,
            settings.security.screenshotDeterrent,
            settings.security.biometricLock,
            settings.security.autoLockMinutes,
            settings.security.localOnlyMode,
        ],
    );

    const dataStable = useMemo(
        () => settings.data,
        [
            settings.data.autoSave,
            settings.data.cloudSync,
            settings.data.syncNotes,
            settings.data.syncFiles,
            settings.data.syncExecution,
        ],
    );

    const performanceStable = useMemo(
        () => settings.performance,
        [
            settings.performance.enableAnimations,
            settings.performance.prefetchScreens,
            settings.performance.litePerformance,
        ],
    );

    const homeLayoutStable = useMemo(
        () => settings.homeLayout,
        [homeLayoutStableKey(settings.homeLayout)],
    );

    return {
        appearanceStable,
        securityStable,
        dataStable,
        performanceStable,
        homeLayoutStable,
    };
}
