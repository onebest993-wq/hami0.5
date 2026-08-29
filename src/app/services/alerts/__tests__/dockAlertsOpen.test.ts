import { describe, expect, it, vi } from 'vitest';
import {
    ALERTS_DOCK_FEATURE,
    armPendingAlertsDockOpen,
    consumePendingAlertsDockOpen,
    openAlertsDockFromShell,
    resetPendingAlertsDockOpenForTests,
    resolveAlertsDockSheetMode,
    shouldShowAlertsDockBadge,
} from '@/app/services/alerts/dockAlertsOpen';

describe('dockAlertsOpen', () => {
    it('exports Arabic feature label', () => {
        expect(ALERTS_DOCK_FEATURE).toBe('البطاقة');
    });

    it('opens alerts panel by default', () => {
        const onOpen = vi.fn();
        expect(
            openAlertsDockFromShell({
                signedIn: true,
                pinnedCount: 0,
                urgentAlertsCount: 2,
                onOpen,
            }),
        ).toBe(true);
        expect(onOpen).toHaveBeenCalledWith('alerts');
    });

    it('opens pins when only pins exist without urgent alerts', () => {
        expect(resolveAlertsDockSheetMode(3, 0)).toBe('pins');
        const onOpen = vi.fn();
        openAlertsDockFromShell({
            signedIn: true,
            pinnedCount: 3,
            urgentAlertsCount: 0,
            onOpen,
        });
        expect(onOpen).toHaveBeenCalledWith('pins');
    });

    it('prefers alerts when urgent alerts exist even with pins', () => {
        expect(resolveAlertsDockSheetMode(2, 1)).toBe('alerts');
    });

    it('blocks open when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            openAlertsDockFromShell({
                signedIn: false,
                pinnedCount: 1,
                urgentAlertsCount: 0,
                onOpen,
                onSignedOut,
            }),
        ).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('shows dock badge for pins or urgent alerts', () => {
        expect(shouldShowAlertsDockBadge(0, 0)).toBe(false);
        expect(shouldShowAlertsDockBadge(2, 0)).toBe(true);
        expect(shouldShowAlertsDockBadge(0, 1)).toBe(true);
    });

    it('armPendingAlertsDockOpen يُستهلك مرة واحدة', () => {
        resetPendingAlertsDockOpenForTests();
        expect(consumePendingAlertsDockOpen()).toBe(false);
        armPendingAlertsDockOpen();
        expect(consumePendingAlertsDockOpen()).toBe(true);
        expect(consumePendingAlertsDockOpen()).toBe(false);
    });
});
