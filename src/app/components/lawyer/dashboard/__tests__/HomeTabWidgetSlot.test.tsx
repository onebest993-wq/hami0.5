import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { HomeTabWidgetSlot } from '@/app/components/lawyer/dashboard/HomeTabWidgetSlot';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import type { HomeTabContentModel } from '@/app/components/lawyer/dashboard/useHomeTabContentModel';
import type { AppearanceSettings } from '@/app/services/settings/types';

vi.mock('@/app/components/lawyer/dashboard/HomeHubHomeSlot', () => ({
    HomeHubHomeSlot: () => <div data-testid="home-hub-home-slot" />,
}));

function slot(id: HomeMainGridSlot['id'], span: 1 | 2 = 1): HomeMainGridSlot {
    return { id, span, override: undefined, style: {} };
}

function stubTiles() {
    return {
        ExecutionHero: ({ onOpenArchive }: { onOpenArchive: (id: string) => void }) => (
            <button type="button" data-testid="hub-archive-execution" onClick={() => onOpenArchive('execution')}>
                تنفيذ
            </button>
        ),
        RouteTile: ({
            card,
            onOpenArchive,
        }: {
            card: { id: string };
            onOpenArchive: (id: string) => void;
        }) => (
            <button
                type="button"
                data-testid={`hub-archive-${card.id}`}
                onClick={() => onOpenArchive(card.id)}
            >
                {card.id}
            </button>
        ),
        ForumTile: ({ onOpen }: { onOpen: () => void }) => (
            <button type="button" data-testid="home-dock-forum" onClick={onOpen}>
                المنتدى
            </button>
        ),
        DockHalfTile: ({ widgetId, onOpen }: { widgetId: string; onOpen: () => void }) => (
            <button type="button" data-testid={`home-dock-${widgetId}`} onClick={onOpen}>
                {widgetId}
            </button>
        ),
    };
}

function model(overrides: Partial<HomeTabContentModel> = {}): HomeTabContentModel {
    return {
        appearance: { glassOpacity: 0.92, homeContainerBorder: true } as AppearanceSettings,
        themePrimary: '#E6C673',
        reduceMotion: true,
        commandHubTiles: stubTiles() as HomeTabContentModel['commandHubTiles'],
        forumUnreadCount: 0,
        handleHubArchiveOpen: vi.fn(),
        prefetchForumIntent: vi.fn(),
        dockActions: {
            resolveDockWidgetClick: () => undefined,
        } as HomeTabContentModel['dockActions'],
        dockBadgeContext: {},
        userId: 'lawyer-1',
        userMetadata: {},
        onOpenProfile: vi.fn(),
        onPrimeProfile: vi.fn(),
        onPrimeProfilePress: vi.fn(),
        ...overrides,
    } as HomeTabContentModel;
}

describe('HomeTabWidgetSlot — ربط مركز القيادة', () => {
    it('بلاطات الأرشيف تفتح عبر مسار المنزل', () => {
        const handleHubArchiveOpen = vi.fn();
        const m = model({ handleHubArchiveOpen });
        const { rerender } = render(<HomeTabWidgetSlot slot={slot('hubExecution')} model={m} />);
        fireEvent.click(screen.getByTestId('hub-archive-execution'));
        expect(handleHubArchiveOpen).toHaveBeenCalledWith('execution');

        rerender(<HomeTabWidgetSlot slot={slot('hubLawsuit')} model={m} />);
        fireEvent.click(screen.getByTestId('hub-archive-lawsuit'));
        expect(handleHubArchiveOpen).toHaveBeenCalledWith('lawsuit');

        rerender(<HomeTabWidgetSlot slot={slot('hubTransaction')} model={m} />);
        fireEvent.click(screen.getByTestId('hub-archive-transaction'));
        expect(handleHubArchiveOpen).toHaveBeenCalledWith('transaction');
    });

    it('التقويم والمهام والمستودع والمنتدى تمر من الدوك', () => {
        const handlers = {
            onOpenCommunity: vi.fn(),
            onOpenCalendar: vi.fn(),
            onOpenRepository: vi.fn(),
            onOpenFieldTasksSheet: vi.fn(),
        };
        const m = model({
            dockActions: {
                resolveDockWidgetClick: (id: string) => {
                    if (id === 'forum') return handlers.onOpenCommunity;
                    if (id === 'dockCalendar') return handlers.onOpenCalendar;
                    if (id === 'dockRepository') return handlers.onOpenRepository;
                    if (id === 'dockTasks') return handlers.onOpenFieldTasksSheet;
                    return undefined;
                },
            } as HomeTabContentModel['dockActions'],
        });

        const { rerender } = render(<HomeTabWidgetSlot slot={slot('forum')} model={m} />);
        fireEvent.click(screen.getByTestId('home-dock-forum'));
        expect(handlers.onOpenCommunity).toHaveBeenCalledTimes(1);

        rerender(<HomeTabWidgetSlot slot={slot('dockCalendar')} model={m} />);
        fireEvent.click(screen.getByTestId('home-dock-dockCalendar'));
        expect(handlers.onOpenCalendar).toHaveBeenCalledTimes(1);

        rerender(<HomeTabWidgetSlot slot={slot('dockRepository')} model={m} />);
        fireEvent.click(screen.getByTestId('home-dock-dockRepository'));
        expect(handlers.onOpenRepository).toHaveBeenCalledTimes(1);

        rerender(<HomeTabWidgetSlot slot={slot('dockTasks')} model={m} />);
        fireEvent.click(screen.getByTestId('home-dock-dockTasks'));
        expect(handlers.onOpenFieldTasksSheet).toHaveBeenCalledTimes(1);
    });

    it('بطاقة التنبيهات تُركَّب في فتحة الهاب', () => {
        render(<HomeTabWidgetSlot slot={slot('alerts', 2)} model={model()} />);
        expect(screen.getByTestId('home-hub-home-slot')).toBeInTheDocument();
    });
});
