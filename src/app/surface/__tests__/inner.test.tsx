import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/AdminDashboard', () => ({
    AdminDashboard: () => <div data-testid="admin-dashboard" />,
}));

vi.mock('@/app/components/admin/RequireTrustedDevice', () => ({
    RequireTrustedDevice: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="require-trusted-device-gate">{children}</div>
    ),
}));

vi.mock('@/app/components/admin/HqStepUpHost', () => ({
    HqStepUpHost: () => null,
}));

vi.mock('@/app/components/admin/AdminHeadquartersAccess', () => ({
    AdminHeadquartersLoginGate: ({ onLoggedIn }: { onLoggedIn?: () => void }) => (
        <div data-testid="admin-hq-login-gate">
            <button type="button" data-testid="lawyer-sign-in-submit" onClick={() => onLoggedIn?.()}>
                دخول
            </button>
        </div>
    ),
    AdminPcAccessDenied: () => <div data-testid="admin-pc-access-denied" />,
}));

import HostInner from '@/app/surface/inner';

const deny = {
    userId: 'u1',
    userEmail: 'hami.apps@proton.me',
    isGuest: false,
    verifyReason: 'no_live_session',
    profileRole: 'admin',
    uuidMatches: true,
    verifyFailed: false,
};

const rest = {
    deny,
    fallback: <div data-testid="hq-fallback" />,
    onSessionRequired: () => undefined,
    onBack: () => undefined,
    onLogout: () => undefined,
    onSwitchAccount: () => undefined,
};

describe('HostInner HQ routing', () => {
    it('keeps OTP when allowed even if leftover needsLogin is true', () => {
        render(<HostInner pending={false} allowed needsLogin {...rest} />);
        expect(screen.getByTestId('require-trusted-device-gate')).toBeTruthy();
        expect(screen.queryByTestId('admin-hq-login-gate')).toBeNull();
    });

    it('shows the HQ login gate when the session is missing', () => {
        render(<HostInner pending={false} allowed={false} needsLogin {...rest} />);
        expect(screen.getByTestId('admin-hq-login-gate')).toBeTruthy();
        expect(screen.queryByTestId('require-trusted-device-gate')).toBeNull();
    });

    it('notifies the shell after a successful HQ login so verify can re-run', () => {
        const onLoggedIn = vi.fn();
        render(
            <HostInner pending={false} allowed={false} needsLogin onLoggedIn={onLoggedIn} {...rest} />,
        );
        fireEvent.click(screen.getByTestId('lawyer-sign-in-submit'));
        expect(onLoggedIn).toHaveBeenCalledTimes(1);
    });

    it('shows pending fallback before login or OTP', () => {
        render(<HostInner pending allowed={false} needsLogin={false} {...rest} />);
        expect(screen.getByTestId('hq-fallback')).toBeTruthy();
    });

    it('skipTrustedDevice opens HQ without the OTP gate', () => {
        render(<HostInner pending={false} allowed skipTrustedDevice {...rest} />);
        expect(screen.getByTestId('admin-dashboard')).toBeTruthy();
        expect(screen.queryByTestId('require-trusted-device-gate')).toBeNull();
        expect(screen.queryByTestId('admin-hq-login-gate')).toBeNull();
    });

    it('skipTrustedDevice wins over a pending white fallback', () => {
        render(<HostInner pending allowed={false} skipTrustedDevice {...rest} />);
        expect(screen.getByTestId('admin-dashboard')).toBeTruthy();
        expect(screen.queryByTestId('hq-fallback')).toBeNull();
        expect(screen.queryByTestId('require-trusted-device-gate')).toBeNull();
    });

    it('holds the HQ surface until the development session is ready', () => {
        render(<HostInner pending allowed={false} skipTrustedDevice devSessionReady={false} {...rest} />);
        expect(screen.getByTestId('hq-fallback')).toBeTruthy();
        expect(screen.queryByTestId('admin-dashboard')).toBeNull();
        expect(screen.queryByTestId('require-trusted-device-gate')).toBeNull();
    });
});
