import { useCallback, useMemo, useState } from 'react';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
} from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeBlockShape } from '@/app/services/settings/homeLayout';
import {
    APPEARANCE_BLOCK_SCOPE_IDS,
    appearanceBlockLabel,
    type AppearanceBlockScopeId,
} from '@/app/services/settings/appearanceBlockCatalog';
import {
    glassTransparencyToOpacity,
    opacityToGlassTransparency,
    opacityToPatternIntensity,
    patternIntensityToOpacity,
    normalizeBackgroundPreset,
    type BackgroundPresetId,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import { resolveCardThemeKey, resolvePatternThemeKey } from '@/app/services/settings/themeResolve';
import { shapeKeyToHomeBlockShape } from '@/app/services/settings/resolveHomeBlockStyle';
import type { ShapeKey } from '@/app/types/common';

function homeBlockShapeToShapeKey(shape: HomeBlockShape): ShapeKey {
    return shape === 'sharp' ? 'square' : shape;
}

const BLOCK_APPEARANCE_RESET: Partial<HomeBlockStyleOverride> = {
    cardTheme: undefined,
    patternTheme: undefined,
    backgroundPreset: undefined,
    patternOpacity: undefined,
    glassOpacity: undefined,
    containerBorder: undefined,
    shape: undefined,
    accentColor: undefined,
};

const APPEARANCE_OVERRIDE_KEYS = Object.keys(BLOCK_APPEARANCE_RESET) as (keyof HomeBlockStyleOverride)[];

function blockHasAppearanceOverride(override?: HomeBlockStyleOverride): boolean {
    if (!override) return false;
    return APPEARANCE_OVERRIDE_KEYS.some((key) => override[key] !== undefined);
}

function resolveEffectiveForBlock(
    appearance: ReturnType<typeof useLawyerSettingsAppearance>,
    override?: HomeBlockStyleOverride,
) {
    return {
        cardThemeKey: override?.cardTheme ?? resolveCardThemeKey(appearance),
        patternThemeKey: override?.patternTheme ?? resolvePatternThemeKey(appearance),
        backgroundPreset:
            override?.backgroundPreset ?? normalizeBackgroundPreset(appearance.backgroundPreset),
        patternIntensity: opacityToPatternIntensity(
            override?.patternOpacity ?? appearance.backgroundPatternOpacity,
        ),
        glassTransparency: opacityToGlassTransparency(
            override?.glassOpacity ?? appearance.glassOpacity,
        ),
        containerBorder:
            override?.containerBorder !== undefined
                ? override.containerBorder
                : appearance.homeContainerBorder !== false,
        glassOpacity: override?.glassOpacity ?? appearance.glassOpacity,
        patternOpacity: override?.patternOpacity ?? appearance.backgroundPatternOpacity,
        blockShape: override?.shape ?? shapeKeyToHomeBlockShape(appearance.shape),
        shapeKey: homeBlockShapeToShapeKey(
            override?.shape ?? shapeKeyToHomeBlockShape(appearance.shape),
        ),
    };
}

export function useAppearanceBlockCustomize() {
    const appearance = useLawyerSettingsAppearance();
    const { overrides } = useLawyerSettingsHomeLayout();
    const { patchBlockOverride, patchGlobalGlassTransparency } = useSettingsPatches();
    const [panelOpen, setPanelOpen] = useState(false);
    const [selectedBlockIds, setSelectedBlockIds] = useState<Set<AppearanceBlockScopeId>>(() => new Set());

    const selectedIds = useMemo(
        () => APPEARANCE_BLOCK_SCOPE_IDS.filter((id) => selectedBlockIds.has(id)),
        [selectedBlockIds],
    );

    const primaryBlockId = selectedIds[0] ?? null;
    const override = primaryBlockId ? overrides[primaryBlockId] : undefined;

    const effective = useMemo(
        () => resolveEffectiveForBlock(appearance, override),
        [appearance, override],
    );

    const toggleBlock = useCallback((id: AppearanceBlockScopeId) => {
        setSelectedBlockIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const isSelected = useCallback((id: AppearanceBlockScopeId) => selectedBlockIds.has(id), [selectedBlockIds]);

    const isAllSelected = selectedIds.length === APPEARANCE_BLOCK_SCOPE_IDS.length;

    const toggleSelectAll = useCallback(() => {
        setSelectedBlockIds((prev) => {
            if (prev.size === APPEARANCE_BLOCK_SCOPE_IDS.length) {
                return new Set();
            }
            return new Set(APPEARANCE_BLOCK_SCOPE_IDS);
        });
    }, []);

    const patchSelected = useCallback(
        (patch: Partial<HomeBlockStyleOverride>) => {
            if (selectedIds.length === 0) return;
            for (const id of selectedIds) {
                patchBlockOverride(id, patch);
            }
        },
        [patchBlockOverride, selectedIds],
    );

    const setCardTheme = useCallback((key: ThemeKey) => patchSelected({ cardTheme: key }), [patchSelected]);

    const setPatternTheme = useCallback(
        (key: ThemeKey) => patchSelected({ patternTheme: key }),
        [patchSelected],
    );

    const setBackgroundPreset = useCallback(
        (id: BackgroundPresetId) => patchSelected({ backgroundPreset: id }),
        [patchSelected],
    );

    const setPatternIntensity = useCallback(
        (level: ReturnType<typeof opacityToPatternIntensity>) => {
            patchSelected({ patternOpacity: patternIntensityToOpacity(level) });
        },
        [patchSelected],
    );

    const setGlassTransparency = useCallback(
        (level: ReturnType<typeof opacityToGlassTransparency>) => {
            if (isAllSelected) {
                patchGlobalGlassTransparency(level);
                return;
            }
            patchSelected({ glassOpacity: glassTransparencyToOpacity(level) });
        },
        [isAllSelected, patchGlobalGlassTransparency, patchSelected],
    );

    const setContainerBorder = useCallback(
        (enabled: boolean) => patchSelected({ containerBorder: enabled }),
        [patchSelected],
    );

    const setShape = useCallback(
        (shapeKey: ShapeKey) => patchSelected({ shape: shapeKeyToHomeBlockShape(shapeKey) }),
        [patchSelected],
    );

    const resetBlock = useCallback(() => {
        if (selectedIds.length === 0) return;
        for (const id of selectedIds) {
            patchBlockOverride(id, BLOCK_APPEARANCE_RESET);
        }
    }, [patchBlockOverride, selectedIds]);

    const hasCustomOverride = useMemo(
        () => selectedIds.some((id) => blockHasAppearanceOverride(overrides[id])),
        [overrides, selectedIds],
    );

    return {
        blocks: APPEARANCE_BLOCK_SCOPE_IDS,
        blockLabel: appearanceBlockLabel,
        panelOpen,
        setPanelOpen,
        selectedIds,
        selectedCount: selectedIds.length,
        isAllSelected,
        toggleSelectAll,
        toggleBlock,
        isSelected,
        override,
        effective,
        hasCustomOverride,
        setCardTheme,
        setPatternTheme,
        setBackgroundPreset,
        setPatternIntensity,
        setGlassTransparency,
        setContainerBorder,
        setShape,
        resetBlock,
        appearance,
    };
}

export type AppearanceBlockCustomize = ReturnType<typeof useAppearanceBlockCustomize>;
