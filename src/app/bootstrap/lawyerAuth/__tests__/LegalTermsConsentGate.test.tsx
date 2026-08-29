import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { LegalTermsConsentGate } from '@/app/bootstrap/lawyerAuth/LegalTermsConsentGate';
import {
    clearLegalTermsAcceptance,
    hasAcceptedCurrentLegalTerms,
} from '@/app/services/auth/legalTermsAcceptance';

vi.mock('@/app/bootstrap/useBootGateSurfaceReady', () => ({
    useBootGateSurfaceReady: () => undefined,
}));

const { exitApp } = vi.hoisted(() => ({
    exitApp: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/auth/exitApplicationAfterTermsDecline', () => ({
    exitApplicationAfterTermsDecline: () => exitApp(),
}));

describe('LegalTermsConsentGate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearLegalTermsAcceptance();
        window.localStorage.clear();
    });

    afterEach(() => {
        clearLegalTermsAcceptance();
    });

    it('يعرض الوثيقة مباشرة بلا زر عرض الوسطي', async () => {
        const onAccepted = vi.fn();
        render(<LegalTermsConsentGate onAccepted={onAccepted} />);
        expect(screen.getByTestId('legal-terms-consent-gate')).toBeInTheDocument();
        expect(screen.queryByTestId('legal-terms-open-document')).not.toBeInTheDocument();
        expect(screen.getByTestId('legal-terms-document-body')).toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-auth-choice')).not.toBeInTheDocument();
        expect(await screen.findByText('ديباجة تمهيدية')).toBeInTheDocument();
        expect(screen.getByTestId('legal-terms-accept')).not.toBeDisabled();
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        expect(onAccepted).not.toHaveBeenCalled();
    });

    it('بعد تحميل الوثيقة يُفعّل أوافق ويسجّل القبول', async () => {
        const onAccepted = vi.fn();
        render(<LegalTermsConsentGate onAccepted={onAccepted} />);
        expect(await screen.findByText('ديباجة تمهيدية')).toBeInTheDocument();
        const accept = screen.getByTestId('legal-terms-accept');
        expect(accept).not.toBeDisabled();
        fireEvent.click(accept);
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('عند الرفض يعرض الخروج والتراجع دون قبول', async () => {
        const onAccepted = vi.fn();
        render(<LegalTermsConsentGate onAccepted={onAccepted} />);
        await screen.findByText('ديباجة تمهيدية');
        fireEvent.click(screen.getByTestId('legal-terms-decline'));
        expect(screen.getByTestId('legal-terms-declined')).toBeInTheDocument();
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        expect(onAccepted).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('legal-terms-exit-app'));
        expect(exitApp).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByTestId('legal-terms-reconsider'));
        expect(screen.getByTestId('legal-terms-consent')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId('legal-terms-accept')).not.toBeDisabled();
        });
        fireEvent.click(screen.getByTestId('legal-terms-accept'));
        expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('العودة للاختيار تستدعي onBack دون قبول', async () => {
        const onAccepted = vi.fn();
        const onBack = vi.fn();
        render(<LegalTermsConsentGate onAccepted={onAccepted} onBack={onBack} />);
        await screen.findByText('ديباجة تمهيدية');
        fireEvent.click(screen.getByTestId('legal-terms-back-choice'));
        expect(onBack).toHaveBeenCalledTimes(1);
        expect(onAccepted).not.toHaveBeenCalled();
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
    });
});
