import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HamiSettingsHost } from '@/app/components/lawyer/HamiSettings/HamiSettingsHost';

vi.mock('@/app/runtime/settingsBootHydrator', () => ({
    SETTINGS_SHELL_HYDRATED_EVENT: 'hami:settings-shell-hydrated',
    hydrateSettingsShellForInstantOpen: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('@/app/hooks/lawyerDashboard/settingsIntentWarm', () => ({
    warmSettingsOnOpen: vi.fn(),
    warmSettingsOnHover: vi.fn(),
}));

vi.mock('@/app/hooks/useOpaqueFeatureSurface', () => ({
    useOpaqueFeatureSurface: vi.fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/components/lawyer/HamiSettings/index', () => ({
    HamiSettings: ({ open }: { open?: boolean }) => (
        <div data-testid="mock-hami-settings" data-open={open ? 'true' : 'false'} />
    ),
}));

import { warmSettingsOnHover, warmSettingsOnOpen } from '@/app/hooks/lawyerDashboard/settingsIntentWarm';
import { hydrateSettingsShellForInstantOpen } from '@/app/runtime/settingsBootHydrator';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';

describe('HamiSettingsHost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });

    it('يرسم عبر portal على document.body عند open=true', () => {
        render(
            <HamiSettingsHost open onClose={() => undefined} onLogout={() => undefined} />,
        );
        expect(screen.getByTestId('hami-settings-overlay-host')).toBeInTheDocument();
        expect(screen.getByTestId('mock-hami-settings')).toHaveAttribute('data-open', 'true');
        expect(document.body.querySelector('[data-testid="hami-settings-overlay-host"]')).not.toBeNull();
        expect(useOpaqueFeatureSurface).toHaveBeenCalledWith(true);
    });

    it('مع keepAlive يبقي الـ portal مركّباً عند open=false', () => {
        render(
            <HamiSettingsHost
                open={false}
                keepAlive
                onClose={() => undefined}
                onLogout={() => undefined}
            />,
        );
        const host = screen.getByTestId('hami-settings-overlay-host');
        expect(host).toBeInTheDocument();
        expect(host).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('mock-hami-settings')).toHaveAttribute('data-open', 'false');
        expect(useOpaqueFeatureSurface).toHaveBeenCalledWith(false);
    });

    it('بدون keepAlive و open=false لا يرسم شيئاً', () => {
        const { container } = render(
            <HamiSettingsHost open={false} onClose={() => undefined} onLogout={() => undefined} />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByTestId('hami-settings-overlay-host')).toBeNull();
    });

    it('عند open=true لا يسخّن من Host — التسخين من hook الفتح فقط', async () => {
        render(
            <HamiSettingsHost open onClose={() => undefined} onLogout={() => undefined} />,
        );
        await Promise.resolve();
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
        expect(warmSettingsOnHover).not.toHaveBeenCalled();
        expect(hydrateSettingsShellForInstantOpen).not.toHaveBeenCalled();
    });

    it('مع keepAlive مغلق لا hydrate/warm على مسار الإغلاق (تبديل سريع)', () => {
        render(
            <HamiSettingsHost
                open={false}
                keepAlive
                onClose={() => undefined}
                onLogout={() => undefined}
            />,
        );
        expect(hydrateSettingsShellForInstantOpen).not.toHaveBeenCalled();
        expect(warmSettingsOnHover).not.toHaveBeenCalled();
        expect(warmSettingsOnOpen).not.toHaveBeenCalled();
    });
});
