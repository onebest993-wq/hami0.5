import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ShapeKey, ThemeKey } from '@/app/types/common';
import { shouldAllowPush } from '@/app/services/settings/apply';
import type { AppSettingsState } from '@/app/services/settings/types';
import { LAWYER_THEME_TOKENS } from '@/app/services/settings/lawyerThemeTokens';
import {
    createLawyerSettingsFactoryResetSnapshot,
    persistLawyerSettingsFactoryReset,
} from '@/app/services/settings/applyLawyerSettingsFactoryReset';
import type { LawyerSettingsActionsValue, LawyerSettingsContextValue } from './lawyerSettingsTypes';

export function useLawyerSettingsActionApi(args: {
    settings: AppSettingsState;
    setSettings: Dispatch<SetStateAction<AppSettingsState>>;
    currentTheme: ThemeKey;
    setCurrentThemeState: Dispatch<SetStateAction<ThemeKey>>;
    currentShape: ShapeKey;
    setCurrentShapeState: Dispatch<SetStateAction<ShapeKey>>;
}) {
    const {
        settings,
        setSettings,
        currentTheme,
        setCurrentThemeState,
        currentShape,
        setCurrentShapeState,
    } = args;

    const setCurrentTheme = useCallback((theme: ThemeKey) => {
        setCurrentThemeState(theme);
        const token = LAWYER_THEME_TOKENS[theme] ?? LAWYER_THEME_TOKENS.gold;
        setSettings((prev) => ({
            ...prev,
            appearance: { ...prev.appearance, theme, brandColor: token.primary },
        }));
    }, []);

    const setCurrentShape = useCallback((shape: ShapeKey) => {
        setCurrentShapeState(shape);
        setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, shape } }));
    }, []);

    useEffect(() => {
        if (settings.appearance.theme !== currentTheme) {
            setCurrentThemeState(settings.appearance.theme);
        }
    }, [settings.appearance.theme, currentTheme]);

    useEffect(() => {
        if (settings.appearance.shape !== currentShape) {
            setCurrentShapeState(settings.appearance.shape);
        }
    }, [settings.appearance.shape, currentShape]);

    const patchSettings = useCallback(
        (patch: Partial<AppSettingsState> | ((prev: AppSettingsState) => AppSettingsState)) => {
            setSettings((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
        },
        [],
    );

    const resetToDefaults = useCallback(() => {
        const next = createLawyerSettingsFactoryResetSnapshot();
        setSettings(next);
        setCurrentThemeState(next.appearance.theme);
        setCurrentShapeState(next.appearance.shape);
        persistLawyerSettingsFactoryReset(next);
    }, []);

    const actionsValue = useMemo<LawyerSettingsActionsValue>(
        () => ({
            setSettings,
            patchSettings,
            setCurrentTheme,
            setCurrentShape,
            resetToDefaults,
        }),
        [patchSettings, setCurrentTheme, setCurrentShape, resetToDefaults],
    );

    const value = useMemo<LawyerSettingsContextValue>(
        () => ({
            settings,
            setSettings,
            patchSettings,
            currentTheme,
            currentShape,
            setCurrentTheme,
            setCurrentShape,
            pushAllowed: shouldAllowPush(settings),
            resetToDefaults,
        }),
        [settings, patchSettings, currentTheme, currentShape, setCurrentTheme, setCurrentShape, resetToDefaults],
    );

    return { actionsValue, value };
}
