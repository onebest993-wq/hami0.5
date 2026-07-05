import React, { memo, useCallback, useMemo } from 'react';
import { Scale, ArrowLeft } from 'lucide-react';
import { useLawyerSettingsAppearance } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeHubTileId } from '@/app/services/settings/homeLayout';
import { HOME_HUB_TILE_LABELS } from '@/app/services/settings/homeBlockLabels';
import {
    resolveHomeBlockAccent,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    resolveHubTileMinHeight,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { hubExecutionTitleRem } from '@/app/services/settings/homeBlockScale';
import { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';
import { prefetchHubArchiveIntentDebounced } from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';
import { HomeBlockPatternOverlay } from '../HomeBlockPatternOverlay';
import { HomeMoroccanGlassDecor } from '../HomeMoroccanGlassDecor';

type HubCard = {
    id: string;
    tileId: HomeHubTileId;
    label: string;
    icon: typeof Scale;
    accent: string;
};

const HUB_TILE_BUTTON_A11Y =
    'touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

function bindArchivePrefetch(archiveId: string, interactionDisabled: boolean) {
    if (interactionDisabled) {
        return { onPointerEnter: undefined, onPointerDown: undefined };
    }
    const run = () => prefetchHubArchiveIntentDebounced(archiveId);
    return { onPointerEnter: run, onPointerDown: run };
}

function hubTilePressClass(
    variant: 'route' | 'hero',
    reduceMotion: boolean,
    interactionDisabled: boolean,
): string {
    if (reduceMotion || interactionDisabled) return '';
    return ` hami-hub-tile-press hami-hub-tile-press--${variant}`;
}

function tileShellClasses(override: HomeBlockStyleOverride | undefined, tileId: HomeHubTileId, minH: string) {
    return `relative overflow-hidden border w-full text-right active:opacity-[0.88] transition-opacity duration-200 ${HUB_TILE_BUTTON_A11Y} ${resolveHomeBlockClassNames(override)} ${minH}`;
}

type HubRouteVisuals = ReturnType<typeof resolveHubRouteTileVisuals>;

const HubIconBadge = memo(function HubIconBadge({
    icon: Icon,
    reduceMotion,
    visuals,
}: {
    icon: typeof Scale;
    reduceMotion: boolean;
    visuals: HubRouteVisuals;
}) {
    return (
        <div
            className={`relative shrink-0${reduceMotion ? '' : ' hami-hub-icon-badge-press'}`}
            style={visuals.iconWrapStyle}
        >
            <div
                className="absolute inset-0 rounded-[1.05rem] blur-md opacity-50 scale-110 pointer-events-none"
                style={visuals.iconGlowStyle}
                aria-hidden
            />
            <div
                className="absolute inset-0 rounded-[1.05rem] flex items-center justify-center overflow-hidden"
                style={visuals.iconBoxStyle}
            >
                <Icon strokeWidth={1.85} className="relative z-[1]" style={visuals.iconStyle} />
            </div>
        </div>
    );
});

const HubTileTitle = memo(function HubTileTitle({
    label,
    visuals,
}: {
    label: string;
    visuals: HubRouteVisuals;
}) {
    return (
        <div className="w-full min-w-0 text-right space-y-2">
            <p
                dir="rtl"
                lang="ar"
                aria-hidden
                className="font-['Cairo'] font-black leading-[1.06] tracking-[-0.04em]"
                style={visuals.titleStyle}
            >
                {label}
            </p>
            <span
                className="block rounded-full mr-0 ml-auto"
                style={visuals.titleRuleStyle}
                aria-hidden
            />
        </div>
    );
});

export const RouteTile = memo(function RouteTile({
    card,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    themePrimary,
    interactionDisabled = false,
    layoutSpan = 2,
}: {
    card: HubCard;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
}) {
    const appearance = useLawyerSettingsAppearance();
    const accent = resolveHomeBlockAccent(blockOverride, card.accent || themePrimary);
    const tileSize = blockOverride?.size ?? 'normal';
    const baseH = 156;
    const minH =
        layoutSpan === 1
            ? 'min-h-[5.5rem]'
            : blockOverride?.heightPx
              ? ''
              : resolveHubTileMinHeight(card.tileId, tileSize);
    const tileVisuals = useMemo(
        () => resolveHubRouteTileVisuals({ accent, size: tileSize, layoutSpan }),
        [accent, tileSize, layoutSpan],
    );
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, themePrimary, {
            baseMinHeightPx: baseH,
            skipContentScale: true,
            defaultGlassOpacity: appearance.glassOpacity,
        }),
        ...(blockOverride?.heightPx ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const prefetchHandlers = bindArchivePrefetch(card.id, interactionDisabled);
    const handleOpen = useCallback(() => {
        onOpenArchive(card.id);
    }, [card.id, onOpenArchive]);

    return (
        <button
            type="button"
            data-hami-block={card.tileId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`hub-archive-${card.id}`}
            aria-label={`${card.label} — فتح الأرشيف`}
            {...prefetchHandlers}
            onClick={interactionDisabled ? undefined : handleOpen}
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={layoutSpan}
            className={`${tileShellClasses(blockOverride, card.tileId, minH)} group${
                blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
            }${hubTilePressClass('route', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} />
            {layoutSpan === 2 ? (
                <div
                    className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-70"
                    style={tileVisuals.glowOrbStyle}
                    aria-hidden
                />
            ) : null}
            <div
                className={`relative z-10 flex h-full min-h-0 w-full ${
                    layoutSpan === 1
                        ? 'hami-hub-tile--half flex-row items-center justify-end gap-3 px-3.5 py-3'
                        : 'flex-col items-end gap-3 p-4 sm:p-5'
                }`}
            >
                <HubIconBadge icon={card.icon} reduceMotion={reduceMotion} visuals={tileVisuals} />
                <div className={`w-full min-w-0 ${layoutSpan === 1 ? 'hami-hub-tile-body pt-0' : 'mt-auto pt-0.5'}`}>
                    <div data-hami-edit-hide-in-layout={interactionDisabled || undefined}>
                        <HubTileTitle label={card.label} visuals={tileVisuals} />
                    </div>
                </div>
            </div>
        </button>
    );
});

export const ExecutionHero = memo(function ExecutionHero({
    accent,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    themePrimary,
    interactionDisabled = false,
    layoutSpan = 2,
}: {
    accent: string;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
}) {
    const appearance = useLawyerSettingsAppearance();
    const resolvedAccent = resolveHomeBlockAccent(blockOverride, accent || themePrimary);
    const execSize = blockOverride?.size ?? 'normal';
    const spanScale = layoutSpan === 1 ? 0.84 : 1;
    const titleRem = hubExecutionTitleRem(execSize) * spanScale;
    const minH =
        layoutSpan === 1
            ? 'min-h-[5.5rem]'
            : blockOverride?.heightPx
              ? ''
              : resolveHubTileMinHeight('hubExecution', execSize);
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, themePrimary, {
            baseMinHeightPx: 196,
            skipContentScale: true,
            defaultGlassOpacity: appearance.glassOpacity,
        }),
        ...(blockOverride?.heightPx ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        appearance.homeContainerBorder !== false,
    );
    const prefetchHandlers = bindArchivePrefetch('execution', interactionDisabled);
    const handleOpen = useCallback(() => {
        onOpenArchive('execution');
    }, [onOpenArchive]);
    const executionLabel = HOME_HUB_TILE_LABELS.hubExecution;

    return (
        <button
            type="button"
            data-hami-block="hubExecution"
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid="hub-archive-execution"
            aria-label={`${executionLabel} — فتح مخزن الإضابير التنفيذية`}
            {...prefetchHandlers}
            onClick={interactionDisabled ? undefined : handleOpen}
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            data-hami-layout-span={layoutSpan}
            className={`${tileShellClasses(blockOverride, 'hubExecution', minH)} group${
                blockOverride?.heightPx ? ' overflow-y-auto' : ' overflow-hidden'
            }${hubTilePressClass('hero', reduceMotion, interactionDisabled)}`}
            style={style}
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} />
            {layoutSpan === 2 ? (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `
                        radial-gradient(ellipse 70% 90% at 100% 0%, ${resolvedAccent}16, transparent 55%),
                        radial-gradient(ellipse 50% 70% at 0% 100%, rgba(255,255,255,0.04), transparent 50%)
                    `,
                    }}
                    aria-hidden
                />
            ) : null}
            <div
                className={`relative z-10 h-full flex ${
                    layoutSpan === 1
                        ? 'hami-hub-tile--half flex-row items-center justify-between gap-3 px-3.5 py-3'
                        : 'flex-col justify-end p-5 sm:p-6'
                }`}
            >
                <div className="min-w-0 text-right flex-1">
                    <p
                        dir="rtl"
                        lang="ar"
                        aria-hidden
                        data-hami-edit-hide-in-layout={interactionDisabled || undefined}
                        className="font-['Cairo'] font-black leading-[1.02] tracking-[-0.04em]"
                        style={{
                            fontSize: `calc(${titleRem}rem * var(--hami-content-scale, 1))`,
                            backgroundImage: `linear-gradient(148deg, #FFF9EE 0%, #F5F0E6 35%, color-mix(in srgb, ${resolvedAccent} 55%, #F5F0E6) 100%)`,
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            filter: `drop-shadow(0 4px 22px color-mix(in srgb, ${resolvedAccent} 40%, transparent))`,
                        }}
                    >
                        {executionLabel}
                    </p>
                </div>
                {layoutSpan === 2 ? (
                    <div
                        className="shrink-0 rounded-2xl flex items-center justify-center hami-sovereign-float ml-5 hami-hub-hero-icon"
                        style={{
                            width: `calc(3.5rem * var(--hami-content-scale, 1))`,
                            height: `calc(3.5rem * var(--hami-content-scale, 1))`,
                            background: `linear-gradient(160deg, ${resolvedAccent}28, rgba(0,0,0,0.5))`,
                            border: `1px solid ${resolvedAccent}35`,
                            boxShadow: `0 12px 40px ${resolvedAccent}18`,
                        }}
                    >
                        <ArrowLeft
                            className="text-[#FFF8E7]/90 transition-transform duration-300 group-hover:-translate-x-1"
                            strokeWidth={1.75}
                            style={{
                                width: `calc(1.375rem * var(--hami-content-scale, 1))`,
                                height: `calc(1.375rem * var(--hami-content-scale, 1))`,
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="shrink-0 rounded-xl flex items-center justify-center"
                        style={{
                            width: `calc(2.5rem * var(--hami-content-scale, 1))`,
                            height: `calc(2.5rem * var(--hami-content-scale, 1))`,
                            background: `linear-gradient(160deg, ${resolvedAccent}28, rgba(0,0,0,0.5))`,
                            border: `1px solid ${resolvedAccent}35`,
                            color: resolvedAccent,
                        }}
                        aria-hidden
                    >
                        <ArrowLeft strokeWidth={1.75} className="w-4 h-4" />
                    </div>
                )}
            </div>
        </button>
    );
});
