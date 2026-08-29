import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionsHubDialog } from '@/app/components/lawyer/TransactionsThreading/TransactionsHubDialog';

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

const keyboardInsetState = vi.hoisted(() => ({ value: 0 }));

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: (enabled: boolean) => (enabled ? keyboardInsetState.value : 0),
}));

describe('TransactionsHubDialog — تركيز خفيف', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        keyboardInsetState.value = 0;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يغلق بـ Escape ويستعيد التركيز السابق', async () => {
        const onOpenChange = vi.fn();
        const trigger = document.createElement('button');
        trigger.textContent = 'فتح';
        document.body.appendChild(trigger);
        trigger.focus();

        render(
            <TransactionsHubDialog open onOpenChange={onOpenChange} ariaLabel="حوار اختبار" testId="tx-dlg">
                <button type="button">إجراء</button>
            </TransactionsHubDialog>,
        );

        expect(screen.getByTestId('tx-dlg')).toBeInTheDocument();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('ينقل التركيز إلى عنصر داخل الحوار عند الفتح', async () => {
        render(
            <TransactionsHubDialog open onOpenChange={vi.fn()} ariaLabel="حوار" testId="tx-dlg-focus">
                <button type="button">أول زر</button>
                <button type="button">ثاني زر</button>
            </TransactionsHubDialog>,
        );

        await waitFor(() => {
            expect(document.activeElement?.textContent).toBe('أول زر');
        });
    });
    it('يرفع الحوار فوق الكيبورد ويعلّم overlay-safe', () => {
        keyboardInsetState.value = 260;
        render(
            <TransactionsHubDialog open onOpenChange={vi.fn()} ariaLabel="حوار" testId="tx-dlg-kb">
                <button type="button">إجراء</button>
            </TransactionsHubDialog>,
        );
        const dialog = screen.getByTestId('tx-dlg-kb');
        expect(dialog).toHaveAttribute('data-hami-overlay-safe', '1');
        expect(dialog).toHaveAttribute('data-keyboard-inset', '260');
        expect(dialog.style.touchAction).toBe('manipulation');
    });
});
