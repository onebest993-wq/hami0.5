import { describe, expect, it, vi } from 'vitest';

import { closeOverlaysBeforeTransactionsOpen } from '../transactionsShellOrchestration';

describe('closeOverlaysBeforeTransactionsOpen', () => {
    it('يغلق overlays الإنتاجية المتنافسة قبل فتح مركز المعاملات', () => {
        const closeNotifications = vi.fn();
        const closeGlobalSearch = vi.fn();
        const closeSettings = vi.fn();
        const closeVault = vi.fn();
        const closeNotepad = vi.fn();
        const closeCommunity = vi.fn();

        closeOverlaysBeforeTransactionsOpen({
            closeNotifications,
            closeGlobalSearch,
            closeSettings,
            closeVault,
            closeNotepad,
            closeCommunity,
        });

        expect(closeNotifications).toHaveBeenCalledTimes(1);
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(closeVault).toHaveBeenCalledTimes(1);
        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(closeCommunity).toHaveBeenCalledTimes(1);
    });
});
