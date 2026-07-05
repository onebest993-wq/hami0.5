import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { SecuritySection } from '@/app/components/lawyer/HamiSettings/security/SecuritySection';

const patchSecurity = vi.fn();
const toggleLocalOnly = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/security/useSecuritySection', () => ({
    useSecuritySection: () => ({
        security: {
            localOnlyMode: false,
            privacyBlur: true,
            biometricLock: false,
            autoLockMinutes: 5,
            screenshotDeterrent: false,
        },
        patchSecurity,
        toggleLocalOnly,
        toggleBiometric: vi.fn(),
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
        expect(screen.getByTestId('settings-toggle-security-privacyBlur')).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('settings-toggle-security-localOnlyMode')).toHaveAttribute('aria-checked', 'false');
    });

    it('يستدعي toggleLocalOnly عند تغيير قطع الاتصال', () => {
        render(<SecuritySection />);
        fireEvent.click(screen.getByTestId('settings-toggle-security-localOnlyMode'));
        expect(toggleLocalOnly).toHaveBeenCalledWith(true);
    });

    it('يستدعي patchSecurity عند تغيير تمويه الخروج', () => {
        render(<SecuritySection />);
        fireEvent.click(screen.getByTestId('settings-toggle-security-privacyBlur'));
        expect(patchSecurity).toHaveBeenCalledWith({ privacyBlur: false });
    });
});
