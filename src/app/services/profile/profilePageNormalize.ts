import {
    PROFILE_ACCENT_COLORS,
    PROFILE_BLOCK_SHAPES,
    PROFILE_CANVAS_FRAME_GLOWS,
    PROFILE_CANVAS_FRAME_SHAPES,
    PROFILE_CANVAS_INTERACTIONS,
    PROFILE_CANVAS_MATERIALS,
    PROFILE_IMAGE_INTERACTIONS,
    PROFILE_MATERIALS,
    PROFILE_MEDIA_TEMPLATES,
    PROFILE_PORTRAIT_FRAMES,
    PROFILE_TEXT_EFFECTS,
    PROFILE_TEXT_FONTS,
} from './profilePageCatalog';
import {
    defaultImageFrameStyle,
    defaultProfilePageCustomization,
    defaultTextCanvasStyle,
} from './profilePageDefaults';
import {
    clampPct,
    inferProfileBlockKind,
    resolveBlockPosition,
} from './profilePageLayout';
import {
    sanitizeProfileCanvasColor,
    sanitizeProfileMediaUrl,
    sanitizeProfileStoragePath,
} from './profileUrlSanitize';
import type {
    ProfileAppearanceSettings,
    ProfileBlockCanvasStyle,
    ProfileBlockKind,
    ProfileBlockTextStyle,
    ProfileCanvasInteraction,
    ProfileCustomBlock,
    ProfileFontSize,
    ProfileImageFrameStyle,
    ProfilePageCustomization,
    ProfilePrivacySettings,
    ProfileTextSpanStyle,
} from './profilePageTypes';

function migrateCanvasInteraction(raw: unknown): ProfileCanvasInteraction | undefined {
    if (raw === 'petalSwipe') return 'stardust';
    if (typeof raw === 'string' && PROFILE_CANVAS_INTERACTIONS.some((i) => i.id === raw)) {
        return raw as ProfileCanvasInteraction;
    }
    return undefined;
}

function coerceProfileFontSize(raw: unknown): ProfileFontSize {
    switch (raw) {
        case 'xs':
            return 'xs';
        case 'sm':
        case 'base':
            return 'base';
        case 'lg':
        case 'xl':
            return 'lg';
        case '2xl':
        case '3xl':
            return '2xl';
        default:
            return 'base';
    }
}

export function normalizeBlockTextStyle(raw: unknown): ProfileBlockTextStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as ProfileBlockTextStyle;
    /* placeholder فارغ من patchTextBlockStyle — لا تملأه بخطوط افتراضية تُفسد باقي الأسطر */
    if (Object.keys(o).length === 0) return {};

    const out: ProfileBlockTextStyle = {};
    if ('fontSize' in o) out.fontSize = coerceProfileFontSize(o.fontSize);
    if ('effect' in o) {
        out.effect = PROFILE_TEXT_EFFECTS.find((e) => e.id === o.effect)?.id ?? 'none';
    }
    if ('align' in o) {
        out.align = o.align === 'center' || o.align === 'left' ? o.align : 'right';
    }
    if ('fontWeight' in o) {
        out.fontWeight = o.fontWeight === 'bold' ? 'bold' : 'normal';
    }
    if ('color' in o) {
        out.color =
            typeof o.color === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.color) ? o.color : undefined;
    }
    if ('fontFamily' in o) {
        out.fontFamily = PROFILE_TEXT_FONTS.find((f) => f.id === o.fontFamily)?.id ?? 'literary';
    }
    if ('lineHeight' in o) {
        out.lineHeight =
            typeof o.lineHeight === 'number' ? Math.max(1, Math.min(3, o.lineHeight)) : undefined;
    }
    if ('letterSpacing' in o) {
        out.letterSpacing =
            typeof o.letterSpacing === 'number'
                ? Math.max(-1, Math.min(8, o.letterSpacing))
                : undefined;
    }
    return out;
}

export function mergeBlockTextStyles(
    base?: ProfileBlockTextStyle,
    override?: ProfileBlockTextStyle,
): ProfileBlockTextStyle {
    const result: ProfileBlockTextStyle = { ...(base ?? {}) };
    if (!override) return result;
    (Object.keys(override) as (keyof ProfileBlockTextStyle)[]).forEach((key) => {
        const value = override[key];
        if (value !== undefined) {
            (result as Record<string, unknown>)[key] = value;
        }
    });
    return result;
}

function normalizeTextSpan(raw: unknown, index: number): ProfileTextSpanStyle | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Partial<ProfileTextSpanStyle>;
    if (typeof o.lineIndex !== 'number' || typeof o.start !== 'number' || typeof o.end !== 'number') {
        return undefined;
    }
    const style = normalizeBlockTextStyle(o.style);
    if (!style) return undefined;
    const start = Math.max(0, Math.floor(o.start));
    const end = Math.max(start + 1, Math.floor(o.end));
    return {
        id: typeof o.id === 'string' ? o.id : `span-${index}`,
        lineIndex: Math.max(0, Math.floor(o.lineIndex)),
        start,
        end,
        style,
    };
}

function normalizeCanvasStyle(raw: unknown): ProfileBlockCanvasStyle | undefined {
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

function normalizeImageFrameStyle(raw: unknown): ProfileImageFrameStyle | undefined {
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

export function normalizeProfilePageCustomization(raw: unknown): ProfilePageCustomization {
    const base = defaultProfilePageCustomization();
    if (!raw || typeof raw !== 'object') return base;
    const o = raw as Partial<ProfilePageCustomization>;

    if (o.privacy && typeof o.privacy === 'object') {
        const p = o.privacy as Partial<ProfilePrivacySettings>;
        const pageAccess =
            p.pageAccess === 'public' || p.pageAccess === 'followers' || p.pageAccess === 'private'
                ? p.pageAccess
                : base.privacy.pageAccess ?? 'public';
        base.privacy = {
            pageAccess,
            showPhoneMeta: p.showPhoneMeta !== false,
            showCityMeta: p.showCityMeta !== false,
            showSyndicate: p.showSyndicate !== false,
            showContactChannels: p.showContactChannels !== false,
            showGallery: p.showGallery !== false,
            showCustomBlocks: p.showCustomBlocks !== false,
            hiddenContactIds: Array.isArray(p.hiddenContactIds)
                ? p.hiddenContactIds.filter((id): id is string => typeof id === 'string')
                : [],
        };
    }

    if (o.appearance && typeof o.appearance === 'object') {
        const a = o.appearance as Partial<ProfileAppearanceSettings>;
        const color = PROFILE_ACCENT_COLORS.find((c) => c.id === a.accentColor)?.id ?? 'gold';
        const material = PROFILE_MATERIALS.find((m) => m.id === a.material)?.id ?? 'glass';
        const portraitFrame =
            PROFILE_PORTRAIT_FRAMES.find((f) => f.id === a.portraitFrame)?.id ?? 'classic';
        base.appearance = { accentColor: color, material, portraitFrame };
    }

    if (Array.isArray(o.customBlocks)) {
        base.customBlocks = o.customBlocks
            .filter((b): b is ProfileCustomBlock => Boolean(b) && typeof b === 'object' && typeof (b as ProfileCustomBlock).id === 'string')
            .map((b, index) => {
                const kind: ProfileBlockKind =
                    b.kind === 'image' || b.kind === 'text' ? b.kind : inferProfileBlockKind(b);
                const rawTemplate = (b as { mediaTemplate?: string }).mediaTemplate;
                const legacyTemplate =
                    rawTemplate === 'polaroid'
                        ? 'arch'
                        : PROFILE_MEDIA_TEMPLATES.find((t) => t.id === rawTemplate)?.id;
                const hasPos =
                    typeof b.posX === 'number' &&
                    typeof b.posY === 'number' &&
                    Number.isFinite(b.posX) &&
                    Number.isFinite(b.posY);
                const migrated = hasPos
                    ? {
                          posX: clampPct(Number(b.posX), 0, 94),
                          posY: clampPct(Number(b.posY), 0, 90),
                      }
                    : resolveBlockPosition(
                          {
                              ...b,
                              kind,
                              order: typeof b.order === 'number' ? b.order : index,
                          } as ProfileCustomBlock,
                          index,
                      );

                return {
                    id: b.id,
                    kind,
                    title: String(b.title ?? (kind === 'image' ? 'صورة' : 'نص حر')).slice(0, 48),
                    shape: PROFILE_BLOCK_SHAPES.find((s) => s.id === b.shape)?.id ?? 'rounded',
                    width: b.width === 'half' ? 'half' : 'full',
                    minHeightPx: Math.max(80, Math.min(480, Number(b.minHeightPx) || 140)),
                    imageUrl: sanitizeProfileMediaUrl(
                        typeof b.imageUrl === 'string' ? b.imageUrl : undefined,
                    ),
                    imageStoragePath: sanitizeProfileStoragePath(
                        typeof (b as { imageStoragePath?: string }).imageStoragePath === 'string'
                            ? (b as { imageStoragePath?: string }).imageStoragePath
                            : undefined,
                    ),
                    mediaTemplate: kind === 'image' ? legacyTemplate ?? 'circle' : undefined,
                    body:
                        typeof b.body === 'string'
                            ? b.body.slice(0, 2000)
                            : kind === 'text' && typeof b.title === 'string' && b.title.trim()
                              ? b.title.slice(0, 2000)
                              : undefined,
                    order: typeof b.order === 'number' ? b.order : index,
                    posX: migrated.posX,
                    posY: migrated.posY,
                    blockWidthPct: clampPct(
                        Number(b.blockWidthPct) ||
                            (kind === 'image' ? (b.width === 'half' ? 38 : 42) : b.width === 'half' ? 46 : 92),
                        28,
                        96,
                    ),
                    offsetX: Math.max(-48, Math.min(48, Number(b.offsetX) || 0)),
                    offsetY: Math.max(-48, Math.min(48, Number(b.offsetY) || 0)),
                    imageHeightPx: Math.max(72, Math.min(320, Number(b.imageHeightPx) || 160)),
                    imageFocusX:
                        typeof b.imageFocusX === 'number'
                            ? Math.max(0, Math.min(100, Math.round(b.imageFocusX)))
                            : 50,
                    imageFocusY:
                        typeof b.imageFocusY === 'number'
                            ? Math.max(0, Math.min(100, Math.round(b.imageFocusY)))
                            : 50,
                    imageZoom:
                        typeof b.imageZoom === 'number'
                            ? Math.max(100, Math.min(220, Math.round(b.imageZoom)))
                            : 100,
                    imageFrameStyle: normalizeImageFrameStyle(b.imageFrameStyle),
                    titleStyle: normalizeBlockTextStyle(b.titleStyle),
                    bodyStyle: normalizeBlockTextStyle(b.bodyStyle) ?? {
                        fontSize: 'lg',
                        effect: 'none',
                        align: 'right',
                        color: '#ffffff',
                        fontFamily: 'literary',
                        lineHeight: 1.85,
                    },
                    lineStyles: Array.isArray(b.lineStyles)
                        ? b.lineStyles.map((line) => {
                              if (!line || typeof line !== 'object') return {};
                              return normalizeBlockTextStyle(line) ?? {};
                          })
                        : undefined,
                    textSpans: Array.isArray(b.textSpans)
                        ? b.textSpans
                              .map((span, spanIndex) => normalizeTextSpan(span, spanIndex))
                              .filter((span): span is ProfileTextSpanStyle => Boolean(span))
                        : undefined,
                    canvasStyle: normalizeCanvasStyle(b.canvasStyle),
                };
            });
    }

    return base;
}
