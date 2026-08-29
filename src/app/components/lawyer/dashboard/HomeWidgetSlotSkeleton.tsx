import React from 'react';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import { HOME_WIDGET_LABELS, dockShellLabel } from '@/app/services/settings/homeBlockLabels';
import {
    resolveBlockContainerBorder,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { mergeBlockScopedAppearance, resolveCardThemePrimary } from '@/app/services/settings/themeResolve';
import type { AppearanceSettings } from '@/app/services/settings/types';
import { HomeBlockPatternOverlay } from './HomeBlockPatternOverlay';
import { HomeHubCardSkeleton } from './HomeHubCardSkeleton';
import { ForumTileProfileQuarterFallback } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterFallback';
import { peekForumFirstPaintChrome } from './peekForumFirstPaintChrome';
import { HUB_HALF_TILE_BASE_PX, HUB_HALF_TILE_MIN_CLASS } from './hubHalfTileMetrics';
import { HUB_TILE_BUTTON_A11Y } from '@/app/components/lawyer/dashboard/commandHub/commandHubTileClasses';

function slotLabel(id: HomeMainGridSlot['id']): string {
    if (id === 'forum') return dockShellLabel('forum');
    if (id === 'alerts') return dockShellLabel('alerts');
    return HOME_WIDGET_LABELS[id] ?? id;
}

type SkeletonPointerHandlers = {
    onPointerEnter?: () => void;
    onPointerDown?: () => void;
    onFocus?: () => void;
};

function skeletonActivateProps(
    interactive: boolean,
    onActivate: (() => void) | undefined,
    pointerHandlers: SkeletonPointerHandlers | undefined,
    nativeButton = false,
) {
    return {
        'aria-busy': interactive ? undefined : ('true' as const),
        role: nativeButton || !interactive ? undefined : ('button' as const),
        tabIndex: nativeButton || !interactive ? undefined : 0,
        onClick: interactive ? onActivate : undefined,
        onKeyDown:
            interactive && !nativeButton
                ? (event: React.KeyboardEvent) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onActivate?.();
                      }
                  }
                : undefined,
        onPointerEnter: pointerHandlers?.onPointerEnter,
        onPointerDown: pointerHandlers?.onPointerDown,
        onFocus: pointerHandlers?.onFocus,
    };
}

function SkeletonHubTitle({ label }: { label: string }) {
    return (
        <div className="hami-hub-tile-face" data-hami-hub-face="1">
            <p
                dir="rtl"
                lang="ar"
                className="hami-hub-title hami-hub-title-crystal tracking-[-0.025em] hami-hub-title--half-fill text-center"
                style={{ ['--hami-hub-title-size' as string]: '2.05rem' }}
            >
                {label}
            </p>
            <span className="hami-hub-title-mark" aria-hidden />
        </div>
    );
}

/**
 * هيكل فتحة المنزل — نفس غلاف البلاطة المسطحة النهائية.
 * يقبل اللمسة قبل وصول commandHub إن مُرِّر onActivate.
 */
export function HomeWidgetSlotSkeleton({
    slot,
    appearance,
    themePrimary,
    onActivate,
    pointerHandlers,
}: {
    slot: HomeMainGridSlot;
    appearance: AppearanceSettings;
    themePrimary: string;
    onActivate?: () => void;
    pointerHandlers?: SkeletonPointerHandlers;
}): React.ReactElement {
    const scoped = mergeBlockScopedAppearance(appearance, slot.override);
    const cardThemePrimary = resolveCardThemePrimary(scoped);
    const containerBorderOn = resolveBlockContainerBorder(
        slot.override,
        appearance.homeContainerBorder !== false,
    );
    const style: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(slot.override, cardThemePrimary || themePrimary, {
            baseMinHeightPx: HUB_HALF_TILE_BASE_PX,
            skipHeightPx: true,
            skipContentScale: true,
            skipGlassPaint: true,
            appearance: scoped,
        }),
    };
    const label = slotLabel(slot.id);
    const interactive = Boolean(onActivate);

    if (slot.id === 'alerts') {
        return (
            <HomeHubCardSkeleton
                onActivate={onActivate}
            />
        );
    }

    if (slot.id === 'forum' && slot.span === 2) {
        const chrome = peekForumFirstPaintChrome();
        const forumFaceActivate = skeletonActivateProps(
            interactive,
            onActivate,
            pointerHandlers,
            true,
        );
        return (
            <div
                data-testid="home-dock-forum-shell"
                data-hami-block="forum"
                data-hami-block-border="0"
                data-hami-layout-span={slot.span}
                className={`hami-forum-profile-shell ${resolveHomeBlockClassNames(slot.override, appearance.shape)} ${HUB_HALF_TILE_MIN_CLASS} group overflow-visible`}
                dir="rtl"
                style={style}
            >
                <ForumTileProfileQuarterFallback
                    displayName={chrome.displayName}
                    profileInitial={chrome.profileInitial}
                    avatarUrl={chrome.avatarUrl}
                    showInitial={chrome.showInitial}
                    identitySettled={chrome.isLoaded}
                />
                {interactive ? (
                    <button
                        type="button"
                        data-testid="home-dock-forum"
                        className={`hami-forum-tile-main relative z-[1] min-h-[44px] ${HUB_TILE_BUTTON_A11Y}`}
                        aria-label={label}
                        {...forumFaceActivate}
                    >
                        <HomeBlockPatternOverlay
                            blockId="forum"
                            override={slot.override}
                            themePrimary={cardThemePrimary || themePrimary}
                        />
                        <SkeletonHubTitle label={label} />
                    </button>
                ) : (
                    <div className="hami-forum-tile-main relative z-[1] min-h-[44px]" data-testid="home-dock-forum">
                        <HomeBlockPatternOverlay
                            blockId="forum"
                            override={slot.override}
                            themePrimary={cardThemePrimary || themePrimary}
                        />
                        <SkeletonHubTitle label={label} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            data-testid={`home-widget-slot-skeleton-${slot.id}`}
            data-hami-block={slot.id}
            data-hami-block-border={containerBorderOn ? '1' : '0'}
            data-hami-layout-span={slot.span}
            aria-label={label}
            {...skeletonActivateProps(interactive, onActivate, pointerHandlers)}
            className={`relative overflow-hidden ${containerBorderOn ? 'border' : 'border-0'} w-full text-right ${resolveHomeBlockClassNames(slot.override, appearance.shape)} ${HUB_HALF_TILE_MIN_CLASS}${
                interactive ? ' touch-manipulation' : ''
            }`}
            style={style}
        >
            <HomeBlockPatternOverlay
                blockId={slot.id}
                override={slot.override}
                themePrimary={cardThemePrimary || themePrimary}
            />
            <SkeletonHubTitle label={label} />
        </div>
    );
}
