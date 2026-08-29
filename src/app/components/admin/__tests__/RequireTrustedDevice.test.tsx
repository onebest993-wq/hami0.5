import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { fetchStatusMock, requestOtpMock, verifyOtpMock, isDeviceTrustedLocallyMock } = vi.hoisted(() => ({
    fetchStatusMock: vi.fn(),
    requestOtpMock: vi.fn(),
    verifyOtpMock: vi.fn(),
    isDeviceTrustedLocallyMock: vi.fn(() => false),
}));

vi.mock('@/app/bootstrap/bootStaticShell', () => ({
    removeStaticBootShell: vi.fn(),
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: {
        getDeviceFingerprint: () => 'testdevicefingerprint01',
        trustThisDevice: vi.fn(),
        revokeDeviceTrust: vi.fn(),
        isDeviceTrustedLocally: () => isDeviceTrustedLocallyMock(),
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

import { RequireTrustedDevice } from '../RequireTrustedDevice';
import { DOCUMENT_HOLD_REDUCED_MS } from '../useDocumentHold';

describe('RequireTrustedDevice', () => {
    afterEach(() => {
        vi.clearAllMocks();
        isDeviceTrustedLocallyMock.mockReturnValue(false);
        vi.useRealTimers();
    });

    it('shows the 6-digit confirmation stage and does not auto-verify', async () => {
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-input')).toBeTruthy();
        expect(screen.getByTestId('require-trusted-device-gate').getAttribute('data-phase')).toBe('verify');
        expect(screen.getByTestId('admin-otp-sent').textContent).toMatch(/ha\*\*\*@proton\.me/);
        expect(screen.queryByTestId('hq-children')).toBeNull();
        expect(verifyOtpMock).not.toHaveBeenCalled();
    });

    it('tells the admin the 6-digit code was mailed, never a magic link', async () => {
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            mailMode: 'smtp',
            destinationHint: 'ha***@proton.me',
        });
        render(
            <RequireTrustedDevice>
                <div>secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-sent')).toBeTruthy();
        expect(screen.getByTestId('admin-otp-sent').textContent).toMatch(/رمز التحقق/);
        expect(screen.getByTestId('admin-otp-sent').textContent).not.toMatch(/رابط|تجاهله/);
        expect(verifyOtpMock).not.toHaveBeenCalled();
    });

    it('stays on request when mailbox delivery fails', async () => {
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: false,
            delivered: false,
            error: 'تعذّر إرسال رمز التحقق إلى البريد الرسمي',
        });
        render(
            <RequireTrustedDevice>
                <div>secret</div>
            </RequireTrustedDevice>,
        );
        await waitFor(() => {
            expect(screen.getByRole('alert').textContent).toMatch(/البريد الرسمي/);
        });
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(verifyOtpMock).not.toHaveBeenCalled();
    });

    it('after a valid OTP holds on an empty document before HQ children', async () => {
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        verifyOtpMock.mockResolvedValue({ ok: true });
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        const input = await screen.findByTestId('admin-otp-input');
        vi.useFakeTimers();
        fireEvent.change(input, { target: { value: '234569' } });
        await act(async () => {
            fireEvent.click(screen.getByTestId('admin-otp-verify'));
        });
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });
        expect(verifyOtpMock).toHaveBeenCalled();
        expect(screen.getByTestId('doc-surface')).toBeTruthy();
        expect(screen.queryByTestId('hq-children')).toBeNull();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(DOCUMENT_HOLD_REDUCED_MS + 1);
        });
        expect(screen.getByTestId('hq-children')).toBeTruthy();
        const { warmLiveHeadquartersApis } = await import('@/app/services/admin/hqDevSessionWarm');
        expect(warmLiveHeadquartersApis).toHaveBeenCalled();
    });

    it('enters HQ without OTP when the server already trusts this device', async () => {
        fetchStatusMock.mockResolvedValue('trusted');
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('hq-children')).toBeTruthy();
        await waitFor(() => expect(fetchStatusMock).toHaveBeenCalled());
        const { warmLiveHeadquartersApis } = await import('@/app/services/admin/hqDevSessionWarm');
        expect(warmLiveHeadquartersApis).toHaveBeenCalled();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(requestOtpMock).not.toHaveBeenCalled();
        expect(verifyOtpMock).not.toHaveBeenCalled();
    });

    it('skips OTP on an unavailable probe when this browser is already trusted locally', async () => {
        isDeviceTrustedLocallyMock.mockReturnValue(true);
        fetchStatusMock.mockResolvedValue('unavailable');
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('hq-children')).toBeTruthy();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(requestOtpMock).not.toHaveBeenCalled();
    });

    it('does not open OTP when the probe is unavailable', async () => {
        fetchStatusMock.mockResolvedValue('unavailable');
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(screen.getByTestId('require-trusted-device-gate').getAttribute('data-phase')).toBe('checking');
        expect(screen.getByTestId('admin-otp-retry-probe')).toBeTruthy();
        expect(screen.queryByTestId('admin-otp-request')).toBeNull();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(screen.queryByTestId('hq-children')).toBeNull();
        expect(requestOtpMock).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toMatch(/تعذّر التحقق/);
    });

    it('enters HQ without OTP if a retry probe reports the device is trusted', async () => {
        fetchStatusMock.mockResolvedValueOnce('unavailable').mockResolvedValueOnce('trusted');
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('hq-children')).toBeTruthy();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(requestOtpMock).not.toHaveBeenCalled();
        expect(fetchStatusMock).toHaveBeenCalledTimes(2);
    });

    it('does not open HQ on an untrusted probe even if this browser has leftover local trust', async () => {
        isDeviceTrustedLocallyMock.mockReturnValue(true);
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-input')).toBeTruthy();
        expect(screen.queryByTestId('hq-children')).toBeNull();
        expect(requestOtpMock).toHaveBeenCalled();
    });

    it('keeps the OTP card when the code is rejected and does not open lawyer login', async () => {
        const onSessionRequired = vi.fn();
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        verifyOtpMock.mockResolvedValue({ ok: false, error: 'رمز غير صالح أو منتهٍ' });
        render(
            <RequireTrustedDevice onSessionRequired={onSessionRequired}>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        const input = await screen.findByTestId('admin-otp-input');
        fireEvent.change(input, { target: { value: '123459' } });
        fireEvent.click(screen.getByTestId('admin-otp-verify'));
        await waitFor(() => expect(verifyOtpMock).toHaveBeenCalled());
        expect(onSessionRequired).not.toHaveBeenCalled();
        expect(screen.getByTestId('admin-otp-input')).toBeTruthy();
        expect(screen.getByRole('alert').textContent).toMatch(/رمز غير صالح/);
        expect(screen.queryByTestId('admin-otp-session-login')).toBeNull();
        expect(screen.queryByTestId('hq-children')).toBeNull();
    });

    it('offers login from the OTP card when verify reports a dead session', async () => {
        const onSessionRequired = vi.fn();
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        verifyOtpMock.mockResolvedValue({
            ok: false,
            sessionRequired: true,
            error: 'انتهت جلسة الخادم. سجّل الدخول ثم أعد إدخال الرمز.',
        });
        render(
            <RequireTrustedDevice onSessionRequired={onSessionRequired}>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        const input = await screen.findByTestId('admin-otp-input');
        fireEvent.change(input, { target: { value: '234569' } });
        fireEvent.click(screen.getByTestId('admin-otp-verify'));
        await waitFor(() => expect(screen.getByTestId('admin-otp-session-login')).toBeTruthy());
        expect(onSessionRequired).not.toHaveBeenCalled();
        fireEvent.click(screen.getByTestId('admin-otp-session-login'));
        expect(onSessionRequired).toHaveBeenCalledTimes(1);
    });

    it('does not jump to lawyer login when the trust probe reports a dead session', async () => {
        const onSessionRequired = vi.fn();
        fetchStatusMock.mockResolvedValue('session_required');
        render(
            <RequireTrustedDevice onSessionRequired={onSessionRequired}>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-session-login')).toBeTruthy();
        expect(onSessionRequired).not.toHaveBeenCalled();
        expect(screen.queryByTestId('hq-children')).toBeNull();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        fireEvent.click(screen.getByTestId('admin-otp-session-login'));
        expect(onSessionRequired).toHaveBeenCalledTimes(1);
    });

    it('does not skip to HQ on a dead server session even if local trust remains', async () => {
        isDeviceTrustedLocallyMock.mockReturnValue(true);
        fetchStatusMock.mockResolvedValue('session_required');
        render(
            <RequireTrustedDevice>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-session-login')).toBeTruthy();
        expect(screen.queryByTestId('hq-children')).toBeNull();
    });

    it('keeps the request card when sending the code reports a dead session', async () => {
        const onSessionRequired = vi.fn();
        fetchStatusMock.mockResolvedValue('untrusted');
        requestOtpMock.mockResolvedValue({
            ok: false,
            sessionRequired: true,
            error: 'انتهت جلسة الخادم. سجّل الدخول ثم أعد فتح /admin.',
        });
        render(
            <RequireTrustedDevice onSessionRequired={onSessionRequired}>
                <div data-testid="hq-children">secret</div>
            </RequireTrustedDevice>,
        );
        expect(await screen.findByTestId('admin-otp-session-login')).toBeTruthy();
        expect(onSessionRequired).not.toHaveBeenCalled();
        expect(screen.queryByTestId('admin-otp-input')).toBeNull();
        expect(screen.getByTestId('require-trusted-device-gate').getAttribute('data-phase')).toBe('request');
    });
});
