import React, { memo } from 'react';
import { HomeHubHomeSlot } from '@/app/components/lawyer/dashboard/HomeHubHomeSlot';
import { HomeWidgetSlotSkeleton } from '@/app/components/lawyer/dashboard/HomeWidgetSlotSkeleton';
import { bindDockWidgetPointerHandlers } from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';
import { HOME_HUB_TILE_LABELS, HOME_WIDGET_LABELS } from '@/app/services/settings/homeBlockLabels';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import { COMMAND_HUB_TILE_SLOT_IDS } from './homeTabWidgetIds';
import type { HomeTabContentModel } from './useHomeTabContentModel';

export const HomeTabWidgetSlot = memo(function HomeTabWidgetSlot({
    slot,
    model,
}: {
    slot: HomeMainGridSlot;
    model: HomeTabContentModel;
}) {
    const id = slot.id;
    const ov = slot.override;
    const layoutSpan = slot.span;
    const {
        appearance,
        themePrimary,
        reduceMotion,
        commandHubTiles,
        forumUnreadCount,
        handleHubArchiveOpen,
        prefetchForumIntent,
        dockActions,
        dockBadgeContext,
        userId,
        userMetadata,
        onOpenProfile,
        onPrimeProfile,
        onPrimeProfilePress,
    } = model;

    if (id === 'alerts') {
        return <HomeHubHomeSlot slot={slot} model={model} />;
    }

    if (!commandHubTiles) {
        return COMMAND_HUB_TILE_SLOT_IDS.has(id) ? (
            <HomeWidgetSlotSkeleton
                slot={slot}
                appearance={appearance}
                themePrimary={themePrimary}
                onActivate={() => dockActions.resolveDockWidgetClick(id, false)?.()}
                pointerHandlers={bindDockWidgetPointerHandlers(id)}
            />
        ) : null;
    }

    const { ExecutionHero, RouteTile, ForumTile, DockHalfTile } = commandHubTiles;

    switch (id) {
        case 'hubExecution':
            return (
                <ExecutionHero
                    accent={themePrimary}
                    onOpenArchive={handleHubArchiveOpen}
                    reduceMotion={reduceMotion}
                    blockOverride={ov}
                    layoutSpan={layoutSpan}
                />
            );
        case 'hubLawsuit':
            return (
                <RouteTile
                    card={{
                        id: 'lawsuit',
                        tileId: 'hubLawsuit',
                        label: HOME_HUB_TILE_LABELS.hubLawsuit,
                    }}
                    onOpenArchive={handleHubArchiveOpen}
                    reduceMotion={reduceMotion}
                    blockOverride={ov}
                    layoutSpan={layoutSpan}
                />
            );
        case 'hubTransaction':
            return (
                <RouteTile
                    card={{
                        id: 'transaction',
                        tileId: 'hubTransaction',
                        label: HOME_HUB_TILE_LABELS.hubTransaction,
                    }}
                    onOpenArchive={handleHubArchiveOpen}
                    reduceMotion={reduceMotion}
                    blockOverride={ov}
                    layoutSpan={layoutSpan}
                />
            );
        case 'forum':
            return (
                <ForumTile
                    forumUnreadCount={forumUnreadCount}
                    onOpen={() => dockActions.resolveDockWidgetClick('forum', false)?.()}
                    onPrefetch={prefetchForumIntent}
                    reduceMotion={reduceMotion}
                    blockOverride={ov}
                    layoutSpan={layoutSpan}
                    userId={userId}
                    userMetadata={userMetadata}
                    onOpenProfile={onOpenProfile}
                    onPrimeProfile={onPrimeProfile}
                    onPrimeProfilePress={onPrimeProfilePress}
                />
            );
        case 'dockRepository':
        case 'dockNotepad':
        case 'dockCalendar':
        case 'dockVault':
        case 'dockTasks': {
            const onDockClick = dockActions.resolveDockWidgetClick(id, false);
            const dockTitle = HOME_WIDGET_LABELS[id];
            return (
                <DockHalfTile
                    widgetId={id}
                    label={dockTitle}
                    onOpen={() => onDockClick?.()}
                    prefetchHandlers={bindDockWidgetPointerHandlers(id)}
                    badgeContext={dockBadgeContext}
                    reduceMotion={reduceMotion}
                    blockOverride={ov}
                    layoutSpan={layoutSpan}
                />
            );
        }
        default:
            return null;
    }
});
