import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SmartDialogContainer } from '@/app/components/ui/SmartDialogContainer';
import { SmartDialog } from '@/app/components/ui/SmartDialog';

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: (enabled = true) => (enabled ? 120 : 0),
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

describe('SmartDialogContainer accessibility', () => {
    it('uses a protected password input, traps focus, and restores the opener', async () => {
        const opener = document.createElement('button');
        document.body.appendChild(opener);
        opener.focus();
        render(<SmartDialogContainer />);

        let result!: Promise<string | null>;
        act(() => {
            result = SmartDialog.prompt('أدخل كلمة المرور', '', {
                title: 'نسخة محمية',
                inputType: 'password',
                autoComplete: 'current-password',
                ariaLabel: 'كلمة مرور النسخة',
            });
        });

        const dialog = await screen.findByRole('dialog', { name: 'نسخة محمية' });
        const input = screen.getByLabelText('كلمة مرور النسخة');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(input).toHaveAttribute('type', 'password');
        expect(input).toHaveAttribute('autocomplete', 'current-password');
        await waitFor(() => expect(input).toHaveFocus());

        const confirm = screen.getByTestId('smart-dialog-confirm');
        confirm.focus();
        fireEvent.keyDown(confirm, { key: 'Tab' });
        expect(input).toHaveFocus();

        fireEvent.change(input, { target: { value: 'secret value' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        await expect(result).resolves.toBe('secret value');
        await waitFor(() => expect(opener).toHaveFocus());
        opener.remove();
    });

    it('dismisses with Escape outside the Settings shell', async () => {
        render(<SmartDialogContainer />);
        let result!: Promise<boolean>;
        act(() => {
            result = SmartDialog.confirm('هل تريد المتابعة؟');
        });
        const dialog = await screen.findByRole('dialog');
        fireEvent.keyDown(dialog, { key: 'Escape' });
        await expect(result).resolves.toBe(false);
    });

    it('queues overlapping requests instead of orphaning the first promise', async () => {
        render(<SmartDialogContainer />);
        let first!: Promise<boolean>;
        let second!: Promise<boolean>;
        act(() => {
            first = SmartDialog.confirm('الأول', { title: 'الحوار الأول' });
            second = SmartDialog.confirm('الثاني', { title: 'الحوار الثاني' });
        });

        expect(await screen.findByRole('dialog', { name: 'الحوار الأول' })).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('smart-dialog-confirm'));
        await expect(first).resolves.toBe(true);

        expect(await screen.findByRole('dialog', { name: 'الحوار الثاني' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
        await expect(second).resolves.toBe(false);
    });

    it('يرفع الحوار فوق لوحة المفاتيح ويحافظ على أهداف لمس 44px', async () => {
        render(<SmartDialogContainer />);
        act(() => {
            void SmartDialog.prompt('أدخل كلمة المرور', '', {
                title: 'نسخة محمية',
                ariaLabel: 'كلمة مرور النسخة',
            });
        });

        const overlay = await screen.findByTestId('smart-dialog-overlay');
        expect(overlay).toHaveAttribute('data-keyboard-inset', '120');
        expect(overlay.getAttribute('style') ?? '').toContain('120px');
        expect(overlay.className).toContain('safe-area-inset-left');
        expect(overlay.className).toContain('safe-area-inset-right');
        expect(overlay.className).toContain('overscroll-none');

        const input = screen.getByLabelText('كلمة مرور النسخة');
        expect(input.className).toContain('min-h-[44px]');
        expect(screen.getByRole('button', { name: 'إلغاء' }).className).toContain('min-h-[44px]');
        expect(screen.getByRole('button', { name: 'إلغاء' }).className).toContain('min-w-[44px]');
        expect(screen.getByTestId('smart-dialog-confirm').className).not.toContain('min-h-[40px]');
        expect(screen.getByRole('dialog').className).toContain('100dvh');
    });
});
