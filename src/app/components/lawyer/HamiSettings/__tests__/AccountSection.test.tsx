import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AccountSection } from '@/app/components/lawyer/HamiSettings/account/AccountSection';

const confirm = vi.fn();
vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { confirm: (...args: unknown[]) => confirm(...args) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn() },
}));

describe('AccountSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('open', vi.fn(() => null));
    });

    it('يعرض خيارات الدعم', () => {
        render(<AccountSection onClose={vi.fn()} />);
        expect(screen.getByTestId('settings-section-account')).toBeInTheDocument();
        expect(screen.getByText('واتساب')).toBeInTheDocument();
    });

    it('يطلب تأكيداً قبل تسجيل الخروج', async () => {
        confirm.mockResolvedValueOnce(false);
        const onLogout = vi.fn();
        const onClose = vi.fn();

        render(<AccountSection onClose={onClose} onLogout={onLogout} />);
        fireEvent.click(screen.getByTestId('settings-account-logout'));

        await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
        expect(onLogout).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('يُغلق ويُسجّل الخروج بعد التأكيد', async () => {
        confirm.mockResolvedValueOnce(true);
        const onLogout = vi.fn();
        const onClose = vi.fn();

        render(<AccountSection onClose={onClose} onLogout={onLogout} />);
        fireEvent.click(screen.getByTestId('settings-account-logout'));

        await waitFor(() => expect(onLogout).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
