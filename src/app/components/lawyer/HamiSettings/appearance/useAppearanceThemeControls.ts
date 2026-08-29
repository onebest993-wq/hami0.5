import { useMemo, useState } from 'react';
import {
    LAWYER_THEME_TOKENS,
    resolveBoardThemeKey,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import type { AppSettingsState } from '@/app/services/settings';
import { pickCollapsedItems } from '@/app/components/lawyer/HamiSettings/components/collapseList';
import {
    APPEARANCE_THEME_KEYS,
    THEME_COLLAPSED_COUNT,
} from './appearanceConstants';

type PatchAppearance = (partial: Partial<AppSettingsState['appearance']>) => void;

export function useAppearanceThemeControls(
    appearance: AppSettingsState['appearance'],
    patchAppearance: PatchAppearance,
) {
    const [themesExpanded, setThemesExpanded] = useState(false);

    const activeThemeKey = resolveBoardThemeKey(appearance);
    const activeThemeToken = LAWYER_THEME_TOKENS[activeThemeKey] ?? LAWYER_THEME_TOKENS.gold;

    /** لون واحد موحّد — اللوحة والبطاقات والنقوش العامة */
    const selectTheme = (key: ThemeKey) => {
        const token = LAWYER_THEME_TOKENS[key] ?? LAWYER_THEME_TOKENS.gold;
        patchAppearance({
            theme: key,
            cardTheme: key,
            patternTheme: key,
            brandColor: token.primary,
        });
    };

    const visibleThemeKeys = useMemo(
        () =>
            pickCollapsedItems(
                APPEARANCE_THEME_KEYS,
                THEME_COLLAPSED_COUNT,
                themesExpanded,
                activeThemeKey,
            ),
        [activeThemeKey, themesExpanded],
    );
    const hiddenThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    return {
        themesExpanded,
        setThemesExpanded,
        activeThemeKey,
        activeThemeToken,
        visibleThemeKeys,
        hiddenThemeCount,
        selectTheme,
    };
}
