import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';

const { enterLocalGuest } = vi.hoisted(() => ({
    enterLocalGuest: vi.fn(),
}));

vi.mock('@/app/bootstrap/useBootGateSurfaceReady', () => ({
    useBootGateSurfaceReady: () => undefined,
}));

vi.mock('@/app/context/authHooks', () => ({
    useAuth: () => ({
        enterLocalGuest,
        devBypassLogin: vi.fn(),
        login: vi.fn(),
        registerLawyer: vi.fn(),
        registerLawyerAccount: vi.fn(),
        finalizeLawyerOnboarding: vi.fn(),
        requestPasswordReset: vi.fn(),
        resendEmailConfirmation: vi.fn(),
    }),
}));

vi.mock('@/app/services/auth/authGatePreferredMode', () => ({
    consumePreferredAuthGateMode: () => null,
    peekPreferredAuthGateMode: () => null,
    setPreferredAuthGateMode: vi.fn(),
}));

import { LawyerAuthGate } from '@/app/bootstrap/lawyerAuth/LawyerAuthGate';

describe('LawyerAuthGate contract', () => {
    it('لا يكرّر wordmark «حامي» — العنوان إجرائي فقط', () => {
        render(<LawyerAuthGate />);
        expect(screen.getByTestId('lawyer-auth-choice')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'أهلاً بك' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'حامي' })).not.toBeInTheDocument();
    });

    it('يعرض مسارات الدخول بما فيها المطوّر في التطوير', () => {
        render(<LawyerAuthGate />);
        expect(screen.getByTestId('lawyer-auth-go-login')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-go-register')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-enter-guest')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-enter-dev')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'الدخول كمطور' })).toBeInTheDocument();
    });

    it('يحذّر من فقدان المميزات قبل الدخول بدون تسجيل', async () => {
        const { markLegalTermsAccepted, clearLegalTermsAcceptance } = await import(
            '@/app/services/auth/legalTermsAcceptance'
        );
        clearLegalTermsAcceptance();
        markLegalTermsAccepted();
        render(<LawyerAuthGate />);
        expect(screen.queryByTestId('lawyer-auth-guest-warning')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('lawyer-auth-enter-guest'));
        expect(enterLocalGuest).not.toHaveBeenCalled();
        expect(screen.getByTestId('lawyer-auth-guest-warning')).toBeInTheDocument();
        expect(screen.getByText(/المنتدى/)).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('lawyer-auth-guest-confirm'));
        expect(enterLocalGuest).toHaveBeenCalledTimes(1);
    });

    it('البوابة منسّقة: اختيار / lazy / استعادة كلّ في ملفه', () => {
        const gate = readFileSync(
            resolve(process.cwd(), 'src/app/bootstrap/lawyerAuth/LawyerAuthGate.tsx'),
            'utf8',
        );
        const hook = readFileSync(
            resolve(process.cwd(), 'src/app/hooks/lawyerDashboard/useLawyerDashboardAuth.tsx'),
            'utf8',
        );
        const choice = readFileSync(
            resolve(process.cwd(), 'src/app/bootstrap/lawyerAuth/LawyerAuthChoiceCard.tsx'),
            'utf8',
        );
        expect(gate).toContain('LawyerAuthChoiceCard');
        expect(gate).toContain('authGateLazy');
        expect(gate).toContain('requireTermsThen');
        expect(gate).toContain('LegalTermsConsentGate');
        expect(gate).not.toContain('lazyWithRetry');
        expect(hook).toContain('LawyerPasswordResetGate');
        expect(hook).toContain('LegalTermsConsentGate');
        expect(hook).toContain('!termsAccepted && user');
        expect(choice).not.toContain('خيار المطوّر');
        expect(choice).toContain('lawyer-auth-guest-warning');
        expect(choice).not.toContain('العودة والتسجيل');
        expect(choice).not.toContain('أو اعمل على هذا الجهاز محلياً');
    });

    it('تحذير الضيف يستبدل بطاقة الاختيار ولا يكرّر أزرار التسجيل', async () => {
        const { markLegalTermsAccepted, clearLegalTermsAcceptance } = await import(
            '@/app/services/auth/legalTermsAcceptance'
        );
        clearLegalTermsAcceptance();
        markLegalTermsAccepted();
        render(<LawyerAuthGate />);
        fireEvent.click(screen.getByTestId('lawyer-auth-enter-guest'));
        expect(screen.getByTestId('lawyer-auth-guest-warning')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-go-login')).not.toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-go-register')).not.toBeInTheDocument();
        expect(screen.getByTestId('lawyer-auth-guest-cancel')).toHaveTextContent('رجوع');
        fireEvent.click(screen.getByTestId('lawyer-auth-guest-cancel'));
        expect(screen.getByTestId('lawyer-auth-go-register')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-guest-warning')).not.toBeInTheDocument();
    });

    it('إنشاء حساب بلا قبول شروط يفتح الوثيقة مباشرة', async () => {
        const { clearLegalTermsAcceptance } = await import(
            '@/app/services/auth/legalTermsAcceptance'
        );
        clearLegalTermsAcceptance();
        render(<LawyerAuthGate />);
        expect(screen.getByTestId('lawyer-auth-choice')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('lawyer-auth-go-register'));
        expect(await screen.findByTestId('legal-terms-consent-gate')).toBeInTheDocument();
        expect(screen.queryByTestId('legal-terms-open-document')).not.toBeInTheDocument();
        expect(screen.getByTestId('legal-terms-document-body')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-choice')).not.toBeInTheDocument();
    });
});
