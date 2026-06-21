import { describe, expect, it, vi } from 'vitest';
import {
    GLOBAL_SEARCH_SHELL_FEATURE,
    openGlobalSearchFromShell,
} from '@/app/services/search/globalSearchShellNavigation';
import {
    formatHeaderToolbarBadge,
    shouldShowHeaderToolbarBadge,
} from '@/app/components/lawyer/LawyerDashboardParts/components/headerToolbarUtils';

describe('globalSearchShellNavigation', () => {
    it('opens search when signed in', () => {
        const onOpen = vi.fn();
        expect(
            openGlobalSearchFromShell({ signedIn: true, seed: 'عقد', onOpen }),
        ).toBe(true);
        expect(onOpen).toHaveBeenCalledWith('عقد');
    });

    it('blocks search when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            openGlobalSearchFromShell({ signedIn: false, onOpen, onSignedOut }),
        ).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('uses Arabic feature label', () => {
        expect(GLOBAL_SEARCH_SHELL_FEATURE).toBe('البحث الشامل');
    });
});

describe('headerToolbarUtils', () => {
    it('formats header badges', () => {
        expect(shouldShowHeaderToolbarBadge(0)).toBe(false);
        expect(formatHeaderToolbarBadge(120)).toBe('99+');
        expect(formatHeaderToolbarBadge(4)).toBe('4');
    });
});
