import { describe, expect, it, vi } from 'vitest';

import { closeOverlaysBeforeSettingsOpen } from '../settingsShellOrchestration';

describe('closeOverlaysBeforeSettingsOpen', () => {
    it('يغلق overlays الإنتاجية المتنافسة قبل فتح مركز الإعدادات', () => {
        const closeNotifications = vi.fn();
        const closeGlobalSearch = vi.fn();
        const closeVault = vi.fn();
        const closeNotepad = vi.fn();
        const closeTransactionsHub = vi.fn();
        const closeCommunity = vi.fn();

        closeOverlaysBeforeSettingsOpen({
            closeNotifications,
            closeGlobalSearch,
            closeVault,
            closeNotepad,
            closeTransactionsHub,
            closeCommunity,
        });

        expect(closeNotifications).toHaveBeenCalledTimes(1);
        expect(closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(closeVault).toHaveBeenCalledTimes(1);
        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(closeTransactionsHub).toHaveBeenCalledTimes(1);
        expect(closeCommunity).toHaveBeenCalledTimes(1);
    });
});
