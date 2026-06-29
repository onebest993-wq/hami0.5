import { describe, expect, it, vi } from 'vitest';

import { closeOverlaysBeforeForumOpen } from '../forumShellOrchestration';

describe('closeOverlaysBeforeForumOpen', () => {
    it('يغلق overlays الإنتاجية المتنافسة قبل فتح المنتدى', () => {
        const closeNotifications = vi.fn();
        const closeGlobalSearch = vi.fn();
        const closeSettings = vi.fn();
        const closeVault = vi.fn();
        const closeNotepad = vi.fn();
        const closeTransactionsHub = vi.fn();

        closeOverlaysBeforeForumOpen({
            closeNotifications,
            closeGlobalSearch,
            closeSettings,
            closeVault,
            closeNotepad,
            closeTransactionsHub,
        });

        expect(closeNotifications).toHaveBeenCalledTimes(1);
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(closeVault).toHaveBeenCalledTimes(1);
        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(closeTransactionsHub).toHaveBeenCalledTimes(1);
    });
});
