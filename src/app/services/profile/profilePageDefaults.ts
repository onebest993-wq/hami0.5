import { DEFAULT_PROFILE_APPEARANCE, DEFAULT_PROFILE_PRIVACY } from './profilePageCatalog';
import type {
    ProfileBlockCanvasStyle,
    ProfileBlockKind,
    ProfileCustomBlock,
    ProfileImageFrameStyle,
    ProfilePageCustomization,
} from './profilePageTypes';

export function defaultImageFrameStyle(): ProfileImageFrameStyle {
    return {
        accentColor: '#E6C673',
        frameGlow: 'gold',
        glowIntensity: 0.6,
        rimStyle: 'gold',
        interaction: 'none',
        vignette: true,
    };
}

export function resolveImageFrameStyle(block: ProfileCustomBlock): ProfileImageFrameStyle {
    return { ...defaultImageFrameStyle(), ...block.imageFrameStyle };
}

export function defaultTextCanvasStyle(): ProfileBlockCanvasStyle {
    return {
        enabled: false,
        material: 'glass',
        frameShape: 'rounded',
        frameGlow: 'soft',
        glowIntensity: 0.55,
        backgroundColor: 'rgba(10,15,28,0.62)',
        accentColor: '#E6C673',
        borderWidthPx: 1,
        paddingPx: 16,
        minHeightPx: 120,
        interaction: 'none',
    };
}

export function resolveBlockCanvasStyle(block: ProfileCustomBlock): ProfileBlockCanvasStyle {
    const merged = { ...defaultTextCanvasStyle(), ...block.canvasStyle };
    if ((merged.interaction ?? 'none') !== 'none') {
        merged.enabled = true;
    }
    return merged;
}

export function defaultBlockLayout(index: number, kind: ProfileBlockKind): {
    posX: number;
    posY: number;
    blockWidthPct: number;
} {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return {
        posX: col === 0 ? 6 : 52,
        posY: row * 24 + 4,
        blockWidthPct: kind === 'image' ? 38 : col === 0 ? 88 : 42,
    };
}

export function defaultProfilePageCustomization(): ProfilePageCustomization {
    return {
        privacy: { ...DEFAULT_PROFILE_PRIVACY, hiddenContactIds: [] },
        appearance: { ...DEFAULT_PROFILE_APPEARANCE },
        customBlocks: [],
    };
}
