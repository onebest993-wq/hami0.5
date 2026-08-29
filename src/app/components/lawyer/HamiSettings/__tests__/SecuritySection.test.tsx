import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SecuritySection } from '@/app/components/lawyer/HamiSettings/security/SecuritySection';

const toggleLocalOnly = vi.fn();
const togglePrivacyBlur = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/security/useSecuritySection', () => ({
    useSecuritySection: () => ({
        security: {
            localOnlyMode: false,
            privacyBlur: true,
            biometricLock: false,
            autoLockMinutes: 5,
            screenshotDeterrent: false,
        },
        toggleLocalOnly,
        toggleBiometric: vi.fn(),
        toggleScreenshotDeterrent: vi.fn(),
        togglePrivacyBlur,
        setAutoLockMinutes: vi.fn(),
    }),
}));

describe('SecuritySection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض التoggles المربوطة', () => {
        render(<SecuritySection />);
        expect(screen.getByTestId('settings-section-security')).toBeInTheDocument();
        expect(screen.getByTestId('settings-toggle-security-localOnlyMode')).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByTestId('settings-toggle-security-biometricLock')).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByTestId('settings-toggle-security-privacyBlur')).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.getByTestId('settings-toggle-security-screenshotDeterrent')).toHaveAttribute(
            'aria-checked',
            'false',
        );
        expect(screen.getByTestId('settings-auto-lock-5')).toBeInTheDocument();
        expect(screen.getByTestId('settings-auto-lock-15')).toBeInTheDocument();
    });

    it('يستدعي toggleLocalOnly عند تغيير قطع الاتصال', async () => {
        render(<SecuritySection />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('settings-toggle-security-localOnlyMode'));
        });
        expect(toggleLocalOnly).toHaveBeenCalledWith(true);
    });

    it('يستدعي togglePrivacyBlur عند إيقاف الضبابية', async () => {
        render(<SecuritySection />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('settings-toggle-security-privacyBlur'));
        });
        expect(togglePrivacyBlur).toHaveBeenCalledWith(false);
    });
});
