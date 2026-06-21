// @ts-nocheck
import React from 'react';
import { motion } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { Scale, FileText, ArrowLeft } from 'lucide-react';
import { SOV_GOLD, SOV_GOLD_DIM, SOV_PEARL } from './lawyerHomeTheme';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import type { HomeBlockStyleOverride, HomeHubTileId } from '@/app/services/settings/homeLayout';
import { moveOrderItem } from '@/app/services/settings/homeLayout';
import { HOME_HUB_TILE_LABELS } from '@/app/services/settings/homeBlockLabels';
import {
    isBlockVisible,
    resolveHomeBlockAccent,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    resolveHubTileMinHeight,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import {
    hubExecutionTitleRem,
    hubIconBoxPx,
    hubIconStrokePx,
    hubRouteTitleRem,
} from '@/app/services/settings/homeBlockScale';
import { DraggableHomeWidget } from './homeLayoutEdit/DraggableHomeWidget';
import { HomeBlockPatternOverlay } from './HomeBlockPatternOverlay';
import { useHomeLayoutEdit } from './homeLayoutEdit/HomeLayoutEditContext';
import { useSettingsPatches } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsPatches';
import { getWidgetsInZone } from '@/app/services/settings/homeLayout';

type HubCard = {
    id: string;
    tileId: HomeHubTileId;
    label: string;
    icon: typeof Scale;
    accent: string;
};

type UnifiedCommandHubProps = {
    theme?: { primary?: string; secondary?: string };
    shapeClass?: string;
    onOpenArchive: (id: string) => void;
    onPrefetchExecution?: () => void;
};

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.04, delayChildren: 0 },
    },
};

const item = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
    },
};

function GlassSheen({ enabled = true }: { enabled?: boolean }) {
    if (!enabled) return null;
    return (
        <>
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.55]"
                style={{
                    background:
                        'linear-gradient(165deg, rgba(255,255,255,0.09) 0%, transparent 42%, rgba(255,255,255,0.02) 100%)',
                }}
                aria-hidden
            />
            <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />
        </>
    );
}

function tileShellClasses(override: HomeBlockStyleOverride | undefined, tileId: HomeHubTileId, minH: string) {
    return `relative overflow-hidden border w-full text-right active:opacity-[0.88] transition-opacity duration-200 ${resolveHomeBlockClassNames(override)} ${minH}`;
}

function HubIconBadge({
    icon: Icon,
    accent,
    reduceMotion,
    size = 'normal',
}: {
    icon: typeof Scale;
    accent: string;
    reduceMotion: boolean;
    size?: HomeBlockStyleOverride['size'];
}) {
    const boxPx = hubIconBoxPx(size ?? 'normal');
    const iconPx = hubIconStrokePx(size ?? 'normal');

    return (
        <motion.div
            className="relative shrink-0"
            style={{
                width: `calc(${boxPx}px * var(--hami-content-scale, 1))`,
                height: `calc(${boxPx}px * var(--hami-content-scale, 1))`,
            }}
            whileHover={reduceMotion ? undefined : { scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
            <div
                className="absolute inset-0 rounded-[1.05rem] blur-md opacity-50 scale-110 pointer-events-none"
                style={{ background: `color-mix(in srgb, ${accent} 40%, transparent)` }}
                aria-hidden
            />
            <div
                className="absolute inset-0 rounded-[1.05rem] flex items-center justify-center overflow-hidden"
                style={{
                    background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 28%, rgba(255,255,255,0.08)) 0%, rgba(0,0,0,0.58) 100%)`,
                    border: `1px solid color-mix(in srgb, ${accent} 48%, transparent)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 24px color-mix(in srgb, ${accent} 18%, transparent)`,
                }}
            >
                <Icon
                    strokeWidth={1.85}
                    className="relative z-[1]"
                    style={{
                        width: `calc(${iconPx}px * var(--hami-content-scale, 1))`,
                        height: `calc(${iconPx}px * var(--hami-content-scale, 1))`,
                        color: accent,
                        filter: `drop-shadow(0 2px 10px color-mix(in srgb, ${accent} 45%, transparent))`,
                    }}
                />
            </div>
        </motion.div>
    );
}

function HubTileTitle({
    label,
    accent,
    size = 'normal',
}: {
    label: string;
    accent: string;
    size?: HomeBlockStyleOverride['size'];
}) {
    const baseRem = hubRouteTitleRem(size ?? 'normal');

    return (
        <div className="w-full min-w-0 text-right space-y-2">
            <p
                dir="rtl"
                lang="ar"
                className="font-['Cairo'] font-black leading-[1.06] tracking-[-0.04em]"
                style={{
                    fontSize: `calc(${baseRem}rem * var(--hami-content-scale, 1))`,
                    backgroundImage: `linear-gradient(148deg, #FFF9EE 0%, #F8F2E8 38%, color-mix(in srgb, ${accent} 48%, #F5F0E6) 100%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: `drop-shadow(0 3px 16px color-mix(in srgb, ${accent} 45%, transparent))`,
                }}
            >
                {label}
            </p>
            <span
                className="block rounded-full mr-0 ml-auto"
                style={{
                    width: `calc(2.85rem * var(--hami-content-scale, 1))`,
                    height: `max(2px, calc(2.5px * var(--hami-content-scale, 1)))`,
                    background: `linear-gradient(to left, color-mix(in srgb, ${accent} 95%, #FFF8E7), color-mix(in srgb, ${accent} 30%, transparent), transparent)`,
                    boxShadow: `0 0 14px color-mix(in srgb, ${accent} 38%, transparent)`,
                }}
                aria-hidden
            />
        </div>
    );
}

export function RouteTile({
    card,
    onOpenArchive,
    reduceMotion,
    blockOverride,
    themePrimary,
    interactionDisabled = false,
}: {
    card: HubCard;
    onOpenArchive: (id: string) => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
}) {
    const { settings } = useLawyerSettings();
    const accent = resolveHomeBlockAccent(blockOverride, card.accent || themePrimary);
    const tileSize = blockOverride?.size ?? 'normal';
    const baseH = 156;
    const minH = blockOverride?.heightPx ? '' : resolveHubTileMinHeight(card.tileId, tileSize);
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, themePrimary, {
            baseMinHeightPx: baseH,
            skipContentScale: true,
            defaultGlassOpacity: settings.appearance.glassOpacity,
        }),
        ...(blockOverride?.heightPx ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        settings.appearance.homeContainerBorder !== false,
    );

    return (
        <motion.button
            type="button"
            data-hami-block={card.tileId}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid={`hub-archive-${card.id}`}
            variants={item}
            whileHover={reduceMotion || interactionDisabled ? undefined : { scale: 1.015 }}
            whileTap={interactionDisabled ? undefined : { scale: 0.975 }}
            onClick={
                interactionDisabled
                    ? undefined
                    : () => onOpenArchive(card.id)
            }
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            className={`${tileShellClasses(blockOverride, card.tileId, minH)} group ${
                blockOverride?.heightPx ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
            style={style}
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            <GlassSheen enabled={shouldShowHomeBlockSheen(blockOverride?.pattern)} />
            <div
                className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40 pointer-events-none transition-opacity duration-500 group-hover:opacity-70"
                style={{ background: `${accent}33` }}
                aria-hidden
            />
            <div className="relative z-10 flex h-full min-h-0 flex-col items-end gap-3 p-4 sm:p-5">
                <HubIconBadge
                    icon={card.icon}
                    accent={accent}
                    reduceMotion={reduceMotion}
                    size={tileSize}
                />
                <div className="mt-auto w-full min-w-0 pt-0.5">
                    <HubTileTitle label={card.label} accent={accent} size={tileSize} />
                </div>
            </div>
        </motion.button>
    );
}

export function ExecutionHero({
    accent,
    onOpenArchive,
    onPrefetchExecution,
    reduceMotion,
    blockOverride,
    themePrimary,
    interactionDisabled = false,
}: {
    accent: string;
    onOpenArchive: (id: string) => void;
    onPrefetchExecution?: () => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary: string;
    interactionDisabled?: boolean;
}) {
    const { settings } = useLawyerSettings();
    const resolvedAccent = resolveHomeBlockAccent(blockOverride, accent || themePrimary);
    const execSize = blockOverride?.size ?? 'normal';
    const titleRem = hubExecutionTitleRem(execSize);
    const minH = blockOverride?.heightPx ? '' : resolveHubTileMinHeight('hubExecution', execSize);
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(blockOverride, themePrimary, {
            baseMinHeightPx: 196,
            skipContentScale: true,
            defaultGlassOpacity: settings.appearance.glassOpacity,
        }),
        ...(blockOverride?.heightPx ? { minHeight: blockOverride.heightPx } : {}),
    };
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        settings.appearance.homeContainerBorder !== false,
    );
    const prefetch = () => {
        if (interactionDisabled) return;
        onPrefetchExecution?.();
    };

    return (
        <motion.button
            type="button"
            data-hami-block="hubExecution"
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-testid="hub-archive-execution"
            variants={item}
            whileHover={reduceMotion || interactionDisabled ? undefined : { scale: 1.008 }}
            whileTap={interactionDisabled ? undefined : { scale: 0.985 }}
            onMouseEnter={interactionDisabled ? undefined : prefetch}
            onFocus={interactionDisabled ? undefined : prefetch}
            onClick={
                interactionDisabled
                    ? undefined
                    : () => {
                          prefetch();
                          onOpenArchive('execution');
                      }
            }
            disabled={interactionDisabled}
            tabIndex={interactionDisabled ? -1 : 0}
            className={`${tileShellClasses(blockOverride, 'hubExecution', minH)} group ${
                blockOverride?.heightPx ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
            style={style}
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            <GlassSheen enabled={shouldShowHomeBlockSheen(blockOverride?.pattern)} />
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
            <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0 text-right flex-1">
                        <p
                            dir="rtl"
                            lang="ar"
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
                            {'تنفيذ'}
                        </p>
                    </div>
                    <motion.div
                        className="shrink-0 rounded-2xl flex items-center justify-center hami-sovereign-float ml-5"
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
                    </motion.div>
                </div>
            </div>
        </motion.button>
    );
}

export const UnifiedCommandHub = ({
    theme,
    onOpenArchive,
    onPrefetchExecution,
}: UnifiedCommandHubProps) => {
    const reduceMotion = useReduceMotion();
    const { settings } = useLawyerSettings();
    const { patchHomeLayout } = useSettingsPatches();
    const { isEditing } = useHomeLayoutEdit();
    const { placements, overrides } = settings.homeLayout;
    const accent = theme?.primary ?? SOV_GOLD;
    const secondaryAccent = theme?.secondary ?? SOV_GOLD_DIM;
    const themePrimary = accent;

    const hubTileOrder = getWidgetsInZone(placements, 'main').filter(
        (id): id is HomeHubTileId =>
            id === 'hubExecution' || id === 'hubLawsuit' || id === 'hubTransaction',
    );

    const tileVisible = (tileId: HomeHubTileId) =>
        isEditing || isBlockVisible(overrides[tileId]);

    const routes: HubCard[] = [
        {
            id: 'lawsuit',
            tileId: 'hubLawsuit',
            label: 'دعاوى',
            icon: Scale,
            accent,
        },
        {
            id: 'transaction',
            tileId: 'hubTransaction',
            label: 'معاملات',
            icon: FileText,
            accent: secondaryAccent,
        },
    ];

    const routeByTile = Object.fromEntries(routes.map((r) => [r.tileId, r])) as Record<
        'hubLawsuit' | 'hubTransaction',
        HubCard
    >;

    const tileNodes: Record<HomeHubTileId, React.ReactNode> = {
        hubExecution: tileVisible('hubExecution') ? (
            <ExecutionHero
                accent={accent}
                onOpenArchive={onOpenArchive}
                onPrefetchExecution={onPrefetchExecution}
                reduceMotion={reduceMotion}
                blockOverride={overrides.hubExecution}
                themePrimary={themePrimary}
            />
        ) : null,
        hubLawsuit: tileVisible('hubLawsuit') ? (
            <RouteTile
                card={routeByTile.hubLawsuit}
                onOpenArchive={onOpenArchive}
                reduceMotion={reduceMotion}
                blockOverride={overrides.hubLawsuit}
                themePrimary={themePrimary}
            />
        ) : null,
        hubTransaction: tileVisible('hubTransaction') ? (
            <RouteTile
                card={routeByTile.hubTransaction}
                onOpenArchive={onOpenArchive}
                reduceMotion={reduceMotion}
                blockOverride={overrides.hubTransaction}
                themePrimary={themePrimary}
            />
        ) : null,
    };

    return (
        <motion.div
            className="grid grid-cols-2 gap-3.5"
            variants={isEditing ? undefined : container}
            initial={isEditing ? false : 'hidden'}
            animate={isEditing ? undefined : 'show'}
        >
            {hubTileOrder.map((tileId) => {
                const node = tileNodes[tileId];
                if (!node) return null;
                const span = overrides[tileId]?.span ?? (tileId === 'hubExecution' ? 2 : 1);
                const hidden = !isBlockVisible(overrides[tileId]);
                return (
                    <div key={tileId} className={span === 2 ? 'col-span-2' : undefined}>
                        <DraggableHomeWidget
                            widgetId={tileId}
                            zone="main"
                            label={HOME_HUB_TILE_LABELS[tileId]}
                            className={hidden && isEditing ? 'opacity-45' : ''}
                            blockOverride={overrides[tileId]}
                            currentHeightPx={overrides[tileId]?.heightPx}
                            currentSpan={span}
                            onResizeHeight={(heightPx) =>
                                patchHomeLayout({
                                    overrides: {
                                        ...overrides,
                                        [tileId]: { ...overrides[tileId], heightPx },
                                    },
                                })
                            }
                            onResizeSpan={(nextSpan) =>
                                patchHomeLayout({
                                    overrides: {
                                        ...overrides,
                                        [tileId]: { ...overrides[tileId], span: nextSpan },
                                    },
                                })
                            }
                        >
                            {node}
                        </DraggableHomeWidget>
                    </div>
                );
            })}
        </motion.div>
    );
};
