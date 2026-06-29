import { describe, expect, it, vi } from 'vitest';
import { closeOverlaysBeforeProfileOpen } from '@/app/services/profile/profileShellOrchestration';

describe('closeOverlaysBeforeProfileOpen', () => {
    it('يغلق overlays المتنافسة', () => {
        const closers = {
            closeGlobalSearch: vi.fn(),
            closeNotifications: vi.fn(),
            closeSettings: vi.fn(),
            closeVault: vi.fn(),
            closeNotepad: vi.fn(),
            closeTransactionsHub: vi.fn(),
            closeCommunity: vi.fn(),
        };

        closeOverlaysBeforeProfileOpen(closers);

        expect(closers.closeGlobalSearch).toHaveBeenCalledTimes(1);
        expect(closers.closeNotifications).toHaveBeenCalledTimes(1);
        expect(closers.closeSettings).toHaveBeenCalledTimes(1);
        expect(closers.closeVault).toHaveBeenCalledTimes(1);
        expect(closers.closeNotepad).toHaveBeenCalledTimes(1);
        expect(closers.closeTransactionsHub).toHaveBeenCalledTimes(1);
        expect(closers.closeCommunity).toHaveBeenCalledTimes(1);
    });
});
