import { describe, expect, it, vi } from 'vitest';

import { closeOverlaysBeforeNotificationsOpen } from '../notificationShellOrchestration';

describe('closeOverlaysBeforeNotificationsOpen', () => {
    it('يغلق overlays الإنتاجية المتنافسة قبل فتح الإشعارات', () => {
        const closeGlobalSearch = vi.fn();
        const closeSettings = vi.fn();
        const closeVault = vi.fn();
        const closeNotepad = vi.fn();
        const closeTransactionsHub = vi.fn();
        const closeCommunity = vi.fn();

        closeOverlaysBeforeNotificationsOpen({
            closeGlobalSearch,
            closeSettings,
            closeVault,
            closeNotepad,
            closeTransactionsHub,
            closeCommunity,
        });

        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(closeVault).toHaveBeenCalledTimes(1);
        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(closeTransactionsHub).toHaveBeenCalledTimes(1);
        expect(closeCommunity).toHaveBeenCalledTimes(1);
    });
});
