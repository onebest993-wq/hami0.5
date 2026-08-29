import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LawyerDashboardSettingsOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry';

vi.mock('@/app/components/lawyer/HamiSettings/HamiSettingsHost', () => ({
    HamiSettingsHost: ({ open }: { open?: boolean }) => (
        <div data-testid="hami-settings-overlay-host" data-open={open ? '1' : '0'}>
            <div data-testid="hami-settings-shell">
                <div data-testid="settings-section-appearance">appearance</div>
            </div>
        </div>
    ),
}));

describe('LawyerDashboardSettingsOverlayEntry', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('عند showSettings يرسم Host الحقيقي مع قسم المنظر — بلا InstantShell', () => {
        render(
            <LawyerDashboardSettingsOverlayEntry
                shell={{
                    userId: 'u1',
                    authUserId: 'u1',
                    onLogout: () => undefined,
                }}
                overlays={{
                    showSettings: true,
                    settingsHostMounted: true,
                    settingsSessionKey: 1,
                    closeSettings: () => undefined,
                    resetSettingsShell: () => undefined,
                }}
            />,
        );
        expect(screen.getByTestId('hami-settings-overlay-host')).toBeInTheDocument();
        expect(screen.getByTestId('hami-settings-shell')).toBeInTheDocument();
        expect(screen.getByTestId('settings-section-appearance')).toBeInTheDocument();
        expect(screen.queryByTestId('hami-settings-shell-loading')).not.toBeInTheDocument();
    });

    it('عند الإغلاق بلا keepAlive لا يرسم شيئاً', () => {
        const { container } = render(
            <LawyerDashboardSettingsOverlayEntry
                shell={{
                    userId: 'u1',
                    onLogout: () => undefined,
                }}
                overlays={{
                    showSettings: false,
                    settingsHostMounted: false,
                    settingsSessionKey: 1,
                    closeSettings: () => undefined,
                    resetSettingsShell: () => undefined,
                }}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });
});
