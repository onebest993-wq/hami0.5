import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.fn(async () => undefined);
const { fetchStatusMock, requestOtpMock, verifyOtpMock } = vi.hoisted(() => ({
    fetchStatusMock: vi.fn(),
    requestOtpMock: vi.fn(),
    verifyOtpMock: vi.fn(),
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

vi.mock('@/app/bootstrap/useBootGateSurfaceReady', () => ({
    useBootGateSurfaceReady: () => undefined,
}));

vi.mock('@/app/context/authHooks', () => ({
    useAuth: () => ({
        login: loginMock,
        requestPasswordReset: vi.fn(),
        resendEmailConfirmation: vi.fn(),
    }),
}));

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: () => true,
}));

vi.mock('@/app/domain/admin/headquartersHiddenDoor', () => ({
    headquartersDoorPhraseMatches: vi.fn(async () => true),
    isHeadquartersDevDoorToken: () => false,
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: {
        getDeviceFingerprint: () => 'testdevicefingerprint01',
        trustThisDevice: vi.fn(),
        revokeDeviceTrust: vi.fn(),
        isDeviceTrustedLocally: () => false,
    },
}));

vi.mock('@/app/services/admin/adminHeadquartersOtpClient', () => ({
    fetchAdminDeviceTrustStatus: (...a: unknown[]) => fetchStatusMock(...a),
    requestAdminHeadquartersOtp: (...a: unknown[]) => requestOtpMock(...a),
    verifyAdminHeadquartersOtp: (...a: unknown[]) => verifyOtpMock(...a),
}));

vi.mock('@/app/services/admin/hqDevSessionWarm', () => ({
    warmLiveHeadquartersApis: vi.fn(async () => undefined),
}));

vi.mock('@/app/components/AdminDashboard', () => ({
    AdminDashboard: ({ onLogout }: { onLogout: () => void }) => (
        <div data-testid="admin-dashboard">
            <button type="button" data-testid="hq-end-session" onClick={() => onLogout()}>
                إنهاء الجلسة
            </button>
        </div>
    ),
}));

import { HeadquartersHiddenDoor } from '@/app/components/admin/HeadquartersHiddenDoor';
import HostInner from '@/app/surface/inner';
import { setPlainDocumentCoverForTests } from '@/boot/plainDocumentPath';

const deny = {
    userId: 'u1',
    userEmail: 'hami.apps@proton.me',
    isGuest: true,
    verifyReason: 'no_live_session',
    profileRole: null,
    uuidMatches: null,
    verifyFailed: false,
};

function HqAuthPath(): React.ReactElement {
    const [unlocked, setUnlocked] = useState(false);
    const [pending, setPending] = useState(false);
    const [allowed, setAllowed] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(true);
    return (
        <HeadquartersHiddenDoor unlocked={unlocked} onUnlock={() => setUnlocked(true)}>
            <HostInner
                pending={pending}
                allowed={allowed}
                needsLogin={needsLogin}
                deny={deny}
                fallback={<div data-testid="hq-fallback" />}
                onSessionRequired={() => undefined}
                onLoggedIn={() => {
                    setPending(true);
                    setNeedsLogin(false);
                    queueMicrotask(() => {
                        setPending(false);
                        setAllowed(true);
                    });
                }}
                onBack={() => undefined}
                onLogout={() => {
                    fetchStatusMock.mockResolvedValue('untrusted');
                    setAllowed(false);
                    setNeedsLogin(false);
                    queueMicrotask(() => setAllowed(true));
                }}
                onSwitchAccount={() => undefined}
            />
        </HeadquartersHiddenDoor>
    );
}

describe('HQ auth path white → login → OTP → dashboard', () => {
    afterEach(() => {
        vi.clearAllMocks();
        loginMock.mockClear();
        setPlainDocumentCoverForTests(false);
    });

    it('walks the product path and skips OTP on a later trusted visit', async () => {
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        verifyOtpMock.mockResolvedValue({ ok: true });

        const { unmount } = render(<HqAuthPath />);
        expect(screen.getByTestId('doc-surface')).toBeTruthy();
        expect(screen.queryByTestId('lawyer-sign-in-submit')).toBeNull();
        expect(screen.queryByTestId('admin-dashboard')).toBeNull();

        fireEvent.change(screen.getByTestId('doc-surface-input'), { target: { value: 'xxxxxxxxxxxxx' } });
        expect(await screen.findByTestId('admin-hq-login-gate')).toBeTruthy();
        expect(screen.queryByTestId('doc-surface')).toBeNull();

        fireEvent.click(screen.getByTestId('lawyer-sign-in-submit'));
        expect(loginMock).not.toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-sign-in-error').textContent).toMatch(/البريد الإلكتروني/);

        fireEvent.change(screen.getByTestId('lawyer-sign-in-email'), {
            target: { value: 'hami.apps@proton.me' },
        });
        fireEvent.change(screen.getByTestId('lawyer-sign-in-password'), { target: { value: 'secret-pass' } });
        fireEvent.submit(screen.getByTestId('lawyer-sign-in-form'));
        await waitFor(() => expect(loginMock).toHaveBeenCalledWith('hami.apps@proton.me', 'secret-pass'));
        expect(await screen.findByTestId('admin-otp-input')).toBeTruthy();
        expect(screen.queryByTestId('admin-dashboard')).toBeNull();

        fireEvent.change(screen.getByTestId('admin-otp-input'), { target: { value: '234569' } });
        fireEvent.click(screen.getByTestId('admin-otp-verify'));
        expect(await screen.findByTestId('admin-dashboard')).toBeTruthy();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();

        fireEvent.click(screen.getByTestId('hq-end-session'));
        expect(await screen.findByTestId('admin-otp-input')).toBeTruthy();
        expect(screen.queryByTestId('admin-dashboard')).toBeNull();
        unmount();

        fetchStatusMock.mockResolvedValue('trusted');
        render(
            <HostInner
                pending={false}
                allowed
                needsLogin={false}
                deny={{ ...deny, isGuest: false, verifyReason: 'session_flag' }}
                fallback={<div data-testid="hq-fallback" />}
                onSessionRequired={() => undefined}
                onBack={() => undefined}
                onLogout={() => undefined}
                onSwitchAccount={() => undefined}
            />,
        );
        expect(await screen.findByTestId('admin-dashboard')).toBeTruthy();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(screen.queryByTestId('admin-hq-login-gate')).toBeNull();
        expect(requestOtpMock).toHaveBeenCalledTimes(2);
    });
});
