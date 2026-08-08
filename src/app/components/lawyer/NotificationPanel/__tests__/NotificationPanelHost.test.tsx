import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationPanelHost } from '@/app/components/lawyer/NotificationPanel/NotificationPanelHost';

const MockPanel = (props: { isOpen: boolean; keepAlive?: boolean }) =>
    props.isOpen || props.keepAlive
        ? <div data-testid="notification-panel-loaded">loaded</div>
        : null;

vi.mock('@/app/runtime/notificationBootHydrator', () => ({
    hydrateNotificationShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
    NOTIFICATION_SHELL_HYDRATED_EVENT: 'hami:notification-shell-hydrated',
}));

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    getCachedNotificationPanel: vi.fn(() => MockPanel),
    loadNotificationPanelModule: vi.fn(async () => ({ NotificationPanel: MockPanel })),
    seedCachedNotificationPanel: vi.fn(),
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

    it('يبقي اللوحة mounted مع keepAlive حتى عند الإغلاق', async () => {
        render(
            <NotificationPanelHost
                isOpen={false}
                keepAlive
                onClose={vi.fn()}
                userId="u1"
                onNavigate={vi.fn()}
            />,
        );
        await waitFor(() => {
            expect(screen.getByTestId('notification-panel-loaded')).toBeInTheDocument();
        });
    });

    it('يعرض المحتوى عند الفتح', async () => {
        render(
            <NotificationPanelHost
                isOpen
                keepAlive
                onClose={vi.fn()}
                userId="u1"
                onNavigate={vi.fn()}
            />,
        );
        await waitFor(() => {
            expect(screen.getByTestId('notification-panel-loaded')).toBeInTheDocument();
        });
    });
});
