import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationPanelHost } from '@/app/components/lawyer/NotificationPanel/NotificationPanelHost';

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ hydrateFromLocalPeek: vi.fn() }),
    },
}));

vi.mock('@/app/components/lawyer/NotificationPanel/index', () => ({
    NotificationPanel: (props: { isOpen: boolean; keepAlive?: boolean }) =>
        props.isOpen || props.keepAlive ? (
            <div data-testid="notification-panel-loaded">loaded</div>
        ) : null,
}));

describe('NotificationPanelHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('لا يركّب شيئاً عندما تكون اللوحة مغلقة بدون keepAlive', () => {
        const { container } = render(
            <NotificationPanelHost
                isOpen={false}
                keepAlive={false}
                onClose={vi.fn()}
                userId="u1"
                onNavigate={vi.fn()}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('يبقي اللوحة mounted مع keepAlive حتى عند الإغلاق', () => {
        render(
            <NotificationPanelHost
                isOpen={false}
                keepAlive
                onClose={vi.fn()}
                userId="u1"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByTestId('notification-panel-loaded')).toBeInTheDocument();
    });

    it('يعرض المحتوى عند الفتح بلا هيكل تحميل', () => {
        render(
            <NotificationPanelHost
                isOpen
                keepAlive
                onClose={vi.fn()}
                userId="u1"
                onNavigate={vi.fn()}
            />,
        );
        expect(screen.getByTestId('notification-panel-loaded')).toBeInTheDocument();
        expect(screen.queryByTestId('notification-panel-shell-loading')).toBeNull();
    });
});
