import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.fn(async () => undefined);
const previewAuthOtpAccount = vi.fn();
const requestAuthOtp = vi.fn();

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

vi.mock('@/app/services/auth/authOtpClient', () => ({
    previewAuthOtpAccount: (...args: unknown[]) => previewAuthOtpAccount(...args),
    requestAuthOtp: (...args: unknown[]) => requestAuthOtp(...args),
    completeAuthOtp: vi.fn(),
    fetchAuthOtpChannels: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { LawyerSignInForm } from '@/app/bootstrap/lawyerAuth/LawyerSignInForm';

describe('LawyerSignInForm submit', () => {
    beforeEach(() => {
        previewAuthOtpAccount.mockReset();
        requestAuthOtp.mockReset();
        previewAuthOtpAccount.mockResolvedValue({
            phoneTail: '24',
            hasWhatsAppNumber: true,
            emailReady: true,
            whatsappSendReady: false,
            adminWhatsappUrl: 'https://wa.me/9647811102199',
        });
        requestAuthOtp.mockResolvedValue({
            delivery: 'otp',
            message: 'تم',
            resendAfterSec: 60,
            phoneTail: '24',
        });
    });

    afterEach(() => {
        loginMock.mockClear();
    });

    it('calls login and onSuccess with live form values including autofill', async () => {
        const onSuccess = vi.fn();
        render(<LawyerSignInForm onBack={() => undefined} onSuccess={onSuccess} />);
        const email = screen.getByTestId('lawyer-sign-in-email') as HTMLInputElement;
        const password = screen.getByTestId('lawyer-sign-in-password') as HTMLInputElement;
        email.value = 'hami.apps@proton.me';
        password.value = 'secret-pass';
        fireEvent.submit(screen.getByTestId('lawyer-sign-in-form'));
        await waitFor(() => {
            expect(loginMock).toHaveBeenCalledWith('hami.apps@proton.me', 'secret-pass');
        });
        expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('shows an Arabic error instead of a dead native submit when fields are empty', () => {
        render(<LawyerSignInForm onBack={() => undefined} />);
        fireEvent.click(screen.getByTestId('lawyer-sign-in-submit'));
        expect(loginMock).not.toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-sign-in-error').textContent).toMatch(/البريد الإلكتروني/);
    });

    it('يفتح حاوية البريد عند نسيت كلمة المرور دون ملء نموذج الدخول', () => {
        render(<LawyerSignInForm onBack={() => undefined} />);
        const forgot = screen.getByTestId('lawyer-sign-in-forgot');
        expect(forgot).not.toBeDisabled();
        fireEvent.click(forgot);
        expect(screen.getByTestId('lawyer-auth-otp-panel')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-otp-email-form')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-otp-email')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-otp-channel-whatsapp')).not.toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-sign-in-form')).not.toBeInTheDocument();
    });

    it('ينتقل من بريد الاستعادة إلى إرسال الرمز بالبريد', async () => {
        render(<LawyerSignInForm onBack={() => undefined} />);
        fireEvent.click(screen.getByTestId('lawyer-sign-in-forgot'));
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-email'), {
            target: { value: 'a@gmail.com' },
        });
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        expect(await screen.findByTestId('lawyer-auth-otp-channel-email')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-otp-channel-admin-whatsapp')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-otp-channel-whatsapp')).not.toBeInTheDocument();
        expect(requestAuthOtp).not.toHaveBeenCalled();
    });

    it('لا يرسل الرمز مباشرة إذا واتساب غير مضبوط', async () => {
        previewAuthOtpAccount.mockResolvedValue({
            phoneTail: null,
            hasWhatsAppNumber: false,
            emailReady: true,
            whatsappSendReady: false,
            adminWhatsappUrl: 'https://wa.me/9647811102199',
        });
        render(<LawyerSignInForm onBack={() => undefined} />);
        fireEvent.click(screen.getByTestId('lawyer-sign-in-forgot'));
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-email'), {
            target: { value: 'a@gmail.com' },
        });
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        expect(await screen.findByTestId('lawyer-auth-otp-channel-email')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-otp-channel-whatsapp')).not.toBeInTheDocument();
        expect(requestAuthOtp).not.toHaveBeenCalled();
    });
});
