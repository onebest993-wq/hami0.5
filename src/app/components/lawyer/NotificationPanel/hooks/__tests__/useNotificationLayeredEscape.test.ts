import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const isSmartDialogOpen = vi.fn(() => false);
const dismissActiveSmartDialog = vi.fn();

vi.mock('@/app/components/ui/smartDialogBus', () => ({
    isSmartDialogOpen: () => isSmartDialogOpen(),
    dismissActiveSmartDialog: () => dismissActiveSmartDialog(),
}));

import { useNotificationLayeredEscape } from '@/app/components/lawyer/NotificationPanel/hooks/useNotificationLayeredEscape';

describe('useNotificationLayeredEscape', () => {
    it('يرجع للوارد من تحكم التنبيهات ولا يغلق اللوحة', () => {
        const backToInbox = vi.fn();
        const onClose = vi.fn();
        const { result } = renderHook(() => useNotificationLayeredEscape(false, backToInbox, onClose));
        act(() => {
            result.current();
        });
        expect(backToInbox).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        expect(dismissActiveSmartDialog).not.toHaveBeenCalled();
    });

    it('يغلق الحوار المفتوح دون إغلاق اللوحة', () => {
        isSmartDialogOpen.mockReturnValueOnce(true);
        const backToInbox = vi.fn();
        const onClose = vi.fn();
        const { result } = renderHook(() => useNotificationLayeredEscape(true, backToInbox, onClose));
        act(() => {
            result.current();
        });
        expect(dismissActiveSmartDialog).toHaveBeenCalledTimes(1);
        expect(backToInbox).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('يرجع للوارد من مسار DOM حتى لو isInboxRoute متأخر', () => {
        const host = document.createElement('div');
        host.setAttribute('data-testid', 'notification-panel');
        host.setAttribute('data-notification-route', 'alert-controls');
        document.body.appendChild(host);
        const backToInbox = vi.fn();
        const onClose = vi.fn();
        const { result } = renderHook(() => useNotificationLayeredEscape(true, backToInbox, onClose));
        act(() => {
            result.current();
        });
        expect(backToInbox).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        host.remove();
    });
});
