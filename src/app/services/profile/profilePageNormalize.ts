import {
    PROFILE_ACCENT_COLORS,
    PROFILE_BLOCK_SHAPES,
    PROFILE_MATERIALS,
    PROFILE_MEDIA_TEMPLATES,
    PROFILE_PORTRAIT_FRAMES,
} from './profilePageCatalog';
import { defaultProfilePageCustomization } from './profilePageDefaults';
import {
    clampPct,
    inferProfileBlockKind,
    resolveBlockPosition,
} from './profilePageLayout';
import {
    sanitizeProfileMediaUrl,
    sanitizeProfileStoragePath,
} from './profileUrlSanitize';
import type {
    ProfileAppearanceSettings,
    ProfileBlockKind,
    ProfileCustomBlock,
    ProfilePageCustomization,
    ProfilePrivacySettings,
    ProfileTextSpanStyle,
} from './profilePageTypes';
import { normalizeBlockTextStyle, normalizeTextSpan } from './normalizeBlockTextStyle';
import { normalizeCanvasStyle, normalizeImageFrameStyle } from './normalizeCanvasAndFrameStyle';

export { mergeBlockTextStyles, normalizeBlockTextStyle } from './normalizeBlockTextStyle';

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
