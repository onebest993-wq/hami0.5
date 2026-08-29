import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AccountSection } from '@/app/components/lawyer/HamiSettings/account/AccountSection';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

const confirm = vi.fn();
vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { confirm: (...args: unknown[]) => confirm(...args) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: vi.fn(() => false),
}));

vi.mock('@/app/services/profile/profileContactNavigation', () => ({
    openNativeScheme: vi.fn(),
}));

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettingsAppearance: () => ({ language: 'ar' }),
    useLawyerSettingsReset: () => vi.fn(),
}));

const requestAuthGateFromGuest = vi.fn();
vi.mock('@/app/services/auth/requestAuthGateFromGuest', () => ({
    requestAuthGateFromGuest: (...args: unknown[]) => requestAuthGateFromGuest(...args),
}));

const deleteLawyerAccount = vi.fn(async () => ({
    authDeleted: true,
    localCompleted: true,
    failedLocalStages: [],
    userId: 'lawyer-1',
}));
vi.mock('@/app/services/settings/deleteLawyerAccount', () => ({
    deleteLawyerAccount: (...args: unknown[]) => deleteLawyerAccount(...args),
}));

const verifySensitiveSettingsAction = vi.fn(async () => false);
vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: `${base}-TEST`,
        promptMessage: `اكتب «${base}-TEST»`,
    }),
    verifySensitiveSettingsAction: (...args: unknown[]) => verifySensitiveSettingsAction(...args),
}));

describe('AccountSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('open', vi.fn(() => null));
    });

    it('يعرض خيارات الدعم والوثيقة القانونية الموحدة بلا نبذة', () => {
        render(<AccountSection onClose={vi.fn()} />);
        expect(screen.getByTestId('settings-section-account')).toBeInTheDocument();
        expect(screen.getByTestId('settings-account-support-email')).toBeInTheDocument();
        expect(screen.getByLabelText(/hami\.apps@proton\.me|مراسلة الدعم عبر/)).toBeInTheDocument();
        expect(
            screen.getByText('الشروط والأحكام وسياسة الاستخدام والخصوصية'),
        ).toBeInTheDocument();
        expect(screen.queryByText('نبذة عن حامي')).not.toBeInTheDocument();
        expect(screen.queryByTestId('settings-account-open-about')).not.toBeInTheDocument();
    });

    it('يفتح الوثيقة الموحدة: شروط واستخدام وخصوصية', async () => {
        render(<AccountSection onClose={vi.fn()} />);
        fireEvent.click(screen.getByTestId('settings-account-open-terms'));
        expect(await screen.findByTestId('account-legal-document-sheet')).toBeInTheDocument();
        const body = screen.getByTestId('account-legal-document-body');
        expect(body.className).toContain('hami-settings-sheet-body');
        expect(screen.getByTestId('hami-settings-sheet-panel')).toBeInTheDocument();
        expect(body).toHaveTextContent('ديباجة تمهيدية');
        expect(body).toHaveTextContent('الشروط والأحكام العامة');
        expect(body).toHaveTextContent('سياسة الاستخدام المقبول');
        expect(body).toHaveTextContent('الخصوصية');
        expect(body).toHaveTextContent('الامتثال');
        expect(body).toHaveTextContent('نقابة المحامين العراقيين');
    });

    it('يطلب تأكيداً قبل تسجيل الخروج', async () => {
        confirm.mockResolvedValueOnce(false);
        const onLogout = vi.fn();
        const onClose = vi.fn();

        render(<AccountSection onClose={onClose} onLogout={onLogout} userId="lawyer-1" />);
        fireEvent.click(screen.getByTestId('settings-account-logout'));

        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(onLogout).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('يُغلق ويُسجّل الخروج بعد التأكيد', async () => {
        confirm.mockResolvedValueOnce(true);
        const onLogout = vi.fn();
        const onClose = vi.fn();

        render(<AccountSection onClose={onClose} onLogout={onLogout} userId="lawyer-1" />);
        fireEvent.click(screen.getByTestId('settings-account-logout'));

        await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('لا يدّعي مسح بيانات التطبيق إذا رُفض الخروج', async () => {
        const { SmartToast } = await import('@/app/components/ui/SmartToast');
        confirm.mockResolvedValueOnce(true);
        const onLogout = vi.fn().mockRejectedValue(new Error('unexpected'));
        render(<AccountSection onClose={vi.fn()} onLogout={onLogout} userId="lawyer-1" />);
        fireEvent.click(screen.getByTestId('settings-account-logout'));
        await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
        expect(SmartToast.warning).toHaveBeenCalled();
        const message = String(vi.mocked(SmartToast.warning).mock.calls[0]?.[0] ?? '');
        expect(message).not.toMatch(/تنظيف البيانات المحلية/);
        expect(message).toMatch(/خرجت من هذا الجهاز/);
    });

    it('يعرض مسح الحساب للمسجّل ولا يحذف عند إلغاء التأكيد', async () => {
        confirm.mockResolvedValueOnce(false);
        render(<AccountSection onClose={vi.fn()} onLogout={vi.fn()} userId="lawyer-1" />);
        expect(screen.getByTestId('settings-account-delete')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('settings-account-delete'));
        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(deleteLawyerAccount).not.toHaveBeenCalled();
    });

    it('يعرض تسجيل الدخول للضيف بدل الخروج', () => {
        const onLogout = vi.fn();
        const onClose = vi.fn();
        render(<AccountSection onClose={onClose} onLogout={onLogout} userId={GUEST_LAWYER_ID} />);
        expect(screen.getByTestId('settings-account-login')).toBeInTheDocument();
        expect(screen.queryByTestId('settings-account-logout')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('settings-account-login'));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(requestAuthGateFromGuest).toHaveBeenCalledWith('login');
        expect(onLogout).not.toHaveBeenCalled();
        expect(screen.queryByTestId('settings-account-delete')).not.toBeInTheDocument();
    });
});
