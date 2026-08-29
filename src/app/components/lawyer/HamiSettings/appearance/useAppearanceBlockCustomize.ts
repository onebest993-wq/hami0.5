import { useCallback, useMemo, useState } from 'react';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsHomeLayout,
} from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    APPEARANCE_BLOCK_SCOPE_IDS,
    appearanceBlockLabel,
} from '@/app/services/settings/appearanceBlockCatalog';
import {
    glassTransparencyToOpacity,
    opacityToGlassTransparency,
    opacityToPatternIntensity,
    patternIntensityToOpacity,
    type BackgroundPresetId,
} from '@/app/services/settings';
import type { ThemeKey } from '@/app/types/common';
import { useSettingsPatches } from '../hooks/useSettingsPatches';
import { shapeKeyToHomeBlockShape } from '@/app/services/settings/resolveHomeBlockStyle';
import type { ShapeKey } from '@/app/types/common';
import {
    BLOCK_APPEARANCE_RESET,
    blockHasAppearanceOverride,
    resolveEffectiveForBlock,
} from './appearanceBlockEffective';
import { useAppearanceBlockSelection } from './useAppearanceBlockSelection';

export function useAppearanceBlockCustomize() {
    const appearance = useLawyerSettingsAppearance();
    const { overrides } = useLawyerSettingsHomeLayout();
    const { patchBlockOverride, patchGlobalGlassTransparency } = useSettingsPatches();
    const [panelOpen, setPanelOpen] = useState(false);
    const selection = useAppearanceBlockSelection();
    const { selectedIds, isAllSelected } = selection;

    const primaryBlockId = selectedIds[0] ?? null;
    const override = primaryBlockId ? overrides[primaryBlockId] : undefined;

    const effective = useMemo(
        () => resolveEffectiveForBlock(appearance, override),
        [appearance, override],
    );

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
        ...selection,
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
