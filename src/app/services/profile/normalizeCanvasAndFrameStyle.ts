import {
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_CANVAS_FRAME_SHAPES,
    PROFILE_CANVAS_INTERACTIONS,
    PROFILE_CANVAS_MATERIALS,
    PROFILE_IMAGE_INTERACTIONS,
} from './profilePageCatalog';
import { defaultImageFrameStyle, defaultTextCanvasStyle } from './profilePageDefaults';
import {
    sanitizeProfileCanvasColor,
    sanitizeProfileMediaUrl,
    sanitizeProfileStoragePath,
} from './profileUrlSanitize';
import type {
    ProfileBlockCanvasStyle,
    ProfileCanvasInteraction,
    ProfileImageFrameStyle,
} from './profilePageTypes';

function migrateCanvasInteraction(raw: unknown): ProfileCanvasInteraction | undefined {
    if (raw === 'petalSwipe') return 'stardust';
    if (typeof raw === 'string' && PROFILE_CANVAS_INTERACTIONS.some((i) => i.id === raw)) {
        return raw as ProfileCanvasInteraction;
    }
    return undefined;
}

export function normalizeCanvasStyle(raw: unknown): ProfileBlockCanvasStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Partial<ProfileBlockCanvasStyle>;
    const out: ProfileBlockCanvasStyle = { ...defaultTextCanvasStyle() };
    if (typeof o.enabled === 'boolean') out.enabled = o.enabled;
    if (typeof o.backgroundColor === 'string') {
        out.backgroundColor =
            sanitizeProfileCanvasColor(o.backgroundColor) ?? defaultTextCanvasStyle().backgroundColor;
    }
    if (typeof o.backgroundImage === 'string') {
        const safe = sanitizeProfileMediaUrl(o.backgroundImage);
        if (safe) out.backgroundImage = safe;
    }
    if (typeof o.backgroundStoragePath === 'string') {
        const path = sanitizeProfileStoragePath(o.backgroundStoragePath);
        if (path) out.backgroundStoragePath = path;
    }
    if (PROFILE_CANVAS_MATERIALS.some((m) => m.id === o.material)) out.material = o.material;
    if (PROFILE_CANVAS_FRAME_SHAPES.some((s) => s.id === o.frameShape)) out.frameShape = o.frameShape;
    if (PROFILE_CANVAS_FRAME_GLOWS.some((g) => g.id === o.frameGlow)) out.frameGlow = o.frameGlow;
    const migratedInteraction = migrateCanvasInteraction(o.interaction);
    if (migratedInteraction) out.interaction = migratedInteraction;
    if (typeof o.glowIntensity === 'number') {
        out.glowIntensity = Math.max(0, Math.min(1, o.glowIntensity));
    }
    if (typeof o.accentColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.accentColor)) {
        out.accentColor = o.accentColor;
    }
    if (typeof o.borderWidthPx === 'number') {
        out.borderWidthPx = Math.max(0, Math.min(6, Math.round(o.borderWidthPx)));
    }
    if (typeof o.paddingPx === 'number') {
        out.paddingPx = Math.max(8, Math.min(48, Math.round(o.paddingPx)));
    }
    if (typeof o.minHeightPx === 'number') {
        out.minHeightPx = Math.max(72, Math.min(360, Math.round(o.minHeightPx)));
    }
    if ((out.interaction ?? 'none') !== 'none') {
        out.enabled = true;
    }
    return out;
}

export function normalizeImageFrameStyle(raw: unknown): ProfileImageFrameStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Partial<ProfileImageFrameStyle>;
    const out: ProfileImageFrameStyle = { ...defaultImageFrameStyle() };
    if (typeof o.accentColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.accentColor)) {
        out.accentColor = o.accentColor;
    }
    if (PROFILE_CANVAS_FRAME_GLOWS.some((g) => g.id === o.frameGlow)) out.frameGlow = o.frameGlow;
    if (PROFILE_IMAGE_INTERACTIONS.some((i) => i.id === o.interaction)) out.interaction = o.interaction;
    if (o.rimStyle === 'minimal' || o.rimStyle === 'gold' || o.rimStyle === 'ornate' || o.rimStyle === 'neon') {
        out.rimStyle = o.rimStyle;
    }
    if (typeof o.glowIntensity === 'number') {
        out.glowIntensity = Math.max(0, Math.min(1, o.glowIntensity));
    }
    if (typeof o.vignette === 'boolean') out.vignette = o.vignette;
    return out;
}
