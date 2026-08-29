import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { LawyerAuthOtpPanel } from '@/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel';

const requestAuthOtp = vi.fn();
const completeAuthOtp = vi.fn();
const previewAuthOtpAccount = vi.fn();
const openNativeScheme = vi.fn();

vi.mock('@/app/services/auth/authOtpClient', () => ({
    requestAuthOtp: (...args: unknown[]) => requestAuthOtp(...args),
    completeAuthOtp: (...args: unknown[]) => completeAuthOtp(...args),
    previewAuthOtpAccount: (...args: unknown[]) => previewAuthOtpAccount(...args),
    fetchAuthOtpChannels: vi.fn(),
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/services/profile/profileContactNavigation', () => ({
    openNativeScheme: (...args: unknown[]) => openNativeScheme(...args),
}));

const previewOk = {
    phoneTail: '99',
    hasWhatsAppNumber: true,
    emailReady: true,
    whatsappSendReady: false,
    adminWhatsappUrl: 'https://wa.me/9647811102199?text=x',
};

describe('LawyerAuthOtpPanel', () => {
    beforeEach(() => {
        requestAuthOtp.mockReset();
        completeAuthOtp.mockReset();
        previewAuthOtpAccount.mockReset();
        openNativeScheme.mockReset();
        previewAuthOtpAccount.mockResolvedValue(previewOk);
        requestAuthOtp.mockResolvedValue({
            delivery: 'otp',
            message: 'تم',
            resendAfterSec: 60,
            phoneTail: '99',
        });
        completeAuthOtp.mockResolvedValue('تم تحديث كلمة المرور');
    });

    async function continueResetEmail() {
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        await waitFor(() => {
            expect(screen.getByTestId('lawyer-auth-otp-channel-email')).toBeInTheDocument();
        });
    }

    it('يبدأ استعادة كلمة المرور بحاوية البريد قبل القنوات', async () => {
        render(
            <LawyerAuthOtpPanel purpose="password_reset" initialEmail="" onBack={vi.fn()} />,
        );
        expect(screen.getByTestId('lawyer-auth-otp-email-form')).toBeInTheDocument();
        expect(screen.getByText(/أدخل بريد الحساب المسجّل/)).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-otp-channel-email')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        expect(screen.getByTestId('lawyer-auth-otp-error').textContent).toMatch(/أدخل البريد الإلكتروني/);
        expect(previewAuthOtpAccount).not.toHaveBeenCalled();
    });

    it('يعرض البريد أولاً ويؤجّل واتساب الرمز حتى يُضبط', async () => {
        render(
            <LawyerAuthOtpPanel
                purpose="password_reset"
                initialEmail="a@gmail.com"
                onBack={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        expect(await screen.findByTestId('lawyer-auth-otp-channel-email')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-otp-channel-whatsapp')).not.toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-otp-channel-admin-whatsapp')).toBeInTheDocument();
        expect(requestAuthOtp).not.toHaveBeenCalled();
    });

    it('يرفض بريداً غير مسجّل قبل القنوات', async () => {
        previewAuthOtpAccount.mockRejectedValueOnce(new Error('لا يوجد حساب مسجّل بهذا البريد'));
        render(
            <LawyerAuthOtpPanel
                purpose="password_reset"
                initialEmail="missing@gmail.com"
                onBack={vi.fn()}
            />,
        );
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-email-continue'));
        expect(await screen.findByTestId('lawyer-auth-otp-error')).toHaveTextContent(/لا يوجد حساب/);
        expect(screen.queryByTestId('lawyer-auth-otp-channel-whatsapp')).not.toBeInTheDocument();
    });

    it('يفتح واتساب الإدارة مباشرة', async () => {
        render(
            <LawyerAuthOtpPanel
                purpose="password_reset"
                initialEmail="a@gmail.com"
                onBack={vi.fn()}
            />,
        );
        await continueResetEmail();
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-channel-admin-whatsapp'));
        expect(openNativeScheme).toHaveBeenCalledWith(previewOk.adminWhatsappUrl);
    });

    it('يطلب الرمز عبر البريد ثم يحفظ كلمة مرور جديدة', async () => {
        const onBack = vi.fn();
        render(
            <LawyerAuthOtpPanel
                purpose="password_reset"
                initialEmail="a@gmail.com"
                onBack={onBack}
            />,
        );
        await continueResetEmail();
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-channel-email'));
        await waitFor(() => {
            expect(requestAuthOtp).toHaveBeenCalledWith({
                email: 'a@gmail.com',
                channel: 'email',
                purpose: 'password_reset',
            });
        });
        expect(await screen.findByTestId('lawyer-auth-otp-code')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-code'), { target: { value: '123456' } });
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-new-password'), {
            target: { value: 'Abcd1234' },
        });
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-confirm-password'), {
            target: { value: 'Abcd1234' },
        });
        fireEvent.submit(screen.getByTestId('lawyer-auth-otp-submit').closest('form')!);
        await waitFor(() => {
            expect(completeAuthOtp).toHaveBeenCalledWith({
                email: 'a@gmail.com',
                code: '123456',
                purpose: 'password_reset',
                newPassword: 'Abcd1234',
            });
        });
        expect(onBack).toHaveBeenCalled();
    });

    it('يرفض كلمة مرور ضعيفة قبل إرسال الرمز للخادم', async () => {
        render(
            <LawyerAuthOtpPanel
                purpose="password_reset"
                initialEmail="a@gmail.com"
                onBack={vi.fn()}
            />,
        );
        await continueResetEmail();
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-channel-email'));
        expect(await screen.findByTestId('lawyer-auth-otp-code')).toBeInTheDocument();
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-code'), { target: { value: '123456' } });
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-new-password'), {
            target: { value: 'short' },
        });
        fireEvent.change(screen.getByTestId('lawyer-auth-otp-confirm-password'), {
            target: { value: 'short' },
        });
        fireEvent.submit(screen.getByTestId('lawyer-auth-otp-submit').closest('form')!);
        expect(completeAuthOtp).not.toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-auth-otp-error').textContent).toMatch(/8 أحرف/);
    });

    it('يعيد الإرسال بعد انتهاء العدّ عبر البريد', async () => {
        render(
            <LawyerAuthOtpPanel purpose="email_confirm" initialEmail="a@gmail.com" onBack={vi.fn()} />,
        );
        await waitFor(() => {
            expect(screen.getByTestId('lawyer-auth-otp-channel-email')).toBeInTheDocument();
        });
        fireEvent.click(screen.getByTestId('lawyer-auth-otp-channel-email'));
        expect(await screen.findByTestId('lawyer-auth-otp-resend')).toBeDisabled();
        expect(screen.getByTestId('lawyer-auth-otp-resend').textContent).toMatch(/طلب رمز جديد/);
    });
});
