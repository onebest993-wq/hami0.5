import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    warmNotificationsOnHover,
    warmNotificationsOnOpen,
} from '@/app/hooks/lawyerDashboard/notificationIntentWarm';

const prefetchNotificationPanel = vi.fn();
const loadNotificationPanelModule = vi.fn(() => Promise.resolve({}));
const refreshNotificationShellBadge = vi.fn();
const hydrateFromLocalPeek = vi.fn();

vi.mock('@/app/runtime/notificationPanelLoader', () => ({
    prefetchNotificationPanel: (...args: unknown[]) => prefetchNotificationPanel(...args),
    loadNotificationPanelModule: (...args: unknown[]) => loadNotificationPanelModule(...args),
}));

vi.mock('@/app/services/notifications/notificationBackgroundSync', () => ({
    refreshNotificationShellBadge: (...args: unknown[]) => refreshNotificationShellBadge(...args),
}));

vi.mock('@/app/stores/notificationStore', () => ({
    useNotificationStore: {
        getState: () => ({ hydrateFromLocalPeek }),
    },
}));

describe('notificationIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('warmNotificationsOnHover يحمّل اللوحة مسبقاً', () => {
        warmNotificationsOnHover();
        expect(prefetchNotificationPanel).toHaveBeenCalledTimes(1);
    });

    it('warmNotificationsOnOpen يجلب الإشعارات ويحمّل chunk للمستخدم المسجّل', async () => {
        warmNotificationsOnOpen('lawyer-1');
        expect(prefetchNotificationPanel).toHaveBeenCalledTimes(1);
        expect(loadNotificationPanelModule).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => {
            expect(hydrateFromLocalPeek).toHaveBeenCalledWith('lawyer-1');
        });
        expect(refreshNotificationShellBadge).toHaveBeenCalledWith('lawyer-1');
    });

    it('warmNotificationsOnOpen يتخطى الجلب بدون معرّف', () => {
        warmNotificationsOnOpen(null);
        expect(refreshNotificationShellBadge).not.toHaveBeenCalled();
        expect(hydrateFromLocalPeek).not.toHaveBeenCalled();
    });

    it('warmNotificationsOnOpen يتخطى مزامنة الشبكة في الخلفية', async () => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        warmNotificationsOnOpen('lawyer-1');
        await vi.waitFor(() => {
            expect(hydrateFromLocalPeek).toHaveBeenCalledWith('lawyer-1');
        });
        expect(refreshNotificationShellBadge).not.toHaveBeenCalled();
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    });
});
