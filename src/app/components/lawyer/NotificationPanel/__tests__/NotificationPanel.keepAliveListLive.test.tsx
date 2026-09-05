import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { NotificationPanel } from '@/app/components/lawyer/NotificationPanel/index';

const snap = vi.hoisted(() => ({ open: false, present: false }));

vi.mock('@/app/hooks/lawyerDashboard/notifications/useNotificationShellSnap', () => ({
    useNotificationShellSnapSurface: () => ({ open: snap.open, present: snap.present }),
}));

vi.mock('@/app/hooks/useIncomingCaseShares', () => ({
    useIncomingCaseShares: () => ({
        shares: [],
        pendingCount: 0,
        refresh: vi.fn(),
    }),
}));

vi.mock('@/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling', () => ({
    useNotificationPolling: vi.fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/utils/horizontalTabSwipe', () => ({
    useHorizontalTabSwipe: () => ({ swipeHandlers: {} }),
}));

vi.mock('@/app/motion/overlayMotionRuntime', () => ({
    motion: {
        div: React.forwardRef(function MotionDivMock(
            {
                children,
                drag: _drag,
                dragListener: _dragListener,
                dragControls: _dragControls,
                dragMomentum: _dragMomentum,
                dragConstraints: _dragConstraints,
                dragElastic: _dragElastic,
                initial: _initial,
                onDragEnd: _onDragEnd,
                ...rest
            }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>,
            ref: React.Ref<HTMLDivElement>,
        ) {
            return (
                <div ref={ref} {...rest}>
                    {children}
                </div>
            );
        }),
    },
    useDragControls: () => ({ start: vi.fn() }),
}));

describe('NotificationPanel keepAlive listLive', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
        snap.open = false;
        snap.present = false;
        useNotificationStore.setState({
            notifications: [
                {
                    id: 'keep-1',
                    title: 'رد جديد على سؤالك',
                    message: 'نص',
                    type: 'forum_reply',
                    isRead: false,
                    createdAt: new Date().toISOString(),
                },
            ],
            unreadCount: 1,
            isLoading: false,
            currentUserId: 'u1',
            hasHydratedOnce: true,
            lastFetchedAt: Date.now(),
        });
    });

    it('يبقي البطاقة مسلّحة عندما الستارة حاضرة وReact ما زالت مغلقة', () => {
        snap.present = true;
        render(
            <NotificationPanel
                isOpen={false}
                keepAlive
                userId="u1"
                onClose={vi.fn()}
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByTestId('notification-card-keep-1')).toBeInTheDocument();
        expect(screen.getByTestId('notification-panel-list')).toBeInTheDocument();
    });

    it('لا يرسم قائمة البطاقات عندما keepAlive مغلق والستارة غائبة', () => {
        snap.present = false;
        render(
            <NotificationPanel
                isOpen={false}
                keepAlive
                userId="u1"
                onClose={vi.fn()}
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.queryByTestId('notification-card-keep-1')).toBeNull();
        expect(screen.queryByTestId('notification-panel-list')).toBeNull();
        expect(screen.getByTestId('notification-panel')).toBeInTheDocument();
    });
});
