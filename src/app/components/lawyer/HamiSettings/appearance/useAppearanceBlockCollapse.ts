import { useMemo, useState } from 'react';
import { BACKGROUND_PRESETS } from '@/app/services/settings';
import { pickCollapsedItems } from '@/app/components/lawyer/HamiSettings/components/collapseList';
import {
    APPEARANCE_THEME_KEYS,
    PATTERN_COLLAPSED_COUNT,
    THEME_COLLAPSED_COUNT,
} from './appearanceConstants';
import type { AppearanceBlockCustomize } from './useAppearanceBlockCustomize';

export function useAppearanceBlockCollapse(customize: AppearanceBlockCustomize) {
    const [patternsExpanded, setPatternsExpanded] = useState(false);
    const [cardThemesExpanded, setCardThemesExpanded] = useState(false);
    const [patternThemesExpanded, setPatternThemesExpanded] = useState(false);

    const visibleCardThemeKeys = useMemo(
        () =>
            pickCollapsedItems(
                APPEARANCE_THEME_KEYS,
                THEME_COLLAPSED_COUNT,
                cardThemesExpanded,
                customize.effective.cardThemeKey,
            ),
        [cardThemesExpanded, customize.effective.cardThemeKey],
    );
    const hiddenCardThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    const visiblePatternThemeKeys = useMemo(
        () =>
            pickCollapsedItems(
                APPEARANCE_THEME_KEYS,
                THEME_COLLAPSED_COUNT,
                patternThemesExpanded,
                customize.effective.patternThemeKey,
            ),
        [customize.effective.patternThemeKey, patternThemesExpanded],
    );
    const hiddenPatternThemeCount = Math.max(0, APPEARANCE_THEME_KEYS.length - THEME_COLLAPSED_COUNT);

    const visiblePresets = useMemo(
        () =>
            pickCollapsedItems(
                BACKGROUND_PRESETS,
                PATTERN_COLLAPSED_COUNT,
                patternsExpanded,
                BACKGROUND_PRESETS.find((p) => p.id === customize.effective.backgroundPreset),
            ),
        [customize.effective.backgroundPreset, patternsExpanded],
    );
    const hiddenPatternPresetCount = Math.max(0, BACKGROUND_PRESETS.length - PATTERN_COLLAPSED_COUNT);

    return {
        patternsExpanded,
        setPatternsExpanded,
        cardThemesExpanded,
        setCardThemesExpanded,
        patternThemesExpanded,
        setPatternThemesExpanded,
        visibleCardThemeKeys,
        hiddenCardThemeCount,
        visiblePatternThemeKeys,
        hiddenPatternThemeCount,
        visiblePresets,
        hiddenPatternPresetCount,
    };
}
