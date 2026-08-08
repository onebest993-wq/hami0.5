import { APPEARANCE_BLOCK_SCOPE_IDS } from './appearanceBlockCatalog';
import { glassTransparencyToOpacity, type GlassTransparencyId } from './glassTransparency';
import type { AppSettingsState } from './types';
import type { HomeLayoutSettings } from './types';

/** يزيل تجاوزات شفافية الأقسام حتى يُطبَّق الإعداد العام على كل البطاقات */
export function clearBlockGlassOpacityOverrides(
    overrides: HomeLayoutSettings['overrides'],
): HomeLayoutSettings['overrides'] {
    const next = { ...overrides };
    for (const id of APPEARANCE_BLOCK_SCOPE_IDS) {
        const block = next[id];
        if (!block || block.glassOpacity === undefined) continue;
        const { glassOpacity: _removed, ...rest } = block;
        if (Object.keys(rest).length > 0) next[id] = rest;
        else delete next[id];
    }
    return next;
}

export function buildGlobalGlassTransparencySettingsPatch(
    prev: AppSettingsState,
    level: GlassTransparencyId,
): AppSettingsState {
    return {
        ...prev,
        appearance: { ...prev.appearance, glassOpacity: glassTransparencyToOpacity(level) },
        homeLayout: {
            ...prev.homeLayout,
            overrides: clearBlockGlassOpacityOverrides(prev.homeLayout.overrides),
        },
    };
}
