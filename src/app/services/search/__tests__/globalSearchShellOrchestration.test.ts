import { describe, expect, it, vi } from 'vitest';
import { closeOverlaysBeforeGlobalSearchOpen } from '@/app/services/search/globalSearchShellOrchestration';

describe('closeOverlaysBeforeGlobalSearchOpen', () => {
    it('يغلق overlays المتنافسة', () => {
        const closers = {
            closeNotifications: vi.fn(),
            closeSettings: vi.fn(),
            closeVault: vi.fn(),
            closeNotepad: vi.fn(),
            closeTransactionsHub: vi.fn(),
            closeCommunity: vi.fn(),
        };

        closeOverlaysBeforeGlobalSearchOpen(closers);

        expect(closers.closeNotifications).toHaveBeenCalledTimes(1);
        expect(closers.closeSettings).toHaveBeenCalledTimes(1);
        expect(closers.closeVault).toHaveBeenCalledTimes(1);
        expect(closers.closeNotepad).toHaveBeenCalledTimes(1);
        expect(closers.closeTransactionsHub).toHaveBeenCalledTimes(1);
        expect(closers.closeCommunity).toHaveBeenCalledTimes(1);
    });
});
